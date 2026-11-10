"""Pruebas aisladas de Omnitrix AI: no hacen llamadas externas a Neon ni Groq."""
from types import SimpleNamespace as NS

import pytest
from fastapi import HTTPException

import chat_service
import consumo
import diagnostico
import selector


def respuesta_groq(texto=None, *, herramienta=None, argumentos='{}', entrada=90, salida=30):
    llamada = None
    if herramienta:
        llamada = [NS(id='call_test', function=NS(name=herramienta, arguments=argumentos))]
    return NS(
        model='modelo-de-pruebas',
        usage=NS(prompt_tokens=entrada, completion_tokens=salida, total_tokens=entrada + salida),
        choices=[NS(message=NS(content=texto, tool_calls=llamada))],
    )


class ClienteFalso:
    def __init__(self, respuestas):
        self.respuestas = iter(respuestas)
        self.llamadas = []
        self.chat = NS(completions=NS(create=self.crear))

    def crear(self, **kwargs):
        self.llamadas.append(kwargs)
        return next(self.respuestas)


def test_selector_utiliza_herramienta_y_suma_tokens(monkeypatch):
    cliente = ClienteFalso([
        respuesta_groq(herramienta='buscar_aliens', argumentos='{"criterio":""}', entrada=100, salida=20),
        respuesta_groq('Recomiendo XLR8 por su velocidad.', entrada=150, salida=50),
    ])
    criterios = []
    monkeypatch.setattr(selector, 'client', cliente)
    monkeypatch.setattr(selector, 'buscar_aliens', lambda criterio: criterios.append(criterio) or [
        {'nombre': 'XLR8', 'fortalezas': 'Velocidad', 'habilidades': []}
    ])

    resultado = selector.ejecutar_selector('Necesito moverme muy rápido', presupuesto_tokens=8192)

    assert criterios == ['']
    assert resultado['tokens_entrada'] == 250
    assert resultado['tokens_salida'] == 70
    assert resultado['tokens_total'] == 320
    assert resultado['herramientas_ejecutadas'][0]['herramienta'] == 'buscar_aliens'
    assert 'XLR8' in resultado['recomendacion']


def test_selector_no_recomienda_sin_consultar_herramientas(monkeypatch):
    monkeypatch.setattr(selector, 'client', ClienteFalso([respuesta_groq('XLR8')]))
    with pytest.raises(RuntimeError, match='no consulto ninguna herramienta'):
        selector.ejecutar_selector('Necesito velocidad')


def test_diagnostico_consulta_fallas_y_suma_tokens(monkeypatch):
    cliente = ClienteFalso([
        respuesta_groq(
            herramienta='buscar_fallas',
            argumentos='{"sintomas":"pantalla parpadea"}',
            entrada=100,
            salida=20
        ),
        respuesta_groq(
            'Posible falla OM-005.',
            entrada=200,
            salida=40
        ),
    ])

    llamadas = []

    def buscar_fallas_falso(sintomas):
        llamadas.append(sintomas)
        return {
            'total': 1,
            'fallas_conocidas': [
                {
                    'codigo': 'OM-005',
                    'nombre': 'Pantalla'
                }
            ]
        }

    monkeypatch.setattr(diagnostico, 'client', cliente)
    monkeypatch.setattr(
        diagnostico,
        'buscar_fallas',
        buscar_fallas_falso
    )

    resultado = diagnostico.ejecutar_diagnostico(
        'Pantalla parpadea',
        presupuesto_tokens=8192
    )

    assert llamadas == ['pantalla parpadea']
    assert resultado['tokens_entrada'] == 300
    assert resultado['tokens_salida'] == 60
    assert resultado['tokens_total'] == 360
    assert resultado['herramientas_ejecutadas'][0]['herramienta'] == 'buscar_fallas'

def test_diagnostico_no_emite_resultado_sin_herramientas(monkeypatch):
    monkeypatch.setattr(diagnostico, 'client', ClienteFalso([respuesta_groq('Diagnóstico')]))
    with pytest.raises(RuntimeError, match='no consultó Neon'):
        diagnostico.ejecutar_diagnostico('Falla de pantalla')


class CursorConsumo:
    def __init__(self, *, limite=1000, consumidos=300, activo=True):
        self.limite = limite
        self.consumidos = consumidos
        self.activo = activo
        self.sql = []
        self.ultima = ''

    def execute(self, sql, params=None):
        self.ultima = sql
        self.sql.append((sql, params))

    def fetchone(self):
        if 'FROM usuarios' in self.ultima:
            return {'id': 1, 'nombre': 'Ben', 'limite_tokens': self.limite}
        if 'FROM servicios_ia' in self.ultima:
            return {'id': 2, 'nombre': 'Selector Omnitrix', 'activo': self.activo, 'limite_tokens_solicitud': 8192}
        if 'SUM(tokens_total)' in self.ultima:
            return {'consumidos': self.consumidos}
        if 'INSERT INTO consumo_tokens' in self.ultima:
            return {'id': 23}
        raise AssertionError('SQL sin respuesta simulada')


def test_presupuesto_tokens_disponibles():
    cursor = CursorConsumo(limite=1000, consumidos=300)
    resultado = consumo.verificar_consumo(cursor, 1, 'Selector Omnitrix', reserva_tokens=650)
    assert resultado['disponibles'] == 700
    assert any('FOR UPDATE' in sql for sql, _ in cursor.sql)


def test_presupuesto_bloquea_saldo_agotado():
    with pytest.raises(HTTPException) as exc:
        consumo.verificar_consumo(CursorConsumo(limite=300, consumidos=300), 1, 'Selector Omnitrix')
    assert exc.value.status_code == 429


def test_presupuesto_bloquea_reserva_excesiva():
    with pytest.raises(HTTPException) as exc:
        consumo.verificar_consumo(CursorConsumo(limite=1000, consumidos=300), 1, 'Selector Omnitrix', reserva_tokens=701)
    assert exc.value.status_code == 429


def test_servicio_inactivo_no_permite_consumo():
    with pytest.raises(HTTPException) as exc:
        consumo.verificar_consumo(CursorConsumo(activo=False), 1, 'Selector Omnitrix')
    assert exc.value.status_code == 503


def test_registro_consumo_guarda_cifras_y_conversacion():
    cursor = CursorConsumo()
    assert consumo.registrar_consumo(cursor, 1, 2, 120, 40, conversacion_id=8) == 23
    sql, parametros = cursor.sql[-1]
    assert 'INSERT INTO consumo_tokens' in sql
    assert parametros == (1, 2, 8, 120, 40)


def test_registro_consumo_rechaza_negativos():
    with pytest.raises(ValueError, match='invalido'):
        consumo.registrar_consumo(CursorConsumo(), 1, 2, -1, 20)


class CursorChat:
    def __init__(self, *, consumidos=100, limite=10000, conversacion_existente=False):
        self.consumidos = consumidos
        self.limite = limite
        self.conversacion_existente = conversacion_existente
        self.ultima = ''
        self.consultas = []

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=None):
        self.ultima = sql
        self.consultas.append((sql, params))

    def fetchone(self):
        sql = self.ultima
        if 'FROM usuarios' in sql:
            return {'id': 1, 'nombre': 'Ben', 'limite_tokens': self.limite}
        if 'FROM servicios_ia' in sql:
            return {'id': 3, 'activo': True, 'limite_tokens_solicitud': 8192}
        if 'SUM(tokens_total)' in sql:
            return {'consumidos': self.consumidos}
        if 'FROM conversaciones' in sql:
            return {'id': 77} if self.conversacion_existente else None
        if 'INSERT INTO conversaciones' in sql:
            return {'id': 77}
        raise AssertionError('SQL sin respuesta simulada: ' + sql[:100])

    def fetchall(self):
        if 'FROM mensajes' in self.ultima:
            return [
                {'rol': 'assistant', 'contenido': 'XLR8 es muy rápido'},
                {'rol': 'user', 'contenido': '¿Quién es el más rápido?'},
            ]
        raise AssertionError('SQL sin lista simulada')


class ConexionChat:
    def __init__(self, cursor):
        self._cursor = cursor
        self.commits = 0

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.commits += 1


def preparar_chat(monkeypatch, *, consumidos=100, limite=10000, conversacion_existente=False):
    cursor = CursorChat(consumidos=consumidos, limite=limite, conversacion_existente=conversacion_existente)
    conexion = ConexionChat(cursor)
    consultas_rag = []
    cliente = ClienteFalso([respuesta_groq('XLR8 es el más rápido', entrada=120, salida=30)])
    monkeypatch.setattr(chat_service, 'conectar_db', lambda: conexion)
    monkeypatch.setattr(chat_service, 'client', cliente)
    monkeypatch.setattr(chat_service, 'buscar_documentos', lambda texto, limite: consultas_rag.append(texto) or [
        {'id': 8, 'titulo': 'XLR8', 'contenido': 'Velocidad', 'fuente': 'Neon', 'similitud': 0.9}
    ])
    return cursor, conexion, cliente, consultas_rag


def test_azmuth_guarda_conversacion_mensajes_fuentes_y_consumo(monkeypatch):
    cursor, conexion, _, _ = preparar_chat(monkeypatch)
    resultado = chat_service.conversar_azmuth(1, '¿Quién corre más rápido?')
    sqls = [sql for sql, _ in cursor.consultas]
    assert resultado['conversacion_id'] == 77
    assert resultado['tokens_total'] == 150
    assert resultado['tokens_disponibles'] == 9750
    assert resultado['fuentes'][0]['titulo'] == 'XLR8'
    assert any('INSERT INTO conversaciones' in sql for sql in sqls)
    assert sum('INSERT INTO mensajes' in sql for sql in sqls) == 2
    assert any('INSERT INTO consumo_tokens' in sql for sql in sqls)
    assert conexion.commits == 1


def test_azmuth_recupera_memoria_de_conversacion(monkeypatch):
    cursor, _, cliente, rag = preparar_chat(monkeypatch, conversacion_existente=True)
    resultado = chat_service.conversar_azmuth(1, '¿Y sus debilidades?', conversacion_id=77)
    assert resultado['conversacion_id'] == 77
    assert 'Conversacion anterior' in rag[0]
    assert 'XLR8 es muy rápido' in rag[0]
    assert any(m['role'] == 'assistant' for m in cliente.llamadas[0]['messages'])
    assert not any('INSERT INTO conversaciones' in sql for sql, _ in cursor.consultas)


def test_azmuth_no_gasta_tokens_con_saldo_agotado(monkeypatch):
    _, _, cliente, _ = preparar_chat(monkeypatch, consumidos=10000, limite=10000)
    with pytest.raises(HTTPException) as exc:
        chat_service.conversar_azmuth(1, '¿Qué es XLR8?')
    assert exc.value.status_code == 429
    assert cliente.llamadas == []


def test_azmuth_rechaza_historial_ajeno(monkeypatch):
    _, _, cliente, _ = preparar_chat(monkeypatch, conversacion_existente=False)
    with pytest.raises(HTTPException) as exc:
        chat_service.conversar_azmuth(1, 'Hola', conversacion_id=77)
    assert exc.value.status_code == 404
    assert cliente.llamadas == []
