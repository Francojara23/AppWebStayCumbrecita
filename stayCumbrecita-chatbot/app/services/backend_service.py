import httpx
from typing import Dict, List, Optional, Any
from ..core.config import settings
from ..models.knowledge import (
    ChatbotConfig, HospedajeInfo, HabitacionInfo, 
    ServicioInfo, DisponibilidadInfo, PrecioInfo
)
import logging

logger = logging.getLogger(__name__)

def formatear_precio_argentino(precio: float) -> str:
    """Formatea un precio en formato argentino: ARS $139.900,00"""
    # Convertir a entero para evitar decimales innecesarios si es un número entero
    if precio == int(precio):
        precio_str = f"{int(precio):,}".replace(",", ".")
        return f"ARS ${precio_str},00"
    else:
        precio_str = f"{precio:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"ARS ${precio_str}"

class BackendService:
    def __init__(self):
        self.backend_url = settings.backend_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Cerrar cliente HTTP"""
        await self.client.aclose()
    
    # ========== CONFIGURACIÓN DEL CHATBOT ==========
    
    async def get_chatbot_config(self, hospedaje_id: str) -> Optional[ChatbotConfig]:
        """Obtener configuración del chatbot desde el backend"""
        try:
            # Usar endpoint público sin autenticación
            response = await self.client.get(f"{self.backend_url}/chatbot/public/{hospedaje_id}/configuration")
            if response.status_code == 200:
                data = response.json()
                return ChatbotConfig(**data)
            return None
        except Exception as e:
            logger.error(f"Error obteniendo configuración del chatbot: {e}")
            return None
    
    async def mark_as_trained(self, hospedaje_id: str) -> bool:
        """Marcar el chatbot como entrenado"""
        try:
            # Usar endpoint público sin autenticación
            response = await self.client.post(f"{self.backend_url}/chatbot/public/{hospedaje_id}/mark-trained")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Error marcando como entrenado: {e}")
            return False
    
    # ========== INFORMACIÓN DEL HOSPEDAJE ==========
    
    async def get_hospedaje_info(self, hospedaje_id: str) -> Optional[HospedajeInfo]:
        """Obtener información básica del hospedaje"""
        try:
            response = await self.client.get(f"{self.backend_url}/hospedajes/{hospedaje_id}")
            if response.status_code == 200:
                data = response.json()
                return HospedajeInfo(**data)
            return None
        except Exception as e:
            logger.error(f"Error obteniendo información del hospedaje: {e}")
            return None
    
    # ========== HABITACIONES ==========
    
    async def get_habitaciones_hospedaje(self, hospedaje_id: str) -> List[HabitacionInfo]:
        """Obtener todas las habitaciones del hospedaje"""
        try:
            response = await self.client.get(f"{self.backend_url}/hospedajes/{hospedaje_id}/habitaciones")
            if response.status_code == 200:
                data = response.json()
                # El backend devuelve {"data": [...]} no un array directo
                habitaciones_data = data.get("data", []) if isinstance(data, dict) else data
                return [HabitacionInfo(**hab) for hab in habitaciones_data]
            return []
        except Exception as e:
            logger.error(f"Error obteniendo habitaciones: {e}")
            return []
    
    async def get_habitacion_details(self, habitacion_id: str) -> Optional[Dict[str, Any]]:
        """Obtener detalles específicos de una habitación incluyendo capacidad"""
        try:
            response = await self.client.get(f"{self.backend_url}/habitaciones/{habitacion_id}")
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error obteniendo detalles de habitación {habitacion_id}: {e}")
            return None
    
    # ========== PRECIOS ==========
    
    async def get_precios_habitacion(self, habitacion_id: str, fecha_inicio: str, fecha_fin: str) -> Optional[PrecioInfo]:
        """Obtener precios en rango de fechas"""
        try:
            response = await self.client.get(
                f"{self.backend_url}/habitaciones/{habitacion_id}/calendario-precios",
                params={"from": fecha_inicio, "to": fecha_fin}
            )
            if response.status_code == 200:
                precios_por_dia = response.json()  # Array de {fecha, precio}
                if not precios_por_dia:
                    return None
                
                # Calcular precio total sumando todos los días
                precio_total = sum(dia["precio"] for dia in precios_por_dia)
                precio_por_noche = precios_por_dia[0]["precio"]  # Precio base por noche
                noches = len(precios_por_dia)
                
                precio_info = PrecioInfo(
                    precio_base=float(precio_por_noche),
                    precio_total=float(precio_total),
                    noches=noches,
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    ajustes=precios_por_dia  # Información detallada por día
                )
                
                # Agregar formateo argentino para facilitar al chatbot
                precio_info_dict = precio_info.dict()
                precio_info_dict["precio_base_formateado"] = formatear_precio_argentino(precio_por_noche)
                precio_info_dict["precio_total_formateado"] = formatear_precio_argentino(precio_total)
                
                return precio_info
            return None
        except Exception as e:
            logger.error(f"Error obteniendo precios: {e}")
            return None
    
    async def get_precio_fecha_especifica(self, habitacion_id: str, fecha: str) -> Optional[PrecioInfo]:
        """Obtener precio para fecha específica"""
        try:
            response = await self.client.get(
                f"{self.backend_url}/habitaciones/{habitacion_id}/precio",
                params={"fecha": fecha}
            )
            if response.status_code == 200:
                precio_numero = response.json()  # El backend devuelve solo un número
                # Crear PrecioInfo con la estructura correcta
                precio_info = PrecioInfo(
                    precio_base=float(precio_numero),
                    precio_total=float(precio_numero),
                    noches=1,
                    fecha_inicio=fecha,
                    fecha_fin=fecha
                )
                
                # Agregar formateo argentino para facilitar al chatbot
                precio_info_dict = precio_info.dict()
                precio_info_dict["precio_formateado"] = formatear_precio_argentino(precio_numero)
                
                return precio_info
            return None
        except Exception as e:
            logger.error(f"Error obteniendo precio específico: {e}")
            return None
    
    # ========== DISPONIBILIDAD MENSUAL ==========
    
    async def get_disponibilidad_mensual(self, hospedaje_id: str, mes: int, año: int) -> Optional[Dict[str, Any]]:
        """Obtener disponibilidad mensual de un hospedaje"""
        try:
            response = await self.client.get(
                f"{self.backend_url}/habitaciones/hospedajes/{hospedaje_id}/disponibilidad-mes",
                params={"mes": mes, "año": año}
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error obteniendo disponibilidad mensual: {e}")
            return None
    
    async def get_disponibilidad_multiples_meses(self, hospedaje_id: str, meses: str) -> Optional[Dict[str, Any]]:
        """Obtener disponibilidad para múltiples meses de un hospedaje"""
        try:
            response = await self.client.get(
                f"{self.backend_url}/habitaciones/hospedajes/{hospedaje_id}/disponibilidad-meses",
                params={"meses": meses}
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error obteniendo disponibilidad múltiples meses: {e}")
            return None

    # ========== SERVICIOS ==========
    
    async def get_servicios_hospedaje(self, hospedaje_id: str) -> List[ServicioInfo]:
        """Obtener servicios del hospedaje"""
        try:
            response = await self.client.get(f"{self.backend_url}/hospedajes/{hospedaje_id}/servicios")
            if response.status_code == 200:
                data = response.json()
                return [ServicioInfo(**serv) for serv in data]
            return []
        except Exception as e:
            logger.error(f"Error obteniendo servicios del hospedaje: {e}")
            return []
    
    async def get_servicios_habitacion(self, habitacion_id: str) -> List[ServicioInfo]:
        """Obtener servicios de habitación específica"""
        try:
            response = await self.client.get(f"{self.backend_url}/servicios/habitaciones/{habitacion_id}/servicios")
            if response.status_code == 200:
                data = response.json()
                return [ServicioInfo(**serv) for serv in data]
            return []
        except Exception as e:
            logger.error(f"Error obteniendo servicios de habitación: {e}")
            return []
    
    async def buscar_servicio_habitacion(self, habitacion_id: str, termino: str) -> List[Dict[str, Any]]:
        """Buscar servicios específicos en una habitación por término"""
        try:
            response = await self.client.get(
                f"{self.backend_url}/servicios/habitaciones/{habitacion_id}/buscar",
                params={"termino": termino}
            )
            if response.status_code == 200:
                data = response.json()
                return data  # Retorna la estructura completa del endpoint
            return []
        except Exception as e:
            logger.error(f"Error buscando servicio en habitación: {e}")
            return []
    
    async def buscar_servicio_hospedaje(self, hospedaje_id: str, termino: str) -> List[Dict[str, Any]]:
        """Buscar servicios específicos en un hospedaje por término"""
        try:
            response = await self.client.get(
                f"{self.backend_url}/servicios/hospedajes/{hospedaje_id}/buscar",
                params={"termino": termino}
            )
            if response.status_code == 200:
                data = response.json()
                return data  # Retorna la estructura completa del endpoint
            return []
        except Exception as e:
            logger.error(f"Error buscando servicio en hospedaje: {e}")
            return []
    
    # ========== DISPONIBILIDAD ==========
    
    async def check_disponibilidad_hospedaje(self, hospedaje_id: str, fecha_inicio: str, fecha_fin: str) -> Optional[DisponibilidadInfo]:
        """Verificar disponibilidad del hospedaje - endpoint correcto"""
        try:
            # Endpoint correcto: /habitaciones/hospedajes/{hospedajeId}/disponibilidad
            response = await self.client.get(
                f"{self.backend_url}/habitaciones/hospedajes/{hospedaje_id}/disponibilidad",
                params={"fechaInicio": fecha_inicio, "fechaFin": fecha_fin}
            )
            if response.status_code == 200:
                data = response.json()
                # La respuesta real: {"data": [...habitaciones...], "meta": {...}}
                habitaciones_disponibles = data.get("data", [])
                cantidad_disponibles = len(habitaciones_disponibles)
                
                return DisponibilidadInfo(
                    disponible=cantidad_disponibles > 0,
                    habitaciones_disponibles=cantidad_disponibles,
                    motivo=f"Se encontraron {cantidad_disponibles} habitaciones disponibles" if cantidad_disponibles > 0 else "No hay habitaciones disponibles para las fechas seleccionadas",
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    detalle_habitaciones=habitaciones_disponibles  # Agregamos el detalle completo
                )
            return None
        except Exception as e:
            logger.error(f"Error verificando disponibilidad: {e}")
            return None

    # ========== GENERACIÓN DE URLs DE RESERVA ==========
    
    async def generar_url_reserva_multiple(
        self, 
        hospedaje_id: str, 
        habitacion_ids: List[str],
        fecha_inicio: str,
        fecha_fin: str, 
        huespedes: int
    ) -> str:
        """Generar URL de checkout para múltiples habitaciones"""
        try:
            from urllib.parse import urlencode
            
            # Unir IDs de habitaciones con comas
            habitacion_ids_str = ",".join(habitacion_ids)
            
            # Parámetros de la URL
            params = {
                "hospedajeId": hospedaje_id,
                "habitacionIds": habitacion_ids_str,
                "fechaInicio": fecha_inicio,
                "fechaFin": fecha_fin,
                "huespedes": str(huespedes)
            }
            
            # Construir URL
            frontend_url = settings.frontend_url
            query_string = urlencode(params)
            checkout_url = f"{frontend_url}/checkout?{query_string}"
            # Reducir ruido: no loguear la URL completa para evitar duplicados visibles
            logger.info(f"🏠 URL MÚLTIPLE GENERADA - {len(habitacion_ids)} habitaciones")
            return checkout_url
            
        except Exception as e:
            logger.error(f"Error generando URL múltiple: {e}")
            return f"{settings.frontend_url}/checkout"
    
    async def generar_url_reserva_simple(
        self, 
        hospedaje_id: str, 
        habitacion_id: str,
        fecha_inicio: str,
        fecha_fin: str, 
        huespedes: int
    ) -> str:
        """Generar URL de checkout para una sola habitación"""
        try:
            from urllib.parse import urlencode
            
            # Parámetros de la URL
            params = {
                "hospedajeId": hospedaje_id,
                "habitacionIds": habitacion_id,  # Una sola habitación
                "fechaInicio": fecha_inicio,
                "fechaFin": fecha_fin,
                "huespedes": str(huespedes)
            }
            
            # Construir URL
            frontend_url = settings.frontend_url
            query_string = urlencode(params)
            checkout_url = f"{frontend_url}/checkout?{query_string}"
            # Reducir ruido: no loguear la URL completa para evitar duplicados visibles
            logger.info("🏠 URL SIMPLE GENERADA - 1 habitación")
            return checkout_url
            
        except Exception as e:
            logger.error(f"Error generando URL simple: {e}")
            return f"{settings.frontend_url}/checkout"
    
    def calcular_habitaciones_necesarias(
        self, 
        huespedes: int, 
        habitaciones_disponibles: List[Dict]
    ) -> Dict[str, Any]:
        """Calcular combinaciones posibles de habitaciones para un número de huéspedes"""
        try:
            if not habitaciones_disponibles:
                return {"error": "No hay habitaciones disponibles"}
            
            # Capacidad máxima individual
            capacidad_maxima = max(hab.get("capacidad", 2) for hab in habitaciones_disponibles)
            
            # Habitaciones necesarias (división hacia arriba)
            habitaciones_necesarias = (huespedes + capacidad_maxima - 1) // capacidad_maxima
            
            # Generar combinaciones
            combinaciones = self._generar_combinaciones_detalladas(habitaciones_disponibles, huespedes)
            
            return {
                "habitaciones_necesarias": habitaciones_necesarias,
                "capacidad_maxima_individual": capacidad_maxima,
                "combinaciones_posibles": combinaciones,
                "puede_alojar_todos": any(combo["capacidad_total"] >= huespedes for combo in combinaciones)
            }
            
        except Exception as e:
            logger.error(f"Error calculando habitaciones necesarias: {e}")
            return {"error": str(e)}
    
    def _generar_combinaciones_detalladas(self, habitaciones: List[Dict], huespedes: int) -> List[Dict]:
        """Genera combinaciones detalladas de habitaciones"""
        from itertools import combinations
        
        combinaciones_validas = []
        
        # Intentar con 1 habitación (si alguna tiene capacidad suficiente)
        for habitacion in habitaciones:
            if habitacion.get("capacidad", 2) >= huespedes:
                combinaciones_validas.append({
                    "numero_habitaciones": 1,
                    "habitaciones": [habitacion.get("nombre")],
                    "ids": [habitacion.get("id")],
                    "capacidad_total": habitacion.get("capacidad", 2),
                    "tipo": "individual",
                    "descripcion": f"{habitacion.get('nombre')} (capacidad: {habitacion.get('capacidad', 2)} personas)"
                })
        
        # Intentar con 2 habitaciones
        if len(habitaciones) >= 2:
            for combo in combinations(habitaciones, 2):
                capacidad_total = sum(hab.get("capacidad", 2) for hab in combo)
                if capacidad_total >= huespedes:
                    combinaciones_validas.append({
                        "numero_habitaciones": 2,
                        "habitaciones": [hab.get("nombre") for hab in combo],
                        "ids": [hab.get("id") for hab in combo],
                        "capacidad_total": capacidad_total,
                        "tipo": "doble",
                        "descripcion": f"{combo[0].get('nombre')} + {combo[1].get('nombre')} (capacidad total: {capacidad_total} personas)"
                    })
        
        # Si no hay combinaciones válidas, intentar con todas las habitaciones
        if not combinaciones_validas and len(habitaciones) >= 3:
            capacidad_total = sum(hab.get("capacidad", 2) for hab in habitaciones)
            if capacidad_total >= huespedes:
                combinaciones_validas.append({
                    "numero_habitaciones": len(habitaciones),
                    "habitaciones": [hab.get("nombre") for hab in habitaciones],
                    "ids": [hab.get("id") for hab in habitaciones],
                    "capacidad_total": capacidad_total,
                    "tipo": "multiple",
                    "descripcion": f"Todas las habitaciones disponibles (capacidad total: {capacidad_total} personas)"
                })
        
        return combinaciones_validas

# Instancia global del servicio
backend_service = BackendService() 