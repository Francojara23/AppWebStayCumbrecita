from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .chat import TonoChatbot

class ChatbotConfig(BaseModel):
    """Configuración del chatbot obtenida del backend"""
    id: str
    hospedaje_id: str = Field(alias="hospedajeId")
    pdf_url: Optional[str] = Field(default=None, alias="pdfUrl")
    pdf_filename: Optional[str] = Field(default=None, alias="pdfFilename")
    tono: TonoChatbot
    is_active: bool = Field(default=True, alias="isActive")
    is_trained: bool = Field(default=False, alias="isTrained")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    
    class Config:
        populate_by_name = True  # Permite usar tanto snake_case como camelCase

class HospedajeInfo(BaseModel):
    """Información básica del hospedaje"""
    id: str
    nombre: str
    descripcion_corta: str = Field(alias="descripcionCorta")
    descripcion_larga: str = Field(alias="descripcionLarga")
    responsable: str
    telefono_contacto: str = Field(alias="telefonoContacto")
    mail_contacto: str = Field(alias="mailContacto")
    direccion: str
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    
    class Config:
        populate_by_name = True  # Permite usar tanto snake_case como camelCase

class HabitacionInfo(BaseModel):
    """Información de habitación - estructura real del backend"""
    id: str
    nombre: str
    descripcion_corta: str = Field(alias="descripcionCorta")
    descripcion_larga: str = Field(alias="descripcionLarga")
    capacidad: int
    precio_base: str = Field(alias="precioBase")  # El backend devuelve string
    tipo_habitacion: Dict[str, Any] = Field(alias="tipoHabitacion")
    
    class Config:
        populate_by_name = True

class ServicioInfo(BaseModel):
    """Información de servicio - estructura real del backend"""
    id: str
    servicio: Dict[str, Any]  # Contiene nombre, descripcion, etc.
    precioExtra: Optional[str] = "0.00"
    observaciones: Optional[str] = None
    
    # Propiedades de conveniencia para acceder a los datos anidados
    @property
    def nombre(self) -> str:
        return self.servicio.get("nombre", "")
    
    @property
    def descripcion(self) -> str:
        return self.servicio.get("descripcion", "")
    
    @property
    def incluido(self) -> bool:
        if self.precioExtra is None:
            return True  # Si no tiene precio extra, está incluido
        try:
            return float(self.precioExtra) == 0.0
        except (ValueError, TypeError):
            return True

class DisponibilidadInfo(BaseModel):
    """Información de disponibilidad"""
    disponible: bool
    habitaciones_disponibles: Optional[int] = None
    motivo: Optional[str] = None
    fecha_inicio: str
    fecha_fin: str
    detalle_habitaciones: Optional[List[Dict[str, Any]]] = None

class PrecioInfo(BaseModel):
    """Información de precios"""
    precio_base: float
    precio_total: float
    noches: int
    fecha_inicio: str
    fecha_fin: str
    ajustes: Optional[List[Dict[str, Any]]] = None

class VectorDocument(BaseModel):
    """Documento vectorizado"""
    id: str
    hospedaje_id: str
    chunk_text: str
    embedding: List[float]
    metadata: Dict[str, Any]
    similarity_score: Optional[float] = None

class QueryClassification(BaseModel):
    """Clasificación de consulta"""
    query_type: str
    confidence: float
    detected_dates: Optional[Dict[str, str]] = None
    detected_entities: Optional[List[str]] = None

class ContextSources(BaseModel):
    """Fuentes de contexto para la respuesta"""
    pdf_context: str = ""
    database_context: str = ""
    history_context: str = ""
    sources_used: List[str] = Field(default_factory=list)

class HabitacionDisponibilidadMensual(BaseModel):
    """Información de disponibilidad mensual de una habitación"""
    habitacion_id: str
    nombre: str
    tipo_habitacion: str
    dias_disponibles: List[str]
    total_dias_disponibles: int

class DisponibilidadMensual(BaseModel):
    """Información de disponibilidad mensual"""
    mes: str
    año: int
    mes_numero: int
    dias_en_mes: int
    habitaciones_disponibles: List[HabitacionDisponibilidadMensual]
    total_habitaciones_disponibles: int

class DisponibilidadMultiplesMeses(BaseModel):
    """Información de disponibilidad para múltiples meses"""
    meses: List[DisponibilidadMensual]
    total_meses: int
    resumen: Dict[str, Any] 