import os

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def conectar_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL no configurada")

    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row
    )