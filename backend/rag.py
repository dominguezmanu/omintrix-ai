from sentence_transformers import SentenceTransformer
from database import conectar_db

# Utilizamos el mismo modelo empleado para generar los embeddings.
modelo = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)


def buscar_documentos(pregunta: str, limite: int = 3):

    # Convertir pregunta en embedding
    embedding = modelo.encode(pregunta).tolist()

    vector = "[" + ",".join(
        str(valor) for valor in embedding
    ) + "]"

    # Buscar documentos similares en Neon
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
            """, (vector, vector, limite))

            documentos = cursor.fetchall()

    return documentos