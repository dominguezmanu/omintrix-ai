from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from auth import solo_admin
from database import conectar_db
from pwdlib import PasswordHash
from psycopg.errors import UniqueViolation

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Administracion"],
    dependencies=[Depends(solo_admin)]
)
password_hash = PasswordHash.recommended()

# ==========================================
# MODELOS
# ==========================================

class ActualizarUsuario(BaseModel):
    nombre: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )
    rol: str | None = None
    activo: bool | None = None
    limite_tokens: int | None = Field(
        default=None,
        ge=0
    )

class CrearUsuario(BaseModel):
    nombre: str = Field(
        min_length=2,
        max_length=100
    )

    correo: str = Field(
        min_length=5,
        max_length=150
    )

    password: str = Field(
        min_length=8,
        max_length=128
    )

    rol: str = "usuario"

    limite_tokens: int = Field(
        default=100000,
        ge=0
    )

class ActualizarServicio(BaseModel):
    activo: bool | None = None
    limite_tokens_solicitud: int | None = Field(
        default=None,
        ge=256,
        le=100000
    )


# ==========================================
# CONSULTAR USUARIOS
# ==========================================

@router.get("/usuarios")
def listar_usuarios():

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    u.id,
                    u.nombre,
                    u.correo,
                    u.rol,
                    u.activo,
                    u.limite_tokens,
                    u.creado_en,
                    COALESCE(
                        SUM(c.tokens_total), 0
                    ) AS tokens_consumidos
                FROM usuarios u
                LEFT JOIN consumo_tokens c
                    ON c.usuario_id = u.id
                GROUP BY u.id
                ORDER BY u.id
            """)

            return cursor.fetchall()


# ==========================================
# ACTUALIZAR USUARIO
# ==========================================

@router.patch("/usuarios/{usuario_id}")
def actualizar_usuario(
    usuario_id: int,
    datos: ActualizarUsuario,
    administrador: dict = Depends(solo_admin)
):

    cambios = datos.model_dump(exclude_unset=True)

    if not cambios:
        raise HTTPException(
            status_code=400,
            detail="No se enviaron cambios"
        )

    if "rol" in cambios:
        if cambios["rol"] not in ("admin", "usuario"):
            raise HTTPException(
                status_code=422,
                detail="Rol invalido"
            )

    if any(valor is None for valor in cambios.values()):
        raise HTTPException(
            status_code=422,
            detail="Los campos enviados no pueden ser nulos"
        )

    if usuario_id == administrador["id"]:
        if cambios.get("activo") is False:
            raise HTTPException(
                status_code=400,
                detail="No puedes desactivar tu propia cuenta"
            )

        if cambios.get("rol") == "usuario":
            raise HTTPException(
                status_code=400,
                detail="No puedes quitarte tu rol administrativo"
            )

    columnas = []
    valores = []

    for campo, valor in cambios.items():
        columnas.append(f"{campo} = %s")
        valores.append(valor)

    valores.append(usuario_id)

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute(f"""
                UPDATE usuarios
                SET {', '.join(columnas)}
                WHERE id = %s
                RETURNING
                    id, nombre, correo, rol,
                    activo, limite_tokens
            """, valores)

            usuario = cursor.fetchone()

            if not usuario:
                raise HTTPException(
                    status_code=404,
                    detail="Usuario no encontrado"
                )

        conexion.commit()

    return usuario


# ==========================================
# CONSULTAR SERVICIOS IA
# ==========================================

@router.get("/servicios")
def listar_servicios():

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    nombre,
                    descripcion,
                    proveedor,
                    modelo,
                    activo,
                    limite_tokens_solicitud
                FROM servicios_ia
                ORDER BY id
            """)

            return cursor.fetchall()


# ==========================================
# CONFIGURAR SERVICIO IA
# ==========================================

@router.patch("/servicios/{servicio_id}")
def actualizar_servicio(
    servicio_id: int,
    datos: ActualizarServicio
):

    cambios = datos.model_dump(exclude_unset=True)

    if not cambios:
        raise HTTPException(
            status_code=400,
            detail="No se enviaron cambios"
        )

    if any(valor is None for valor in cambios.values()):
        raise HTTPException(
            status_code=422,
            detail="Los campos no pueden ser nulos"
        )

    columnas = []
    valores = []

    for campo, valor in cambios.items():
        columnas.append(f"{campo} = %s")
        valores.append(valor)

    valores.append(servicio_id)

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute(f"""
                UPDATE servicios_ia
                SET {', '.join(columnas)}
                WHERE id = %s
                RETURNING
                    id,
                    nombre,
                    activo,
                    limite_tokens_solicitud
            """, valores)

            servicio = cursor.fetchone()

            if not servicio:
                raise HTTPException(
                    status_code=404,
                    detail="Servicio no encontrado"
                )

        conexion.commit()

    return servicio
# ==========================================
# CREAR USUARIO
# ==========================================

@router.post("/usuarios", status_code=201)
def crear_usuario(datos: CrearUsuario):

    if datos.rol not in ("admin", "usuario"):
        raise HTTPException(
            status_code=422,
            detail="Rol invalido"
        )

    correo = datos.correo.strip().lower()

    if "@" not in correo or correo.startswith("@"):
        raise HTTPException(
            status_code=422,
            detail="Identificador de correo invalido"
        )

    hash_generado = password_hash.hash(datos.password)

    try:
        with conectar_db() as conexion:
            with conexion.cursor() as cursor:

                cursor.execute("""
                    INSERT INTO usuarios (
                        nombre,
                        correo,
                        password_hash,
                        rol,
                        limite_tokens,
                        activo
                    )
                    VALUES (%s, %s, %s, %s, %s, TRUE)
                    RETURNING
                        id,
                        nombre,
                        correo,
                        rol,
                        limite_tokens,
                        activo,
                        creado_en
                """, (
                    datos.nombre.strip(),
                    correo,
                    hash_generado,
                    datos.rol,
                    datos.limite_tokens
                ))

                usuario = cursor.fetchone()

            conexion.commit()

        return usuario

    except UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un usuario con ese correo"
        )