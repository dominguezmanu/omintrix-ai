import os

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

from jwt.exceptions import InvalidTokenError

from dotenv import load_dotenv
from pwdlib import PasswordHash

from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    status
)

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from pydantic import BaseModel

from database import conectar_db

load_dotenv()

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Autenticacion"]
)

password_hash = PasswordHash.recommended()

security = HTTPBearer()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(
    os.getenv("JWT_EXPIRE_MINUTES", "120")
)

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY no configurada")


# ==========================================
# MODELOS
# ==========================================

class LoginRequest(BaseModel):
    correo: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: dict


# ==========================================
# FUNCIONES DE AUTENTICACION
# ==========================================

def verificar_password(
    password: str,
    hashed_password: str
):
    return password_hash.verify(
        password,
        hashed_password
    )


def crear_token(usuario_id: int):

    expiracion = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=JWT_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(usuario_id),
        "exp": expiracion,
        "iat": datetime.now(timezone.utc)
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(security)
):

    token = credenciales.credentials

    error_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalido o expirado",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        usuario_id = int(payload["sub"])

    except (InvalidTokenError, ValueError, KeyError):
        raise error_credenciales

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    nombre,
                    correo,
                    rol,
                    activo,
                    limite_tokens
                FROM usuarios
                WHERE id = %s
            """, (usuario_id,))

            usuario = cursor.fetchone()

    if not usuario or not usuario["activo"]:
        raise error_credenciales

    return usuario


def solo_admin(
    usuario: dict = Depends(obtener_usuario_actual)
):

    if usuario["rol"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acceso exclusivo para administradores"
        )

    return usuario


# ==========================================
# LOGIN
# ==========================================

@router.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    nombre,
                    correo,
                    password_hash,
                    rol,
                    activo,
                    limite_tokens
                FROM usuarios
                WHERE correo = %s
            """, (datos.correo,))

            usuario = cursor.fetchone()

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas"
        )

    if not verificar_password(
        datos.password,
        usuario["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas"
        )

    if not usuario["activo"]:
        raise HTTPException(
            status_code=403,
            detail="Usuario desactivado"
        )

    token = crear_token(usuario["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario["id"],
            "nombre": usuario["nombre"],
            "correo": usuario["correo"],
            "rol": usuario["rol"],
            "limite_tokens": usuario["limite_tokens"]
        }
    }


# ==========================================
# PERFIL
# ==========================================

@router.get("/me")
def mi_perfil(
    usuario: dict = Depends(obtener_usuario_actual)
):
    return usuario


# ==========================================
# PRUEBA DE PERMISOS
# ==========================================

@router.get("/admin/test")
def probar_administrador(
    usuario: dict = Depends(solo_admin)
):

    return {
        "mensaje": "Acceso administrativo autorizado",
        "administrador": usuario["nombre"]
    }