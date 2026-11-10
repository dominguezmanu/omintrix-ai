from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from psycopg.errors import UniqueViolation

from auth import solo_admin
from database import conectar_db


router = APIRouter(
    prefix="/api/v1/admin/aliens",
    tags=["Administracion - Aliens"],
    dependencies=[Depends(solo_admin)]
)


# ==========================================
# MODELOS
# ==========================================

class CrearAlien(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    especie: str | None = None
    planeta: str | None = None
    descripcion: str | None = None
    fortalezas: str | None = None
    debilidades: str | None = None
    imagen_url: str | None = None
    serie_origen: str | None = None


class ActualizarAlien(BaseModel):
    nombre: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )
    especie: str | None = None
    planeta: str | None = None
    descripcion: str | None = None
    fortalezas: str | None = None
    debilidades: str | None = None
    imagen_url: str | None = None
    serie_origen: str | None = None
    activo: bool | None = None


class AsignarHabilidad(BaseModel):
    habilidad_id: int = Field(gt=0)
    nivel: int = Field(ge=1, le=10)


# ==========================================
# LISTAR ALIENS
# ==========================================

@router.get("")
def listar_aliens_admin():

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
                    serie_origen,
                    activo,
                    creado_en
                FROM aliens
                ORDER BY nombre
            """)

            return cursor.fetchall()


# ==========================================
# CREAR ALIEN
# ==========================================

@router.post("", status_code=201)
def crear_alien(datos: CrearAlien):

    valores = datos.model_dump()

    try:
        with conectar_db() as conexion:
            with conexion.cursor() as cursor:

                cursor.execute("""
                    INSERT INTO aliens (
                        nombre,
                        especie,
                        planeta,
                        descripcion,
                        fortalezas,
                        debilidades,
                        imagen_url,
                        serie_origen
                    )
                    VALUES (
                        %(nombre)s,
                        %(especie)s,
                        %(planeta)s,
                        %(descripcion)s,
                        %(fortalezas)s,
                        %(debilidades)s,
                        %(imagen_url)s,
                        %(serie_origen)s
                    )
                    RETURNING *
                """, valores)

                alien = cursor.fetchone()

            conexion.commit()

        return alien

    except UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un alien con ese nombre"
        )


# ==========================================
# CONSULTAR ALIEN
# ==========================================

@router.get("/{alien_id}")
def obtener_alien_admin(alien_id: int):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT *
                FROM aliens
                WHERE id = %s
            """, (alien_id,))

            alien = cursor.fetchone()

            if not alien:
                raise HTTPException(
                    status_code=404,
                    detail="Alien no encontrado"
                )

            cursor.execute("""
                SELECT
                    h.id,
                    h.nombre,
                    h.descripcion,
                    h.categoria,
                    ah.nivel
                FROM alien_habilidades ah
                JOIN habilidades h
                    ON h.id = ah.habilidad_id
                WHERE ah.alien_id = %s
                ORDER BY ah.nivel DESC
            """, (alien_id,))

            alien["habilidades"] = cursor.fetchall()

            return alien


# ==========================================
# ACTUALIZAR ALIEN
# ==========================================

@router.patch("/{alien_id}")
def actualizar_alien(
    alien_id: int,
    datos: ActualizarAlien
):

    cambios = datos.model_dump(exclude_unset=True)

    if not cambios:
        raise HTTPException(
            status_code=400,
            detail="No se enviaron cambios"
        )

    if "nombre" in cambios and cambios["nombre"] is None:
        raise HTTPException(
            status_code=422,
            detail="El nombre no puede ser nulo"
        )

    if "activo" in cambios and cambios["activo"] is None:
        raise HTTPException(
            status_code=422,
            detail="El estado no puede ser nulo"
        )

    # Los campos proceden de un modelo Pydantic
    # con nombres de columnas permitidos.
    columnas = []
    valores = []

    for campo, valor in cambios.items():
        columnas.append(f"{campo} = %s")
        valores.append(valor)

    valores.append(alien_id)

    try:
        with conectar_db() as conexion:
            with conexion.cursor() as cursor:

                cursor.execute(f"""
                    UPDATE aliens
                    SET {', '.join(columnas)}
                    WHERE id = %s
                    RETURNING *
                """, valores)

                alien = cursor.fetchone()

                if not alien:
                    raise HTTPException(
                        status_code=404,
                        detail="Alien no encontrado"
                    )

            conexion.commit()

        return alien

    except UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="Ya existe otro alien con ese nombre"
        )


# ==========================================
# DESACTIVAR ALIEN
# ==========================================

@router.delete("/{alien_id}")
def desactivar_alien(alien_id: int):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                UPDATE aliens
                SET activo = FALSE
                WHERE id = %s
                RETURNING id, nombre, activo
            """, (alien_id,))

            alien = cursor.fetchone()

            if not alien:
                raise HTTPException(
                    status_code=404,
                    detail="Alien no encontrado"
                )

        conexion.commit()

    return {
        "mensaje": "Transformacion desactivada",
        "alien": alien
    }


# ==========================================
# CONSULTAR HABILIDADES
# ==========================================

@router.get("/catalogo/habilidades")
def listar_habilidades():

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    nombre,
                    descripcion,
                    categoria
                FROM habilidades
                ORDER BY nombre
            """)

            return cursor.fetchall()


# ==========================================
# ASIGNAR HABILIDAD
# ==========================================

@router.post("/{alien_id}/habilidades")
def asignar_habilidad(
    alien_id: int,
    datos: AsignarHabilidad
):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                SELECT id
                FROM aliens
                WHERE id = %s
            """, (alien_id,))

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Alien no encontrado"
                )

            cursor.execute("""
                SELECT id
                FROM habilidades
                WHERE id = %s
            """, (datos.habilidad_id,))

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Habilidad no encontrada"
                )

            cursor.execute("""
                INSERT INTO alien_habilidades (
                    alien_id,
                    habilidad_id,
                    nivel
                )
                VALUES (%s, %s, %s)
                ON CONFLICT (alien_id, habilidad_id)
                DO UPDATE SET nivel = EXCLUDED.nivel
                RETURNING *
            """, (
                alien_id,
                datos.habilidad_id,
                datos.nivel
            ))

            relacion = cursor.fetchone()

        conexion.commit()

    return relacion


# ==========================================
# ELIMINAR RELACION DE HABILIDAD
# ==========================================

@router.delete("/{alien_id}/habilidades/{habilidad_id}")
def eliminar_habilidad(
    alien_id: int,
    habilidad_id: int
):

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute("""
                DELETE FROM alien_habilidades
                WHERE alien_id = %s
                  AND habilidad_id = %s
                RETURNING alien_id, habilidad_id
            """, (
                alien_id,
                habilidad_id
            ))

            relacion = cursor.fetchone()

            if not relacion:
                raise HTTPException(
                    status_code=404,
                    detail="Relacion no encontrada"
                )

        conexion.commit()

    return {
        "mensaje": "Habilidad eliminada del alien",
        "relacion": relacion
    }