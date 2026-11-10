from fastapi import HTTPException

from azmuth import (
    client,
    MODELO,
    INSTRUCCIONES_AZMUTH
)

from rag import buscar_documentos
from database import conectar_db


def conversar_azmuth(
    usuario_id: int,
    pregunta: str,
    conversacion_id: int | None = None
):


    # La transaccion bloquea temporalmente el saldo del
    # usuario para evitar consumos simultaneos excesivos.
    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT id, nombre, limite_tokens
                FROM usuarios
                WHERE id = %s AND activo = TRUE
                FOR UPDATE
            """, (usuario_id,))

            usuario = cursor.fetchone()

            if not usuario:
                raise HTTPException(
                    status_code=401,
                    detail="Usuario no disponible"
                )

            cursor.execute("""
                SELECT
                    id,
                    activo,
                    limite_tokens_solicitud
                FROM servicios_ia
                WHERE nombre = 'Azmuth AI'
            """)

            servicio = cursor.fetchone()

            if not servicio or not servicio["activo"]:
                raise HTTPException(
                    status_code=503,
                    detail="Azmuth AI no esta disponible"
                )

            servicio_id = servicio["id"]

            # Calcular el consumo acumulado.
            cursor.execute("""
                SELECT COALESCE(SUM(tokens_total), 0)
                    AS consumidos
                FROM consumo_tokens
                WHERE usuario_id = %s
            """, (usuario_id,))

            consumidos = cursor.fetchone()["consumidos"]

            limite_usuario = usuario["limite_tokens"]
            disponibles = limite_usuario - consumidos

            if disponibles <= 0:
                raise HTTPException(
                    status_code=429,
                    detail="Has agotado tus tokens disponibles"
                )

            historial = []

            # Si existe una conversacion, verificar propiedad.
            if conversacion_id is not None:

                cursor.execute("""
                    SELECT id
                    FROM conversaciones
                    WHERE id = %s
                      AND usuario_id = %s
                      AND servicio_id = %s
                """, (
                    conversacion_id,
                    usuario_id,
                    servicio_id
                ))

                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=404,
                        detail="Conversacion no encontrada"
                    )

                cursor.execute("""
                    SELECT rol, contenido
                    FROM mensajes
                    WHERE conversacion_id = %s
                      AND rol IN ('user', 'assistant')
                    ORDER BY creado_en DESC, id DESC
                    LIMIT 8
                """, (conversacion_id,))

                historial = list(reversed(
                    cursor.fetchall()
                ))
            # ==========================================
            # RAG CON MEMORIA CONVERSACIONAL
            # ==========================================

            pregunta_busqueda = pregunta

            if historial:

                ultimo_usuario = next(
                    (
                        m["contenido"]
                        for m in reversed(historial)
                        if m["rol"] == "user"
                    ),
                    ""
                )

                ultima_respuesta = next(
                    (
                        m["contenido"]
                        for m in reversed(historial)
                        if m["rol"] == "assistant"
                    ),
                    ""
                )

                pregunta_busqueda = (
                    f"Conversacion anterior:\n"
                    f"Usuario: {ultimo_usuario}\n"
                    f"Azmuth: {ultima_respuesta[:500]}\n\n"
                    f"Pregunta actual: {pregunta}"
                )

            documentos = buscar_documentos(
                pregunta_busqueda,
                limite=3
            )

            contexto = "\n\n".join(
                f"DOCUMENTO: {doc['titulo']}\n"
                f"FUENTE: {doc['fuente']}\n"
                f"CONTENIDO:\n{doc['contenido'][:1200]}"
                for doc in documentos
            )

            if not contexto:
                contexto = "No hay documentos disponibles."
            # Preparar mensajes para Groq.
            mensajes = [
                {
                    "role": "system",
                    "content": INSTRUCCIONES_AZMUTH
                }
            ]

            for mensaje in historial:
                mensajes.append({
                    "role": mensaje["rol"],
                    "content": mensaje["contenido"][:900]
                })

            mensajes.append({
                "role": "user",
                "content": (
                    "INFORMACION RECUPERADA DE NEON:\n"
                    f"{contexto}\n\n"
                    "PREGUNTA ACTUAL:\n"
                    f"{pregunta}"
                )
            })

            # Estimacion conservadora del presupuesto:
            # bytes UTF-8 + margen para formato de mensajes.
            estimacion_entrada = (
                sum(
                    len(m["content"].encode("utf-8"))
                    for m in mensajes
                )
                + 512
                + 16 * len(mensajes)
            )

            limite_solicitud = servicio[
                "limite_tokens_solicitud"
            ]

            max_salida = min(
                1200,
                limite_solicitud - estimacion_entrada,
                disponibles - estimacion_entrada
            )

            if max_salida < 256:
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "No hay presupuesto suficiente "
                        "para procesar esta pregunta"
                    )
                )

            # Consultar Groq.
            respuesta_ia = client.chat.completions.create(
                model=MODELO,
                messages=mensajes,
                temperature=0.4,
                max_completion_tokens=max_salida
            )

            respuesta = respuesta_ia.choices[0].message.content

            if not respuesta:
                raise HTTPException(
                    status_code=502,
                    detail="La IA no devolvio una respuesta"
                )

            uso = respuesta_ia.usage

            if uso is None:
                raise HTTPException(
                    status_code=502,
                    detail="No se recibieron datos de consumo"
                )

            tokens_entrada = uso.prompt_tokens
            tokens_salida = uso.completion_tokens
            tokens_total = uso.total_tokens

            if tokens_total > disponibles:
                raise HTTPException(
                    status_code=429,
                    detail="La respuesta excedio el presupuesto"
                )

            # Crear conversacion si es nueva.
            if conversacion_id is None:

                cursor.execute("""
                    INSERT INTO conversaciones
                    (usuario_id, servicio_id, titulo)
                    VALUES (%s, %s, %s)
                    RETURNING id
                """, (
                    usuario_id,
                    servicio_id,
                    pregunta[:100]
                ))

                conversacion_id = cursor.fetchone()["id"]

            fuentes = [
                {
                    "documento_id": doc["id"],
                    "titulo": doc["titulo"],
                    "fuente": doc["fuente"],
                    "similitud": round(
                        float(doc["similitud"]), 4
                    )
                }
                for doc in documentos
            ]

            # Guardar pregunta.
            cursor.execute("""
                INSERT INTO mensajes
                (conversacion_id, rol, contenido)
                VALUES (%s, 'user', %s)
            """, (
                conversacion_id,
                pregunta
            ))

            # Guardar respuesta.
            from psycopg.types.json import Jsonb

            cursor.execute("""
                INSERT INTO mensajes
                (conversacion_id, rol, contenido, fuentes)
                VALUES (%s, 'assistant', %s, %s)
            """, (
                conversacion_id,
                respuesta,
                Jsonb(fuentes)
            ))

            # Registrar consumo real.
            cursor.execute("""
                INSERT INTO consumo_tokens
                (
                    usuario_id,
                    servicio_id,
                    conversacion_id,
                    tokens_entrada,
                    tokens_salida
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                usuario_id,
                servicio_id,
                conversacion_id,
                tokens_entrada,
                tokens_salida
            ))

        conexion.commit()

    return {
        "conversacion_id": conversacion_id,
        "respuesta": respuesta,
        "modelo": respuesta_ia.model,
        "fuentes": fuentes,
        "tokens_entrada": tokens_entrada,
        "tokens_salida": tokens_salida,
        "tokens_total": tokens_total,
        "tokens_disponibles": disponibles - tokens_total
    }