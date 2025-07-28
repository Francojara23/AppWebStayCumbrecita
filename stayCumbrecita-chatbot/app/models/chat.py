from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TonoChatbot(str, Enum):
    FORMAL = "formal"
    CORDIAL = "cordial"
    JUVENIL = "juvenil"
    AMIGABLE = "amigable"
    CORPORATIVO = "corporativo"

# 🆕 Modelos para contexto conversacional híbrido
class ChatContextQuery(BaseModel):
    dates: Optional[Dict[str, str]] = Field(None, description="Fechas de la consulta")
    habitacion: Optional[str] = Field(None, description="Habitación mencionada")
    lastAvailability: Optional[bool] = Field(None, description="Última disponibilidad confirmada")
    lastPrices: Optional[Any] = Field(None, description="Últimos precios consultados")

class ChatContextMessage(BaseModel):
    id: str = Field(..., description="ID del mensaje")
    message: str = Field(..., description="Contenido del mensaje")
    role: str = Field(..., description="Rol: 'user' o 'assistant'")
    timestamp: datetime = Field(..., description="Timestamp del mensaje")

class ChatContext(BaseModel):
    sessionId: str = Field(..., description="ID de la sesión")
    conversationHistory: List[ChatContextMessage] = Field(default_factory=list, description="Historial de conversación")
    currentQuery: ChatContextQuery = Field(default_factory=ChatContextQuery, description="Consulta actual")
    timestamp: int = Field(..., description="Timestamp del contexto")
    hospedajeId: str = Field(..., description="ID del hospedaje")

class ChatRequest(BaseModel):
    user_id: str = Field(..., description="ID del usuario que envía el mensaje")
    message: str = Field(..., description="Mensaje del usuario")
    token: Optional[str] = Field(None, description="Token de autenticación para agrupar conversación")
    session_id: Optional[str] = Field(None, description="ID de la sesión de chat (legacy)")
    context: Optional[ChatContext] = Field(None, description="Contexto conversacional del frontend")
    saveToHistory: Optional[bool] = Field(True, description="Si debe guardar en historial (solo interacciones importantes)")

class ChatMessage(BaseModel):
    message: str = Field(..., description="Contenido del mensaje")
    role: str = Field(..., description="Rol: 'user' o 'assistant'")
    timestamp: datetime = Field(..., description="Timestamp del mensaje")
    session_id: Optional[str] = Field(None, description="ID de la sesión")

class ChatResponse(BaseModel):
    response: str = Field(..., description="Respuesta del chatbot")
    hospedaje_id: str = Field(..., description="ID del hospedaje")
    session_id: str = Field(..., description="ID de la sesión")
    query_type: str = Field(default="general", description="Tipo de consulta clasificada")
    sources_used: List[str] = Field(default_factory=list, description="Fuentes utilizadas")
    response_time: Optional[float] = Field(None, description="Tiempo de respuesta en segundos")
    timestamp: datetime = Field(default_factory=datetime.now)
    context_used: Optional[bool] = Field(False, description="Si se usó contexto del frontend")

class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Lista de mensajes del historial")
    total: int = Field(..., description="Total de mensajes")
    page: int = Field(..., description="Página actual")
    limit: int = Field(..., description="Límite por página")
    hospedaje_id: str = Field(..., description="ID del hospedaje")

class ChatHistoryRecord(BaseModel):
    id: str
    hospedaje_id: str
    user_id: str
    session_id: Optional[str]
    user_message: str
    bot_response: str
    sources_used: List[str]
    response_time: float
    created_at: datetime

class HospedajeHistoryResponse(BaseModel):
    hospedaje_id: str
    hospedaje_nombre: str
    total_consultas: int
    ultima_consulta: datetime

class UserAllHospedajesHistoryResponse(BaseModel):
    data: List[HospedajeHistoryResponse]

class HealthCheckResponse(BaseModel):
    status: str = "ok"
    timestamp: datetime = Field(default_factory=datetime.now)
    version: str = "1.0.0"

class ErrorResponse(BaseModel):
    error: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.now) 