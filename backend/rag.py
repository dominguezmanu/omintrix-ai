from pathlib import Path
from functools import lru_cache

import numpy as np
import onnxruntime as ort

from tokenizers import Tokenizer
from database import conectar_db


BASE_DIR = Path(__file__).resolve().parent

MODELO_DIR = BASE_DIR / "modelos_rag"

MODELO_PATH = (
    MODELO_DIR
    / "onnx"
    / "model_quint8_avx2.onnx"
)

TOKENIZER_PATH = MODELO_DIR / "tokenizer.json"


@lru_cache(maxsize=1)
def cargar_modelo():

    if not MODELO_PATH.exists():
        raise RuntimeError(
            "No se encontró el modelo ONNX. "
            "Ejecuta descargar_modelo.py."
        )

    tokenizer = Tokenizer.from_file(
        str(TOKENIZER_PATH)
    )

    tokenizer.enable_truncation(max_length=128)

    opciones = ort.SessionOptions()
    opciones.intra_op_num_threads = 1
    opciones.inter_op_num_threads = 1

    sesion = ort.InferenceSession(
        str(MODELO_PATH),
        sess_options=opciones,
        providers=["CPUExecutionProvider"]
    )

    return tokenizer, sesion


def generar_embedding(texto: str):

    tokenizer, sesion = cargar_modelo()

    encoding = tokenizer.encode(texto)

    ids = np.array(
        [encoding.ids],
        dtype=np.int64
    )

    mascara = np.array(
        [encoding.attention_mask],
        dtype=np.int64
    )

    tipos = np.array(
        [encoding.type_ids],
        dtype=np.int64
    )

    entradas_disponibles = {
        entrada.name
        for entrada in sesion.get_inputs()
    }

    entradas = {
        "input_ids": ids,
        "attention_mask": mascara,
        "token_type_ids": tipos
    }

    entradas = {
        nombre: valor
        for nombre, valor in entradas.items()
        if nombre in entradas_disponibles
    }

    resultados = sesion.run(None, entradas)

    # Embeddings de cada token
    tokens = resultados[0]

    # Mean pooling, como el modelo original
    mascara_expandida = np.expand_dims(
        mascara, axis=-1
    )

    suma = np.sum(
        tokens * mascara_expandida,
        axis=1
    )

    divisor = np.maximum(
        mascara_expandida.sum(axis=1),
        1
    )

    embedding = suma / divisor

    return embedding[0].tolist()


def buscar_documentos(
    pregunta: str,
    limite: int = 3
):

    embedding = generar_embedding(pregunta)

    vector = "[" + ",".join(
        str(valor)
        for valor in embedding
    ) + "]"

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    titulo,
                    contenido,
                    fuente,
                    1 - (embedding <=> %s::vector) AS similitud
                FROM documentos_rag
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (
                vector,
                vector,
                limite
            ))

            documentos = cursor.fetchall()

    return documentos