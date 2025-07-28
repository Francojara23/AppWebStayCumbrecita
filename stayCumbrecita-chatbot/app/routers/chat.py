from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from ..models.chat import ChatRequest, ChatResponse, ChatHistoryResponse
from ..services.chat_service import ChatService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Instancia del servicio de chat
chat_service = ChatService()

@router.post("/{hospedaje_id}", response_model=ChatResponse)
async def chat_with_hospedaje(
    hospedaje_id: str,
    request: ChatRequest
):
    """
    Endpoint principal para chatear con un hospedaje específico
    🆕 Ahora soporta contexto conversacional del frontend
    """
    try:
        # 🆕 Convertir contexto del frontend a dict si existe
        frontend_context = None
        if request.context:
            frontend_context = request.context.dict()
            logger.info(f"🆕 Contexto recibido del frontend: {len(frontend_context.get('conversationHistory', []))} mensajes")
        
        response = await chat_service.process_message(
            hospedaje_id=hospedaje_id,
            user_id=request.user_id,
            message=request.message,
            token=request.token,  # Pasar el token para agrupar conversaciones
            session_id=request.session_id,
            context=frontend_context,  # 🆕 Pasar contexto del frontend
            save_to_history=request.saveToHistory or True  # 🆕 Control de guardado
        )
        return response
    except Exception as e:
        logger.error(f"Error procesando mensaje: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error procesando el mensaje"
        )

@router.get("/{hospedaje_id}/history/{user_id}", response_model=ChatHistoryResponse)
async def get_user_chat_history(
    hospedaje_id: str,
    user_id: str,
    page: int = 1,
    limit: int = 20
):
    """
    Obtener historial de chat de un usuario específico en un hospedaje
    """
    try:
        history = await chat_service.get_user_history(
            hospedaje_id=hospedaje_id,
            user_id=user_id,
            page=page,
            limit=limit
        )
        return history
    except Exception as e:
        logger.error(f"Error obteniendo historial: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error obteniendo historial de chat"
        )

@router.post("/upload-pdf")
async def upload_pdf():
    """
    Placeholder para subir PDF del chatbot
    """
    return {"message": "Upload PDF functionality to be implemented"}

@router.post("/retrain/{hospedaje_id}")
async def retrain_hospedaje(hospedaje_id: str):
    """
    Re-entrenar el chatbot de un hospedaje específico
    """
    try:
        success = await chat_service.retrain_hospedaje(hospedaje_id)
        if success:
            return {"message": "Chatbot re-entrenado exitosamente"}
        else:
            raise HTTPException(
                status_code=400,
                detail="Error re-entrenando el chatbot"
            )
    except Exception as e:
        logger.error(f"Error re-entrenando: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error interno re-entrenando el chatbot"
        ) 