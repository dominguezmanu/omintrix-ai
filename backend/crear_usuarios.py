from getpass import getpass

from pwdlib import PasswordHash
from database import conectar_db

password_hash = PasswordHash.recommended()

usuarios = [
    {
        "nombre": "Ben Tennyson",
        "correo": "ben@omnitrix.local",
        "rol": "admin"
    },
    {
        "nombre": "Gwen Tennyson",
        "correo": "gwen@omnitrix.local",
        "rol": "usuario"
    },
    {
        "nombre": "Max Tennyson",
        "correo": "max@omnitrix.local",
        "rol": "usuario"
    }
]

with conectar_db() as conexion:

    with conexion.cursor() as cursor:

        for usuario in usuarios:

            cursor.execute(
                "SELECT id FROM usuarios WHERE correo = %s",
                (usuario["correo"],)
            )

            if cursor.fetchone():
                print(
                    f"El usuario {usuario['nombre']} ya existe."
                )
                continue

            print(f"\nCreando usuario: {usuario['nombre']}")

            while True:
                password = getpass("Contraseña: ")
                confirmacion = getpass("Confirmar contraseña: ")

                if len(password) < 8:
                    print("La contraseña debe tener al menos 8 caracteres.")
                    continue

                if password != confirmacion:
                    print("Las contraseñas no coinciden.")
                    continue

                break

            hash_generado = password_hash.hash(password)

            cursor.execute("""
                INSERT INTO usuarios
                (nombre, correo, password_hash, rol, limite_tokens)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                usuario["nombre"],
                usuario["correo"],
                hash_generado,
                usuario["rol"],
                100000
            ))

            print(f"Usuario {usuario['nombre']} creado correctamente.")

    conexion.commit()

print("\nUsuarios del Omnitrix configurados.")