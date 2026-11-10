from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import solo_admin
from database import conectar_db


router = APIRouter(
    prefix="/api/v1/reportes",
    tags=["Reportes"],
    dependencies=[Depends(solo_admin)]
)


# ==========================================
# CONFIGURACIÓN DE FILTROS
# ==========================================

def columna_fecha(cursor):
    """
    Detecta el campo de fecha de consumo_tokens.
    Esto permite trabajar con distintas versiones
    del esquema sin inventar nombres de columnas.
    """

    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'consumo_tokens'
    """)

    columnas = {
        fila["column_name"]
        for fila in cursor.fetchall()
    }

    permitidas = (
        "creado_en",
        "fecha",
        "fecha_consumo",
        "fecha_registro",
        "created_at"
    )

    for nombre in permitidas:
        if nombre in columnas:
            return nombre

    raise HTTPException(
        status_code=500,
        detail=(
            "No se encontró una columna de fecha "
            "compatible en consumo_tokens."
        )
    )


def construir_filtros(
    usuario_id,
    servicio_id,
    fecha_inicio,
    fecha_fin,
    columna
):
    condiciones = []
    parametros = []

    if fecha_inicio and fecha_fin:
        if fecha_inicio > fecha_fin:
            raise HTTPException(
                status_code=422,
                detail="La fecha inicial no puede superar la final"
            )

    if usuario_id is not None:
        condiciones.append("c.usuario_id = %s")
        parametros.append(usuario_id)

    if servicio_id is not None:
        condiciones.append("c.servicio_id = %s")
        parametros.append(servicio_id)

    if fecha_inicio:
        condiciones.append(f"c.{columna} >= %s")
        parametros.append(fecha_inicio)

    if fecha_fin:
        condiciones.append(f"c.{columna} < %s")
        parametros.append(fecha_fin + timedelta(days=1))

    where = (
        "WHERE " + " AND ".join(condiciones)
        if condiciones else ""
    )

    return where, parametros


# ==========================================
# CONSULTA CENTRAL
# ==========================================

def consultar_consumo(
    usuario_id=None,
    servicio_id=None,
    fecha_inicio=None,
    fecha_fin=None
):
    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            fecha = columna_fecha(cursor)

            where, parametros = construir_filtros(
                usuario_id,
                servicio_id,
                fecha_inicio,
                fecha_fin,
                fecha
            )

            cursor.execute(f"""
                SELECT
                    c.usuario_id,
                    u.nombre AS usuario,
                    c.servicio_id,
                    s.nombre AS servicio,
                    c.tokens_entrada,
                    c.tokens_salida,
                    c.tokens_total,
                    c.{fecha} AS fecha
                FROM consumo_tokens c
                JOIN usuarios u
                    ON u.id = c.usuario_id
                JOIN servicios_ia s
                    ON s.id = c.servicio_id
                {where}
                ORDER BY c.{fecha} DESC
            """, parametros)

            return cursor.fetchall()


# ==========================================
# RESUMEN GENERAL
# ==========================================

@router.get("/resumen")
def resumen_general(
    usuario_id: int | None = Query(default=None, gt=0),
    servicio_id: int | None = Query(default=None, gt=0),
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None
):
    registros = consultar_consumo(
        usuario_id,
        servicio_id,
        fecha_inicio,
        fecha_fin
    )

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    COUNT(*) AS total_usuarios,
                    COUNT(*) FILTER (
                        WHERE activo = TRUE
                    ) AS usuarios_activos
                FROM usuarios
            """)
            usuarios = cursor.fetchone()

            cursor.execute("""
                SELECT
                    COUNT(*) AS total_servicios,
                    COUNT(*) FILTER (
                        WHERE activo = TRUE
                    ) AS servicios_activos
                FROM servicios_ia
            """)
            servicios = cursor.fetchone()

    return {
        **usuarios,
        **servicios,
        "total_consultas": len(registros),
        "tokens_entrada": sum(
            int(r["tokens_entrada"]) for r in registros
        ),
        "tokens_salida": sum(
            int(r["tokens_salida"]) for r in registros
        ),
        "tokens_total": sum(
            int(r["tokens_total"]) for r in registros
        ),
        "usuarios_con_actividad": len({
            r["usuario_id"] for r in registros
        }),
        "servicios_utilizados": len({
            r["servicio_id"] for r in registros
        })
    }


# ==========================================
# CONSUMO POR USUARIO
# ==========================================

@router.get("/usuarios")
def reporte_usuarios(
    usuario_id: int | None = Query(default=None, gt=0),
    servicio_id: int | None = Query(default=None, gt=0),
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None
):
    registros = consultar_consumo(
        usuario_id,
        servicio_id,
        fecha_inicio,
        fecha_fin
    )

    agrupados = {}

    for registro in registros:
        clave = registro["usuario_id"]

        if clave not in agrupados:
            agrupados[clave] = {
                "usuario_id": clave,
                "usuario": registro["usuario"],
                "consultas": 0,
                "tokens_entrada": 0,
                "tokens_salida": 0,
                "tokens_total": 0
            }

        agrupados[clave]["consultas"] += 1

        for campo in (
            "tokens_entrada",
            "tokens_salida",
            "tokens_total"
        ):
            agrupados[clave][campo] += int(registro[campo])

    return sorted(
        agrupados.values(),
        key=lambda x: x["tokens_total"],
        reverse=True
    )


# ==========================================
# CONSUMO POR SERVICIO
# ==========================================

@router.get("/servicios")
def reporte_servicios(
    usuario_id: int | None = Query(default=None, gt=0),
    servicio_id: int | None = Query(default=None, gt=0),
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None
):
    registros = consultar_consumo(
        usuario_id,
        servicio_id,
        fecha_inicio,
        fecha_fin
    )

    agrupados = {}

    for registro in registros:
        clave = registro["servicio_id"]

        if clave not in agrupados:
            agrupados[clave] = {
                "servicio_id": clave,
                "servicio": registro["servicio"],
                "consultas": 0,
                "tokens_entrada": 0,
                "tokens_salida": 0,
                "tokens_total": 0
            }

        agrupados[clave]["consultas"] += 1

        for campo in (
            "tokens_entrada",
            "tokens_salida",
            "tokens_total"
        ):
            agrupados[clave][campo] += int(registro[campo])

    return sorted(
        agrupados.values(),
        key=lambda x: x["tokens_total"],
        reverse=True
    )


# ==========================================
# ACTIVIDAD DIARIA
# ==========================================

@router.get("/diario")
def reporte_diario(
    usuario_id: int | None = Query(default=None, gt=0),
    servicio_id: int | None = Query(default=None, gt=0),
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None
):
    registros = consultar_consumo(
        usuario_id,
        servicio_id,
        fecha_inicio,
        fecha_fin
    )

    agrupados = {}

    for registro in registros:
        fecha = registro["fecha"].date().isoformat()

        if fecha not in agrupados:
            agrupados[fecha] = {
                "fecha": fecha,
                "consultas": 0,
                "tokens_entrada": 0,
                "tokens_salida": 0,
                "tokens_total": 0
            }

        agrupados[fecha]["consultas"] += 1

        for campo in (
            "tokens_entrada",
            "tokens_salida",
            "tokens_total"
        ):
            agrupados[fecha][campo] += int(registro[campo])

    return sorted(
        agrupados.values(),
        key=lambda x: x["fecha"]
    )


# ==========================================
# DETALLE PARA POWER BI
# ==========================================

@router.get("/detalle")
def reporte_detalle(
    usuario_id: int | None = Query(default=None, gt=0),
    servicio_id: int | None = Query(default=None, gt=0),
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None
):
    return consultar_consumo(
        usuario_id,
        servicio_id,
        fecha_inicio,
        fecha_fin
    )