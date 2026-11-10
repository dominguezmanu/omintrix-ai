import json

from azmuth import client, MODELO
from database import conectar_db


# ==========================================
# HERRAMIENTA 1: BUSCAR ALIENS
# ==========================================

def buscar_aliens(criterio: str):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    a.id,
                    a.nombre,
                    a.especie,
                    a.descripcion,
                    a.fortalezas,
                    a.debilidades,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'habilidad', h.nombre,
                                'nivel', ah.nivel
                            )
                        ) FILTER (
                            WHERE h.id IS NOT NULL
                        ),
                        '[]'
                    ) AS habilidades
                FROM aliens a
                LEFT JOIN alien_habilidades ah
                    ON ah.alien_id = a.id
                LEFT JOIN habilidades h
                    ON h.id = ah.habilidad_id
                WHERE a.activo = TRUE
                  AND (
                    %s = ''
                    OR a.nombre ILIKE %s
                    OR a.descripcion ILIKE %s
                    OR a.fortalezas ILIKE %s
                    OR h.nombre ILIKE %s
                  )
                GROUP BY a.id
                ORDER BY a.nombre
                LIMIT 20
            """, (
                criterio,
                f"%{criterio}%",
                f"%{criterio}%",
                f"%{criterio}%",
                f"%{criterio}%"
            ))

            return cursor.fetchall()

# ==========================================
# HERRAMIENTA 2: CONSULTAR ALIEN
# ==========================================

def consultar_alien(nombre: str):

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
                    debilidades
                FROM aliens
                WHERE nombre ILIKE %s
                  AND activo = TRUE
                LIMIT 1
            """, (nombre,))

            alien = cursor.fetchone()

            if not alien:
                return {
                    "error": "Alien no encontrado"
                }

            cursor.execute("""
                SELECT
                    h.nombre,
                    h.descripcion,
                    ah.nivel
                FROM alien_habilidades ah
                JOIN habilidades h
                    ON h.id = ah.habilidad_id
                WHERE ah.alien_id = %s
                ORDER BY ah.nivel DESC
            """, (alien["id"],))

            alien["habilidades"] = cursor.fetchall()

            return alien


# ==========================================
# DEFINICION DE HERRAMIENTAS PARA GROQ
# ==========================================

HERRAMIENTAS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_aliens",
            "description": (
                "Busca aliens en la base de datos "
                "por nombre, habilidad o característica. "
                "Usa un término corto. Si quieres explorar "
                "todos los aliens, utiliza una cadena vacía."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "criterio": {
                        "type": "string",
                        "description": "Término de búsqueda"
                    }
                },
                "required": ["criterio"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_alien",
            "description": (
                "Obtiene información detallada de un alien, "
                "incluyendo habilidades y niveles."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {
                        "type": "string",
                        "description": "Nombre exacto del alien"
                    }
                },
                "required": ["nombre"]
            }
        }
    }
]


# ==========================================
# AGENTE SELECTOR OMNITRIX
# ==========================================

INSTRUCCIONES = """
Eres el Selector Inteligente del Omnitrix.

Tu función es recomendar transformaciones para
resolver escenarios del universo Ben 10.

PROCEDIMIENTO:
1. Analiza el problema del usuario.
2. Identifica qué capacidades necesita.
3. Utiliza buscar_aliens para encontrar candidatos.
4. Si la búsqueda no encuentra suficientes candidatos,
   consulta el catálogo completo con criterio vacío.
5. Utiliza consultar_alien para investigar los
   candidatos más apropiados.
6. Compara sus habilidades y debilidades.
7. Recomienda la mejor transformación.

REGLAS:
- Debes consultar las herramientas antes de recomendar.
- No inventes habilidades.
- Utiliza únicamente aliens registrados en la BD.
- Prioriza la seguridad del escenario.
- Explica las limitaciones de tu recomendación.
- Responde siempre en español.
- No ejecutes herramientas innecesarias.

OPTIMIZACION:
- Utiliza buscar_aliens con criterio vacío para obtener
  el catálogo y sus habilidades en una sola consulta.
- Analiza los candidatos utilizando esa información.
- No necesitas consultar individualmente cada alien
  si sus habilidades ya están disponibles.
- Prioriza una recomendación fundamentada.
- No inventes capacidades que no estén documentadas.
- Si una capacidad es una inferencia, indícalo.
- Evita explicaciones excesivamente largas.
- Responde en español.

FORMATO DE RESPUESTA:
Transformación recomendada:
Motivo:
Habilidades útiles:
Riesgos o debilidades:
Alternativas:
"""


def ejecutar_selector(
    escenario: str,
    presupuesto_tokens: int = 8192
):

    mensajes = [
        {
            "role": "system",
            "content": INSTRUCCIONES
        },
        {
            "role": "user",
            "content": escenario
        }
    ]

    herramientas_ejecutadas = []

    tokens_entrada = 0
    tokens_salida = 0
    tokens_consumidos = 0

    funciones = {
        "buscar_aliens": buscar_aliens,
        "consultar_alien": consultar_alien
    }

    for paso in range(3):

        # Calcular el presupuesto restante.
        restantes = presupuesto_tokens - tokens_consumidos

        # Estimación conservadora de tokens de entrada.
        # No sustituye al conteo real del proveedor.
        estimacion_entrada = (
            sum(
                len(str(m).encode("utf-8"))
                for m in mensajes
            )
            + 512
        )

        max_salida = min(
            1600,
            restantes - estimacion_entrada
        )

        if max_salida < 256:
            raise RuntimeError(
                "Presupuesto de tokens insuficiente "
                "para continuar el análisis"
            )

        parametros = {
            "model": MODELO,
            "messages": mensajes,
            "temperature": 0.3,
            "max_completion_tokens": max_salida
        }

        if paso == 0:
            parametros["tools"] = HERRAMIENTAS
            parametros["tool_choice"] = "required"

        respuesta = client.chat.completions.create(
            **parametros
        )

        if respuesta.usage:

            tokens_entrada += respuesta.usage.prompt_tokens
            tokens_salida += respuesta.usage.completion_tokens

            tokens_consumidos = (
                tokens_entrada + tokens_salida
            )

        mensaje = respuesta.choices[0].message

        # Si la IA solicita herramientas
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

                if nombre not in funciones:
                    resultado = {
                        "error": "Herramienta no disponible"
                    }
                else:
                    try:
                        argumentos = json.loads(
                            llamada.function.arguments
                        )

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

        # Respuesta final
        if mensaje.content:

            if not herramientas_ejecutadas:
                raise RuntimeError(
                    "El agente no consulto ninguna herramienta"
                )

            return {
                "servicio": "Selector Omnitrix",
                "escenario": escenario,
                "recomendacion": mensaje.content,
                "herramientas_ejecutadas": herramientas_ejecutadas,
                "tokens_entrada": tokens_entrada,
                "tokens_salida": tokens_salida,
                "tokens_total": tokens_entrada + tokens_salida
            }

    raise RuntimeError(
        "El agente supero el limite de pasos"
    )