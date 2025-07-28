from fastapi import APIRouter
from ..models.chat import HealthCheckResponse

router = APIRouter()

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Endpoint de verificación de salud del servicio"""
    return HealthCheckResponse() 