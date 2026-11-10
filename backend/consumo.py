from fastapi import HTTPException


def obtener_servicio(cursor, nombre_servicio: str):

    cursor.execute("""
        SELECT
            id,
            nombre,
            activo,
            limite_tokens_solicitud
        FROM servicios_ia
        WHERE nombre = %s
    """, (nombre_servicio,))

    servicio = cursor.fetchone()

    if not servicio or not servicio["activo"]:
        raise HTTPException(
            status_code=503,
            detail="Servicio de IA no disponible"
        )

    return servicio


def verificar_consumo(
    cursor,
    usuario_id: int,
    nombre_servicio: str,
    reserva_tokens: int = 0
):

    # Bloquea la fila del usuario durante la transacción.
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

    servicio = obtener_servicio(
        cursor,
        nombre_servicio
    )

    cursor.execute("""
        SELECT COALESCE(SUM(tokens_total), 0)
            AS consumidos
        FROM consumo_tokens
        WHERE usuario_id = %s
    """, (usuario_id,))

    consumidos = cursor.fetchone()["consumidos"]

    disponibles = usuario["limite_tokens"] - consumidos

    if disponibles <= 0:
        raise HTTPException(
            status_code=429,
            detail="Has agotado tus tokens disponibles"
        )

    if disponibles < reserva_tokens:
        raise HTTPException(
            status_code=429,
            detail="Saldo insuficiente para ejecutar este servicio"
        )

    return {
        "usuario": usuario,
        "servicio": servicio,
        "disponibles": disponibles
    }


def registrar_consumo(
    cursor,
    usuario_id: int,
    servicio_id: int,
    tokens_entrada: int,
    tokens_salida: int,
    conversacion_id: int | None = None
):

    if tokens_entrada < 0 or tokens_salida < 0:
        raise ValueError("Consumo de tokens invalido")

    cursor.execute("""
        INSERT INTO consumo_tokens (
            usuario_id,
            servicio_id,
            conversacion_id,
            tokens_entrada,
            tokens_salida
        )
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """, (
        usuario_id,
        servicio_id,
        conversacion_id,
        tokens_entrada,
        tokens_salida
    ))

    return cursor.fetchone()["id"]