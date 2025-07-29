import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Base de datos - usando variables individuales como en el env.example
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: str = os.getenv("DB_PORT", "5432")
    db_username: str = os.getenv("DB_USERNAME", "adminCumbrecita")
    db_password: str = os.getenv("DB_PASSWORD", "123456")
    db_database: str = os.getenv("DB_DATABASE", "StayAtCumbrecita")
    
    # Construir URL de base de datos
    @property
    def database_url(self) -> str:
        return f"postgresql://{self.db_username}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_database}"
    
    # Credenciales de encriptación (del env.example)
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "")
    encryption_iv: str = os.getenv("ENCRYPTION_IV", "")
    salt_rounds: int = int(os.getenv("SALT_ROUNDS", "8"))
    secret_pepper: str = os.getenv("SECRET_PEPPER", "")
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    
    # Backend API
    backend_url: str = os.getenv("BACKEND_URL", "http://backend:5001")
    
    # Cloudinary (para descargar PDFs privados)
    cloudinary_cloud_name: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    cloudinary_api_key: str = os.getenv("CLOUDINARY_API_KEY", "")
    cloudinary_api_secret: str = os.getenv("CLOUDINARY_API_SECRET", "")
    
    # Frontend URL (para generar enlaces de checkout)
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Configuración del chatbot
    max_tokens: int = int(os.getenv("MAX_TOKENS", "500"))
    temperature: float = float(os.getenv("TEMPERATURE", "0.3"))
    max_context_length: int = int(os.getenv("MAX_CONTEXT_LENGTH", "4000"))
    
    # Configuración de la aplicación
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = environment == "development"
    
    # Configuración de vectores
    vector_dimensions: int = 1536  # Para text-embedding-3-small
    similarity_threshold: float = 0.3
    max_chunks_per_query: int = 4
    
    # Configuración de historial
    max_history_months: int = 6
    max_history_results: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Instancia global de configuración
settings = Settings()

# Validación de configuración crítica
def validate_settings():
    """Valida que las configuraciones críticas estén presentes"""
    errors = []
    
    if not settings.openai_api_key or settings.openai_api_key == "sk-tu-openai-api-key-aqui":
        errors.append("OPENAI_API_KEY es requerida y debe ser válida")
    
    if not settings.database_url:
        errors.append("DATABASE_URL no pudo ser construida")
    
    if not settings.backend_url:
        errors.append("BACKEND_URL es requerida")
    
    if not settings.cloudinary_cloud_name or not settings.cloudinary_api_key or not settings.cloudinary_api_secret:
        errors.append("Credenciales de Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) son requeridas")
    
    if errors:
        print("❌ Errores de configuración encontrados:")
        for error in errors:
            print(f"  - {error}")
        print("\n💡 Por favor, revisa tu archivo .env y configura las variables necesarias")
        return False
    
    print("✅ Configuración validada correctamente")
    return True

# Validar al importar (solo mostrar errores, no fallar)
try:
    validate_settings()
except Exception as e:
    print(f"⚠️  Advertencia de configuración: {e}") 