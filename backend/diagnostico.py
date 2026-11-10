import json

from azmuth import client, MODELO
from database import conectar_db


# ==========================================
# HERRAMIENTA 1: BUSCAR FALLAS
# ==========================================

def buscar_fallas(sintomas: str):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    f.codigo,
                    f.nombre,
                    f.descripcion,
                    f.sintomas,
                    f.causa_probable,
                    f.solucion,
                    f.gravedad,
                    f.fuente,
                    c.nombre AS componente
                FROM fallas_omnitrix f
                LEFT JOIN componentes_omnitrix c
                    ON c.id = f.componente_id
                WHERE f.activo = TRUE
                ORDER BY f.codigo
                LIMIT 20
            """)

            fallas = cursor.fetchall()
            fallas = [
                {
                    "codigo": falla["codigo"],
                    "nombre": falla["nombre"],
                    "sintomas": falla["sintomas"][:200],
                    "causa_probable": falla["causa_probable"][:250],
                    "solucion": falla["solucion"][:250],
                    "gravedad": falla["gravedad"],
                    "componente": falla["componente"]
                }
                for falla in fallas
            ]

    return {
        "sintomas_reportados": sintomas,
        "fallas_conocidas": fallas,
        "total": len(fallas)
    }


# ==========================================
# HERRAMIENTA 2: CONSULTAR COMPONENTE
# ==========================================

def consultar_componente(nombre: str):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    nombre,
                    descripcion,
                    funcion,
                    estado
                FROM componentes_omnitrix
                WHERE nombre ILIKE %s
                LIMIT 1
            """, (nombre,))

            componente = cursor.fetchone()

            if not componente:
                return {
                    "error": "Componente no encontrado"
                }

            cursor.execute("""
                SELECT
                    codigo,
                    nombre,
                    sintomas,
                    causa_probable,
                    solucion,
                    gravedad
                FROM fallas_omnitrix
                WHERE componente_id = %s
                  AND activo = TRUE
                ORDER BY codigo
            """, (componente["id"],))

            componente["fallas_relacionadas"] = (
                cursor.fetchall()
            )

    return componente


# ==========================================
# HERRAMIENTAS DISPONIBLES PARA GROQ
# ==========================================

HERRAMIENTAS_DIAGNOSTICO = [
    {
        "type": "function",
        "function": {
            "name": "buscar_fallas",
            "description": (
                "Consulta el catálogo de fallas conocidas "
                "del Omnitrix, incluyendo síntomas, causas, "
                "gravedad, componentes y soluciones. "
                "Permite comparar las fallas con los "
                "síntomas reportados por el usuario."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sintomas": {
                        "type": "string",
                        "description": (
                            "Descripción de los síntomas "
                            "que presenta el dispositivo"
                        )
                    }
                },
                "required": ["sintomas"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_componente",
            "description": (
                "Consulta la información técnica de "
                "un componente del Omnitrix y sus "
                "fallas relacionadas."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {
                        "type": "string",
                        "description": (
                            "Nombre del componente "
                            "que se desea investigar"
                        )
                    }
                },
                "required": ["nombre"]
            }
        }
    }
]


# ==========================================
# INSTRUCCIONES DEL AGENTE
# ==========================================

INSTRUCCIONES_DIAGNOSTICO = """
Eres el Sistema Inteligente de Diagnóstico del Omnitrix.

Fuiste diseñado para asistir a los portadores del
Omnitrix en la identificación de problemas técnicos.

PERSONALIDAD:
- Eres un sistema tecnológico avanzado.
- Hablas con precisión y profesionalismo.
- Utilizas terminología del universo Ben 10.
- Respondes siempre en español.
- Tu objetivo es ayudar al portador.

PROCEDIMIENTO:
1. Analiza los síntomas del problema.
2. Consulta las fallas almacenadas en la base de datos.
3. Identifica las fallas que coinciden con los síntomas.
4. Consulta componentes cuando sea necesario.
5. Compara las posibles causas.
6. Propón una solución basada en los registros.
7. Indica la gravedad y las recomendaciones.

REGLAS:
- Consulta las herramientas antes de diagnosticar.
- Utiliza únicamente códigos de fallas existentes en Neon.
- Utiliza únicamente componentes registrados en Neon.
- Los procedimientos técnicos deben provenir de la base de datos.
- No inventes comandos, botones, combinaciones de teclas,
  versiones de firmware, archivos ni componentes.
- No inventes valores técnicos, tiempos de reparación,
  porcentajes o parámetros de funcionamiento.
- Puedes explicar las posibles causas, pero debes
  diferenciar las hipótesis de los hechos documentados.
- Si no existe un procedimiento registrado para resolver
  una falla, indica que se requiere información adicional.
- No afirmes que una falla está confirmada únicamente
  porque sus síntomas coinciden.
- Si identificas varias fallas posibles, presenta
  sus códigos y sus respectivos niveles de gravedad.
- No afirmes haber reparado físicamente el Omnitrix.
- Recuerda que el sistema utiliza una simulación técnica
  inspirada en Ben 10, no documentación oficial.
- Responde siempre en español.

FORMATO DE RESPUESTA:

DIAGNÓSTICO DEL OMNITRIX

Problema detectado:
Código de falla:
Componente posiblemente afectado:
Gravedad:
Causa probable:
Procedimiento recomendado:
Observaciones:
"""


# ==========================================
# AGENTE DE DIAGNOSTICO
# ==========================================

def ejecutar_diagnostico(
    problema: str,
    presupuesto_tokens: int = 8192
):

    mensajes = [
        {
            "role": "system",
            "content": INSTRUCCIONES_DIAGNOSTICO
        },
        {
            "role": "user",
            "content": problema
        }
    ]

    funciones = {
        "buscar_fallas": buscar_fallas,
        "consultar_componente": consultar_componente
    }

    herramientas_ejecutadas = []

    tokens_entrada = 0
    tokens_salida = 0

    # Máximo 3 rondas de llamadas al modelo.
    for paso in range(2):

        consumidos = tokens_entrada + tokens_salida
        restantes = presupuesto_tokens - consumidos

        # Estimación conservadora del contexto.
        estimacion_entrada = (
            sum(
                len(
                    json.dumps(
                        mensaje,
                        ensure_ascii=False
                    ).encode("utf-8")
                )
                for mensaje in mensajes
            )
            + 512
)

        max_salida = min(
            1400,
            restantes - estimacion_entrada
        )

        if max_salida < 256:
            raise RuntimeError(
                "Presupuesto insuficiente para "
                "continuar el diagnóstico"
            )

        parametros = {
            "model": MODELO,
            "messages": mensajes,
            "temperature": 0.2,
            "max_completion_tokens": max_salida
        }

        # Primera llamada: consultar herramientas.
        if paso == 0:
          parametros["tools"] = HERRAMIENTAS_DIAGNOSTICO
          parametros["tool_choice"] = {
              "type": "function",
              "function": {
                  "name": "buscar_fallas"
              }
          }

      # En el segundo paso no se ofrecen herramientas.
      # Groq debe generar el diagnóstico con los resultados obtenidos.

        # Última llamada: generar respuesta definitiva.
        # No se ofrecen herramientas en esta ronda.

        respuesta = client.chat.completions.create(
            **parametros
        )

        if respuesta.usage is None:
            raise RuntimeError(
                "Groq no devolvió información de consumo"
            )

        tokens_entrada += respuesta.usage.prompt_tokens
        tokens_salida += respuesta.usage.completion_tokens

        mensaje = respuesta.choices[0].message

        # ==========================================
        # EJECUTAR HERRAMIENTAS
        # ==========================================

        if mensaje.tool_calls:

            llamadas = []

            for llamada in mensaje.tool_calls:

                llamadas.append({
                    "id": llamada.id,
                    "type": "function",
                    "function": {
                        "name": llamada.function.name,
                        "arguments": llamada.function.arguments
                    }
                })

            mensajes.append({
                "role": "assistant",
                "content": mensaje.content,
                "tool_calls": llamadas
            })

            for llamada in mensaje.tool_calls:

                nombre = llamada.function.name

                try:
                    argumentos = json.loads(
                        llamada.function.arguments
                    )

                    if nombre not in funciones:
                        resultado = {
                            "error": "Herramienta no disponible"
                        }
                    else:
                        resultado = funciones[nombre](
                            **argumentos
                        )

                except (ValueError, TypeError):
                    resultado = {
                        "error": "Argumentos invalidos"
                    }

                herramientas_ejecutadas.append({
                    "herramienta": nombre,
                    "argumentos": llamada.function.arguments
                })

                mensajes.append({
                    "role": "tool",
                    "tool_call_id": llamada.id,
                    "content": json.dumps(
                        resultado,
                        ensure_ascii=False,
                        default=str
                    )
                })

            continue

        # ==========================================
        # RESPUESTA FINAL
        # ==========================================

        if mensaje.content:

            if not herramientas_ejecutadas:
                raise RuntimeError(
                    "El agente no consultó Neon"
                )

            return {
                "servicio": "Diagnostico Omnitrix",
                "problema": problema,
                "diagnostico": mensaje.content,
                "herramientas_ejecutadas": herramientas_ejecutadas,
                "modelo": respuesta.model,
                "tokens_entrada": tokens_entrada,
                "tokens_salida": tokens_salida,
                "tokens_total": (
                    tokens_entrada + tokens_salida
                )
            }

    raise RuntimeError(
        "El agente no pudo completar el diagnóstico"
    )