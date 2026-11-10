from pathlib import Path
from huggingface_hub import snapshot_download


MODELO = (
    "sentence-transformers/"
    "paraphrase-multilingual-MiniLM-L12-v2"
)

DESTINO = Path(__file__).resolve().parent / "modelos_rag"


print("Descargando modelo ONNX cuantizado...")

snapshot_download(
    repo_id=MODELO,
    allow_patterns=[
        "onnx/model_quint8_avx2.onnx",
        "tokenizer.json"
    ],
    local_dir=str(DESTINO)
)

print("Modelo descargado correctamente.")