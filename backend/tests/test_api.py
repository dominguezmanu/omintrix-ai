from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_documentacion_disponible():
    respuesta = client.get("/openapi.json")

    assert respuesta.status_code == 200
    assert "paths" in respuesta.json()

def test_rutas_ia_registradas():
    respuesta = client.get("/openapi.json")
    rutas = respuesta.json()["paths"]

    assert "/api/v1/ia/azmuth" in rutas
    assert "/api/v1/ia/selector" in rutas
    assert "/api/v1/ia/diagnostico" in rutas

def test_rutas_administrativas_registradas():
    respuesta = client.get("/openapi.json")
    rutas = respuesta.json()["paths"]

    assert "/api/v1/admin/usuarios" in rutas
    assert "/api/v1/admin/aliens" in rutas
    assert "/api/v1/reportes/resumen" in rutas

def test_administracion_requiere_autenticacion():
    respuesta = client.get("/api/v1/admin/usuarios")

    assert respuesta.status_code in (401, 403)

def test_reportes_requieren_autenticacion():
    respuesta = client.get("/api/v1/reportes/resumen")

    assert respuesta.status_code in (401, 403)