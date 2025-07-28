import asyncio
from typing import Optional, List, Any
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.pool import NullPool
import psycopg2
from .config import settings

# Motor de base de datos asíncrono
async_engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
    poolclass=NullPool,
    echo=settings.debug
)

# Sesión asíncrona
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Motor síncrono para operaciones específicas
sync_engine = create_engine(
    settings.database_url,
    poolclass=NullPool,
    echo=settings.debug
)

# Dependencia para obtener sesión de base de datos
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Funciones de utilidad para vectores
async def execute_vector_query(query: str, params: Optional[List[Any]] = None):
    """Ejecuta consultas vectoriales usando psycopg2 directamente"""
    conn = psycopg2.connect(settings.database_url)
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or [])
            # Solo hacer fetchall() para consultas SELECT
            if query.strip().upper().startswith('SELECT'):
                return cursor.fetchall()
            else:
                # Para INSERT, UPDATE, DELETE - commit y retornar None
                conn.commit()
                return None
    finally:
        conn.close()

async def execute_vector_query_one(query: str, params: Optional[List[Any]] = None):
    """Ejecuta consulta vectorial y retorna un solo resultado"""
    conn = psycopg2.connect(settings.database_url)
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or [])
            return cursor.fetchone()
    finally:
        conn.close()

# Inicialización de la base de datos
async def init_database():
    """Inicializa la base de datos ejecutando los scripts SQL"""
    try:
        # Leer script de inicialización
        with open("sql/init.sql", "r") as f:
            init_script = f.read()
        
        # Ejecutar script
        conn = psycopg2.connect(settings.database_url)
        try:
            with conn.cursor() as cursor:
                cursor.execute(init_script)
                conn.commit()
                print("✅ Base de datos inicializada correctamente")
        finally:
            conn.close()
            
    except Exception as e:
        print(f"❌ Error inicializando base de datos: {e}")
        raise

# Verificar conexión
async def check_database_connection():
    """Verifica que la conexión a la base de datos funcione"""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            result.fetchone()
            print("✅ Conexión a base de datos verificada")
            return True
    except Exception as e:
        print(f"❌ Error de conexión a base de datos: {e}")
        return False 