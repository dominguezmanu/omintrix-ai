import os

from database import conectar_db
from fastapi import FastAPI, HTTPException

from pydantic import BaseModel, Field
from azmuth import hablar_con_azmuth
from groq import GroqError
from fastapi import Depends
from chat_service import conversar_azmuth
from fastapi import Depends
from auth import obtener_usuario_actual
from groq import GroqError
from selector import ejecutar_selector
from consumo import verificar_consumo, registrar_consumo

from auth import router as auth_router, obtener_usuario_actual
from diagnostico import ejecutar_diagnostico
from consumo import verificar_consumo, registrar_consumo
from psycopg.types.json import Jsonb
from fastapi.middleware.cors import CORSMiddleware
from admin import router as admin_router
from admin_aliens import router as admin_aliens_router
from reportes import router as reportes_router
    
app = FastAPI(
    title="Omnitrix AI API",
    description="Sistema inteligente del universo Ben 10",
    version="1.0.0",
)
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"]
)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(admin_aliens_router)
app.include_router(reportes_router)
DATABASE_URL = os.getenv("DATABASE_URL")


@app.get("/")
def inicio():
    return {
        "proyecto": "Omnitrix AI",
        "estado": "activo",
        "mensaje": "Sistema Omnitrix en linea",
    }


@app.get("/health")
def health():
    try:
        with conectar_db() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute("SELECT 1 AS resultado")
                cursor.fetchone()

        return {"api": "activa", "database": "conectada"}

    except Exception:
        raise HTTPException(
            status_code=503, detail="No se pudo conectar a la base de datos"
        )


@app.get("/api/v1/aliens")
def listar_aliens():
    with conectar_db() as conexion:
        with conexion.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id,
                    nombre,
                    especie,
                    planeta,
                    descripcion,
                    fortalezas,
                    debilidades,
                    imagen_url,
                    serie_origen
                FROM aliens
                WHERE activo = TRUE
                ORDER BY nombre
            """)

            return cursor.fetchall()


@app.get("/api/v1/aliens/{alien_id}")
def obtener_alien(alien_id: int):
    with conectar_db() as conexion:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM aliens
                WHERE id = %s AND activo = TRUE
            """,
                (alien_id,),
            )

            alien = cursor.fetchone()

            if not alien:
                raise HTTPException(status_code=404, detail="Alien no encontrado")

            cursor.execute(
                """
                SELECT h.nombre, h.descripcion, ah.nivel
                FROM alien_habilidades ah
                JOIN habilidades h
                    ON h.id = ah.habilidad_id
                WHERE ah.alien_id = %s
                ORDER BY ah.nivel DESC
            """,
                (alien_id,),
            )

            alien["habilidades"] = cursor.fetchall()

            return alien


class PreguntaAzmuth(BaseModel):
    pregunta: str = Field(..., min_length=3, max_length=2000)

    conversacion_id: int | None = Field(default=None, gt=0)


@app.post("/api/v1/ia/azmuth")
def consultar_azmuth(
    datos: PreguntaAzmuth, usuario: dict = Depends(obtener_usuario_actual)
):

    try:
        resultado = conversar_azmuth(
            usuario_id=usuario["id"],
            pregunta=datos.pregunta,
            conversacion_id=datos.conversacion_id,
        )

        return {"servicio": "Azmuth AI", "usuario": usuario["nombre"], **resultado}

    except GroqError:
        raise HTTPException(status_code=502, detail="Error de comunicacion con Groq")


@app.get("/api/v1/conversaciones")
def listar_conversaciones(usuario: dict = Depends(obtener_usuario_actual)):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    c.id,
                    c.titulo,
                    c.creada_en,
                    s.nombre AS servicio
                FROM conversaciones c
                JOIN servicios_ia s
                    ON s.id = c.servicio_id
                WHERE c.usuario_id = %s
                ORDER BY c.creada_en DESC, c.id DESC
            """,
                (usuario["id"],),
            )

            return cursor.fetchall()


@app.get("/api/v1/conversaciones/{conversacion_id}")
def obtener_conversacion(
    conversacion_id: int, usuario: dict = Depends(obtener_usuario_actual)
):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute(
                """
                SELECT id, titulo, creada_en
                FROM conversaciones
                WHERE id = %s AND usuario_id = %s
            """,
                (conversacion_id, usuario["id"]),
            )

            conversacion = cursor.fetchone()

            if not conversacion:
                raise HTTPException(
                    status_code=404, detail="Conversacion no encontrada"
                )

            cursor.execute(
                """
                SELECT
                    id,
                    rol,
                    contenido,
                    fuentes,
                    creado_en
                FROM mensajes
                WHERE conversacion_id = %s
                ORDER BY creado_en, id
            """,
                (conversacion_id,),
            )

            conversacion["mensajes"] = cursor.fetchall()

            return conversacion


@app.get("/api/v1/consumo")
def consultar_consumo(usuario: dict = Depends(obtener_usuario_actual)):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(tokens_entrada), 0)
                        AS tokens_entrada,
                    COALESCE(SUM(tokens_salida), 0)
                        AS tokens_salida,
                    COALESCE(SUM(tokens_total), 0)
                        AS tokens_consumidos,
                    COUNT(*) AS solicitudes
                FROM consumo_tokens
                WHERE usuario_id = %s
            """,
                (usuario["id"],),
            )

            consumo = cursor.fetchone()

    consumo["limite_tokens"] = usuario["limite_tokens"]

    consumo["tokens_disponibles"] = (
        usuario["limite_tokens"] - consumo["tokens_consumidos"]
    )

    return consumo

class EscenarioSelector(BaseModel):
    escenario: str = Field(
        ...,
        min_length=10,
        max_length=3000
    )

@app.post("/api/v1/ia/selector")
def consultar_selector(
    datos: EscenarioSelector,
    usuario: dict = Depends(obtener_usuario_actual)
):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            control = verificar_consumo(
                cursor,
                usuario["id"],
                "Selector Omnitrix",
                reserva_tokens=8192
            )

            servicio = control["servicio"]
            disponibles = control["disponibles"]

            # Ejecutar agente.
            resultado = ejecutar_selector(
                escenario=datos.escenario,
                presupuesto_tokens=min(
                    disponibles,
                    servicio["limite_tokens_solicitud"]
                )
            )

            tokens_entrada = resultado["tokens_entrada"]
            tokens_salida = resultado["tokens_salida"]
            tokens_total = resultado["tokens_total"]

            # Comprobar el consumo real.
            if tokens_total > disponibles:
                # No devolvemos la respuesta si excede el saldo.
                # Esta verificación aún no evita el consumo
                # externo realizado por Groq.
                raise HTTPException(
                    status_code=429,
                    detail="La solicitud supero el saldo disponible"
                )

            # Registrar consumo.
            registrar_consumo(
                cursor=cursor,
                usuario_id=usuario["id"],
                servicio_id=servicio["id"],
                tokens_entrada=tokens_entrada,
                tokens_salida=tokens_salida
            )

        conexion.commit()

    return {
        "usuario": usuario["nombre"],
        **resultado,
        "tokens_disponibles": disponibles - tokens_total
    }
# ==========================================
# DIAGNOSTICO INTELIGENTE DEL OMNITRIX
# ==========================================

class SolicitudDiagnostico(BaseModel):
    problema: str = Field(
        ...,
        min_length=10,
        max_length=3000,
        description="Problema que presenta el Omnitrix"
    )


@app.post("/api/v1/ia/diagnostico")
def consultar_diagnostico(
    datos: SolicitudDiagnostico,
    usuario: dict = Depends(obtener_usuario_actual)
):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            # 1. Verificar usuario, servicio y saldo.
            control = verificar_consumo(
                cursor,
                usuario["id"],
                "Diagnostico Omnitrix",
                reserva_tokens=8192
            )

            servicio = control["servicio"]
            disponibles = control["disponibles"]

            presupuesto = min(
                disponibles,
                servicio["limite_tokens_solicitud"]
            )

            # 2. Ejecutar agente.
            resultado = ejecutar_diagnostico(
                problema=datos.problema,
                presupuesto_tokens=presupuesto
            )

            tokens_entrada = resultado["tokens_entrada"]
            tokens_salida = resultado["tokens_salida"]
            tokens_total = resultado["tokens_total"]

            # 3. Verificar consumo reportado.
            if tokens_total > disponibles:
                raise HTTPException(
                    status_code=429,
                    detail="La solicitud excedio el saldo disponible"
                )

            # 4. Guardar diagnostico.
            cursor.execute("""
                INSERT INTO diagnosticos (
                    usuario_id,
                    problema,
                    causa_probable,
                    solucion,
                    estado
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                usuario["id"],
                datos.problema,
                "Analisis realizado por el agente de IA",
                resultado["diagnostico"],
                "analizado"
            ))

            diagnostico_id = cursor.fetchone()["id"]

            # 5. Registrar consumo.
            registrar_consumo(
                cursor=cursor,
                usuario_id=usuario["id"],
                servicio_id=servicio["id"],
                tokens_entrada=tokens_entrada,
                tokens_salida=tokens_salida
            )

        conexion.commit()

    return {
        "diagnostico_id": diagnostico_id,
        "usuario": usuario["nombre"],
        **resultado,
        "tokens_disponibles": disponibles - tokens_total
    }