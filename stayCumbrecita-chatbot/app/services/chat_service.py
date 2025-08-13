import logging
import uuid
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from openai import AsyncOpenAI
from ..core.config import settings
from ..models.chat import ChatRequest, ChatResponse, ChatHistoryResponse, ChatMessage
from ..models.knowledge import ChatbotConfig
from ..services.backend_service import backend_service
from ..services.knowledge_service import KnowledgeService
from ..services.query_classifier import QueryClassifier
from ..utils.date_extractor import DateExtractor
from ..core.database import get_db, execute_vector_query, execute_vector_query_one
import json
import time

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.knowledge_service = KnowledgeService()
        self.query_classifier = QueryClassifier()
        self.date_extractor = DateExtractor()
        # Patrones simples para detectar confirmación explícita de reserva múltiple
        self._multi_reservation_patterns = [
            r"\bquiero\s+reservar\s+ambas\b",
            r"\breservar\s+ambas\b",
            r"\bme\s+quedo\s+con\s+ambas\b",
            r"\bcontinuar\s+con\s+ambas\b",
            r"\blas\s+dos\s+habitaciones\b",
            r"\breservar\s+las\s+dos\b",
            r"\breservar\s+\d+\s+habitaciones\b",
            r"\bconfirmo\s+ambas\b",
            r"\bsí\s*,?\s*ambas\b",
            r"\bsi\s*,?\s*ambas\b",
        ]
        # Idempotencia de corta ventana: recuerda último mensaje por conversación
        self._last_requests: Dict[str, Dict[str, Any]] = {}
        
    async def process_message(
        self, 
        hospedaje_id: str, 
        user_id: str, 
        message: str, 
        token: Optional[str] = None,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,  # 🆕 Contexto del frontend
        save_to_history: bool = True  # 🆕 Control de guardado
    ) -> ChatResponse:
        """Procesa un mensaje del usuario y genera una respuesta"""
        start_time = time.time()
        
        try:
            # Usar token como identificador de conversación, fallback a session_id o generar UUID
            conversation_id = token or session_id or str(uuid.uuid4())
            
            # Si se proporcionó token, usarlo como session_id para mantener compatibilidad
            if token:
                session_id = token
            elif not session_id:
                session_id = str(uuid.uuid4())
                
            logger.info(f"🔍 DEBUG - Token: {token[:20] if token else 'None'}...")
            logger.info(f"🔍 DEBUG - Conversation ID: {conversation_id[:20] if conversation_id else 'None'}...")
            logger.info(f"🔍 DEBUG - Session ID: {session_id[:20] if session_id else 'None'}...")
            logger.info(f"🆕 DEBUG - Contexto del frontend: {'Presente' if context else 'Ausente'}")
            logger.info(f"🆕 DEBUG - Guardar en historial: {save_to_history}")
            
            # Obtener configuración del chatbot
            config = await backend_service.get_chatbot_config(hospedaje_id)
            if not config:
                logger.error(f"No se encontró configuración para hospedaje {hospedaje_id}")
                response_time = time.time() - start_time
                return ChatResponse(
                    response="Lo siento, no puedo procesar tu consulta en este momento.",
                    session_id=session_id,
                    hospedaje_id=hospedaje_id,
                    query_type="error",
                    response_time=response_time,
                    context_used=False
                )
            
            # 🆕 Guardar mensaje del usuario solo si save_to_history es True y no es anónimo
            if save_to_history and not self._is_anonymous_user(user_id):
                try:
                    await self._save_message(
                        hospedaje_id, user_id, conversation_id, message, "user"
                    )
                except Exception as e:
                    logger.warning(f"Error guardando mensaje del usuario: {e}")
            
            # 🧯 IDEMPOTENCIA (ventana 2s): evitar reprocesar el mismo mensaje
            normalized_message = (message or "").strip().lower()
            idempotency_key = f"{conversation_id}:{normalized_message}"
            now_ms = int(time.time() * 1000)
            last = self._last_requests.get(conversation_id)
            if last and last.get("key") == idempotency_key and (now_ms - last.get("ts", 0)) < 2000:
                logger.info("🧯 IDEMPOTENCIA - Reutilizando respuesta reciente (ventana 2s)")
                cached = last.get("response_text") or "Lo siento, no puedo procesar tu consulta en este momento."
                response_time = time.time() - start_time
                return ChatResponse(
                    response=cached,
                    session_id=session_id,
                    hospedaje_id=hospedaje_id,
                    query_type=last.get("query_type", "general"),
                    response_time=response_time,
                    context_used=context is not None
                )

            # 🆕 PASO 1: Obtener contexto básico para clasificación
            basic_context = await self._get_basic_context_for_classification(
                hospedaje_id, user_id, conversation_id, message, context
            )
            
            # Clasificar la consulta CON contexto básico
            query_type = await self.query_classifier.classify_query(message, basic_context)

            # 🧭 OVERRIDE DIRECTO: si el usuario confirma explícitamente reservar múltiples habitaciones
            if self._is_multi_reservation_confirm(message):
                logger.info("🧭 OVERRIDE DIRECTO - Confirmación de reserva múltiple detectada → query_type='reserva_multiple'")
                query_type = "reserva_multiple"
            
            # 🆕 PASO 2: Obtener contexto completo basado en el tipo de consulta
            full_context = await self._get_relevant_context(
                hospedaje_id, message, query_type, user_id, conversation_id, context, basic_context
            )
            
            # 🔄 APLICAR QUERY TYPE OVERRIDE si existe (desde proceso_reserva con capacidad excedida)
            # IMPORTANTE: Aplicar ANTES del análisis de capacidad para evitar conflictos
            if full_context.get("query_type_override"):
                original_query_type = query_type
                query_type = full_context["query_type_override"]
                logger.info(f"🔄 OVERRIDE APLICADO TEMPRANO - Cambiando query_type de '{original_query_type}' a '{query_type}'")
                # Limpiar el contexto de proceso_reserva para evitar conflictos
                if "proceso_reserva_caso" in full_context:
                    logger.info(f"🧹 LIMPIANDO contexto proceso_reserva para evitar conflictos con override")
                    del full_context["proceso_reserva_caso"]
            
            # 🔍 PASO 3: DETECTAR Y MANEJAR CAPACIDAD EXCEDIDA
            capacity_analysis = await self._analyze_capacity_requirements(message, full_context, query_type)
            if capacity_analysis.get("capacity_exceeded"):
                logger.info(f"🚨 CAPACIDAD EXCEDIDA DETECTADA - Redirigiendo a manejo especial")
                query_type = capacity_analysis["new_query_type"]
                full_context.update(capacity_analysis["enhanced_context"])
            
            # Generar respuesta basada en el tipo de consulta
            response_text = await self._generate_response(
                hospedaje_id, user_id, message, query_type, config, conversation_id, full_context
            )
            
            # 🆕 Guardar respuesta del bot solo si save_to_history es True y no es anónimo
            if save_to_history and not self._is_anonymous_user(user_id):
                try:
                    await self._save_message(
                        hospedaje_id, user_id, conversation_id, response_text, "assistant"
                    )
                    
                    # 🎯 GUARDAR CONTEXTO DE RESERVA PENDIENTE para memoria conversacional
                    if query_type == "proceso_reserva":
                        await self._save_reserva_context_for_memory(
                            hospedaje_id, user_id, conversation_id, full_context
                        )
                        
                except Exception as e:
                    logger.warning(f"Error guardando respuesta del bot: {e}")
            
            # Guardar huella para idempotencia
            try:
                self._last_requests[conversation_id] = {
                    "key": idempotency_key,
                    "ts": int(time.time() * 1000),
                    "response_text": response_text,
                    "query_type": query_type,
                }
            except Exception:
                pass

            response_time = time.time() - start_time
            return ChatResponse(
                response=response_text,
                session_id=session_id,
                hospedaje_id=hospedaje_id,
                query_type=query_type,
                response_time=response_time,
                context_used=context is not None  # 🆕 Indicar si se usó contexto
            )
            
        except Exception as e:
            logger.error(f"Error procesando mensaje: {e}")
            response_time = time.time() - start_time
            return ChatResponse(
                response="Lo siento, ocurrió un error procesando tu consulta.",
                session_id=session_id or str(uuid.uuid4()),
                hospedaje_id=hospedaje_id,
                query_type="error",
                response_time=response_time,
                context_used=False
            )
    
    def _is_multi_reservation_confirm(self, message: str) -> bool:
        """Detecta frases de confirmación de reserva múltiple sin depender del clasificador.

        Ejemplos: "quiero reservar ambas", "reservar las dos", "me quedo con ambas",
        "reservar 2 habitaciones", "continuar con ambas", "sí, ambas".
        """
        try:
            msg = (message or "").strip().lower()
            if not msg:
                return False
            for pattern in self._multi_reservation_patterns:
                if re.search(pattern, msg):
                    return True
            return False
        except Exception as e:
            logger.warning(f"DEBUG _is_multi_reservation_confirm - error evaluando patrón: {e}")
            return False

    async def _generate_response(
        self, 
        hospedaje_id: str, 
        user_id: str, 
        message: str, 
        query_type: str, 
        config: ChatbotConfig,
        conversation_id: str,
        context: Dict[str, Any]  # 🔧 Ya viene el contexto completo
    ) -> str:
        """Genera la respuesta del chatbot"""
        try:
            # Helper local para redactar URLs de checkout en logs y evitar duplicados visibles
            def _redact_checkout_urls(text: str) -> str:
                try:
                    return re.sub(r"https?://[^\s)\"]*checkout[^\s)\"]*", "[REDACTED_CHECKOUT_URL]", text or "")
                except Exception:
                    return text

            # 🎯 SHORT-CIRCUIT: si algún handler ya generó una respuesta concreta (ej. reserva múltiple), usarla
            prebuilt_response = context.get("response_text")
            if prebuilt_response:
                logger.info("🎯 SHORT-CIRCUIT - Usando response_text preconstruido desde el handler")
                return prebuilt_response

            # 🔧 Ya no necesitamos obtener contexto - viene como parámetro
            # Construir prompt directamente
            prompt = await self._build_prompt(message, context, query_type, config)
            
            # 🔍 DEBUG: Mostrar el prompt completo que se envía a OpenAI
            logger.info("=" * 80)
            logger.info("🤖 DEBUG: PROMPT ENVIADO A OPENAI")
            logger.info("=" * 80)
            logger.info(f"🔧 Modelo: gpt-3.5-turbo")
            logger.info(f"🔧 Max tokens: {settings.max_tokens}")
            logger.info(f"🔧 Temperature: {settings.temperature}")
            logger.info(f"🔧 Query type: {query_type}")
            logger.info("-" * 40)
            logger.info("📋 SYSTEM PROMPT:")
            logger.info("-" * 40)
            logger.info(_redact_checkout_urls(prompt["system"]))
            logger.info("-" * 40)
            logger.info("👤 USER MESSAGE:")
            logger.info("-" * 40)
            logger.info(_redact_checkout_urls(prompt["user"]))
            logger.info("=" * 80)
            
            # Generar respuesta con OpenAI
            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": prompt["system"]},
                    {"role": "user", "content": prompt["user"]}
                ],
                max_tokens=settings.max_tokens,
                temperature=settings.temperature
            )
            
            # 🔍 DEBUG: Mostrar la respuesta recibida de OpenAI
            logger.info("=" * 80)
            logger.info("🤖 DEBUG: RESPUESTA DE OPENAI")
            logger.info("=" * 80)
            openai_response = response.choices[0].message.content or "No se pudo generar una respuesta."
            logger.info(f"📤 Respuesta generada:")
            logger.info(openai_response)
            logger.info("=" * 80)
            
            return response.choices[0].message.content or "No se pudo generar una respuesta."
            
        except Exception as e:
            logger.error(f"Error generando respuesta: {e}")
            return "Lo siento, no pude generar una respuesta adecuada."
    
    async def _get_basic_context_for_classification(
        self, 
        hospedaje_id: str, 
        user_id: str, 
        conversation_id: str, 
        message: str, 
        frontend_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Obtiene contexto básico para la clasificación de consultas."""
        basic_context = {}
        
        try:
            # 1. INFORMACIÓN BÁSICA DEL HOSPEDAJE (siempre)
            hospedaje_info = await backend_service.get_hospedaje_info(hospedaje_id)
            if hospedaje_info:
                basic_context["hospedaje"] = hospedaje_info.dict()
            
            # 2. INTERCEPTAR RESPUESTAS DE HUÉSPEDES ANTES DE EXTRAER FECHAS
            guest_interception_result = await self._intercept_guest_response(
                message, frontend_context, hospedaje_id, user_id, conversation_id
            )
            
            if guest_interception_result:
                # Si interceptamos respuesta de huéspedes, usar esos parámetros limpios
                query_params = guest_interception_result
                logger.info(f"🎯 CLASIFICACIÓN - Interceptación de huéspedes detectada: {guest_interception_result}")
            else:
                # Solo si NO es respuesta de huéspedes, extraer fechas normalmente
                query_params = self.date_extractor.get_query_params(message)
                
            basic_context["query_params"] = query_params
            
            # 🆕 2.5. USAR CONTEXTO DEL FRONTEND si está disponible
            if frontend_context and not query_params.get('has_dates'):
                logger.info(f"🔍 DEBUG - Usando contexto del frontend para clasificación")
                
                # Extraer fechas del contexto del frontend
                current_query = frontend_context.get('currentQuery', {})
                if current_query.get('dates'):
                    dates_from_context = current_query['dates']
                    logger.info(f"🔍 DEBUG - Fechas del contexto frontend para clasificación: {dates_from_context}")
                    
                    # Mapear fechas del frontend al formato esperado
                    if dates_from_context.get('checkIn') and dates_from_context.get('checkOut'):
                        query_params.update({
                            'check_in': dates_from_context['checkIn'],
                            'check_out': dates_from_context['checkOut'],
                            'has_dates': True,
                            'inferred_from_frontend': True
                        })
                    elif dates_from_context.get('singleDate'):
                        query_params.update({
                            'single_date': dates_from_context['singleDate'],
                            'has_dates': True,
                            'inferred_from_frontend': True
                        })
                
                # Agregar información de disponibilidad previa
                if current_query.get('lastAvailability'):
                    query_params['previous_availability'] = True
                
                # Agregar información de habitación previa (🎯 CRÍTICO - CLASIFICACIÓN)
                if current_query.get('habitacion'):
                    habitacion_frontend = current_query['habitacion']
                    query_params['previous_habitacion'] = habitacion_frontend
                    logger.info(f"🔍 DEBUG MAPEO CLASIFICACIÓN - Habitación del frontend mapeada: '{habitacion_frontend}' → query_params['previous_habitacion']")
                
                # Agregar historial de conversación del frontend
                conversation_history = frontend_context.get('conversationHistory', [])
                if conversation_history:
                    basic_context["frontend_conversation"] = {
                        "messages_count": len(conversation_history),
                        "recent_messages": conversation_history[-3:] if len(conversation_history) > 3 else conversation_history
                    }
                    logger.info(f"🔍 DEBUG - Historial del frontend para clasificación: {len(conversation_history)} mensajes")
            
            # 2.6. FALLBACK: Buscar contexto en BD solo si no hay contexto del frontend y no hay fechas
            elif not query_params.get('has_dates') and conversation_id:
                logger.info(f"🔍 DEBUG - Fallback: buscando contexto en BD para clasificación")
                session_context = await self._get_session_context(hospedaje_id, user_id, conversation_id)
                if session_context:
                    basic_context["session_context"] = session_context
                    # Si encontramos fechas en mensajes anteriores, usarlas
                    if session_context.get('last_dates'):
                        logger.info(f"🔍 DEBUG - Usando fechas del contexto de BD para clasificación: {session_context['last_dates']}")
                        query_params.update(session_context['last_dates'])
                        query_params['inferred_from_session'] = True
            
            basic_context["query_params"] = query_params
            
            # DEBUG: Log de parámetros extraídos para clasificación
            logger.info(f"🔍 DEBUG - Mensaje para clasificación: '{message}'")
            logger.info(f"🔍 DEBUG - Parámetros extraídos para clasificación: {query_params}")
            logger.info(f"🔍 DEBUG - has_dates para clasificación: {query_params.get('has_dates', False)}")
            logger.info(f"🔍 DEBUG - check_in para clasificación: {query_params.get('check_in')}")
            logger.info(f"🔍 DEBUG - check_out para clasificación: {query_params.get('check_out')}")
            logger.info(f"🔍 DEBUG - single_date para clasificación: {query_params.get('single_date')}")
            logger.info(f"🆕 DEBUG - inferred_from_frontend para clasificación: {query_params.get('inferred_from_frontend', False)}")
            
            # 2.1. VALIDAR FECHAS - NO PERMITIR FECHAS PASADAS
            fecha_invalida = self._validar_fechas_futuras(query_params)
            if fecha_invalida:
                basic_context["error_fecha_pasada"] = {
                    "mensaje": f"No puedo consultar disponibilidad para fechas pasadas. La fecha {fecha_invalida} ya pasó. Solo puedo consultar disponibilidades desde hoy en adelante.",
                    "fecha_actual": datetime.now().strftime("%Y-%m-%d"),
                    "fecha_consultada": fecha_invalida
                }
                return basic_context  # Retornar inmediatamente sin consultar backend
            
            return basic_context
                
        except Exception as e:
            logger.error(f"Error obteniendo contexto básico para clasificación: {e}")
        return basic_context
    
    async def _intercept_guest_response(
        self, 
        message: str, 
        frontend_context: Optional[Dict[str, Any]] = None,
        hospedaje_id: str = None,
        user_id: str = None, 
        conversation_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Intercepta respuestas sobre número de huéspedes ANTES de extraer fechas.
        Evita que "para 2 personas" se interprete como fecha.
        """
        try:
            message_lower = message.lower()
            
            # 1. OBTENER HISTORIAL DE CONVERSACIÓN
            conversation_history = []
            
            # Priorizar contexto del frontend (más actualizado)
            if frontend_context and frontend_context.get('conversationHistory'):
                conversation_history = frontend_context['conversationHistory'][-3:]  # Últimos 3 mensajes
                logger.info(f"🎯 INTERCEPTACIÓN - Usando historial frontend: {len(conversation_history)} mensajes")
            
            # Fallback: historial de BD
            elif conversation_id:
                session_context = await self._get_session_context(hospedaje_id, user_id, conversation_id)
                if session_context and session_context.get("recent_messages"):
                    conversation_history = session_context["recent_messages"][-3:]
                    logger.info(f"🎯 INTERCEPTACIÓN - Usando historial BD: {len(conversation_history)} mensajes")
            
            if not conversation_history:
                logger.info(f"🎯 INTERCEPTACIÓN - Sin historial conversacional, no interceptando")
                return None
            
            # 2. DETECTAR SI EL BOT PREGUNTÓ POR HUÉSPEDES EN EL MENSAJE ANTERIOR
            last_bot_message = None
            for msg in reversed(conversation_history):
                if msg.get("role") == "assistant":
                    last_bot_message = msg.get("message", "").lower()
                    break
            
            if not last_bot_message:
                logger.info(f"🎯 INTERCEPTACIÓN - Sin mensaje previo del bot, no interceptando")
                return None
            
            # Palabras clave que indican que el bot preguntó por huéspedes
            huespedes_keywords = [
                "cuántas personas", "cuantas personas", "cantidad de huéspedes", 
                "para cuántas", "para cuantas", "número de personas",
                "personas será", "personas?", "huéspedes?", "guests?",
                "falta especificar"
            ]
            
            bot_asked_guests = any(keyword in last_bot_message for keyword in huespedes_keywords)
            
            if not bot_asked_guests:
                logger.info(f"🎯 INTERCEPTACIÓN - Bot no preguntó por huéspedes, no interceptando")
                return None
            
            logger.info(f"🎯 INTERCEPTACIÓN DETECTADA - Bot preguntó huéspedes: '{last_bot_message[:100]}...'")
            logger.info(f"🎯 INTERCEPTACIÓN DETECTADA - Respuesta usuario: '{message}'")
            
            # 3. DETECTAR SI EL USUARIO RESPONDE CON UN NÚMERO DE HUÉSPEDES
            import re
            number_patterns = [
                r'(\d+)\s*personas?',   # "2 personas", "4 persona"
                r'para\s+(\d+)',        # "para 2", "para 4"  
                r'somos\s+(\d+)',       # "somos 2", "somos 4"
                r'^(\d+)$',             # Solo un número "2"
                r'(\d+)\s*huéspedes?',  # "2 huéspedes"
            ]
            
            guest_number = None
            for pattern in number_patterns:
                match = re.search(pattern, message_lower)
                if match:
                    try:
                        guest_number = int(match.group(1))
                        logger.info(f"🎯 INTERCEPTACIÓN - Patrón '{pattern}' detectó: {guest_number} huéspedes")
                        break
                    except (ValueError, IndexError):
                        continue
            
            if not guest_number or guest_number < 1 or guest_number > 20:
                logger.info(f"🎯 INTERCEPTACIÓN - Número de huéspedes no válido: {guest_number}")
                return None
            
            # 4. CREAR PARÁMETROS LIMPIOS PRESERVANDO CONTEXTO DEL FRONTEND
            clean_params = {
                # ❌ NO FECHAS del mensaje - pero preservar del frontend
                'has_dates': False,
                'check_in': None,
                'check_out': None,
                'single_date': None,
                'date_range': None,
                'raw_dates': [],
                
                # ✅ SOLO HUÉSPEDES del mensaje
                'guests': guest_number,
                'raw_numbers': [{'number': guest_number, 'category': 'guests', 'original': message}],
                
                # ❌ NO OTROS NÚMEROS
                'nights': None,
                'days': None,
                'rooms': None,
                
                # ❌ NO CONSULTAS MENSUALES  
                'is_monthly_query': False,
                'single_month': None,
                'multiple_months': None,
                'months_list': [],
                
                # ✅ METADATA
                'original_message': message,
                'intercepted_guest_response': True  # Flag para indicar interceptación
            }
            
            # 🎯 PRESERVAR CONTEXTO DEL FRONTEND si está disponible
            if frontend_context and frontend_context.get('currentQuery'):
                current_query = frontend_context['currentQuery']
                
                # ✅ PRESERVAR HABITACIÓN SELECCIONADA
                if current_query.get('habitacion'):
                    clean_params['previous_habitacion'] = current_query['habitacion']
                    logger.info(f"🎯 INTERCEPTACIÓN - Habitación preservada: {current_query['habitacion']}")
                
                # ✅ PRESERVAR FECHAS DEL FRONTEND
                if current_query.get('dates'):
                    dates_from_context = current_query['dates']
                    if dates_from_context.get('checkIn') and dates_from_context.get('checkOut'):
                        clean_params.update({
                            'check_in': dates_from_context['checkIn'],
                            'check_out': dates_from_context['checkOut'],
                            'has_dates': True,
                            'inferred_from_frontend': True
                        })
                        logger.info(f"🎯 INTERCEPTACIÓN - Fechas preservadas: {dates_from_context['checkIn']} a {dates_from_context['checkOut']}")
                    elif dates_from_context.get('singleDate'):
                        clean_params.update({
                            'single_date': dates_from_context['singleDate'],
                            'has_dates': True,
                            'inferred_from_frontend': True
                        })
                        logger.info(f"🎯 INTERCEPTACIÓN - Fecha única preservada: {dates_from_context['singleDate']}")
                
                # ✅ PRESERVAR DISPONIBILIDAD PREVIA
                if current_query.get('lastAvailability'):
                    clean_params['previous_availability'] = True
                    logger.info(f"🎯 INTERCEPTACIÓN - Disponibilidad previa preservada")
            
            logger.info(f"🎯 INTERCEPTACIÓN EXITOSA - Parámetros limpios creados: {clean_params}")
            return clean_params
            
        except Exception as e:
            logger.error(f"Error interceptando respuesta de huéspedes: {e}")
            return None

    async def _get_relevant_context(
        self, 
        hospedaje_id: str, 
        message: str, 
        query_type: str,
        user_id: str,
        conversation_id: str,
        frontend_context: Optional[Dict[str, Any]] = None,
        basic_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Obtiene contexto relevante combinando PDF + endpoints del backend"""
        context = {}
        
        try:
            # 1. INFORMACIÓN BÁSICA DEL HOSPEDAJE (siempre)
            hospedaje_info = await backend_service.get_hospedaje_info(hospedaje_id)
            if hospedaje_info:
                context["hospedaje"] = hospedaje_info.dict()
            
            # 🎯 2. OBTENER PARÁMETROS DE CONSULTA (ya incluyen interceptación si aplica)
            # Los parámetros ya vienen procesados desde el contexto básico de clasificación
            if basic_context and basic_context.get("query_params"):
                query_params = basic_context["query_params"]
                logger.info(f"🎯 CONTEXTO COMPLETO - Usando parámetros del contexto básico: {query_params}")
            else:
                query_params = self.date_extractor.get_query_params(message)
                
            context["query_params"] = query_params
            
            # Verificar si ya fue interceptada respuesta de huéspedes
            was_intercepted = query_params.get('intercepted_guest_response', False)
            if was_intercepted:
                logger.info(f"🎯 CONTEXTO COMPLETO - Respuesta de huéspedes ya interceptada en clasificación")
            
            # 🆕 2.5. USAR CONTEXTO DEL FRONTEND si está disponible
            # 🎯 USAR CONTEXTO DEL FRONTEND - incluso si fue interceptada respuesta de huéspedes
            query_params = context["query_params"]  # Usar los parámetros actuales (pueden ser interceptados)
            
            # Procesar contexto del frontend si está disponible
            if frontend_context:
                current_query = frontend_context.get('currentQuery', {})
                was_intercepted = query_params.get('intercepted_guest_response', False)
                
                if was_intercepted:
                    logger.info(f"🎯 INTERCEPTACIÓN - Preservando contexto del frontend tras interceptar huéspedes")
                else:
                    logger.info(f"🔍 DEBUG - Usando contexto del frontend")
                
                # ✅ PRESERVAR FECHAS DEL CONTEXTO - incluso si fue interceptado
                if current_query.get('dates') and not query_params.get('has_dates'):
                    dates_from_context = current_query['dates']
                    logger.info(f"🔍 DEBUG - Fechas del contexto frontend: {dates_from_context}")
                    
                    # Mapear fechas del frontend al formato esperado
                    if dates_from_context.get('checkIn') and dates_from_context.get('checkOut'):
                        query_params.update({
                            'check_in': dates_from_context['checkIn'],
                            'check_out': dates_from_context['checkOut'],
                            'has_dates': True,
                            'inferred_from_frontend': True
                        })
                        if was_intercepted:
                            logger.info(f"🎯 INTERCEPTACIÓN - Fechas preservadas: {dates_from_context['checkIn']} a {dates_from_context['checkOut']}")
                    elif dates_from_context.get('singleDate'):
                        query_params.update({
                            'single_date': dates_from_context['singleDate'],
                            'has_dates': True,
                            'inferred_from_frontend': True
                        })
                        if was_intercepted:
                            logger.info(f"🎯 INTERCEPTACIÓN - Fecha única preservada: {dates_from_context['singleDate']}")
                
                # ✅ PRESERVAR DISPONIBILIDAD PREVIA - siempre
                if current_query.get('lastAvailability'):
                    query_params['previous_availability'] = True
                    if was_intercepted:
                        logger.info(f"🎯 INTERCEPTACIÓN - Disponibilidad previa preservada")
                
                # ✅ PRESERVAR HABITACIÓN SELECCIONADA - siempre (🎯 CRÍTICO - CONTEXTO COMPLETO)
                if current_query.get('habitacion'):
                    habitacion_frontend = current_query['habitacion']
                    query_params['previous_habitacion'] = habitacion_frontend
                    logger.info(f"🔍 DEBUG MAPEO CONTEXTO - Habitación del frontend mapeada: '{habitacion_frontend}' → query_params['previous_habitacion']")
                    if was_intercepted:
                        logger.info(f"🎯 INTERCEPTACIÓN - Habitación preservada: {habitacion_frontend}")
                
                # ✅ PRESERVAR HISTORIAL DE CONVERSACIÓN - siempre
                conversation_history = frontend_context.get('conversationHistory', [])
                if conversation_history:
                    context["frontend_conversation"] = {
                        "messages_count": len(conversation_history),
                        "recent_messages": conversation_history[-3:] if len(conversation_history) > 3 else conversation_history
                    }
                    logger.info(f"🔍 DEBUG - Historial del frontend: {len(conversation_history)} mensajes")
                    if was_intercepted:
                        logger.info(f"🎯 INTERCEPTACIÓN - Historial conversacional preservado: {len(conversation_history)} mensajes")
            
            # 2.6. FALLBACK: Buscar contexto en BD solo si no hay contexto del frontend y no hay fechas
            elif not frontend_context and not query_params.get('has_dates') and conversation_id:
                logger.info(f"🔍 DEBUG - Fallback: buscando contexto en BD")
                session_context = await self._get_session_context(hospedaje_id, user_id, conversation_id)
                if session_context:
                    context["session_context"] = session_context
                    # Si encontramos fechas en mensajes anteriores, usarlas
                    if session_context.get('last_dates'):
                        logger.info(f"🔍 DEBUG - Usando fechas del contexto de BD: {session_context['last_dates']}")
                        query_params.update(session_context['last_dates'])
                        query_params['inferred_from_session'] = True
            
            context["query_params"] = query_params
            
            # DEBUG: Log de parámetros extraídos
            logger.info(f"🔍 DEBUG - Mensaje: '{message}'")
            logger.info(f"🔍 DEBUG - Parámetros extraídos: {query_params}")
            logger.info(f"🔍 DEBUG - has_dates: {query_params.get('has_dates', False)}")
            logger.info(f"🔍 DEBUG - check_in: {query_params.get('check_in')}")
            logger.info(f"🔍 DEBUG - check_out: {query_params.get('check_out')}")
            logger.info(f"🔍 DEBUG - single_date: {query_params.get('single_date')}")
            logger.info(f"🔍 DEBUG - is_monthly_query: {query_params.get('is_monthly_query', False)}")
            logger.info(f"🆕 DEBUG - inferred_from_frontend: {query_params.get('inferred_from_frontend', False)}")
            
            # 2.1. VALIDAR FECHAS - NO PERMITIR FECHAS PASADAS
            fecha_invalida = self._validar_fechas_futuras(query_params)
            if fecha_invalida:
                context["error_fecha_pasada"] = {
                    "mensaje": f"No puedo consultar disponibilidad para fechas pasadas. La fecha {fecha_invalida} ya pasó. Solo puedo consultar disponibilidades desde hoy en adelante.",
                    "fecha_actual": datetime.now().strftime("%Y-%m-%d"),
                    "fecha_consultada": fecha_invalida
                }
                return context  # Retornar inmediatamente sin consultar backend
            
            # 3. OBTENER HABITACIONES (SIEMPRE - son datos base del hospedaje)
            habitaciones = await backend_service.get_habitaciones_hospedaje(hospedaje_id)
            context["habitaciones"] = [hab.dict() for hab in habitaciones]
            
            # 4. CONSULTAR DISPONIBILIDAD REAL si hay fechas (SIEMPRE FRESCO - NO reutilizar cache)
            if query_params.get('has_dates') and habitaciones:
                # 🔥 SIEMPRE consultar disponibilidad fresca del backend para datos actualizados
                logger.info(f"🔥 DISPONIBILIDAD FRESCA - Forzando consulta al backend para fechas: {query_params}")
                await self._add_availability_context(context, hospedaje_id, query_params, context["habitaciones"])
            
            # 5. CONSULTAR PRECIOS ESPECÍFICOS SOLO si la consulta es de tipo "precios"
            if query_type == "precios" and habitaciones:
                await self._add_pricing_context(context, query_params, context["habitaciones"])
            
            # 6. CONSULTAR DISPONIBILIDAD MENSUAL si se detecta consulta mensual
            if query_params.get('is_monthly_query'):
                await self._add_monthly_availability_context(context, hospedaje_id, query_params)
            
            # 7. CONSULTAR SERVICIOS según tipo de consulta
            await self._add_services_context(context, hospedaje_id, query_type, message)
            
            # 🆕 8. GENERAR INFORMACIÓN DE RESERVA ya se maneja en _add_services_context
            # Eliminamos la duplicación de generación de enlaces de checkout
            
            # 9. INFORMACIÓN DE PDF (complementaria)
            if context.get("hospedaje", {}).get("pdfUrl"):
                pdf_info = await self.knowledge_service.search_similar_content(
                    hospedaje_id, message, limit=2
                )
                if pdf_info:
                    context["pdf_info"] = pdf_info
            
            return context
                
        except Exception as e:
            logger.error(f"Error obteniendo contexto relevante: {e}")
        return context
    
    async def _build_prompt(
        self, 
        message: str, 
        context: Dict[str, Any], 
        query_type: str, 
        config: ChatbotConfig
    ) -> Dict[str, str]:
        """Construye el prompt para OpenAI"""
        try:
            # 🔍 DEBUG: Log del query_type recibido
            logger.info(f"🔍 DEBUG _build_prompt - query_type recibido: '{query_type}'")
            logger.info(f"🔍 DEBUG _build_prompt - context keys: {list(context.keys())}")
            if "query_type_override" in context:
                logger.info(f"🔍 DEBUG _build_prompt - query_type_override en context: '{context['query_type_override']}'")
            if "proceso_reserva_caso" in context:
                logger.info(f"🔍 DEBUG _build_prompt - proceso_reserva_caso en context: '{context['proceso_reserva_caso']}'")
                
            prompt_file_used = None  # Para trackear qué archivo se usa
            # MANEJO ESPECIAL: FECHA PASADA (máxima prioridad)
            if "error_fecha_pasada" in context:
                with open("app/prompts/error_fecha_pasada.txt", "r", encoding="utf-8") as f:
                    error_prompt = f.read()
                
                # Prompt mínimo para error de fecha pasada
                system_prompt = f"""Eres un asistente de reservas profesional. 
                
{error_prompt}

INFORMACIÓN DEL ERROR:
{context['error_fecha_pasada']['mensaje']}

FECHA ACTUAL: {context['error_fecha_pasada']['fecha_actual']}
FECHA CONSULTADA: {context['error_fecha_pasada']['fecha_consultada']}"""
                
                return {
                    "system": system_prompt,
                    "user": message
                }
            
            # Cargar prompt base (temporal - será reemplazado después)
            with open("app/prompts/system_base.txt", "r", encoding="utf-8") as f:
                system_prompt = f.read()
            
            # 🆕 MANEJO ESPECIAL PARA PROCESO_RESERVA - Usar caso específico
            if query_type == "proceso_reserva":
                caso_especifico = context.get("proceso_reserva_caso", "caso6")  # Fallback a caso6
                rules_file = f"app/prompts/proceso_reserva_{caso_especifico}.txt"
                prompt_file_used = rules_file
                logger.info(f"🎯 PROCESO_RESERVA - Usando archivo específico: {rules_file}")
                logger.info(f"🔍 DEBUG - Entrando a rama PROCESO_RESERVA con caso: {caso_especifico}")
                try:
                    with open(rules_file, "r", encoding="utf-8") as f:
                        specific_rules = f.read()
                    system_prompt += f"\n\n{specific_rules}"
                    logger.info(f"✅ DEBUG - Archivo {rules_file} cargado exitosamente")
                except FileNotFoundError:
                    logger.error(f"🎯 PROCESO_RESERVA - Archivo {rules_file} no encontrado, usando caso6")
                    try:
                        with open("app/prompts/proceso_reserva_caso6.txt", "r", encoding="utf-8") as f:
                            specific_rules = f.read()
                        system_prompt += f"\n\n{specific_rules}"
                        prompt_file_used = "app/prompts/proceso_reserva_caso6.txt"
                    except FileNotFoundError:
                        logger.error("🎯 PROCESO_RESERVA - Ni siquiera caso6 existe, usando fallback")
                        with open("app/prompts/fallback.txt", "r", encoding="utf-8") as f:
                            fallback_rules = f.read()
                        system_prompt += f"\n\n{fallback_rules}"
                        prompt_file_used = "app/prompts/fallback.txt"
            else:
                # LÓGICA NORMAL PARA OTROS TIPOS DE CONSULTA
                logger.info(f"🔍 DEBUG - Entrando a rama ELSE (NO proceso_reserva) con query_type: '{query_type}'")
                rules_file = f"app/prompts/{query_type}_rules.txt"
                try:
                    with open(rules_file, "r", encoding="utf-8") as f:
                        specific_rules = f.read()
                    system_prompt += f"\n\n{specific_rules}"
                    prompt_file_used = rules_file
                    logger.info(f"✅ DEBUG - Archivo directo {rules_file} cargado exitosamente")
                except FileNotFoundError:
                    logger.info(f"🔍 DEBUG - Archivo directo {rules_file} no encontrado, buscando en mapping")
                    # Mapear tipos de consulta específicos a archivos de reglas
                    rules_mapping = {
                        "disponibilidad": "availability_rules.txt",
                        "precios": "price_rules.txt",
                        "hospedaje_servicios": "hospedaje_services_rules.txt",
                        "habitacion_servicios": "habitacion_services_rules.txt",
                        "servicio_especifico": "servicio_especifico_rules.txt",
                        "metodos_pago": "metodos_pago_rules.txt",
                        "servicios_multiples_habitaciones": "servicios_multiples_habitaciones_rules.txt",
                        "capacidad_excedida_especifica": "capacidad_excedida_caso1.txt",
                        "capacidad_excedida_general": "capacidad_excedida_caso2.txt",
                        "capacidad_excedida_con_habitacion": "capacidad_excedida_con_habitacion_elegida.txt"
                        # proceso_reserva NO en mapping - tiene lógica específica completa arriba
                    }
                
                mapped_file = rules_mapping.get(query_type)
                logger.info(f"🔍 DEBUG - Mapping lookup para '{query_type}': {mapped_file}")
                if mapped_file:
                    try:
                        with open(f"app/prompts/{mapped_file}", "r", encoding="utf-8") as f:
                            specific_rules = f.read()
                        system_prompt += f"\n\n{specific_rules}"
                        prompt_file_used = f"app/prompts/{mapped_file}"
                        logger.info(f"✅ DEBUG - Archivo mapeado {mapped_file} cargado exitosamente")
                    except FileNotFoundError:
                        logger.error(f"❌ DEBUG - Archivo mapeado {mapped_file} no encontrado, usando fallback")
                        # Si tampoco existe el archivo mapeado, usar fallback
                        with open("app/prompts/fallback.txt", "r", encoding="utf-8") as f:
                            fallback_rules = f.read()
                        system_prompt += f"\n\n{fallback_rules}"
                        prompt_file_used = "app/prompts/fallback.txt"
                else:
                    logger.info(f"🔍 DEBUG - No hay mapping para '{query_type}', usando fallback")
                    # Si no hay reglas específicas ni mapeo, usar fallback
                    with open("app/prompts/fallback.txt", "r", encoding="utf-8") as f:
                        fallback_rules = f.read()
                    system_prompt += f"\n\n{fallback_rules}"
                    prompt_file_used = "app/prompts/fallback.txt"
            
            # Agregar reglas de fusión de datos si hay múltiples fuentes
            sources_summary = context.get("sources_summary", {})
            has_backend_data = (sources_summary.get("has_availability_real") or 
                              sources_summary.get("has_pricing_real") or 
                              sources_summary.get("has_servicios_hospedaje"))
            has_pdf_data = sources_summary.get("has_pdf_info")
            
            if has_backend_data and has_pdf_data:
                try:
                    with open("app/prompts/data_fusion_rules.txt", "r", encoding="utf-8") as f:
                        fusion_rules = f.read()
                    system_prompt += f"\n\n{fusion_rules}"
                except FileNotFoundError:
                    logger.warning("Archivo de reglas de fusión no encontrado")
            elif has_backend_data:
                system_prompt += "\n\n⚡ DATOS EN TIEMPO REAL: Tienes acceso a información actualizada del sistema. Úsala como fuente principal."
            elif has_pdf_data:
                system_prompt += "\n\n📄 INFORMACIÓN DOCUMENTAL: Responde basándote en la información de los documentos del hospedaje."
            
            # Personalizar con configuración del hospedaje
            hospedaje_data = context.get("hospedaje", {})
            
            # 🔧 FIX: Extraer datos del hospedaje si no están en el contexto principal
            if not hospedaje_data:
                availability_real = context.get("availability_real", {})
                hospedaje_disp = availability_real.get("hospedaje_disponibilidad", {})
                detalle_habitaciones = hospedaje_disp.get("detalle_habitaciones", [])
                if detalle_habitaciones:
                    # Los datos del hospedaje están en la primera habitación
                    first_habitacion = detalle_habitaciones[0]
                    hospedaje_data = first_habitacion.get("hospedaje", {})
            
            # 🎯 SEPARAR datos del hospedaje de datos de contacto
            # Determinar si hay disponibilidad o precios para decidir qué datos incluir
            availability_real = context.get("availability_real", {})
            hospedaje_disp = availability_real.get("hospedaje_disponibilidad", {})
            hay_disponibilidad = hospedaje_disp.get("disponible", False)
            hay_precios = context.get("pricing_real") is not None
            
            # Si hay precios o disponibilidad, no mostrar datos de contacto
            mostrar_datos_positivos = hay_disponibilidad or hay_precios
            
            # 📋 DATOS BÁSICOS DEL HOSPEDAJE (siempre incluir)
            replacements = {
                "{TONO}": config.tono,
                "{tono}": config.tono,
                "{HOSPEDAJE_NOMBRE}": hospedaje_data.get("nombre", "nuestro hospedaje"),
                "{nombre_hospedaje}": hospedaje_data.get("nombre", "nuestro hospedaje"),
                "{direccion}": hospedaje_data.get("direccion", "dirección del hospedaje"),
            }
            
            # 📞 DATOS DE CONTACTO (solo incluir si NO hay disponibilidad NI precios)
            if not mostrar_datos_positivos:
                logger.info(f"🔧 SIN disponibilidad ni precios - Incluyendo datos de contacto")
                replacements.update({
                    "{telefono_contacto}": hospedaje_data.get("telefonoContacto", "teléfono de contacto"),
                    "{mail_contacto}": hospedaje_data.get("mailContacto", "email de contacto"), 
                    "{responsable}": hospedaje_data.get("responsable", "responsable"),
                })
            else:
                logger.info(f"🔧 CON disponibilidad o precios - NO incluyendo datos de contacto")
                # Para respuestas positivas, dejar las variables vacías para que no se muestren
                replacements.update({
                    "{telefono_contacto}": "",
                    "{mail_contacto}": "", 
                    "{responsable}": "",
                                 })
            
            # 🎯 RECARGAR PROMPT CORRECTO SEGÚN DISPONIBILIDAD O PRECIOS (NO proceso_reserva - tiene lógica propia)
            if mostrar_datos_positivos and query_type != "proceso_reserva":
                # Prompt SIN datos de contacto
                with open("app/prompts/system_base_positive.txt", "r", encoding="utf-8") as f:
                    system_prompt = f.read()
                logger.info(f"🔧 Usando prompt POSITIVO (sin contacto) - Disponibilidad: {hay_disponibilidad}, Precios: {hay_precios}")
                
                # Volver a agregar reglas específicas
                rules_file = f"app/prompts/{query_type}_rules.txt"
                try:
                    with open(rules_file, "r", encoding="utf-8") as f:
                        specific_rules = f.read()
                    system_prompt += f"\n\n{specific_rules}"
                except FileNotFoundError:
                    # Mapear tipos de consulta específicos a archivos de reglas
                    rules_mapping = {
                        "disponibilidad": "availability_rules.txt",
                        "precios": "price_rules.txt",
                        "hospedaje_servicios": "hospedaje_services_rules.txt",
                        "habitacion_servicios": "habitacion_services_rules.txt",
                        "servicio_especifico": "servicio_especifico_rules.txt",
                        "metodos_pago": "metodos_pago_rules.txt",
                        "servicios_multiples_habitaciones": "servicios_multiples_habitaciones_rules.txt",
                        "capacidad_excedida_especifica": "capacidad_excedida_caso1.txt",
                        "capacidad_excedida_general": "capacidad_excedida_caso2.txt",
                        "capacidad_excedida_con_habitacion": "capacidad_excedida_con_habitacion_elegida.txt"
                    }
                    
                    mapped_file = rules_mapping.get(query_type)
                    if mapped_file:
                        try:
                            with open(f"app/prompts/{mapped_file}", "r", encoding="utf-8") as f:
                                specific_rules = f.read()
                            system_prompt += f"\n\n{specific_rules}"
                        except FileNotFoundError:
                            # Si tampoco existe el archivo mapeado, usar fallback
                            with open("app/prompts/fallback.txt", "r", encoding="utf-8") as f:
                                fallback_rules = f.read()
                            system_prompt += f"\n\n{fallback_rules}"
                    else:
                        # Si no hay reglas específicas ni mapeo, usar fallback
                        with open("app/prompts/fallback.txt", "r", encoding="utf-8") as f:
                            fallback_rules = f.read()
                        system_prompt += f"\n\n{fallback_rules}"
            elif query_type != "proceso_reserva":
                logger.info(f"🔧 Usando prompt NORMAL (con contacto)")
            # proceso_reserva usa su lógica específica de casos, no llega aquí
            
            # Aplicar todos los reemplazos
            for placeholder, value in replacements.items():
                system_prompt = system_prompt.replace(placeholder, str(value))
            
            # Agregar contexto
            context_str = self._format_context(context)
            system_prompt += f"\n\nCONTEXTO DISPONIBLE:\n{context_str}"
            
            # 🔍 DEBUG FINAL: Confirmar qué archivo se usó
            logger.info(f"🎯 DEBUG FINAL - Prompt construido usando archivo: {prompt_file_used}")
            logger.info(f"🎯 DEBUG FINAL - query_type final: '{query_type}'")
            
            return {
                "system": system_prompt,
                "user": message
            }
            
        except Exception as e:
            logger.error(f"Error construyendo prompt: {e}")
            return {
                "system": "Eres un asistente útil para un hospedaje.",
                "user": message
            }
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Formatea el contexto para el prompt combinando todas las fuentes"""
        formatted = []
        
        # 1. INFORMACIÓN BÁSICA DEL HOSPEDAJE (filtrada según disponibilidad)
        if "hospedaje" in context:
            hospedaje_data = context['hospedaje'].copy()
            
            # 🔧 FILTRAR datos de contacto si hay disponibilidad positiva o precios
            availability_real = context.get("availability_real", {})
            hospedaje_disp = availability_real.get("hospedaje_disponibilidad", {})
            hay_disponibilidad = hospedaje_disp.get("disponible", False)
            hay_precios = context.get("pricing_real") is not None
            mostrar_datos_positivos = hay_disponibilidad or hay_precios
            
            if mostrar_datos_positivos:
                # Eliminar datos de contacto del contexto para OpenAI
                hospedaje_data.pop("telefonoContacto", None)
                hospedaje_data.pop("mailContacto", None) 
                hospedaje_data.pop("responsable", None)
                logger.info(f"🔧 FILTRADO - Datos de contacto eliminados del contexto JSON (Disponibilidad: {hay_disponibilidad}, Precios: {hay_precios})")
            
            formatted.append(f"HOSPEDAJE: {json.dumps(hospedaje_data, ensure_ascii=False, indent=2)}")
        
        # 2. PARÁMETROS EXTRAÍDOS DE LA CONSULTA
        if "query_params" in context:
            params = context["query_params"]
            if params.get('has_dates') or params.get('guests') or params.get('nights'):
                formatted.append(f"PARÁMETROS DE LA CONSULTA: {json.dumps(params, ensure_ascii=False, indent=2)}")
        
        # 2.1. ERROR DE FECHA PASADA (TIENE PRIORIDAD ABSOLUTA)
        if "error_fecha_pasada" in context:
            formatted.append(f"⚠️ ERROR: FECHA PASADA - {json.dumps(context['error_fecha_pasada'], ensure_ascii=False, indent=2)}")
            # Si hay error de fecha pasada, no agregar más información de disponibilidad/precios
            return "\n\n".join(formatted)
        
        # 3. HABITACIONES DEL HOSPEDAJE (FORMATO SIMPLIFICADO)
        if "habitaciones" in context:
            habitaciones_text = self._format_habitaciones_simple(context["habitaciones"])
            formatted.append(habitaciones_text)
        
        # 4. DISPONIBILIDAD REAL (FORMATO SIMPLIFICADO Y FILTRADO)
        # 🚨 CRITICAL: Solo agregar disponibilidad si NO hay información de reserva
        if "availability_real" in context and "reserva_info" not in context:
            availability_data = context["availability_real"].copy()
            
            # 🔧 FILTRAR datos de contacto del hospedaje en las habitaciones si hay disponibilidad o precios
            hospedaje_disp = availability_data.get("hospedaje_disponibilidad", {})
            hay_disponibilidad = hospedaje_disp.get("disponible", False)
            hay_precios = context.get("pricing_real") is not None
            mostrar_datos_positivos = hay_disponibilidad or hay_precios
            
            if mostrar_datos_positivos:
                detalle_habitaciones = hospedaje_disp.get("detalle_habitaciones", [])
                for habitacion in detalle_habitaciones:
                    if "hospedaje" in habitacion:
                        # Eliminar datos de contacto del hospedaje en cada habitación
                        habitacion["hospedaje"].pop("telefonoContacto", None)
                        habitacion["hospedaje"].pop("mailContacto", None)
                        habitacion["hospedaje"].pop("responsable", None)
                logger.info(f"🔧 FILTRADO - Datos de contacto eliminados de habitaciones también")
            
            availability_text = self._format_availability_simple(availability_data)
            formatted.append(availability_text)
        elif "availability_real" in context and "reserva_info" in context:
            logger.info(f"🚨 CONTEXTO LIMPIO - Omitiendo disponibilidad porque hay información de reserva")
        
        # 5. PRECIOS ESPECÍFICOS (TIEMPO REAL DEL BACKEND)
        if "pricing_real" in context:
            formatted.append(f"💰 PRECIOS ESPECÍFICOS (BACKEND): {json.dumps(context['pricing_real'], ensure_ascii=False, indent=2)}")
        
        # 5.1. DISPONIBILIDAD MENSUAL (TIEMPO REAL DEL BACKEND)
        if "monthly_availability" in context:
            formatted.append(f"📅 DISPONIBILIDAD MENSUAL (BACKEND): {json.dumps(context['monthly_availability'], ensure_ascii=False, indent=2)}")
        
        # 6. SERVICIOS DEL HOSPEDAJE (TIEMPO REAL DEL BACKEND)
        if "servicios_hospedaje" in context:
            formatted.append(f"🏨 SERVICIOS DEL HOSPEDAJE (BACKEND): {json.dumps(context['servicios_hospedaje'], ensure_ascii=False, indent=2)}")
        
        # 7. SERVICIOS DE HABITACIONES (TIEMPO REAL DEL BACKEND)
        if "servicios_habitaciones" in context:
            formatted.append(f"🛏️ SERVICIOS POR HABITACIÓN (BACKEND): {json.dumps(context['servicios_habitaciones'], ensure_ascii=False, indent=2)}")
        
        # 8. CONTEXTO DE SESIÓN (CONVERSACIÓN PREVIA)
        if "session_context" in context:
            session_data = context["session_context"]
            session_formatted = "💬 CONTEXTO DE LA CONVERSACIÓN:\n"
            
            if session_data.get("last_dates"):
                session_formatted += f"• Fechas de consulta anterior: {json.dumps(session_data['last_dates'], ensure_ascii=False)}\n"
            
            if session_data.get("last_habitacion"):
                session_formatted += f"• Habitación mencionada: {session_data['last_habitacion']}\n"
            
            if session_data.get("last_availability"):
                session_formatted += f"• Disponibilidad confirmada previamente: Sí\n"
            
            # Agregar últimos 2 mensajes para contexto
            if session_data.get("previous_messages"):
                session_formatted += "• Mensajes recientes:\n"
                for i, msg in enumerate(session_data["previous_messages"][:2]):
                    session_formatted += f"  {i+1}. Usuario: '{msg['user']}' → Bot: '{msg['bot'][:100]}...'\n"
            
            formatted.append(session_formatted)
        
        # 9. BÚSQUEDA DE SERVICIO ESPECÍFICO (NUEVA FUNCIONALIDAD)
        if "busqueda_servicio_especifico" in context:
            busqueda_data = context["busqueda_servicio_especifico"]
            busqueda_formatted = f"🔍 BÚSQUEDA DE SERVICIO ESPECÍFICO:\n"
            busqueda_formatted += f"• Término buscado: '{busqueda_data['termino_buscado']}'\n"
            busqueda_formatted += f"• Habitación consultada: {busqueda_data['habitacion_actual']['nombre']}\n"
            busqueda_formatted += f"• Escenario: {busqueda_data['escenario']}\n"
            
            # Servicios encontrados en habitación actual
            if busqueda_data['habitacion_actual']['servicios_encontrados']:
                busqueda_formatted += f"• 🛏️ SERVICIOS EN HABITACIÓN ACTUAL: {json.dumps(busqueda_data['habitacion_actual']['servicios_encontrados'], ensure_ascii=False, indent=2)}\n"
            
            # Servicios encontrados en otras habitaciones
            if busqueda_data['otras_habitaciones']:
                busqueda_formatted += f"• 🏠 SERVICIOS EN OTRAS HABITACIONES:\n"
                for habitacion in busqueda_data['otras_habitaciones']:
                    busqueda_formatted += f"  - {habitacion['habitacion_nombre']}: {json.dumps(habitacion['servicios_encontrados'], ensure_ascii=False)}\n"
            
            # Servicios encontrados en hospedaje
            if busqueda_data['hospedaje']['servicios_encontrados']:
                busqueda_formatted += f"• 🏨 SERVICIOS EN HOSPEDAJE: {json.dumps(busqueda_data['hospedaje']['servicios_encontrados'], ensure_ascii=False, indent=2)}\n"
            
            formatted.append(busqueda_formatted)

        # 10. INFORMACIÓN DE DOCUMENTOS PDF
        if "pdf_info" in context:
            formatted.append(f"📄 INFORMACIÓN DE DOCUMENTOS PDF: {context['pdf_info']}")
        
        # 11. CONSULTAS SIMILARES PREVIAS
        if "similar_queries" in context:
            formatted.append(f"🔍 CONSULTAS SIMILARES PREVIAS: {json.dumps(context['similar_queries'], ensure_ascii=False, indent=2)}")
        
        # 12. 🆕 INFORMACIÓN DE RESERVA (CRÍTICO PARA PROCESO_RESERVA)
        if "reserva_info" in context:
            formatted.append(f"🎯 RESERVA_INFO: {json.dumps(context['reserva_info'], ensure_ascii=False, indent=2)}")
        
        if "reserva_error" in context:
            formatted.append(f"❌ RESERVA_ERROR: {context['reserva_error']}")
        
        # 13. RESUMEN DE FUENTES DISPONIBLES
        if "sources_summary" in context:
            sources = context["sources_summary"]
            active_sources = [key.replace("has_", "") for key, value in sources.items() if value]
            formatted.append(f"📊 FUENTES DISPONIBLES: {', '.join(active_sources)}")
        
        return "\n\n".join(formatted)
    
    def _format_availability_simple(self, availability_data: Dict[str, Any]) -> str:
        """Formatea la información de disponibilidad de forma simple y clara"""
        try:
            hospedaje_disp = availability_data.get("hospedaje_disponibilidad", {})
            
            if not hospedaje_disp:
                return "❌ NO HAY INFORMACIÓN DE DISPONIBILIDAD"
            
            disponible = hospedaje_disp.get("disponible", False)
            fecha_inicio = hospedaje_disp.get("fecha_inicio")
            fecha_fin = hospedaje_disp.get("fecha_fin")
            habitaciones_count = hospedaje_disp.get("habitaciones_disponibles", 0)
            detalle_habitaciones = hospedaje_disp.get("detalle_habitaciones", [])
            
            if not disponible:
                motivo = hospedaje_disp.get("motivo", "No especificado")
                return f"❌ NO HAY DISPONIBILIDAD para {fecha_inicio} al {fecha_fin}\nMotivo: {motivo}"
            
            # Formatear fechas en formato legible
            fecha_texto = ""
            if fecha_inicio == fecha_fin:
                fecha_texto = f"para el {self._format_date_readable(fecha_inicio)}"
            else:
                fecha_texto = f"del {self._format_date_readable(fecha_inicio)} al {self._format_date_readable(fecha_fin)}"
            
            # Construir respuesta positiva
            result = f"✅ DISPONIBILIDAD CONFIRMADA {fecha_texto}\n"
            result += f"• {habitaciones_count} habitación(es) disponible(s)\n"
            
            # Agregar detalles de habitaciones disponibles
            if detalle_habitaciones:
                result += "\nHABITACIONES DISPONIBLES:\n"
                for i, hab in enumerate(detalle_habitaciones, 1):
                    nombre = hab.get("nombre", "Habitación sin nombre")
                    descripcion = hab.get("descripcionCorta", "")
                    capacidad = hab.get("capacidad", "")
                    
                    result += f"{i}. {nombre}"
                    if capacidad:
                        result += f" (capacidad: {capacidad} personas)"
                    if descripcion:
                        # Resumir descripción si es muy larga
                        desc_short = descripcion[:100] + "..." if len(descripcion) > 100 else descripcion
                        result += f"\n   • {desc_short}"
                    result += "\n"
            
            return result
            
        except Exception as e:
            logger.error(f"Error formateando disponibilidad: {e}")
            return "❌ ERROR AL PROCESAR INFORMACIÓN DE DISPONIBILIDAD"
    
    def _format_date_readable(self, date_str: str) -> str:
        """Convierte fecha YYYY-MM-DD a formato legible DD/MM/YYYY"""
        try:
            if not date_str:
                return "fecha no especificada"
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            return date_obj.strftime("%d/%m/%Y")
        except:
            return date_str
    
    def _format_habitaciones_simple(self, habitaciones: List[Dict[str, Any]]) -> str:
        """Formatea la información de habitaciones de forma simple"""
        try:
            if not habitaciones:
                return "❌ NO HAY HABITACIONES REGISTRADAS"
            
            result = f"🏨 HABITACIONES DEL HOSPEDAJE ({len(habitaciones)} habitación(es)):\n"
            
            for i, hab in enumerate(habitaciones, 1):
                nombre = hab.get("nombre", f"Habitación {i}")
                descripcion = hab.get("descripcionCorta", "")
                capacidad = hab.get("capacidad", "")
                precio_base = hab.get("precioBase", "")
                
                result += f"\n{i}. {nombre}"
                if capacidad:
                    result += f" (capacidad: {capacidad} personas)"
                if precio_base:
                    # Formatear precio base
                    try:
                        precio_num = float(precio_base)
                        from ..services.backend_service import formatear_precio_argentino
                        precio_formateado = formatear_precio_argentino(precio_num)
                        result += f" - Precio base: {precio_formateado},00"
                    except:
                        result += f" - Precio base: {precio_base}"
                
                if descripcion:
                    # Resumir descripción
                    desc_short = descripcion[:150] + "..." if len(descripcion) > 150 else descripcion
                    result += f"\n   • {desc_short}"
                result += "\n"
            
            return result
            
        except Exception as e:
            logger.error(f"Error formateando habitaciones: {e}")
            return "❌ ERROR AL PROCESAR INFORMACIÓN DE HABITACIONES"
    
    async def _save_message(
        self, 
        hospedaje_id: str, 
        user_id: str, 
        conversation_id: str, 
        message: str, 
        role: str
    ):
        """Guarda un mensaje en el historial"""
        try:
            current_time = datetime.now()
            
            if role == "user":
                # Insertar mensaje del usuario
                query = """
                INSERT INTO chat_history 
                (hospedaje_id, user_id, session_id, user_message, bot_response, sources_used, response_time, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                params = [hospedaje_id, user_id, conversation_id, message, '', '[]', 0, current_time]
                await execute_vector_query(query, params)
                logger.info(f"💾 DEBUG - Mensaje de usuario guardado correctamente")
            else:
                # Insertar respuesta del bot
                query = """
                INSERT INTO chat_history 
                (hospedaje_id, user_id, session_id, user_message, bot_response, sources_used, response_time, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                params = [hospedaje_id, user_id, conversation_id, '', message, '[]', 0, current_time]
                await execute_vector_query(query, params)
                logger.info(f"💾 DEBUG - Respuesta del bot guardada correctamente")
                
        except Exception as e:
            logger.error(f"Error guardando mensaje: {e}")
            # No propagar el error para que el chatbot siga funcionando
            pass
    
    async def _get_similar_history(
        self, 
        hospedaje_id: str, 
        message: str, 
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """Obtiene historial de consultas similares"""
        try:
            # Generar embedding del mensaje
            embedding = await self.knowledge_service.generate_embedding(message)
            
            # Buscar consultas similares (sin embedding por ahora)
            query = """
            SELECT user_message, 'user' as role, created_at
            FROM chat_history 
            WHERE hospedaje_id = %s 
              AND user_message IS NOT NULL 
              AND user_message != ''
              AND created_at >= %s
            ORDER BY created_at DESC
            LIMIT %s
            """
            
            # Calcular fecha límite y convertir a string
            fecha_limite = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
            
            results = await execute_vector_query(query, [
                hospedaje_id,
                fecha_limite,
                limit
            ])
            
            return [
                {
                    "message": row[0],
                    "role": row[1],
                    "created_at": row[2].isoformat()
                }
                for row in results
            ]
            
        except Exception as e:
            logger.error(f"Error obteniendo historial similar: {e}")
            return []
    
    async def get_user_history(
        self, 
        hospedaje_id: str, 
        user_id: str, 
        page: int = 1, 
        limit: int = 20
    ) -> ChatHistoryResponse:
        """Obtiene el historial de chat de un usuario"""
        try:
            offset = (page - 1) * limit
            
            query = """
            SELECT user_message, bot_response, created_at, session_id
            FROM chat_history 
            WHERE hospedaje_id = %s AND user_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """
            
            results = await execute_vector_query(query, [
                hospedaje_id, user_id, limit, offset
            ])
            
            messages = []
            for row in results:
                # Agregar mensaje del usuario
                if row[0]:  # user_message
                    messages.append(ChatMessage(
                        message=row[0],
                        role="user",
                        timestamp=row[2],
                        session_id=row[3]
                    ))
                # Agregar respuesta del bot
                if row[1]:  # bot_response
                    messages.append(ChatMessage(
                        message=row[1],
                        role="assistant",
                        timestamp=row[2],
                        session_id=row[3]
                    ))
            
            # Contar total
            count_query = """
            SELECT COUNT(*) FROM chat_history 
            WHERE hospedaje_id = %s AND user_id = %s
            """
            
            total_result = await execute_vector_query_one(count_query, [hospedaje_id, user_id])
            total = total_result[0] if total_result else 0
            
            return ChatHistoryResponse(
                messages=messages,
                total=total,
                page=page,
                limit=limit,
                hospedaje_id=hospedaje_id
            )
            
        except Exception as e:
            logger.error(f"Error obteniendo historial: {e}")
            return ChatHistoryResponse(
                messages=[],
                total=0,
                page=page,
                limit=limit,
                hospedaje_id=hospedaje_id
            )
    
    async def get_user_all_hospedajes_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Obtiene historial de todos los hospedajes para un usuario"""
        try:
            query = """
            SELECT DISTINCT hospedaje_id, 
                   COUNT(*) as message_count,
                   MAX(created_at) as last_message
            FROM chat_history 
            WHERE user_id = %s
            GROUP BY hospedaje_id
            ORDER BY last_message DESC
            """
            
            results = await execute_vector_query(query, [user_id])
            
            return [
                {
                    "hospedaje_id": row[0],
                    "message_count": row[1],
                    "last_message": row[2].isoformat()
                }
                for row in results
            ]
            
        except Exception as e:
            logger.error(f"Error obteniendo historial completo: {e}")
            return []
    
    async def retrain_hospedaje(self, hospedaje_id: str) -> bool:
        """Re-entrena el chatbot de un hospedaje"""
        try:
            # Re-procesar documentos PDF
            success = await self.knowledge_service.retrain_hospedaje_knowledge(hospedaje_id)
            
            if success:
                # Marcar como entrenado en el backend
                await backend_service.mark_as_trained(hospedaje_id)
                
            return success
            
        except Exception as e:
            logger.error(f"Error re-entrenando hospedaje: {e}")
            return False

    async def _add_availability_context(
        self, 
        context: Dict[str, Any], 
        hospedaje_id: str, 
        query_params: Dict[str, Any], 
        habitaciones: List[Any]
    ):
        """Agrega información de disponibilidad real del backend"""
        logger.info(f"🆕 CONSULTAR BACKEND - Iniciando consulta fresca de disponibilidad...")
        logger.info(f"🆕 CONSULTAR BACKEND - hospedaje_id: {hospedaje_id}")
        logger.info(f"🆕 CONSULTAR BACKEND - query_params: {query_params}")
        logger.info(f"🆕 CONSULTAR BACKEND - habitaciones count: {len(habitaciones) if habitaciones else 0}")
        try:
            availability_info = {}
            
            # Obtener fechas para consultar
            check_in = query_params.get('check_in')
            check_out = query_params.get('check_out')
            single_date = query_params.get('single_date')
            
                        # Si tenemos rango de fechas, consultar disponibilidad del hospedaje
            if check_in and check_out:
                logger.info(f"🔍 DEBUG - Consultando disponibilidad para rango: {check_in} - {check_out}")
                hospedaje_availability = await backend_service.check_disponibilidad_hospedaje(
                    hospedaje_id, check_in, check_out
                )
                logger.info(f"🆕 CONSULTAR BACKEND - Resultado disponibilidad: {hospedaje_availability}")
                if hospedaje_availability:
                    availability_info["hospedaje_disponibilidad"] = hospedaje_availability.dict()
                    logger.info(f"🆕 CONSULTAR BACKEND - Disponibilidad fresca agregada al contexto")

            # Si solo tenemos una fecha, consultar disponibilidad general
            elif single_date:
                logger.info(f"🔍 DEBUG - Consultando disponibilidad para fecha única: {single_date}")
                # Para una sola fecha, consultar como check-in y siguiente día como check-out
                next_day = datetime.strptime(single_date, "%Y-%m-%d") + timedelta(days=1)
                check_out_single = next_day.strftime("%Y-%m-%d")
                
                hospedaje_availability = await backend_service.check_disponibilidad_hospedaje(
                    hospedaje_id, single_date, check_out_single
                )
                logger.info(f"🆕 CONSULTAR BACKEND - Resultado disponibilidad single: {hospedaje_availability}")
                if hospedaje_availability:
                    availability_info["hospedaje_disponibilidad"] = hospedaje_availability.dict()
                    logger.info(f"🆕 CONSULTAR BACKEND - Disponibilidad single fresca agregada al contexto")
            
            if availability_info:
                context["availability_real"] = availability_info
                
        except Exception as e:
            logger.error(f"Error obteniendo disponibilidad: {e}")

    async def _add_pricing_context(
        self, 
        context: Dict[str, Any], 
        query_params: Dict[str, Any], 
        habitaciones: List[Any]
    ):
        """Agrega información de precios específicos del backend - SIEMPRE usa endpoints reales"""
        try:
            pricing_info = {}
            
            # Obtener fechas para consultar precios
            check_in = query_params.get('check_in')
            check_out = query_params.get('check_out')
            single_date = query_params.get('single_date')
            has_dates = query_params.get('has_dates', False)
            inferred_from_session = query_params.get('inferred_from_session', False)
            
            logger.info(f"🔧 DEBUG PRECIOS - Iniciando consulta de precios")
            logger.info(f"🔧 DEBUG PRECIOS - has_dates: {has_dates}")
            logger.info(f"🔧 DEBUG PRECIOS - check_in: {check_in}")
            logger.info(f"🔧 DEBUG PRECIOS - check_out: {check_out}")
            logger.info(f"🔧 DEBUG PRECIOS - single_date: {single_date}")
            logger.info(f"🔧 DEBUG PRECIOS - inferred_from_session: {inferred_from_session}")
            
            # 🔧 FILTRAR HABITACIONES: Solo obtener precios de habitaciones disponibles
            habitaciones_para_precios = habitaciones
            
            # Si hay información de disponibilidad en el contexto, usar solo las disponibles
            if "availability_real" in context:
                availability_data = context["availability_real"]
                hospedaje_disp = availability_data.get("hospedaje_disponibilidad", {})
                detalle_habitaciones = hospedaje_disp.get("detalle_habitaciones", [])
                
                if detalle_habitaciones and hospedaje_disp.get("disponible", False):
                    # Extraer IDs de habitaciones disponibles
                    habitaciones_disponibles_ids = [hab.get("id") for hab in detalle_habitaciones]
                    # Filtrar la lista de habitaciones
                    habitaciones_para_precios = [
                        hab for hab in habitaciones 
                        if hab.get("id") in habitaciones_disponibles_ids
                    ]
                    logger.info(f"🔧 DEBUG PRECIOS - Filtrando por disponibilidad: {len(habitaciones_para_precios)} de {len(habitaciones)} habitaciones")
                    for hab in habitaciones_para_precios:
                        logger.info(f"🔧 DEBUG PRECIOS - Habitación filtrada: {hab.get('nombre')} (ID: {hab.get('id')})")
            
            # Consultar precios para cada habitación disponible
            for hab in habitaciones_para_precios:
                hab_id = hab.get("id")
                hab_nombre = hab.get("nombre", hab_id)
                
                if not hab_id:
                    continue
                
                pricing_info[hab_id] = {
                    "habitacion_nombre": hab_nombre,
                    "precios": {}
                }
                
                logger.info(f"🔧 DEBUG PRECIOS - Consultando precios para habitación: {hab_nombre} (ID: {hab_id})")
                
                # LÓGICA PRINCIPAL: SIEMPRE consultar endpoints reales
                if check_in and check_out:
                    # Rango de fechas
                    logger.info(f"🔧 DEBUG PRECIOS - Consultando rango: {check_in} a {check_out}")
                    precio_rango = await backend_service.get_precios_habitacion(
                        hab_id, check_in, check_out
                    )
                    if precio_rango:
                        pricing_info[hab_id]["precios"]["rango"] = precio_rango.dict()
                        logger.info(f"✅ DEBUG PRECIOS - Rango obtenido para {hab_nombre}")
                
                elif single_date:
                    # Fecha única: convertir a rango de 1 noche (fecha → fecha+1)
                    try:
                        from datetime import datetime, timedelta
                        fecha_inicio = datetime.strptime(single_date, '%Y-%m-%d')
                        fecha_fin = fecha_inicio + timedelta(days=1)
                        fecha_fin_str = fecha_fin.strftime('%Y-%m-%d')
                        
                        logger.info(f"🔧 DEBUG PRECIOS - Fecha única convertida a rango: {single_date} a {fecha_fin_str}")
                        precio_especifico = await backend_service.get_precios_habitacion(
                            hab_id, single_date, fecha_fin_str
                        )
                        if precio_especifico:
                            pricing_info[hab_id]["precios"]["fecha_especifica"] = precio_especifico.dict()
                            logger.info(f"✅ DEBUG PRECIOS - Precio específico obtenido para {hab_nombre}")
                    except Exception as e:
                        logger.error(f"Error convirtiendo fecha única a rango: {e}")
                
                elif check_in:
                    # Solo check_in: tratar como fecha única
                    try:
                        from datetime import datetime, timedelta
                        fecha_inicio = datetime.strptime(check_in, '%Y-%m-%d')
                        fecha_fin = fecha_inicio + timedelta(days=1)
                        fecha_fin_str = fecha_fin.strftime('%Y-%m-%d')
                        
                        logger.info(f"🔧 DEBUG PRECIOS - Check-in único convertido a rango: {check_in} a {fecha_fin_str}")
                        precio_checkin = await backend_service.get_precios_habitacion(
                            hab_id, check_in, fecha_fin_str
                        )
                        if precio_checkin:
                            pricing_info[hab_id]["precios"]["check_in"] = precio_checkin.dict()
                            logger.info(f"✅ DEBUG PRECIOS - Precio check-in obtenido para {hab_nombre}")
                    except Exception as e:
                        logger.error(f"Error convirtiendo check-in a rango: {e}")
                
                else:
                    # NO hay fechas: usar precio base como último recurso
                    precio_base = hab.get("precioBase")
                    if precio_base:
                        logger.info(f"🔧 DEBUG PRECIOS - Sin fechas, usando precio base: {precio_base}")
                        try:
                            precio_base_float = float(precio_base)
                            from ..services.backend_service import formatear_precio_argentino
                            precio_formateado = formatear_precio_argentino(precio_base_float)
                            pricing_info[hab_id]["precios"]["base"] = {
                                "precio_base": precio_base_float,
                                "precio_formateado": precio_formateado,
                                "tipo": "precio_base_sin_fechas"
                            }
                            logger.info(f"✅ DEBUG PRECIOS - Precio base formateado para {hab_nombre}: {precio_formateado}")
                        except (ValueError, TypeError) as e:
                            logger.error(f"Error formateando precio base: {e}")
            
            if pricing_info:
                context["pricing_real"] = pricing_info
                logger.info(f"🔧 DEBUG PRECIOS - Contexto de precios agregado: {len(pricing_info)} habitaciones")
                
        except Exception as e:
            logger.error(f"Error obteniendo precios: {e}")

    async def _add_monthly_availability_context(
        self, 
        context: Dict[str, Any], 
        hospedaje_id: str, 
        query_params: Dict[str, Any]
    ):
        """Agrega información de disponibilidad mensual del backend"""
        try:
            monthly_info = {}
            
            # Obtener información mensual
            single_month = query_params.get('single_month')
            multiple_months = query_params.get('multiple_months')
            
            if single_month:
                # Consulta para un solo mes (ej: "2025-07")
                año, mes = single_month.split('-')
                disponibilidad_mes = await backend_service.get_disponibilidad_mensual(
                    hospedaje_id, int(mes), int(año)
                )
                if disponibilidad_mes:
                    monthly_info["disponibilidad_mes"] = disponibilidad_mes
                    
            elif multiple_months:
                # Consulta para múltiples meses (ej: ["2025-07", "2025-08"])
                meses_str = ','.join(multiple_months)
                disponibilidad_meses = await backend_service.get_disponibilidad_multiples_meses(
                    hospedaje_id, meses_str
                )
                if disponibilidad_meses:
                    monthly_info["disponibilidad_meses"] = disponibilidad_meses
            
            if monthly_info:
                context["monthly_availability"] = monthly_info
                
        except Exception as e:
            logger.error(f"Error obteniendo disponibilidad mensual: {e}")

    def _create_sources_summary(self, context: Dict[str, Any]) -> Dict[str, bool]:
        """Crea un resumen de qué fuentes están disponibles"""
        return {
            "has_hospedaje_info": "hospedaje" in context,
            "has_habitaciones": "habitaciones" in context,
            "has_servicios_hospedaje": "servicios_hospedaje" in context,
            "has_servicios_habitaciones": "servicios_habitaciones" in context,
            "has_availability_real": "availability_real" in context,
            "has_pricing_real": "pricing_real" in context,
            "has_monthly_availability": "monthly_availability" in context,
            "has_pdf_info": "pdf_info" in context,
            "has_similar_queries": "similar_queries" in context,
            "has_query_params": "query_params" in context,
        }
    
    def _validar_fechas_futuras(self, query_params: Dict[str, Any]) -> Optional[str]:
        """Valida que las fechas consultadas no sean pasadas.
        
        Returns:
            str: La fecha inválida si encuentra alguna fecha pasada, None si todas son válidas
        """
        if not query_params.get('has_dates'):
            return None
        
        hoy = datetime.now().date()
        
        # Validar check_in
        check_in = query_params.get('check_in')
        if check_in:
            try:
                fecha_check_in = datetime.strptime(check_in, "%Y-%m-%d").date()
                if fecha_check_in < hoy:
                    return check_in
            except ValueError:
                pass
        
        # Validar check_out
        check_out = query_params.get('check_out')
        if check_out:
            try:
                fecha_check_out = datetime.strptime(check_out, "%Y-%m-%d").date()
                if fecha_check_out < hoy:
                    return check_out
            except ValueError:
                pass
        
        # Validar single_date
        single_date = query_params.get('single_date')
        if single_date:
            try:
                fecha_single = datetime.strptime(single_date, "%Y-%m-%d").date()
                if fecha_single < hoy:
                    return single_date
            except ValueError:
                pass
        
        return None
    
    def _tiene_disponibilidad_previa_para_fechas(
        self, 
        context: Dict[str, Any], 
        query_params: Dict[str, Any]
    ) -> bool:
        """Verifica si ya hay disponibilidad previa para las mismas fechas"""
        try:
            # Obtener fechas actuales
            check_in_actual = query_params.get('check_in')
            check_out_actual = query_params.get('check_out')
            single_date_actual = query_params.get('single_date')
            
            if not (check_in_actual or single_date_actual):
                return False
            
            # 1. Verificar en contexto del frontend
            frontend_conversation = context.get("frontend_conversation", {})
            if frontend_conversation:
                # Si hay historial del frontend, asumir que ya se consultó disponibilidad
                messages_count = frontend_conversation.get("messages_count", 0)
                if messages_count > 0:
                    logger.info(f"🔄 REUTILIZAR - Hay historial del frontend ({messages_count} mensajes), reutilizando disponibilidad")
                    return True
            
            # 2. Verificar en contexto de sesión 
            session_context = context.get("session_context", {})
            if session_context:
                last_availability = session_context.get("last_availability")
                last_dates = session_context.get("last_dates", {})
                
                if last_availability and last_dates:
                    # Comparar fechas
                    last_check_in = last_dates.get('check_in')
                    last_check_out = last_dates.get('check_out')
                    last_single_date = last_dates.get('single_date')
                    
                    # Mismo rango de fechas
                    if (check_in_actual == last_check_in and check_out_actual == last_check_out):
                        logger.info(f"🔄 REUTILIZAR - Mismas fechas de rango: {check_in_actual} - {check_out_actual}")
                        return True
                    
                    # Misma fecha única
                    if (single_date_actual == last_single_date):
                        logger.info(f"🔄 REUTILIZAR - Misma fecha única: {single_date_actual}")
                        return True
            
            # 3. Verificar si query_params indica que viene del frontend (más confiable)
            if query_params.get('inferred_from_frontend') or query_params.get('previous_availability'):
                logger.info(f"🔄 REUTILIZAR - Fechas inferidas del frontend o disponibilidad previa confirmada")
                return True
            
            logger.info(f"🆕 CONSULTAR - No hay disponibilidad previa para estas fechas")
            return False
            
        except Exception as e:
            logger.error(f"Error verificando disponibilidad previa: {e}")
            return False
    
    def _usar_disponibilidad_previa(self, context: Dict[str, Any]):
        """Utiliza disponibilidad previa del contexto en lugar de consultar backend"""
        try:
            # Crear disponibilidad "simulada" basada en contexto previo
            availability_info = {
                "hospedaje_disponibilidad": {
                    "disponible": True,
                    "motivo": "Disponibilidad confirmada en consulta previa",
                    "habitaciones_disponibles": len(context.get("habitaciones", [])),
                    "detalle_habitaciones": []
                }
            }
            
            # Agregar habitaciones del contexto como disponibles
            habitaciones = context.get("habitaciones", [])
            for hab in habitaciones:
                availability_info["hospedaje_disponibilidad"]["detalle_habitaciones"].append({
                    "id": hab.get("id"),
                    "nombre": hab.get("nombre"),
                    "disponible": True,
                    "capacidad": hab.get("capacidad"),
                    "descripcionCorta": hab.get("descripcionCorta"),
                    "precioBase": hab.get("precioBase"),
                    "hospedaje": context.get("hospedaje", {})  # Datos del hospedaje
                })
            
            # Establecer fechas basadas en query_params
            query_params = context.get("query_params", {})
            check_in = query_params.get('check_in')
            check_out = query_params.get('check_out')
            single_date = query_params.get('single_date')
            
            if check_in and check_out:
                availability_info["hospedaje_disponibilidad"]["fecha_inicio"] = check_in
                availability_info["hospedaje_disponibilidad"]["fecha_fin"] = check_out
            elif single_date:
                # Convertir fecha única a rango de una noche
                from datetime import datetime, timedelta
                fecha_inicio = datetime.strptime(single_date, '%Y-%m-%d')
                fecha_fin = fecha_inicio + timedelta(days=1)
                availability_info["hospedaje_disponibilidad"]["fecha_inicio"] = single_date
                availability_info["hospedaje_disponibilidad"]["fecha_fin"] = fecha_fin.strftime('%Y-%m-%d')
            
            context["availability_real"] = availability_info
            logger.info(f"🔄 REUTILIZADO - Disponibilidad previa aplicada al contexto")
            
        except Exception as e:
            logger.error(f"Error usando disponibilidad previa: {e}") 

    async def _get_session_context(
        self, 
        hospedaje_id: str, 
        user_id: str, 
        conversation_id: str
    ) -> Optional[Dict[str, Any]]:
        """Obtiene contexto de mensajes anteriores en la misma conversación (usando token/conversation_id)"""
        try:
            logger.info(f"🔍 DEBUG SESSION - Buscando contexto para conversation_id: {conversation_id[:20]}...")
            
            # Buscar los últimos 5 mensajes de la conversación (usando conversation_id como session_id)
            query = """
            SELECT user_message, bot_response, created_at
            FROM chat_history 
            WHERE hospedaje_id = %s AND user_id = %s AND session_id = %s
            ORDER BY created_at DESC
            LIMIT 5
            """
            
            results = await execute_vector_query(query, [hospedaje_id, user_id, conversation_id])
            
            if not results:
                logger.info(f"🔍 DEBUG SESSION - No se encontraron mensajes previos")
                return None
            
            logger.info(f"🔍 DEBUG SESSION - Encontrados {len(results)} mensajes previos")
            
            session_context = {
                "previous_messages": [],
                "last_dates": None,
                "last_availability": None,
                "last_habitacion": None,
                # 🎯 NUEVOS CAMPOS PARA MEMORIA DE RESERVA
                "last_reserva_habitacion": None,
                "last_reserva_fechas": None,
                "last_guests": None
            }
            
            # 🎯 RECUPERAR CONTEXTO DE RESERVA PENDIENTE desde sesiones
            try:
                session_query = """
                SELECT session_data 
                FROM chat_sessions 
                WHERE hospedaje_id = %s AND user_id = %s AND conversation_id = %s
                AND updated_at > NOW() - INTERVAL '1 hour'  -- Solo sesiones recientes
                ORDER BY updated_at DESC 
                LIMIT 1
                """
                
                session_results = await execute_vector_query(session_query, [hospedaje_id, user_id, conversation_id])
                
                if session_results and session_results[0][0]:
                    session_data = json.loads(session_results[0][0])
                    
                    # Agregar datos de reserva pendiente al contexto
                    if session_data.get("last_reserva_habitacion"):
                        session_context["last_reserva_habitacion"] = session_data["last_reserva_habitacion"]
                        logger.info(f"🎯 MEMORIA RECUPERADA - Habitación: {session_data['last_reserva_habitacion']}")
                    
                    if session_data.get("last_reserva_fechas"):
                        session_context["last_reserva_fechas"] = session_data["last_reserva_fechas"]
                        logger.info(f"🎯 MEMORIA RECUPERADA - Fechas: {session_data['last_reserva_fechas']}")
                    
                    if session_data.get("last_guests"):
                        session_context["last_guests"] = session_data["last_guests"]
                        logger.info(f"🎯 MEMORIA RECUPERADA - Huéspedes: {session_data['last_guests']}")
                        
            except Exception as e:
                logger.warning(f"Error recuperando contexto de reserva: {e}")
            
            # Procesar mensajes para extraer información útil
            for row in results:
                user_message = row[0]
                bot_response = row[1]
                created_at = row[2]
                
                if user_message:
                    session_context["previous_messages"].append({
                        "user": user_message,
                        "bot": bot_response or "",
                        "timestamp": created_at.isoformat() if created_at else ""
                    })
                    
                    # Intentar extraer fechas del mensaje del usuario
                    if not session_context["last_dates"]:
                        message_params = self.date_extractor.get_query_params(user_message)
                        if message_params.get('has_dates'):
                            session_context["last_dates"] = {
                                "check_in": message_params.get('check_in'),
                                "check_out": message_params.get('check_out'),
                                "single_date": message_params.get('single_date'),
                                "has_dates": True
                            }
                            logger.info(f"🔍 DEBUG SESSION - Fechas extraídas del mensaje: {user_message}")
                    
                    # Buscar disponibilidad confirmada
                    if not session_context["last_availability"] and bot_response:
                        if any(word in bot_response.lower() for word in ["disponible", "excelente", "tenemos"]):
                            session_context["last_availability"] = True
                            
                            # Intentar extraer nombre de habitación
                            import re
                            habitacion_match = re.search(r'Suite\s+\w+|habitación\s+\w+', bot_response, re.IGNORECASE)
                            if habitacion_match:
                                session_context["last_habitacion"] = habitacion_match.group()
                                logger.info(f"🔍 DEBUG SESSION - Habitación extraída: {session_context['last_habitacion']}")
            
            logger.info(f"🔍 DEBUG SESSION - Contexto final: {session_context}")
            return session_context
            
        except Exception as e:
            logger.error(f"Error obteniendo contexto de sesión: {e}")
            return None


    def _extraer_habitacion_del_mensaje(self, message: str, habitaciones: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Extrae la habitación específica mencionada en el mensaje"""
        try:
            message_lower = message.lower()
            
            # Buscar por nombre exacto o parcial
            for habitacion in habitaciones:
                nombre = habitacion.get("nombre", "").lower()
                if nombre in message_lower:
                    logger.info(f"🎯 DEBUG HABITACIÓN - Encontrada por nombre: {nombre}")
                    return habitacion
            
            # Buscar por palabras clave (ej: "suite taina")
            for habitacion in habitaciones:
                nombre_completo = habitacion.get("nombre", "").lower()
                palabras_habitacion = nombre_completo.split()
                
                # Si todas las palabras de la habitación están en el mensaje
                if all(palabra in message_lower for palabra in palabras_habitacion if len(palabra) > 2):
                    logger.info(f"🎯 DEBUG HABITACIÓN - Encontrada por palabras clave: {nombre_completo}")
                    return habitacion
            
            logger.info(f"🎯 DEBUG HABITACIÓN - No se encontró habitación específica en el mensaje")
            return None
            
        except Exception as e:
            logger.error(f"Error extrayendo habitación del mensaje: {e}")
            return None
    


    async def _add_services_context(
        self,
        context: Dict[str, Any],
        hospedaje_id: str,
        query_type: str,
        message: str = ""
    ):
        """Agrega información de servicios según el tipo de consulta"""
        try:
            logger.info(f"🔧 DEBUG - Tipo de consulta: {query_type}")
            
            # Para consultas de servicios específicos - NUEVA FUNCIONALIDAD
            if query_type == "servicio_especifico":
                await self._handle_servicio_especifico_context(context, hospedaje_id, message)
                return
            
            # 🆕 Para consultas de servicios de múltiples habitaciones
            elif query_type == "servicios_multiples_habitaciones":
                await self._handle_servicios_multiples_habitaciones(context, hospedaje_id, message)
                return
            
            # 🆕 Para consultas de proceso de reserva
            elif query_type == "proceso_reserva":
                await self._handle_proceso_reserva(context, hospedaje_id, message)
                return
            
            # 🆕 Para reservas múltiples cuando usuario quiere reservar varias habitaciones
            elif query_type == "reserva_multiple":
                await self._handle_reserva_multiple(context, hospedaje_id, message)
                return
            
            # Para consultas de servicios del hospedaje
            elif query_type == "hospedaje_servicios":
                logger.info(f"🔧 DEBUG - Obteniendo servicios del hospedaje")
                servicios_hospedaje = await backend_service.get_servicios_hospedaje(hospedaje_id)
                context["servicios_hospedaje"] = [serv.dict() for serv in servicios_hospedaje]
                logger.info(f"🔧 DEBUG - Servicios del hospedaje: {len(servicios_hospedaje)} encontrados")
            
            # Para consultas de servicios de habitaciones
            elif query_type == "habitacion_servicios":
                logger.info(f"🔧 DEBUG - Obteniendo servicios de habitaciones")
                habitaciones = context.get("habitaciones", [])
                
                if habitaciones:
                    # 🆕 IDENTIFICAR HABITACIÓN ESPECÍFICA DEL CONTEXTO
                    habitacion_especifica = self._identificar_habitacion_del_contexto(context)
                    
                    if habitacion_especifica:
                        # Consultar servicios solo para la habitación específica
                        hab_id = habitacion_especifica.get("id")
                        hab_nombre = habitacion_especifica.get("nombre", hab_id)
                        logger.info(f"🔧 DEBUG - Habitación específica identificada: {hab_nombre} (ID: {hab_id})")
                        
                        servicios_hab = await backend_service.get_servicios_habitacion(hab_id)
                        context["servicios_habitaciones"] = {
                            hab_id: [serv.dict() for serv in servicios_hab]
                        }
                        context["habitacion_especifica"] = {
                            "id": hab_id,
                            "nombre": hab_nombre
                        }
                        logger.info(f"🔧 DEBUG - Servicios habitación específica {hab_nombre}: {len(servicios_hab)} encontrados")
                    else:
                        # Si no hay habitación específica, obtener para todas
                        logger.info(f"🔧 DEBUG - No hay habitación específica, obteniendo servicios para todas")
                        context["servicios_habitaciones"] = {}
                        for hab in habitaciones:
                            hab_id = hab.get("id")
                            if hab_id:
                                servicios_hab = await backend_service.get_servicios_habitacion(hab_id)
                                context["servicios_habitaciones"][hab_id] = [serv.dict() for serv in servicios_hab]
                                logger.info(f"🔧 DEBUG - Servicios habitación {hab.get('nombre', hab_id)}: {len(servicios_hab)} encontrados")
            
            # 🔧 CORREGIDO: Para consultas de disponibilidad y PRECIOS, NO incluir servicios
            elif query_type in ["disponibilidad", "precios"]:
                logger.info(f"🔧 DEBUG - Consulta de {query_type}: NO agregando servicios para ser directo y conciso")
                # No agregar servicios para mantener respuestas directas y sin información no solicitada
                pass
            
            # Para otros tipos de consulta (general, etc.), incluir servicios básicos del hospedaje
            else:
                logger.info(f"🔧 DEBUG - Consulta general: agregando servicios básicos del hospedaje")
                servicios_hospedaje = await backend_service.get_servicios_hospedaje(hospedaje_id)
                context["servicios_hospedaje"] = [serv.dict() for serv in servicios_hospedaje]
                
        except Exception as e:
            logger.error(f"Error obteniendo servicios contextuales: {e}")

    async def _handle_servicio_especifico_context(
        self,
        context: Dict[str, Any],
        hospedaje_id: str,
        message: str
    ):
        """Maneja consultas de servicios específicos con búsqueda dual"""
        try:
            # Extraer término de búsqueda del mensaje
            termino_busqueda = self._extraer_termino_servicio(message)
            if not termino_busqueda:
                logger.warning(f"No se pudo extraer término de búsqueda del mensaje: {message}")
                return
            
            logger.info(f"🔍 DEBUG - Término de búsqueda extraído: '{termino_busqueda}'")
            
            # Identificar habitación del contexto
            habitacion_especifica = self._identificar_habitacion_del_contexto(context)
            if not habitacion_especifica:
                # Si no hay habitación específica, usar la primera disponible
                habitaciones = context.get("habitaciones", [])
                if habitaciones:
                    habitacion_especifica = habitaciones[0]
                    logger.info(f"🔍 DEBUG - Usando primera habitación disponible: {habitacion_especifica.get('nombre')}")
                else:
                    logger.warning("No se encontró habitación para la búsqueda")
                    return
            
            habitacion_id = habitacion_especifica.get("id")
            habitacion_nombre = habitacion_especifica.get("nombre", "")
            
            logger.info(f"🔍 DEBUG - Buscando en habitación: {habitacion_nombre} ({habitacion_id})")
            
            # BÚSQUEDA MÚLTIPLE - Habitación actual, otras habitaciones y hospedaje
            # 1. Buscar en habitación actual
            servicios_habitacion_actual = await backend_service.buscar_servicio_habitacion(habitacion_id, termino_busqueda)
            logger.info(f"🔍 DEBUG - Servicios encontrados en habitación actual: {len(servicios_habitacion_actual)}")
            
            # 2. Buscar en otras habitaciones del hospedaje (si no se encontró en la actual)
            servicios_otras_habitaciones = []
            if not servicios_habitacion_actual:
                logger.info(f"🔍 DEBUG - No encontrado en habitación actual, buscando en otras habitaciones...")
                servicios_otras_habitaciones = await self._buscar_en_otras_habitaciones(
                    context, hospedaje_id, habitacion_id, termino_busqueda
                )
                logger.info(f"🔍 DEBUG - Servicios encontrados en otras habitaciones: {len(servicios_otras_habitaciones)}")
            
            # 3. Buscar en hospedaje (solo si no se encontró en habitaciones)
            servicios_hospedaje = []
            if not servicios_habitacion_actual and not servicios_otras_habitaciones:
                servicios_hospedaje = await backend_service.buscar_servicio_hospedaje(hospedaje_id, termino_busqueda)
                logger.info(f"🔍 DEBUG - Servicios encontrados en hospedaje: {len(servicios_hospedaje)}")
            
            # Estructurar contexto según los resultados
            context["busqueda_servicio_especifico"] = {
                "termino_buscado": termino_busqueda,
                "habitacion_actual": {
                    "id": habitacion_id,
                    "nombre": habitacion_nombre,
                    "servicios_encontrados": servicios_habitacion_actual
                },
                "otras_habitaciones": servicios_otras_habitaciones,
                "hospedaje": {
                    "servicios_encontrados": servicios_hospedaje
                },
                "escenario": self._determinar_escenario_respuesta_optimizado(
                    servicios_habitacion_actual, servicios_otras_habitaciones, servicios_hospedaje
                )
            }
            
            logger.info(f"🔍 DEBUG - Escenario determinado: {context['busqueda_servicio_especifico']['escenario']}")
            
        except Exception as e:
            logger.error(f"Error manejando búsqueda de servicio específico: {e}")

    def _extraer_termino_servicio(self, mensaje: str) -> Optional[str]:
        """Extrae el término del servicio a buscar del mensaje del usuario"""
        try:
            # Lista de servicios comunes y sus sinónimos
            servicios_conocidos = {
                "jacuzzi": ["jacuzzi", "hidromasaje", "hidro", "bañera", "spa", "jets"],
                "wifi": ["wifi", "wi-fi", "internet", "conexión", "conexion"],
                "aire": ["aire", "acondicionado", "climatización", "climatizacion", "calefacción", "calefaccion"],
                "balcón": ["balcón", "balcon", "terraza", "patio"],
                "cocina": ["cocina", "kitchenette", "microondas", "heladera", "refrigerador"],
                "tv": ["tv", "televisión", "television", "smart", "pantalla"],
                "estacionamiento": ["estacionamiento", "parking", "garage", "cochera"],
                "desayuno": ["desayuno", "comida", "alimentación", "alimentacion"],
                "limpieza": ["limpieza", "housekeeping", "mucama", "servicio"],
                "piscina": ["piscina", "pileta", "natación", "natacion"]
            }
            
            mensaje_lower = mensaje.lower()
            
            # Buscar coincidencias con servicios conocidos
            for servicio_principal, sinonimos in servicios_conocidos.items():
                for sinonimo in sinonimos:
                    if sinonimo in mensaje_lower:
                        logger.info(f"🔍 DEBUG - Coincidencia encontrada: '{sinonimo}' -> '{servicio_principal}'")
                        return sinonimo  # Retornar el término específico encontrado
            
            # Si no encuentra coincidencias específicas, intentar extraer palabra clave genérica
            # Buscar patrones como "tiene X", "hay X", "cuenta con X"
            import re
            patterns = [
                r"tiene\s+(\w+)",
                r"hay\s+(\w+)", 
                r"cuenta\s+con\s+(\w+)",
                r"incluye\s+(\w+)",
                r"viene\s+con\s+(\w+)"
            ]
            
            for pattern in patterns:
                match = re.search(pattern, mensaje_lower)
                if match:
                    termino = match.group(1)
                    if len(termino) > 2:  # Evitar palabras muy cortas
                        logger.info(f"🔍 DEBUG - Término genérico extraído: '{termino}'")
                        return termino
            
            logger.warning(f"No se pudo extraer término específico del mensaje: {mensaje}")
            return None
            
        except Exception as e:
            logger.error(f"Error extrayendo término de servicio: {e}")
            return None

    async def _buscar_en_otras_habitaciones(
        self,
        context: Dict[str, Any],
        hospedaje_id: str,
        habitacion_actual_id: str,
        termino_busqueda: str
    ) -> List[Dict[str, Any]]:
        """Busca el servicio en todas las otras habitaciones del hospedaje"""
        try:
            habitaciones_candidatas = []
            habitaciones = context.get("habitaciones", [])
            
            # Buscar en cada habitación (excepto la actual)
            for habitacion in habitaciones:
                hab_id = habitacion.get("id")
                hab_nombre = habitacion.get("nombre", "")
                
                if hab_id and hab_id != habitacion_actual_id:
                    logger.info(f"🔍 DEBUG - Buscando en habitación: {hab_nombre} ({hab_id})")
                    servicios_encontrados = await backend_service.buscar_servicio_habitacion(hab_id, termino_busqueda)
                    
                    if servicios_encontrados:
                        habitaciones_candidatas.append({
                            "habitacion_id": hab_id,
                            "habitacion_nombre": hab_nombre,
                            "servicios_encontrados": servicios_encontrados,
                            "habitacion_completa": habitacion
                        })
                        logger.info(f"🔍 DEBUG - ✅ Servicio encontrado en: {hab_nombre}")
            
            # Si hay fechas en el contexto, filtrar por disponibilidad
            if habitaciones_candidatas:
                return await self._filtrar_por_disponibilidad_si_hay_fechas(context, habitaciones_candidatas)
            
            return habitaciones_candidatas
            
        except Exception as e:
            logger.error(f"Error buscando en otras habitaciones: {e}")
            return []

    async def _filtrar_por_disponibilidad_si_hay_fechas(
        self,
        context: Dict[str, Any],
        habitaciones_candidatas: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Filtra habitaciones candidatas por disponibilidad si hay fechas en el contexto"""
        try:
            # Verificar si hay fechas en el contexto conversacional
            query_params = context.get("query_params", {})
            tiene_fechas = query_params.get("has_dates", False)
            
            if not tiene_fechas:
                logger.info(f"🔍 DEBUG - No hay fechas en contexto, retornando todas las candidatas")
                return habitaciones_candidatas
            
            # Obtener fechas del contexto
            fecha_inicio = query_params.get("check_in")
            fecha_fin = query_params.get("check_out") 
            fecha_unica = query_params.get("single_date")
            
            if not (fecha_inicio and fecha_fin) and not fecha_unica:
                logger.info(f"🔍 DEBUG - Fechas incompletas, retornando todas las candidatas")
                return habitaciones_candidatas
            
            # Si es fecha única, crear rango de una noche
            if fecha_unica and not fecha_inicio:
                fecha_inicio = fecha_unica
                from datetime import datetime, timedelta
                try:
                    fecha_obj = datetime.strptime(fecha_unica, "%Y-%m-%d")
                    fecha_fin = (fecha_obj + timedelta(days=1)).strftime("%Y-%m-%d")
                except:
                    logger.warning(f"Error parseando fecha única: {fecha_unica}")
                    return habitaciones_candidatas
            
            logger.info(f"🔍 DEBUG - Filtrando habitaciones por disponibilidad: {fecha_inicio} a {fecha_fin}")
            
            # Verificar disponibilidad de cada habitación candidata
            habitaciones_disponibles = []
            
            # Obtener disponibilidad real si existe en el contexto
            availability_real = context.get("availability_real", {})
            hospedaje_disp = availability_real.get("hospedaje_disponibilidad", {})
            detalle_habitaciones = hospedaje_disp.get("detalle_habitaciones", [])
            
            if detalle_habitaciones:
                # Usar datos de disponibilidad ya obtenidos
                habitaciones_disponibles_ids = [
                    hab.get("id") for hab in detalle_habitaciones if hab.get("disponible", False)
                ]
                
                for candidata in habitaciones_candidatas:
                    if candidata["habitacion_id"] in habitaciones_disponibles_ids:
                        habitaciones_disponibles.append(candidata)
                        logger.info(f"🔍 DEBUG - ✅ Habitación {candidata['habitacion_nombre']} disponible para las fechas")
                    else:
                        logger.info(f"🔍 DEBUG - ❌ Habitación {candidata['habitacion_nombre']} NO disponible para las fechas")
            else:
                # Si no hay datos de disponibilidad previa, retornar todas (no consultar disponibilidad aquí)
                logger.info(f"🔍 DEBUG - Sin datos de disponibilidad previa, retornando todas las candidatas")
                return habitaciones_candidatas
            
            return habitaciones_disponibles
            
        except Exception as e:
            logger.error(f"Error filtrando por disponibilidad: {e}")
            return habitaciones_candidatas

    def _determinar_escenario_respuesta_optimizado(
        self,
        servicios_habitacion_actual: List,
        servicios_otras_habitaciones: List,
        servicios_hospedaje: List
    ) -> str:
        """Determina el escenario de respuesta basado en los resultados de búsqueda optimizada"""
        if servicios_habitacion_actual:
            return "encontrado_en_habitacion_actual"
        elif servicios_otras_habitaciones:
            return "encontrado_en_otras_habitaciones"
        elif servicios_hospedaje:
            return "solo_en_hospedaje"
        else:
            return "no_encontrado"

    def _identificar_habitacion_del_contexto(self, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Identifica habitación específica mencionada en el contexto conversacional"""
        try:
            habitaciones = context.get("habitaciones", [])
            logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Habitaciones disponibles: {[h.get('nombre') for h in habitaciones]}")
            
            # 🆕 0. PRIMERO buscar en contexto de sesión (más confiable)
            session_context = context.get("session_context", {})
            logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Session context disponible: {'SÍ' if session_context else 'NO'}")
            
            if session_context:
                previous_messages = session_context.get("previous_messages", [])
                logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Mensajes previos en session: {len(previous_messages)}")
                
                for i, msg in enumerate(reversed(previous_messages[-3:])):  # Últimos 3 mensajes
                    user_message = msg.get("user", "").lower()
                    logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Analizando mensaje {i}: '{user_message[:50]}...'")
                    
                    # Buscar expresiones de interés específico
                    interes_patterns = [
                        r"me\s+interesa\s+la\s+(suite\s+\w+|habitación\s+\w+)",
                        r"quiero\s+la\s+(suite\s+\w+|habitación\s+\w+)",
                        r"elijo\s+la\s+(suite\s+\w+|habitación\s+\w+)",
                        r"prefiero\s+la\s+(suite\s+\w+|habitación\s+\w+)",
                        r"me\s+quedo\s+con\s+la\s+(suite\s+\w+|habitación\s+\w+)",
                        r"(suite\s+\w+|habitación\s+\w+)\s+por\s+favor",
                        r"reservar\s+la\s+(suite\s+\w+|habitación\s+\w+)",
                        r"quisiera\s+reservar\s+la\s+(suite\s+\w+|habitación\s+\w+)",
                        r"quiero\s+reservar\s+la\s+(suite\s+\w+|habitación\s+\w+)",
                        r"esa\s+suite|esta\s+suite|la\s+suite",
                        r"esa\s+habitación|esta\s+habitación|la\s+habitación"
                    ]
                    
                    for pattern in interes_patterns:
                        match = re.search(pattern, user_message, re.IGNORECASE)
                        if match:
                            habitacion_mencionada = match.group(1) if match.groups() else None
                            logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Pattern match: '{pattern}' → '{habitacion_mencionada}'")
                            
                            if habitacion_mencionada:
                                # Buscar habitación por nombre
                                for hab in habitaciones:
                                    hab_nombre = hab.get("nombre", "").lower()
                                    logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Comparando '{habitacion_mencionada.lower()}' con '{hab_nombre}'")
                                    if habitacion_mencionada.lower() in hab_nombre:
                                        logger.info(f"✅ DEBUG IDENTIFICACIÓN - Habitación identificada por interés directo: {hab.get('nombre')}")
                                        return hab
                            else:
                                # Para "esa suite", "esta suite", buscar en bot response anterior
                                bot_response = msg.get("bot", "").lower()
                                logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Buscando referencia en bot response: '{bot_response[:50]}...'")
                                for hab in habitaciones:
                                    hab_nombre = hab.get("nombre", "").lower()
                                    if hab_nombre and hab_nombre in bot_response:
                                        logger.info(f"✅ DEBUG IDENTIFICACIÓN - Habitación identificada por referencia contextual: {hab.get('nombre')}")
                                        return hab
            
            # 1. Buscar en contexto del frontend - PRIORIZAR MENSAJES DEL USUARIO
            frontend_conversation = context.get("frontend_conversation", {})
            if frontend_conversation:
                recent_messages = frontend_conversation.get("recent_messages", [])
                
                # PRIMERO: Buscar en mensajes del USUARIO (mayor prioridad)
                for msg in recent_messages:
                    if msg.get("role") == "user":
                        user_message = msg.get("message", "").lower()
                        logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Analizando mensaje del usuario: '{user_message[:50]}...'")
                        # Buscar expresiones de interés del usuario
                        for hab in habitaciones:
                            hab_nombre = hab.get("nombre", "").lower()
                            if hab_nombre and hab_nombre in user_message and ("interesa" in user_message or "quiero" in user_message or "elijo" in user_message or "reservar" in user_message or "quisiera" in user_message):
                                logger.info(f"✅ DEBUG IDENTIFICACIÓN - Habitación identificada por ELECCIÓN DIRECTA del usuario: {hab.get('nombre')}")
                                return hab
                
                # SEGUNDO: Si no se encontró en mensajes del usuario, buscar en respuestas del bot
                for msg in recent_messages:
                    if msg.get("role") == "assistant":
                        bot_response = msg.get("message", "").lower()
                        # Buscar nombres de habitaciones mencionadas
                        for hab in habitaciones:
                            hab_nombre = hab.get("nombre", "").lower()
                            if hab_nombre and hab_nombre in bot_response:
                                logger.info(f"🔍 DEBUG - Habitación identificada del frontend (respuesta bot): {hab.get('nombre')}")
                                return hab
            
            # 2. Buscar en contexto de sesión de BD
            session_context = context.get("session_context", {})
            if session_context:
                last_habitacion = session_context.get("last_habitacion")
                if last_habitacion:
                    # Buscar habitación por nombre parcial
                    for hab in habitaciones:
                        hab_nombre = hab.get("nombre", "")
                        if last_habitacion.lower() in hab_nombre.lower():
                            logger.info(f"🔍 DEBUG - Habitación identificada de BD: {hab_nombre}")
                            return hab
            
            # 3. Buscar en parámetros de consulta (🎯 CRÍTICO - aquí debería estar)
            query_params = context.get("query_params", {})
            previous_habitacion = query_params.get("previous_habitacion")
            logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Query params: {query_params}")
            logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Previous habitacion: '{previous_habitacion}'")
            
            if previous_habitacion:
                logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Buscando '{previous_habitacion}' en habitaciones disponibles...")
                for hab in habitaciones:
                    hab_nombre = hab.get("nombre", "")
                    logger.info(f"🔍 DEBUG IDENTIFICACIÓN - Comparando '{previous_habitacion.lower()}' con '{hab_nombre.lower()}'")
                    if previous_habitacion.lower() in hab_nombre.lower():
                        logger.info(f"✅ DEBUG IDENTIFICACIÓN - Habitación identificada de parámetros: {hab_nombre}")
                        return hab
                logger.warning(f"❌ DEBUG IDENTIFICACIÓN - No se encontró coincidencia para '{previous_habitacion}' en {[h.get('nombre') for h in habitaciones]}")
            else:
                logger.warning(f"❌ DEBUG IDENTIFICACIÓN - No hay 'previous_habitacion' en query_params")
            
            # 4. Buscar en disponibilidad real si hay una sola habitación disponible
            availability_real = context.get("availability_real", {})
            if availability_real:
                hospedaje_disp = availability_real.get("hospedaje_disponibilidad", {})
                detalle_habitaciones = hospedaje_disp.get("detalle_habitaciones", [])
                if len(detalle_habitaciones) == 1:
                    # Si solo hay una habitación disponible, es probable que se refiera a esa
                    hab_disponible = detalle_habitaciones[0]
                    hab_id = hab_disponible.get("id")
                    for hab in habitaciones:
                        if hab.get("id") == hab_id:
                            logger.info(f"🔍 DEBUG - Habitación identificada por disponibilidad única: {hab.get('nombre')}")
                            return hab
            
            logger.info(f"🔍 DEBUG - No se pudo identificar habitación específica del contexto")
            return None
            
        except Exception as e:
            logger.error(f"Error identificando habitación del contexto: {e}")
            return None

    async def _handle_servicios_multiples_habitaciones(
        self,
        context: Dict[str, Any],
        hospedaje_id: str,
        message: str
    ):
        """Maneja consultas sobre servicios de múltiples habitaciones"""
        try:
            logger.info(f"🔧 DEBUG - Manejando consulta de servicios múltiples habitaciones")
            
            habitaciones = context.get("habitaciones", [])
            if not habitaciones:
                logger.warning("No hay habitaciones disponibles para consultar servicios")
                return
            
            # Obtener servicios para todas las habitaciones
            servicios_por_habitacion = {}
            for hab in habitaciones:
                hab_id = hab.get("id")
                hab_nombre = hab.get("nombre", hab_id)
                
                if hab_id:
                    servicios_hab = await backend_service.get_servicios_habitacion(hab_id)
                    servicios_por_habitacion[hab_id] = {
                        "habitacion_nombre": hab_nombre,
                        "servicios": [serv.dict() for serv in servicios_hab]
                    }
                    
            context["servicios_multiples_habitaciones"] = servicios_por_habitacion
            logger.info(f"🔧 DEBUG - Servicios obtenidos para {len(servicios_por_habitacion)} habitaciones")
            
        except Exception as e:
            logger.error(f"Error manejando servicios múltiples habitaciones: {e}")

    async def _handle_proceso_reserva(
        self,
        context: Dict[str, Any],
        hospedaje_id: str,
        message: str
    ):
        """Maneja consultas sobre proceso de reserva generando URL de checkout"""
        try:
            logger.info(f"🎯 DEBUG PROCESO_RESERVA - Iniciando manejo de proceso de reserva")
            logger.info(f"🎯 DEBUG PROCESO_RESERVA - Mensaje: '{message}'")
            
            # 1. OBTENER INFORMACIÓN NECESARIA DEL CONTEXTO
            habitaciones = context.get("habitaciones", [])
            query_params = context.get("query_params", {})
            session_context = context.get("session_context", {})
            
            # 2. OBTENER FECHAS (del contexto actual o de sesión previa)
            check_in = query_params.get('check_in')
            check_out = query_params.get('check_out')
            single_date = query_params.get('single_date')
            
            # Si tenemos single_date pero no check_in/check_out, convertir
            if single_date and (not check_in or not check_out):
                from datetime import datetime, timedelta
                check_in = single_date
                next_day = datetime.strptime(single_date, "%Y-%m-%d") + timedelta(days=1)
                check_out = next_day.strftime("%Y-%m-%d")
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Convertido single_date {single_date} a rango: {check_in} - {check_out}")
            
            # Si no hay fechas actuales, intentar obtener de sesión previa
            if not check_in or not check_out:
                # Primero: fechas de reserva pendiente (más específicas)
                reserva_fechas = session_context.get('last_reserva_fechas', {})
                if reserva_fechas.get('check_in') and reserva_fechas.get('check_out'):
                    check_in = reserva_fechas['check_in']
                    check_out = reserva_fechas['check_out']
                    logger.info(f"🎯 DEBUG PROCESO_RESERVA - Usando fechas de reserva pendiente: {check_in} - {check_out}")
                else:
                    # Fallback: fechas generales de sesión
                    last_dates = session_context.get('last_dates', {})
                    check_in = last_dates.get('check_in')
                    check_out = last_dates.get('check_out')
                    if check_in and check_out:
                        logger.info(f"🎯 DEBUG PROCESO_RESERVA - Usando fechas de sesión previa: {check_in} - {check_out}")
            
            # 3. IDENTIFICAR HABITACIÓN ESPECÍFICA DEL CONTEXTO
            habitacion_elegida = self._identificar_habitacion_del_contexto(context)
            
            # Logging para debug
            if habitacion_elegida:
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Habitación identificada del contexto conversacional: '{habitacion_elegida.get('nombre')}'")
            else:
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - No se identificó habitación del contexto conversacional")
            
            # Si no se identificó habitación del contexto, buscar en query_params (frontend) como fallback
            if not habitacion_elegida:
                habitacion_previa = query_params.get('previous_habitacion')
                if habitacion_previa:
                    logger.info(f"🎯 DEBUG PROCESO_RESERVA - Usando habitación del frontend como fallback: '{habitacion_previa}'")
                    habitacion_elegida = self._mapear_nombre_a_habitacion(habitacion_previa, habitaciones)
            
            # 🎯 MEMORIA CONVERSACIONAL: Si no hay habitación, buscar en sesión de proceso previo
            if not habitacion_elegida and session_context:
                previous_habitacion_nombre = session_context.get('last_reserva_habitacion')
                if previous_habitacion_nombre:
                    logger.info(f"🎯 DEBUG PROCESO_RESERVA - Habitación de proceso previo: '{previous_habitacion_nombre}'")
                    habitacion_elegida = self._mapear_nombre_a_habitacion(previous_habitacion_nombre, habitaciones)
            
            # 4. OBTENER NÚMERO DE HUÉSPEDES (del mensaje del usuario O contexto conversacional)
            huespedes = query_params.get('guests')  # Primero del mensaje actual
            
            # 🎯 MEMORIA CONVERSACIONAL: Si no hay huéspedes aquí, buscar en CONTEXTO CONVERSACIONAL
            if not huespedes:
                huespedes = self._extract_guest_count_from_context(context)
                if huespedes:
                    logger.info(f"🎯 DEBUG PROCESO_RESERVA - Huéspedes recuperados del contexto conversacional: {huespedes}")
            
            # 🎯 MEMORIA CONVERSACIONAL: Como último recurso, buscar en contexto de sesión
            if not huespedes and session_context:
                previous_guests = session_context.get('last_guests')
                if previous_guests:
                    huespedes = previous_guests
                    logger.info(f"🎯 DEBUG PROCESO_RESERVA - Huéspedes recuperados de sesión: {huespedes}")
            
            logger.info(f"🎯 DEBUG PROCESO_RESERVA - Estado actual:")
            logger.info(f"  - Fechas: {check_in} - {check_out}")
            logger.info(f"  - Habitación: {habitacion_elegida.get('nombre') if habitacion_elegida else 'No definida'}")
            logger.info(f"  - Huéspedes: {huespedes}")
            
            # 🎯 COMPLETAR AUTOMÁTICAMENTE SI TENEMOS TODO
            if check_in and check_out and habitacion_elegida and huespedes:
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - TODOS LOS DATOS DISPONIBLES - Generando URL automáticamente")
                
                # Validar capacidad antes de proceder
                habitacion_id = habitacion_elegida.get('id')
                habitacion_nombre = habitacion_elegida.get('nombre')
                
                habitacion_details = await backend_service.get_habitacion_details(habitacion_id)
                if habitacion_details:
                    capacidad_maxima = habitacion_details.get('capacidad', 0)
                    if huespedes > capacidad_maxima:
                        # 🚨 CAPACIDAD EXCEDIDA - Cambiar el tipo de query para usar prompt específico
                        context["reserva_error"] = f"La {habitacion_nombre} tiene capacidad máxima para {capacidad_maxima} personas"
                        context["reserva_capacidad_excedida"] = {
                            "habitacion_nombre": habitacion_nombre,
                            "capacidad_maxima": capacidad_maxima,
                            "huespedes_solicitados": huespedes
                        }
                        if check_in and check_out:
                            context["reserva_fechas_disponibles"] = {
                                "check_in": check_in,
                                "check_out": check_out
                            }
                        
                        # 🔄 CAMBIAR QUERY TYPE para usar prompt de capacidad excedida con habitación elegida
                        context["query_type_override"] = "capacidad_excedida_con_habitacion"
                        logger.info(f"🎯 DEBUG PROCESO_RESERVA - Error: Capacidad excedida ({huespedes} > {capacidad_maxima})")
                        logger.info(f"🔄 QUERY TYPE OVERRIDE - Cambiando a: capacidad_excedida_con_habitacion")
                        return  # ← Salir también en caso de capacidad excedida
                    else:
                        # TODO PERFECTO - Generar URL
                        checkout_url = self._generar_url_checkout(
                            hospedaje_id, habitacion_id, check_in, check_out, huespedes
                        )
                        
                        context["reserva_info"] = {
                            "habitacion_id": habitacion_id,
                            "habitacion_nombre": habitacion_nombre,
                            "fecha_inicio": check_in,
                            "fecha_fin": check_out,
                            "huespedes": huespedes,
                            "checkout_url": checkout_url
                        }
                        
                        context["proceso_reserva_caso"] = "caso1"  # ← Asignar caso1 cuando URL se genera automáticamente
                        # Saltar validaciones individuales - ir directo a determinación de caso
                        return  # ← IMPORTANTE: Ir directo a determinación de caso
            
            # 5. DETERMINAR CASOS DE ERROR Y ÉXITO según los datos disponibles
            
            # 🔧 VALIDACIONES FINALES - Solo si no se generó URL automáticamente arriba
            if check_in and check_out and habitacion_elegida and huespedes and not context.get("reserva_info"):
                # CASO 1: TODO LISTO - Generar URL de checkout (solo si no se hizo arriba)
                habitacion_id = habitacion_elegida.get('id')
                habitacion_nombre = habitacion_elegida.get('nombre')
                
                # Construir URL de checkout igual que el botón RESERVAR
                checkout_url = self._generar_url_checkout(
                    hospedaje_id, habitacion_id, check_in, check_out, huespedes
                )
                
                context["reserva_info"] = {
                    "habitacion_id": habitacion_id,
                    "habitacion_nombre": habitacion_nombre,
                    "fecha_inicio": check_in,
                    "fecha_fin": check_out,
                    "huespedes": huespedes,
                    "checkout_url": checkout_url
                }
                
                context["proceso_reserva_caso"] = "caso1"  # ← Asignar caso1 cuando URL se genera en validación final
                
            elif not habitacion_elegida:
                # CASO 2: Falta habitación específica
                context["reserva_error"] = "No se ha seleccionado una habitación específica"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Error: Falta habitación específica")
                
            elif not check_in or not check_out:
                # CASO 3: Faltan fechas
                if habitacion_elegida:
                    context["reserva_habitacion_elegida"] = {
                        "nombre": habitacion_elegida.get('nombre'),
                        "id": habitacion_elegida.get('id')
                    }
                context["reserva_error"] = "No se han especificado fechas para la reserva"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Error: Faltan fechas")
                
            elif not huespedes:
                # CASO 4: Faltan huéspedes (🔧 CORRECCIÓN: faltaba esta validación)
                context["reserva_error"] = "No se ha especificado la cantidad de huéspedes"
                if habitacion_elegida:
                    context["reserva_habitacion_elegida"] = {
                        "nombre": habitacion_elegida.get('nombre'),
                        "id": habitacion_elegida.get('id')
                    }
                if check_in and check_out:
                    context["reserva_fechas_disponibles"] = {
                        "check_in": check_in,
                        "check_out": check_out
                    }
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Error: Faltan huéspedes (validación final)")
                
            else:
                # CASO 6: Error general
                context["reserva_error"] = "Error general en el procesamiento de la reserva"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Error general")
            
            # 🆕 DETERMINAR CASO ESPECÍFICO - ERRORES PRIMERO, ÉXITO AL FINAL
            reserva_error = context.get("reserva_error", "")
            
            if reserva_error == "No se ha especificado la cantidad de huéspedes":
                context["proceso_reserva_caso"] = "caso4"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Caso determinado: CASO4 (FALTAN HUÉSPEDES) ← CORRECTO")
            elif reserva_error == "No se ha seleccionado una habitación específica":
                context["proceso_reserva_caso"] = "caso2"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Caso determinado: CASO2 (FALTA HABITACIÓN)")
            elif reserva_error == "No se han especificado fechas para la reserva":
                context["proceso_reserva_caso"] = "caso3"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Caso determinado: CASO3 (FALTAN FECHAS)")
            elif "tiene capacidad máxima para" in reserva_error:
                context["proceso_reserva_caso"] = "caso5"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Caso determinado: CASO5 (CAPACIDAD EXCEDIDA)")
            elif "reserva_info" in context and context["reserva_info"].get("checkout_url"):
                context["proceso_reserva_caso"] = "caso1"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Caso determinado: CASO1 (TODO LISTO)")
            else:
                context["proceso_reserva_caso"] = "caso6"
                logger.info(f"🎯 DEBUG PROCESO_RESERVA - Caso determinado: CASO6 (ERROR GENERAL) - Error: '{reserva_error}'")
            
        except Exception as e:
            logger.error(f"Error manejando proceso de reserva: {e}")
            context["reserva_error"] = "Error interno procesando la reserva"
            context["proceso_reserva_caso"] = "caso6"  # 🆕 Fallback a caso general

    async def _save_reserva_context_for_memory(
        self,
        hospedaje_id: str,
        user_id: str,
        conversation_id: str,
        context: Dict[str, Any]
    ):
        """Guarda el contexto de reserva pendiente para memoria conversacional"""
        try:
            # Solo guardar si hay un proceso de reserva con información parcial
            proceso_caso = context.get("proceso_reserva_caso")
            if not proceso_caso or proceso_caso == "caso1":  # caso1 = completo, no necesita memoria
                return
            
            # Extraer información relevante para memoria
            reserva_data = {}
            
            # Habitación elegida
            if "reserva_habitacion_elegida" in context:
                reserva_data["last_reserva_habitacion"] = context["reserva_habitacion_elegida"]["nombre"]
            
            # Fechas disponibles  
            if "reserva_fechas_disponibles" in context:
                reserva_data["last_reserva_fechas"] = context["reserva_fechas_disponibles"]
            
            # Huéspedes si están definidos
            query_params = context.get("query_params", {})
            if query_params.get("guests"):
                reserva_data["last_guests"] = query_params["guests"]
            
            if reserva_data:
                # Guardar en formato simple para sesión
                reserva_json = json.dumps(reserva_data)
                
                await self.db_service.execute_query(
                    """
                    INSERT INTO chat_sessions (hospedaje_id, user_id, conversation_id, session_data, updated_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT (hospedaje_id, user_id, conversation_id) 
                    DO UPDATE SET 
                        session_data = EXCLUDED.session_data || chat_sessions.session_data,
                        updated_at = NOW()
                    """,
                    (hospedaje_id, user_id, conversation_id, reserva_json)
                )
                
                logger.info(f"🎯 MEMORIA - Contexto de reserva guardado: {reserva_data}")
                
        except Exception as e:
            logger.error(f"Error guardando contexto de reserva: {e}")

    def _mapear_nombre_a_habitacion(self, nombre_habitacion: str, habitaciones: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Mapea el nombre de una habitación a su información completa"""
        try:
            nombre_lower = nombre_habitacion.lower().strip()
            logger.info(f"🎯 DEBUG MAPEO - Buscando habitación: '{nombre_lower}'")
            
            # Búsqueda exacta primero
            for hab in habitaciones:
                hab_nombre = hab.get("nombre", "").lower().strip()
                if hab_nombre == nombre_lower:
                    logger.info(f"🎯 DEBUG MAPEO - Match exacto: '{hab_nombre}' → ID: {hab.get('id')}")
                    return hab
            
            # Búsqueda parcial (contiene)
            for hab in habitaciones:
                hab_nombre = hab.get("nombre", "").lower().strip()
                if nombre_lower in hab_nombre or hab_nombre in nombre_lower:
                    logger.info(f"🎯 DEBUG MAPEO - Match parcial: '{hab_nombre}' → ID: {hab.get('id')}")
                    return hab
            
            # Búsqueda por palabras clave (suite, habitación, etc.)
            palabras_nombre = nombre_lower.split()
            for hab in habitaciones:
                hab_nombre = hab.get("nombre", "").lower().strip()
                palabras_hab = hab_nombre.split()
                
                # Si comparten al menos 2 palabras significativas
                coincidencias = set(palabras_nombre) & set(palabras_hab)
                if len(coincidencias) >= 2:
                    logger.info(f"🎯 DEBUG MAPEO - Match por palabras: '{hab_nombre}' → ID: {hab.get('id')}")
                    return hab
            
            logger.warning(f"🎯 DEBUG MAPEO - No se encontró habitación para: '{nombre_habitacion}'")
            return None
            
        except Exception as e:
            logger.error(f"Error mapeando nombre de habitación: {e}")
            return None

    def _generar_url_checkout(
        self, 
        hospedaje_id: str, 
        habitacion_id: str, 
        fecha_inicio: str, 
        fecha_fin: str, 
        huespedes: int
    ) -> str:
        """Genera la URL de checkout igual que el botón RESERVAR"""
        try:
            # URL base del frontend (configurada via variable de entorno FRONTEND_URL)
            frontend_url = settings.frontend_url
            
            # Parámetros de la URL igual que el botón RESERVAR
            params = {
                "hospedajeId": hospedaje_id,
                "habitacionIds": habitacion_id,  # ID, no nombre
                "fechaInicio": fecha_inicio,     # YYYY-MM-DD
                "fechaFin": fecha_fin,          # YYYY-MM-DD  
                "huespedes": str(huespedes)     # Número como string
            }
            
            # Construir query string
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            checkout_url = f"{frontend_url}/checkout?{query_string}"
            
            return checkout_url
            
        except Exception as e:
            logger.error(f"Error generando URL de checkout: {e}")
            return f"{settings.frontend_url}/checkout"

    def _generar_url_checkout_multiple(
        self, 
        hospedaje_id: str, 
        habitacion_ids: List[str], 
        fecha_inicio: str, 
        fecha_fin: str, 
        huespedes: int
    ) -> str:
        """Genera la URL de checkout para múltiples habitaciones"""
        try:
            # URL base del frontend
            frontend_url = settings.frontend_url
            
            # Concatenar IDs de habitaciones separados por comas
            habitacion_ids_str = ",".join(habitacion_ids)
            
            # Parámetros de la URL
            params = {
                "hospedajeId": hospedaje_id,
                "habitacionIds": habitacion_ids_str,  # IDs concatenados con comas
                "fechaInicio": fecha_inicio,     # YYYY-MM-DD
                "fechaFin": fecha_fin,          # YYYY-MM-DD  
                "huespedes": str(huespedes)     # Número total de huéspedes
            }
            
            # Construir query string
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            checkout_url = f"{frontend_url}/checkout?{query_string}"
            
            return checkout_url
            
        except Exception as e:
            logger.error(f"Error generando URL de checkout múltiple: {e}")
            return f"{settings.frontend_url}/checkout"

    def _calcular_habitaciones_necesarias(
        self, 
        guests: int, 
        habitaciones_disponibles: List[Dict[str, Any]]
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """
        Calcula qué habitaciones usar para alojar el número de huéspedes
        Retorna: (cantidad_necesaria, lista_habitaciones_seleccionadas)
        """
        try:
            if not habitaciones_disponibles:
                return 0, []
            
            # Ordenar habitaciones por capacidad (las más grandes primero para optimizar)
            habitaciones_ordenadas = sorted(
                habitaciones_disponibles, 
                key=lambda h: h.get("capacidad", 2), 
                reverse=True
            )
            
            habitaciones_seleccionadas = []
            capacidad_acumulada = 0
            
            # Algoritmo greedy: tomar habitaciones hasta cubrir la capacidad necesaria
            for habitacion in habitaciones_ordenadas:
                if capacidad_acumulada >= guests:
                    break
                    
                hab_capacidad = habitacion.get("capacidad", 2)
                habitaciones_seleccionadas.append(habitacion)
                capacidad_acumulada += hab_capacidad
                
                logger.info(f"🎯 DEBUG CÁLCULO - Agregada {habitacion.get('nombre')} (cap: {hab_capacidad}), total: {capacidad_acumulada}")
            
            # Verificar si se puede alojar a todos los huéspedes
            if capacidad_acumulada < guests:
                logger.warning(f"🎯 DEBUG CÁLCULO - No se puede alojar {guests} huéspedes (capacidad máxima: {capacidad_acumulada})")
                return 0, []
            
            # Verificar que no excedamos el número de habitaciones del hospedaje
            max_habitaciones = len(habitaciones_disponibles)
            if len(habitaciones_seleccionadas) > max_habitaciones:
                logger.warning(f"🎯 DEBUG CÁLCULO - Se requieren más habitaciones ({len(habitaciones_seleccionadas)}) de las disponibles ({max_habitaciones})")
                return 0, []
            
            logger.info(f"🎯 DEBUG CÁLCULO - Solución encontrada: {len(habitaciones_seleccionadas)} habitaciones para {guests} huéspedes")
            return len(habitaciones_seleccionadas), habitaciones_seleccionadas
            
        except Exception as e:
            logger.error(f"Error calculando habitaciones necesarias: {e}")
            return 0, []

    async def _handle_reserva_multiple(
        self,
        context: Dict[str, Any],
        hospedaje_id: str,
        message: str
    ):
        """Maneja solicitudes de reserva de múltiples habitaciones"""
        try:
            logger.info(f"🎯 DEBUG RESERVA_MULTIPLE - Iniciando manejo de reserva múltiple")
            logger.info(f"🎯 DEBUG RESERVA_MULTIPLE - Mensaje: '{message}'")
            
            # Obtener fechas del contexto
            query_params = context.get("query_params", {})
            check_in = query_params.get('check_in')
            check_out = query_params.get('check_out')
            
            if not check_in or not check_out:
                context["response_text"] = "Para generar las reservas necesito confirmar las fechas. ¿Para qué fechas querés reservar las habitaciones?"
                return
            
            # Obtener habitaciones disponibles del contexto
            availability_real = context.get("availability_real", {})
            if not availability_real:
                context["response_text"] = "Primero necesito consultar la disponibilidad. ¿Para qué fechas querés reservar?"
                return
            
            hospedaje_disp = availability_real.get("hospedaje_disponibilidad", {})
            habitaciones_disponibles = hospedaje_disp.get("detalle_habitaciones", [])
            
            if len(habitaciones_disponibles) < 2:
                context["response_text"] = f"Para las fechas del {check_in} al {check_out} solo tenemos {len(habitaciones_disponibles)} habitación disponible. ¿Te interesa reservarla o prefieres consultar otras fechas?"
                return
            
            # Extraer número de huéspedes del historial o mensaje
            guests = query_params.get('guests') or self._extract_guest_count_from_context(context)
            if not guests:
                guests = 4  # Default para múltiples habitaciones
            
            # Calcular cuántas habitaciones se necesitan y cuáles usar
            habitaciones_necesarias, habitaciones_seleccionadas = self._calcular_habitaciones_necesarias(
                guests, habitaciones_disponibles
            )
            
            if not habitaciones_seleccionadas:
                context["response_text"] = f"No puedo generar una combinación de habitaciones para {guests} personas. ¿Podrías confirmar el número de huéspedes?"
                return
            
            # Generar una sola URL con múltiples habitaciones
            habitacion_ids = [hab["id"] for hab in habitaciones_seleccionadas]
            url_checkout = self._generar_url_checkout_multiple(
                hospedaje_id=hospedaje_id,
                habitacion_ids=habitacion_ids,
                fecha_inicio=check_in,
                fecha_fin=check_out,
                huespedes=guests
            )
            
            # Preparar info de habitaciones para respuesta
            habitaciones_info = []
            capacidad_total = 0
            for habitacion in habitaciones_seleccionadas:
                hab_info = {
                    "nombre": habitacion.get("nombre"),
                    "capacidad": habitacion.get("capacidad", 2)
                }
                habitaciones_info.append(hab_info)
                capacidad_total += hab_info["capacidad"]
                
                logger.info(f"🎯 DEBUG RESERVA_MULTIPLE - Habitación seleccionada: {hab_info['nombre']} (capacidad: {hab_info['capacidad']})")
            
            # Generar respuesta
            fecha_formateada_inicio = check_in.replace("-", "/")
            fecha_formateada_fin = check_out.replace("-", "/")
            
            response_text = f"¡Perfecto! He generado tu enlace de reserva para {len(habitaciones_seleccionadas)} habitaciones del {fecha_formateada_inicio} al {fecha_formateada_fin}:\n\n"
            
            # Mostrar habitaciones incluidas
            for i, hab_info in enumerate(habitaciones_info, 1):
                response_text += f"{i}. **{hab_info['nombre']}** (capacidad: {hab_info['capacidad']} personas)\n"
            
            response_text += f"\n**Capacidad total**: {capacidad_total} personas\n"
            response_text += f"**Huéspedes**: {guests} personas\n\n"
            response_text += f"**🔗 Enlace de reserva**:\n{url_checkout}\n\n"
            response_text += "¡Hacé clic en el enlace para completar la reserva de todas las habitaciones juntas! 🎉"
            
            context["response_text"] = response_text
            
            # Guardar contexto de reserva múltiple
            await self._save_reserva_context_multiple(
                context, 
                hospedaje_id, 
                habitaciones_info, 
                check_in, 
                check_out, 
                guests,
                url_checkout
            )
            
        except Exception as e:
            logger.error(f"Error manejando reserva múltiple: {e}")
            context["response_text"] = "Ocurrió un error al generar las reservas múltiples. ¿Podés intentar nuevamente?"

    def _extract_guest_count_from_context(self, context: Dict[str, Any]) -> Optional[int]:
        """Extrae el número de huéspedes del contexto conversacional"""
        try:
            # 1. Buscar en query_params primero
            query_params = context.get("query_params", {})
            if query_params.get("guests"):
                logger.info(f"🔍 HUÉSPEDES CONTEXTO - Encontrados en query_params: {query_params['guests']}")
                return query_params["guests"]
            
            # 2. Buscar en frontend_conversation (revisar todos los mensajes del usuario)
            frontend_conversation = context.get("frontend_conversation", {})
            if frontend_conversation:
                recent_messages = frontend_conversation.get("recent_messages", [])
                logger.info(f"🔍 HUÉSPEDES CONTEXTO - Revisando {len(recent_messages)} mensajes del historial")
                
                # Revisar todos los mensajes del usuario de más reciente a más antiguo
                for i, msg in enumerate(reversed(recent_messages)):
                    if msg.get("role") == "user":
                        user_message = msg.get("message", "").lower()
                        logger.info(f"🔍 HUÉSPEDES CONTEXTO - Mensaje {i+1}: '{user_message[:50]}...'")
                        
                        # Usar la función existente para extraer huéspedes
                        guest_count = self._extract_guest_count(user_message)
                        if guest_count:
                            logger.info(f"✅ HUÉSPEDES CONTEXTO - Encontrados: {guest_count} personas")
                            return guest_count
                        
                        # También buscar patrones específicos adicionales
                        import re
                        patterns = [
                            r'para\s+(\d+)\s*personas?',
                            r'somos\s+(\d+)',
                            r'(\d+)\s*huéspedes?',
                            r'(\d+)\s*personas?'
                        ]
                        
                        for pattern in patterns:
                            match = re.search(pattern, user_message)
                            if match:
                                num = int(match.group(1))
                                if 1 <= num <= 20:  # Rango razonable
                                    logger.info(f"✅ HUÉSPEDES CONTEXTO - Encontrados con patrón {pattern}: {num}")
                                    return num
                
            logger.info("❌ HUÉSPEDES CONTEXTO - No encontrados en el historial")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error extrayendo huéspedes del contexto: {e}")
            return None

    async def _save_reserva_context_multiple(
        self,
        context: Dict[str, Any],
        hospedaje_id: str,
        habitaciones_info: List[Dict],
        check_in: str,
        check_out: str,
        guests: int,
        url_checkout: str
    ):
        """Guarda el contexto de reserva múltiple en la sesión"""
        try:
            # Solo guardar si hay datos de usuario
            user_id = context.get("user_id")
            conversation_id = context.get("conversation_id")
            
            if not user_id or not conversation_id:
                logger.info("🎯 MEMORIA - No hay user_id o conversation_id, no guardando contexto")
                return
                
            reserva_data = {
                "tipo": "reserva_multiple",
                "hospedaje_id": hospedaje_id,
                "habitaciones": habitaciones_info,
                "fecha_inicio": check_in,
                "fecha_fin": check_out,
                "huespedes": guests,
                "url_checkout": url_checkout,
                "timestamp": datetime.now().isoformat()
            }
            
            reserva_json = json.dumps(reserva_data)
            
            await self.db_service.execute_query(
                """
                INSERT INTO chat_sessions (hospedaje_id, user_id, conversation_id, session_data, updated_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (hospedaje_id, user_id, conversation_id) 
                DO UPDATE SET 
                    session_data = EXCLUDED.session_data || chat_sessions.session_data,
                    updated_at = NOW()
                """,
                (hospedaje_id, user_id, conversation_id, reserva_json)
            )
            
            logger.info(f"🎯 MEMORIA - Contexto de reserva múltiple guardado: {reserva_data}")
            
        except Exception as e:
            logger.error(f"Error guardando contexto de reserva múltiple: {e}")

    async def _analyze_capacity_requirements(self, message: str, context: Dict[str, Any], query_type: str) -> Dict[str, Any]:
        """Analiza si la consulta excede la capacidad de las habitaciones y maneja el caso"""
        try:
            # Extraer número de huéspedes del mensaje
            numero_huespedes = self._extract_guest_count(message)
            if not numero_huespedes:
                return {"capacity_exceeded": False}
            
            # Obtener habitaciones disponibles del contexto
            habitaciones_disponibles = []
            availability_real = context.get("availability_real", {})
            if availability_real:
                hospedaje_disp = availability_real.get("hospedaje_disponibilidad", {})
                habitaciones_disponibles = hospedaje_disp.get("detalle_habitaciones", [])
            
            # Si no hay habitaciones disponibles, no hay problema de capacidad
            if not habitaciones_disponibles:
                return {"capacity_exceeded": False}
            
            # Calcular capacidad máxima individual
            capacidad_maxima = max(hab.get("capacidad", 2) for hab in habitaciones_disponibles)
            
            # Verificar si excede la capacidad
            if numero_huespedes <= capacidad_maxima:
                return {"capacity_exceeded": False}
            
            logger.info(f"🚨 CAPACIDAD EXCEDIDA - Huéspedes: {numero_huespedes}, Capacidad máxima: {capacidad_maxima}")
            
            # Detectar si mencionó habitación específica EN EL MENSAJE o YA TENÍA UNA ELEGIDA
            habitacion_especifica = self._extract_specific_room(message, habitaciones_disponibles)
            
            # Buscar si ya hay una habitación elegida del contexto conversacional
            habitacion_elegida_contexto = self._identificar_habitacion_del_contexto(context)
            
            # Calcular habitaciones necesarias
            habitaciones_necesarias = (numero_huespedes + capacidad_maxima - 1) // capacidad_maxima  # Ceiling division
            
            # Generar combinaciones posibles
            combinaciones = self._generate_room_combinations(habitaciones_disponibles, numero_huespedes)
            
            # Determinar el tipo de consulta específico
            if habitacion_especifica:
                new_query_type = "capacidad_excedida_especifica"
                logger.info(f"🎯 CAPACIDAD EXCEDIDA - Habitación mencionada en mensaje: {habitacion_especifica}")
            elif habitacion_elegida_contexto:
                new_query_type = "capacidad_excedida_con_habitacion"
                logger.info(f"🎯 CAPACIDAD EXCEDIDA - Habitación del contexto: {habitacion_elegida_contexto.get('nombre')}")
            else:
                new_query_type = "capacidad_excedida_general"
                logger.info(f"🎯 CAPACIDAD EXCEDIDA - Consulta general sin habitación específica")
            
            # Contexto mejorado
            enhanced_context = {
                "capacidad_excedida": {
                    "numero_huespedes": numero_huespedes,
                    "capacidad_maxima_individual": capacidad_maxima,
                    "habitacion_especifica": habitacion_especifica,
                    "habitacion_elegida_contexto": habitacion_elegida_contexto,
                    "habitaciones_necesarias": habitaciones_necesarias,
                    "combinaciones_posibles": combinaciones,
                    "habitaciones_disponibles": habitaciones_disponibles
                }
            }
            
            return {
                "capacity_exceeded": True,
                "new_query_type": new_query_type,
                "enhanced_context": enhanced_context
            }
            
        except Exception as e:
            logger.error(f"Error analizando capacidad: {e}")
            return {"capacity_exceeded": False}
    
    def _extract_guest_count(self, message: str) -> Optional[int]:
        """Extrae el número de huéspedes del mensaje"""
        import re
        
        # Patrones para detectar números de personas
        patterns = [
            r'para\s+(\d+)\s+personas?',
            r'somos\s+(\d+)\s+personas?',
            r'(\d+)\s+huéspedes?',
            r'grupo\s+de\s+(\d+)',
            r'familia\s+de\s+(\d+)',
            r'(\d+)\s+personas?',
        ]
        
        message_lower = message.lower()
        for pattern in patterns:
            match = re.search(pattern, message_lower)
            if match:
                return int(match.group(1))
        
        return None
    
    def _extract_specific_room(self, message: str, habitaciones_disponibles: List[Dict]) -> Optional[str]:
        """Detecta si el usuario mencionó una habitación específica"""
        message_lower = message.lower()
        
        for habitacion in habitaciones_disponibles:
            nombre_habitacion = habitacion.get("nombre", "").lower()
            if nombre_habitacion and nombre_habitacion in message_lower:
                return habitacion.get("nombre")
        
        return None
    
    def _generate_room_combinations(self, habitaciones_disponibles: List[Dict], numero_huespedes: int) -> List[Dict]:
        """Genera combinaciones posibles de habitaciones para alojar a todos los huéspedes"""
        from itertools import combinations
        
        combinaciones_validas = []
        
        # Probar combinaciones de 2 habitaciones (más común)
        if len(habitaciones_disponibles) >= 2:
            for combo in combinations(habitaciones_disponibles, 2):
                capacidad_total = sum(hab.get("capacidad", 2) for hab in combo)
                if capacidad_total >= numero_huespedes:
                    combinaciones_validas.append({
                        "habitaciones": [hab.get("nombre") for hab in combo],
                        "ids": [hab.get("id") for hab in combo],
                        "capacidad_total": capacidad_total,
                        "distribucion": f"{numero_huespedes // 2} personas en cada habitación" if numero_huespedes % 2 == 0 else f"{numero_huespedes // 2 + 1} en una, {numero_huespedes // 2} en otra"
                    })
        
        # Si no hay combinaciones de 2, probar con todas las disponibles
        if not combinaciones_validas and len(habitaciones_disponibles) >= 3:
            capacidad_total = sum(hab.get("capacidad", 2) for hab in habitaciones_disponibles)
            if capacidad_total >= numero_huespedes:
                combinaciones_validas.append({
                    "habitaciones": [hab.get("nombre") for hab in habitaciones_disponibles],
                    "ids": [hab.get("id") for hab in habitaciones_disponibles],
                    "capacidad_total": capacidad_total,
                    "distribucion": f"Distribuir {numero_huespedes} personas en {len(habitaciones_disponibles)} habitaciones"
                })
        
        return combinaciones_validas

    def _is_anonymous_user(self, user_id: str) -> bool:
        """Determina si el usuario es anónimo y no debe guardarse en BD"""
        return user_id in ["anonymous", "anónimo", ""] or user_id.startswith("temp_") or user_id.startswith("guest_")