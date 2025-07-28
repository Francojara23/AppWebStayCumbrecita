from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from .core.config import settings
from .core.database import check_database_connection, init_database
from .routers import chat, health
from .services.backend_service import backend_service

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Iniciando Stay Chatbot...")
    
    # Verificar conexión a base de datos
    if not await check_database_connection():
        raise Exception("No se pudo conectar a la base de datos")
    
    # Inicializar base de datos
    try:
        await init_database()
    except Exception as e:
        logger.warning(f"Error inicializando base de datos: {e}")
    
    logger.info("✅ Stay Chatbot iniciado correctamente")
    
    yield
    
    # Shutdown
    logger.info("🔄 Cerrando Stay Chatbot...")
    await backend_service.close()
    logger.info("✅ Stay Chatbot cerrado correctamente")

# Crear aplicación FastAPI
app = FastAPI(
    title="Stay Chatbot",
    description="Chatbot inteligente para hospedajes en La Cumbrecita",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(health.router, tags=["health"])

# Endpoint raíz
@app.get("/")
async def root():
    return {
        "message": "Stay Chatbot API",
        "version": "1.0.0",
        "environment": settings.environment,
        "status": "running"
    }

# Manejador de errores global
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Error no manejado: {exc}")
    return HTTPException(
        status_code=500,
        detail="Error interno del servidor"
    ) 