from sentence_transformers import SentenceTransformer
from main import conectar_db

print("Cargando modelo de embeddings...")

# Modelo multilingüe gratuito de 384 dimensiones.
modelo = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)

print("Conectando con Neon...")

with conectar_db() as conexion:
    with conexion.cursor() as cursor:

        cursor.execute("""
            SELECT id, titulo, contenido
            FROM documentos_rag
            WHERE embedding IS NULL
            ORDER BY id
        """)

        documentos = cursor.fetchall()

        print(f"Documentos pendientes: {len(documentos)}")

        for documento in documentos:

            texto = (
                documento["titulo"]
                + "\n"
                + documento["contenido"]
            )

            embedding = modelo.encode(texto).tolist()

            vector = "[" + ",".join(
                str(valor) for valor in embedding
            ) + "]"

            cursor.execute("""
                UPDATE documentos_rag
                SET embedding = %s::vector
                WHERE id = %s
            """, (
                vector,
                documento["id"]
            ))

            print(
                f"Embedding generado: {documento['titulo']}"
            )

    conexion.commit()

print("\nTodos los embeddings fueron guardados correctamente.")