import logging
import re
from typing import Dict, List, Tuple, Any, Optional
from ..core.config import settings

logger = logging.getLogger(__name__)

class QueryClassifier:
    def __init__(self):
        self.classification_patterns = {
            "metodos_pago": [
                # Patrones específicos para consultas sobre métodos/formas de pago
                r"cómo.*pagar|como.*pagar|cómo.*puedo.*pagar|como.*puedo.*pagar",
                r"formas.*de.*pago|formas.*pago|métodos.*de.*pago|métodos.*pago|metodos.*pago",
                # 🔧 AGREGANDO PATRONES PARA "MEDIOS DE PAGO" (FALTABA!)
                r"medios.*de.*pago|medios.*pago|qué.*medios.*pago|que.*medios.*pago",
                r"cuáles.*medios.*pago|cuales.*medios.*pago|qué.*medios.*tienen|que.*medios.*tienen",
                r"medios.*de.*pago.*tienen|medios.*pago.*tienen|medios.*aceptan|medios.*reciben",
                r"opciones.*de.*pago|opciones.*pago|modalidades.*de.*pago|modalidades.*pago",
                r"qué.*métodos.*pago|que.*métodos.*pago|qué.*formas.*pago|que.*formas.*pago",
                r"cuáles.*métodos.*pago|cuales.*métodos.*pago|cuáles.*formas.*pago|cuales.*formas.*pago",
                r"qué.*opciones.*pago|que.*opciones.*pago|cuáles.*opciones.*pago|cuales.*opciones.*pago",
                # 🆕 PATRONES MÁS ESPECÍFICOS para capturar "cuales son los metodos de pago"
                r"cuáles.*son.*los.*métodos|cuales.*son.*los.*métodos|cuáles.*son.*los.*metodos|cuales.*son.*los.*metodos",
                r"cuáles.*son.*las.*formas|cuales.*son.*las.*formas|qué.*métodos.*hay|que.*métodos.*hay",
                r"cuáles.*métodos.*hay|cuales.*métodos.*hay|qué.*formas.*hay|que.*formas.*hay",
                r"de.*qué.*formas.*pagar|de.*que.*formas.*pagar|de.*qué.*manera.*pagar",
                r"cómo.*se.*puede.*pagar|como.*se.*puede.*pagar|cómo.*efectuar.*pago|como.*efectuar.*pago",
                r"qué.*opciones.*tengo.*pagar|que.*opciones.*tengo.*pagar",
                r"cuáles.*son.*formas.*pagar|cuales.*son.*formas.*pagar|cuáles.*son.*opciones.*pagar",
                r"formas.*de.*abonar|formas.*abonar|modalidades.*abonar|opciones.*abonar",
                r"métodos.*aceptan|metodos.*aceptan|formas.*aceptan|opciones.*aceptan"
            ],
            "precios": [
                # Patrones refinados para PRECIOS (excluyendo métodos de pago)
                r"precio|costo|tarifa|vale|cuesta|cobran|dinero|plata|euros?|dolares?|pesos?",
                r"cuanto|cuánto|valor|monto|importe",
                r"barato|caro|económico|costoso",
                r"descuento|promoción|oferta|rebaja",
                r"que.*precio|precio.*tiene|que.*cuesta|cuanto.*sale",
                r"sale|por.*noche|por.*día|tarifas",
                # 🆕 Patrones específicos para consultas corteses de precios
                r"cuál.*precio|cual.*precio|cuales.*precios|cuáles.*precios",
                r"cuál.*tarifa|cual.*tarifa|cuales.*tarifas|cuáles.*tarifas", 
                r"cuál.*costo|cual.*costo|cuales.*costos|cuáles.*costos",
                r"cuál.*valor|cual.*valor|cuales.*valores|cuáles.*valores",
                r"qué.*precio|que.*precio|qué.*costo|que.*costo",
                r"qué.*tarifa|que.*tarifa|qué.*valor|que.*valor",
                r"cuánto.*sale|cuanto.*sale|cuánto.*cuesta|cuanto.*cuesta",
                r"cuánto.*abonar|cuanto.*abonar",
                # 🔧 REFINADOS: Solo "cuánto pagar" sin "cómo pagar"
                r"cuánto.*tengo.*que.*pagar|cuanto.*tengo.*que.*pagar",
                r"cuánto.*debo.*pagar|cuanto.*debo.*pagar",
                r"cuánto.*debería.*pagar|cuanto.*debería.*pagar",
                r"a.*cuánto.*asciende|a.*cuanto.*asciende",
                r"cuánto.*equivale|cuanto.*equivale",
                r"me.*podrías.*indicar.*costo|me.*podrías.*indicar.*precio",
                r"me.*podrías.*decir.*costo|me.*podrías.*decir.*precio",
                r"estadía.*precio|estadía.*costo|estadia.*precio|estadia.*costo",
                r"habitación.*precio|habitación.*costo|habitacion.*precio|habitacion.*costo",
                r"para.*esas.*fechas.*precio|para.*esas.*fechas.*costo",
                r"sería.*precio|seria.*precio|sería.*costo|seria.*costo"
            ],
            "disponibilidad": [
                r"disponible|disponibilidad|libre|liberado|ocupado",
                r"lugar|lugares|espacio|espacios|plaza|plazas",
                r"habitación libre|habitación disponible|cupo|cupos|vacante|vacantes",
                r"opción|opciones|algo libre|algo disponible",
                r"te queda|tenés algo|hay algo|queda algo",
                r"lugar disponible|lugares disponibles|plaza disponible|plazas disponibles",
                r"fecha|día|semana|mes|calendario|finde|fin de semana",
                r"puedo|podemos|se puede|hay lugar|hay espacio",
                r"cuando|cuándo|desde|hasta|entre|para|en"
            ],
            "hospedaje_servicios": [
                # 🔧 PATRONES EXPLÍCITOS Y FUERTES para servicios del hospedaje
                r"servicios\s+(del\s+)?hospedaje|servicios\s+(del\s+)?hotel|servicios\s+(del\s+)?lugar",
                r"que\s+servicios\s+tiene\s+(el\s+)?hospedaje|que\s+servicios\s+tiene\s+(el\s+)?hotel",
                r"con\s+que\s+servicios\s+cuenta\s+(el\s+)?hospedaje|con\s+que\s+servicios\s+cuenta\s+(el\s+)?hotel",
                r"comodidades\s+(del\s+)?hospedaje|comodidades\s+(del\s+)?hotel|comodidades\s+(del\s+)?lugar",
                r"que\s+tiene\s+(el\s+)?hospedaje|que\s+tiene\s+(el\s+)?hotel|que\s+tiene\s+(el\s+)?lugar",
                r"instalaciones\s+(del\s+)?hospedaje|instalaciones\s+(del\s+)?hotel|instalaciones\s+(del\s+)?lugar",
                r"amenities\s+(del\s+)?hospedaje|amenities\s+(del\s+)?hotel|amenities\s+(del\s+)?lugar",
                r"facilidades\s+(del\s+)?hospedaje|facilidades\s+(del\s+)?hotel|facilidades\s+(del\s+)?lugar",
                r"qué\s+ofrece\s+(el\s+)?hospedaje|que\s+ofrece\s+(el\s+)?hospedaje|qué\s+ofrece\s+(el\s+)?hotel",
                r"servicios\s+generales|comodidades\s+generales|instalaciones\s+generales",
                r"servicios\s+incluidos|que\s+incluye\s+(la\s+)?estadía|que\s+incluye\s+(el\s+)?hospedaje",
                r"instalaciones\s+comunes|áreas\s+comunes|servicios\s+compartidos|zonas\s+comunes",
                # 🆕 PATRONES MÁS DIRECTOS para capturar consultas comunes
                r"servicios\s+tiene\s+(el\s+)?hospedaje|servicios\s+tiene\s+(el\s+)?hotel",
                r"que\s+servicios\s+tiene\s+el\s+hospedaje|que\s+servicios\s+tiene\s+el\s+hotel",
                r"servicios\s+del\s+hospedaje|servicios\s+del\s+hotel",
                r"que\s+servicios.*hospedaje|que\s+servicios.*hotel",
                r"hospedaje.*servicios|hotel.*servicios",
                # Servicios específicos del hospedaje (no de habitaciones)
                r"piscina|pileta|spa|gimnasio|restaurant|restaurante|bar|cafetería|cafeteria",
                r"estacionamiento|parking|garage|garaje|recepción|lobby|reception",
                r"wifi\s+gratuito|internet\s+gratis|desayuno\s+incluido|jardín|jardin|terraza\s+común",
                r"lavandería|lavanderia|servicio\s+de\s+limpieza|limpieza\s+general",
                r"seguridad|vigilancia|caja\s+fuerte|safe|conserjería|conserje"
            ],
            "habitacion_servicios": [
                r"servicios de la habitación|que tiene la habitación|comodidades de la suite",
                r"incluye la habitación|equipamiento|amenities de la habitación",
                r"qué hay en la habitación|servicios privados|comodidades privadas",
                r"qué viene con la habitación|equipado con|cuenta con",
                r"suite.*tiene|habitación.*incluye|habitación.*cuenta",
                r"aire acondicionado|calefacción|tv|televisión|minibar|refrigerador",
                r"baño privado|jacuzzi|hidromasaje|balcón|terraza privada",
                r"cocina equipada|kitchenette|escritorio|área de trabajo",
                # 🆕 Patrones para referencias contextuales  
                r"esa habitación|esta habitación|la habitación|dicha habitación",
                r"esa suite|esta suite|la suite|dicha suite",
                r"con qué.*cuenta|con que.*cuenta|qué.*incluye|que.*incluye",
                r"servicios.*cuenta|comodidades.*tiene|amenities.*incluye",
                r"cuenta con|viene con|incluye.*habitación|tiene.*habitación"
            ],
            "servicio_especifico": [
                # Patrones para consultas sobre servicios específicos individuales
                r"¿.*tiene.*jacuzzi|tiene.*jacuzzi|hay.*jacuzzi|cuenta.*jacuzzi",
                r"¿.*tiene.*wifi|tiene.*wifi|hay.*wifi|cuenta.*wifi",
                r"¿.*tiene.*aire|tiene.*aire.*acondicionado|hay.*aire|cuenta.*aire",
                r"¿.*tiene.*balcón|tiene.*balcón|hay.*balcón|cuenta.*balcón",
                r"¿.*tiene.*cocina|tiene.*cocina|hay.*cocina|cuenta.*cocina",
                r"¿.*tiene.*tv|tiene.*tv|hay.*tv|cuenta.*tv|tiene.*televisión",
                r"¿.*tiene.*estacionamiento|tiene.*estacionamiento|hay.*estacionamiento",
                r"¿.*tiene.*desayuno|tiene.*desayuno|hay.*desayuno|incluye.*desayuno",
                r"¿.*tiene.*limpieza|tiene.*limpieza|hay.*limpieza|incluye.*limpieza",
                r"¿.*tiene.*piscina|tiene.*piscina|hay.*piscina|cuenta.*piscina",
                # Patrones generales para cualquier servicio específico
                r"¿.*tiene.*\w+|¿.*hay.*\w+|¿.*cuenta.*con.*\w+|¿.*incluye.*\w+",
                r"tiene.*\w+\?|hay.*\w+\?|cuenta.*con.*\w+\?|incluye.*\w+\?",
                r"la.*habitación.*tiene.*\w+|el.*hospedaje.*tiene.*\w+",
                r"disponible.*\w+|dispone.*de.*\w+|posee.*\w+"
            ],
            "servicios_multiples_habitaciones": [
                # Patrones para consultas sobre servicios de múltiples habitaciones
                r"servicios.*cada.*habitación|servicios.*cada.*habitacion|servicios.*de.*cada.*habitación",
                r"servicios.*todas.*habitaciones|servicios.*todas.*las.*habitaciones",
                r"servicios.*de.*todas|servicios.*de.*las.*tres|servicios.*las.*tres",
                r"que.*servicios.*cada.*habitación|que.*servicios.*cada.*habitacion",
                r"que.*servicios.*todas.*habitaciones|que.*servicios.*todas.*las.*habitaciones",
                r"cada.*habitación.*servicios|cada.*habitacion.*servicios|todas.*habitaciones.*servicios",
                r"servicios.*habitaciones.*disponibles|servicios.*de.*habitaciones.*disponibles",
                r"comodidades.*cada.*habitación|comodidades.*todas.*habitaciones",
                r"amenities.*cada.*habitación|amenities.*todas.*habitaciones",
                r"que.*tiene.*cada.*habitación|que.*tiene.*cada.*habitacion|que.*tiene.*cada.*una"
            ],
            "proceso_reserva": [
                # Patrones OPTIMIZADOS y MÁS AMPLIOS para consultas sobre cómo reservar
                r"cómo.*puedo.*hacer.*para.*reservar|como.*puedo.*hacer.*para.*reservar",
                r"cómo.*puedo.*hacer.*una.*reserva|como.*puedo.*hacer.*una.*reserva", 
                r"cómo.*puedo.*reservar|como.*puedo.*reservar",
                r"como.*hago.*para.*reservar|cómo.*hago.*para.*reservar",
                r"como.*reservo|cómo.*reservo|como.*me.*reservo",
                r"qué.*pasos.*debo.*seguir.*para.*reservar|que.*pasos.*debo.*seguir.*para.*reservar",
                r"cómo.*puedo.*asegurar.*mi.*reserva|como.*puedo.*asegurar.*mi.*reserva",
                r"qué.*procedimientos.*debo.*seguir.*para.*reservar|que.*procedimientos.*debo.*seguir.*para.*reservar",
                r"cuáles.*son.*los.*pasos.*para.*hacer.*una.*reserva|cuales.*son.*los.*pasos.*para.*hacer.*una.*reserva",
                r"cómo.*puedo.*confirmar.*mi.*reserva|como.*puedo.*confirmar.*mi.*reserva",
                r"qué.*debo.*hacer.*para.*asegurar.*mi.*lugar|que.*debo.*hacer.*para.*asegurar.*mi.*lugar",
                r"cómo.*reservar|como.*reservar|quiero.*reservar|deseo.*reservar",
                r"hacer.*reserva|realizar.*reserva|efectuar.*reserva|proceder.*reserva",
                r"reservar.*habitación|reservar.*habitacion|reservar.*suite",
                r"proceso.*de.*reserva|proceso.*reserva|procedimiento.*reserva",
                r"pasos.*reserva|pasos.*para.*reservar|instrucciones.*reserva",
                # 🆕 PATRONES ADICIONALES MÁS DIRECTOS
                r"^como.*puedo.*reservar.*$|^cómo.*puedo.*reservar.*$",
                r"reservar.*esto|reservar.*esta|reservar.*eso|reservar.*esa",
                r"la.*reservo|lo.*reservo|me.*la.*reservo|me.*lo.*reservo",
                r"continuar.*reserva|seguir.*reserva|proceder.*con.*reserva",
                r"confirmar.*reserva|asegurar.*reserva|apartar.*habitación|apartar.*suite"
            ],
            "capacidad_excedida_especifica": [
                # Patrones para cuando usuario menciona habitación específica con exceso de capacidad
                r"suite.*taina.*para.*\d+.*personas?",
                r"suite.*martina.*para.*\d+.*personas?", 
                r"suite.*bony.*para.*\d+.*personas?",
                r"habitación.*\w+.*para.*\d+.*personas?",
                r"reservar.*la.*suite.*\w+.*para.*\d+",
                r"quiero.*la.*\w+.*para.*\d+.*personas?",
                r"me.*interesa.*la.*\w+.*para.*\d+.*personas?"
            ],
            "capacidad_excedida_general": [
                # Patrones para consultas generales que exceden capacidad
                r"para.*\d+.*personas?.*disponible",
                r"disponible.*para.*\d+.*personas?",
                r"somos.*\d+.*personas?.*disponible",
                r"grupo.*de.*\d+.*personas?.*lugar",
                r"familia.*de.*\d+.*disponibilidad",
                r"\d+.*huéspedes?.*disponible",
                r"lugar.*para.*\d+.*personas?",
                r"habitación.*para.*\d+.*personas?.*disponible"
            ],
            "reserva_multiple": [
                # Patrones para cuando usuario quiere reservar múltiples habitaciones
                r"reservar.*ambas?.*habitaciones?",
                r"reservar.*las.*dos.*habitaciones?",
                r"quiero.*reservar.*ambas?",
                r"puedo.*reservar.*ambas?",
                r"reservar.*\d+.*habitaciones?",
                r"quiero.*las.*dos.*habitaciones?",
                r"me.*quedo.*con.*ambas?",
                r"tomar.*ambas?.*habitaciones?",
                r"apartar.*ambas?.*habitaciones?",
                r"ambas?.*quisiera.*reservar",
                r"ambas?.*quiero.*reservar", 
                r"las.*dos.*quisiera.*reservar",
                r"ambas?.*me.*interesa",
                r"reservar.*dos.*habitaciones?",
                r"confirmar.*ambas?.*habitaciones?",
                r"proceder.*con.*ambas?",
                r"generar.*enlace.*para.*ambas?",
                r"continuar.*con.*ambas?.*habitaciones?"
            ],
            "servicios": [
                r"servicio|servicios|incluye|incluido|ofrece|ofrecen",
                r"limpieza|toallas|sabanas|amenities",
                r"que tiene|que hay|cuenta con|dispone"
            ],
            "ubicacion": [
                r"donde|dónde|ubicación|ubicado|dirección|lugar",
                r"cerca|lejos|distancia|kilómetros|metros|km",
                r"centro|downtown|ciudad|pueblo|barrio",
                r"transporte|colectivo|bus|taxi|uber",
                r"como llegar|cómo llegar|llego|ir|voy"
            ],
            "checkin": [
                r"check.?in|check.?out|entrada|salida|llegada",
                r"hora|horario|tiempo|cuando llegar|cuándo llegar",
                r"llave|key|código|acceso|ingreso",
                r"recepción|reception|front desk"
            ],
            "habitaciones": [
                r"habitación|habitaciones|cuarto|room|rooms",
                r"cama|bed|matrimonial|individual|doble|single|double",
                r"baño|bathroom|ducha|shower|bañera",
                r"vista|view|balcón|terraza|ventana",
                r"capacidad|personas|huéspedes|guests|ocupantes"
            ],
            "politicas": [
                r"política|políticas|reglas|normas|rules",
                r"cancelación|cancelar|cancel|reembolso|refund",
                r"mascotas|pets|animales|perros|gatos",
                r"fumar|smoking|no smoking|prohibido",
                r"niños|children|kids|bebés|babies"
            ],
            "contacto": [
                r"contacto|contact|teléfono|phone|email|mail",
                r"llamar|escribir|comunicar|hablar",
                r"whatsapp|telegram|mensaje|message",
                r"propietario|owner|administrador|manager"
            ]
        }
        
        # Palabras clave para subcategorías
        self.subcategory_patterns = {
            "precios_especificos": [
                r"noche|día|semana|mes|temporada|season",
                r"por persona|per person|individual|grupal"
            ],
            "servicios_especificos": [
                r"gratis|free|incluido|included|extra|adicional",
                r"horario|schedule|abierto|cerrado|disponible"
            ]
        }
    
    def _has_answered_topic(self, conversation_history: List[Dict], topic: str) -> bool:
        """Detecta si ya se respondió un tema específico en la conversación"""
        if not conversation_history:
            return False
            
        # Buscar mensajes del bot que contengan respuestas sobre el tema
        topic_keywords = {
            "disponibilidad": ["disponible", "disponibilidad", "habitaciones disponibles", "suites disponibles", "lugar", "libre"],
            "precios": ["precio", "cuesta", "costo", "tarifa", "ARS", "$", "pesos", "importe"]
        }
        
        keywords = topic_keywords.get(topic, [])
        if not keywords:
            return False
            
        for msg in conversation_history:
            # Solo revisar mensajes del asistente
            if msg.get("role") == "assistant" and msg.get("message"):
                message_content = msg["message"].lower()
                # Si encontramos 2 o más keywords del tema, consideramos que fue tratado
                matches = sum(1 for keyword in keywords if keyword in message_content)
                if matches >= 2:
                    logger.info(f"🧠 DEBUG CONVERSACIONAL - Tema '{topic}' ya tratado en: '{msg['message'][:100]}...'")
                    return True
        
        return False
    
    def _has_new_dates_in_message(self, message: str, previous_dates: Dict[str, Any]) -> bool:
        """Detecta si el mensaje contiene fechas nuevas diferentes a las ya tratadas"""
        # Patrones básicos para detectar fechas en el mensaje
        date_patterns = [
            r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}',  # 25/07/2025
            r'\d{1,2}\s+de\s+\w+',            # 25 de julio
            r'\w+\s+\d{1,2}',                 # julio 25
            r'mañana|hoy|pasado mañana',       # fechas relativas
            r'próxim[ao]\s+\w+',              # próximo viernes
        ]
        
        message_lower = message.lower()
        has_dates_in_message = any(re.search(pattern, message_lower) for pattern in date_patterns)
        
        if not has_dates_in_message:
            logger.info(f"🧠 DEBUG CONVERSACIONAL - No hay fechas nuevas en el mensaje")
            return False
            
        # Si hay fechas en el mensaje, asumir que son nuevas (simplificado)
        logger.info(f"🧠 DEBUG CONVERSACIONAL - Detectadas fechas nuevas en el mensaje")
        return True

    async def classify_query(self, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Clasifica una consulta en categorías predefinidas considerando el contexto conversacional"""
        try:
            message_lower = message.lower()
            
            # 🎯 DETECTAR SI RESPUESTA YA FUE INTERCEPTADA 
            query_params = context.get("query_params", {}) if context else {}
            if query_params.get("intercepted_guest_response"):
                logger.info(f"🎯 CLASIFICADOR - Respuesta de huéspedes ya interceptada, forzando proceso_reserva")
                return "proceso_reserva"
            
            # 🧠 MEMORIA CONVERSACIONAL - obtener historial para contexto
            conversation_history = []
            if context:
                # Obtener historial del frontend o sesión
                frontend_conv = context.get("frontend_conversation", {})
                if frontend_conv.get("recent_messages"):
                    conversation_history = frontend_conv["recent_messages"]
                elif context.get("session_context", {}).get("recent_messages"):
                    conversation_history = context["session_context"]["recent_messages"]
            
            # 🧠 CLASIFICACIÓN NORMAL
            
            # Detectar temas ya tratados
            has_answered_availability = self._has_answered_topic(conversation_history, "disponibilidad")
            has_answered_prices = self._has_answered_topic(conversation_history, "precios")
            has_new_dates = self._has_new_dates_in_message(message, context.get("query_params", {}))
            
            logger.info(f"🧠 DEBUG CONVERSACIONAL - Disponibilidad tratada: {has_answered_availability}")
            logger.info(f"🧠 DEBUG CONVERSACIONAL - Precios tratados: {has_answered_prices}")
            logger.info(f"🧠 DEBUG CONVERSACIONAL - Fechas nuevas: {has_new_dates}")
            
            # 🎯 APLICAR LÓGICA CONVERSACIONAL: Determinar categorías a omitir
            excluded_categories = []
            if has_answered_availability and not has_new_dates:
                excluded_categories.append("disponibilidad")
                logger.info(f"🧠 DEBUG CONVERSACIONAL - OMITIENDO categoría 'disponibilidad' (ya tratada)")
                
            if has_answered_prices and not has_new_dates:
                excluded_categories.append("precios")
                logger.info(f"🧠 DEBUG CONVERSACIONAL - OMITIENDO categoría 'precios' (ya tratada)")
            
            # Si omitimos disponibilidad/precios, priorizar proceso_reserva
            should_prioritize_reserva = len(excluded_categories) > 0
            if should_prioritize_reserva:
                logger.info(f"🧠 DEBUG CONVERSACIONAL - PRIORIZANDO 'proceso_reserva' por contexto conversacional")
                
                # 🎯 BOOST PARA PROCESO_RESERVA: Si hay palabras básicas de reserva, dar score alto
                reserva_basic_keywords = ["reservar", "reserva", "quiero", "me interesa", "proceder", "confirmar"]
                if any(keyword in message_lower for keyword in reserva_basic_keywords):
                    logger.info(f"🧠 DEBUG CONVERSACIONAL - DETECTADAS palabras de reserva con contexto omitido → FORZANDO proceso_reserva")
            
            # 🔧 PASO 1: Calcular puntuaciones para patrones explícitos (excluyendo categorías omitidas)
            scores = {}
            for category, patterns in self.classification_patterns.items():
                # 🧠 OMITIR categorías ya tratadas
                if category in excluded_categories:
                    logger.info(f"🧠 DEBUG CONVERSACIONAL - SALTANDO categoría '{category}' (ya tratada)")
                    continue
                    
                score = self._calculate_category_score(message_lower, patterns)
                if score > 0:
                    scores[category] = score
                    logger.info(f"🔍 DEBUG - Categoría '{category}' score: {score}")
            
            # 🧠 CASO ESPECIAL: Si omitimos categorías y hay palabras de reserva pero sin scores
            if not scores and should_prioritize_reserva:
                reserva_basic_keywords = ["reservar", "reserva", "quiero", "me interesa", "proceder", "confirmar"]
                if any(keyword in message_lower for keyword in reserva_basic_keywords):
                    logger.info(f"🧠 DEBUG CONVERSACIONAL - SIN SCORES pero con contexto omitido + palabras reserva → FORZANDO proceso_reserva")
                    return "proceso_reserva"
            
            # Si no hay puntuaciones, es consulta general
            if not scores:
                logger.info(f"🔍 DEBUG - Sin scores, clasificando como general")
                return "general"
            
            # 🧠 BOOST CONVERSACIONAL: Mejorar score de proceso_reserva si hay contexto omitido
            if should_prioritize_reserva and "proceso_reserva" in scores:
                reserva_basic_keywords = ["reservar", "reserva", "quiero", "me interesa", "proceder", "confirmar"]
                if any(keyword in message_lower for keyword in reserva_basic_keywords):
                    original_score = scores["proceso_reserva"]
                    # Boost significativo para ganar empates y competir
                    scores["proceso_reserva"] = min(original_score + 0.3, 1.0)
                    logger.info(f"🧠 DEBUG CONVERSACIONAL - BOOST aplicado a proceso_reserva: {original_score:.3f} → {scores['proceso_reserva']:.3f}")
            
            # Obtener categoría con mayor puntuación
            max_score = max(scores.values())
            categories_with_max_score = [cat for cat, score in scores.items() if score == max_score]
            
            # 🚨 RESOLVER EMPATES: proceso_reserva tiene PRIORIDAD ABSOLUTA
            if len(categories_with_max_score) > 1:
                logger.info(f"🎯 DEBUG EMPATE - Categorías con score {max_score}: {categories_with_max_score}")
                
                # Si proceso_reserva está entre las empatadas, priorizarla
                if "proceso_reserva" in categories_with_max_score:
                    best_category = "proceso_reserva"
                    logger.info(f"🎯 DEBUG EMPATE RESUELTO - Priorizando 'proceso_reserva' sobre: {[c for c in categories_with_max_score if c != 'proceso_reserva']}")
                else:
                    best_category = categories_with_max_score[0]
            else:
                best_category = categories_with_max_score[0]
                
            logger.info(f"🔍 DEBUG - Mejor categoría por patrones: '{best_category}' (score: {scores[best_category]})")
            
            # 🔧 PASO 2: Verificar si hay clasificación EXPLÍCITA con umbral suficiente
            high_confidence_threshold = 0.4  # Umbral alto para clasificaciones explícitas
            
            # Para consultas de hospedaje_servicios o habitacion_servicios con alta confianza
            if best_category in ["hospedaje_servicios", "habitacion_servicios"] and scores[best_category] >= high_confidence_threshold:
                logger.info(f"🔍 DEBUG - Clasificación EXPLÍCITA con alta confianza: {best_category}")
                return best_category
            
            # Para consultas de precios con umbral más bajo
            if best_category == "precios" and scores[best_category] >= 0.15:
                logger.info(f"🔍 DEBUG - Consulta clasificada como PRECIOS con score: {scores[best_category]}")
                return best_category
            
            # Para otras categorías con umbral estándar
            if scores[best_category] >= 0.3:
                logger.info(f"🔍 DEBUG - Clasificación por umbral estándar: {best_category}")
                return best_category
            
            # 🔧 PASO 3: SOLO SI ES AMBIGUA, usar contexto para resolver
            logger.info(f"🔍 DEBUG - Consulta ambigua (score bajo), analizando contexto...")
            context_influenced_category = self._analyze_context_for_ambiguous_queries(message_lower, context)
            if context_influenced_category:
                logger.info(f"🔍 DEBUG - Clasificación influenciada por contexto: {context_influenced_category}")
                return context_influenced_category
            
            # 🔧 PASO 4: Verificar palabras clave de precio como fallback
            price_keywords = ["precio", "costo", "tarifa", "cuanto", "cuánto", "valor", "importe", "sale", "abonar", "pagar", "cobran", "dinero"]
            if any(keyword in message_lower for keyword in price_keywords):
                logger.info(f"🔍 DEBUG - Forzando clasificación como PRECIOS por palabras clave detectadas")
                return "precios"
            
            logger.info(f"🔍 DEBUG - Defaulteando a general")
            return "general"
            
        except Exception as e:
            logger.error(f"Error clasificando consulta: {e}")
            return "general"
    
    def _calculate_category_score(self, message: str, patterns: List[str]) -> float:
        """Calcula puntuación para una categoría específica"""
        total_matches = 0
        total_words = len(message.split())
        unique_patterns_matched = 0
        
        for pattern in patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            if matches:
                total_matches += len(matches)
                unique_patterns_matched += 1
        
        # Normalizar por longitud del mensaje
        if total_words == 0:
            return 0.0
        
        # 🆕 ALGORITMO MEJORADO PARA CONSULTAS DE PRECIOS
        # Para consultas de precios, usar un algoritmo menos estricto
        if any(keyword in message.lower() for keyword in ["precio", "costo", "tarifa", "cuanto", "cuánto", "valor", "importe", "sale", "abonar", "pagar"]):
            # Para consultas de precios: Si encuentra palabras clave, dar puntuación alta
            if total_matches > 0:
                # Puntuación base alta si hay matches de precio
                base_score = 0.8
                # Bonus por múltiples patrones únicos
                pattern_bonus = min(unique_patterns_matched * 0.1, 0.2)
                # Ajuste suave por longitud (menos penalizante)
                length_adjustment = max(0.7, 1.0 - (total_words * 0.05))
                
                final_score = min((base_score + pattern_bonus) * length_adjustment, 1.0)
                logger.info(f"🔍 DEBUG SCORE PRECIOS - Mensaje: '{message}' | Matches: {total_matches} | Patrones únicos: {unique_patterns_matched} | Score: {final_score}")
                return final_score
        
        # 🔧 ALGORITMO MEJORADO PARA CONSULTAS DE SERVICIOS
        # Para consultas de servicios: usar algoritmo menos penalizante por longitud
        if any(service_keyword in message.lower() for service_keyword in ["servicios", "comodidades", "amenities", "instalaciones", "facilidades"]):
            if total_matches > 0:
                # Puntuación base alta si hay matches de servicios
                base_score = 0.6
                # Bonus por múltiples patrones únicos
                pattern_bonus = min(unique_patterns_matched * 0.15, 0.3)
                # Ajuste MUY suave por longitud (menos penalizante)
                length_adjustment = max(0.8, 1.0 - (total_words * 0.02))
                
                final_score = min((base_score + pattern_bonus) * length_adjustment, 1.0)
                logger.info(f"🔍 DEBUG SCORE SERVICIOS - Mensaje: '{message}' | Matches: {total_matches} | Patrones únicos: {unique_patterns_matched} | Score: {final_score}")
                return final_score

        # 🆕 ALGORITMO ESPECIAL PARA CONSULTAS DE PROCESO_RESERVA
        # Para consultas de proceso de reserva: dar puntuación alta cuando hay intención clara
        if any(reserva_keyword in message.lower() for reserva_keyword in ["reservar", "reserva", "proceder", "confirmar", "asegurar", "apartar"]):
            if total_matches > 0:
                # Puntuación base muy alta para reservas (intención crítica)
                base_score = 0.7
                # Bonus por múltiples patrones únicos
                pattern_bonus = min(unique_patterns_matched * 0.2, 0.3)
                # Ajuste muy suave por longitud (casi sin penalización)
                length_adjustment = max(0.85, 1.0 - (total_words * 0.01))
                
                final_score = min((base_score + pattern_bonus) * length_adjustment, 1.0)
                logger.info(f"🔍 DEBUG SCORE PROCESO_RESERVA - Mensaje: '{message}' | Matches: {total_matches} | Patrones únicos: {unique_patterns_matched} | Score: {final_score}")
                return final_score

        # Para otras categorías: usar algoritmo original
        return min(float(total_matches) / float(total_words), 1.0)
    
    def get_query_intent(self, message: str) -> Dict[str, Any]:
        """Analiza la intención específica de la consulta"""
        try:
            message_lower = message.lower()
            
            subcategories: List[str] = []
            
            intent = {
                "primary_category": "general",
                "subcategories": subcategories,
                "entities": self._extract_entities(message),
                "urgency": self._assess_urgency(message_lower),
                "sentiment": self._assess_sentiment(message_lower),
                "requires_dates": self._requires_dates(message_lower),
                "requires_numbers": self._requires_numbers(message_lower)
            }
            
            # Clasificar categoría principal - remover await ya que no es async
            scores = {}
            for category, patterns in self.classification_patterns.items():
                score = self._calculate_category_score(message_lower, patterns)
                if score > 0:
                    scores[category] = score
            
            if scores:
                best_category = max(scores.keys(), key=lambda x: scores[x])
                if scores[best_category] >= 0.3:
                    intent["primary_category"] = best_category
            
            # Identificar subcategorías
            for subcat, patterns in self.subcategory_patterns.items():
                if any(re.search(pattern, message_lower, re.IGNORECASE) for pattern in patterns):
                    subcategories.append(subcat)
            
            return intent
            
        except Exception as e:
            logger.error(f"Error analizando intención: {e}")
            return {"primary_category": "general", "subcategories": [], "entities": {}}
    
    def _extract_entities(self, message: str) -> Dict[str, List[str]]:
        """Extrae entidades específicas del mensaje"""
        entities = {
            "dates": [],
            "numbers": [],
            "locations": [],
            "amenities": []
        }
        
        # Extraer fechas
        date_patterns = [
            r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}',
            r'\d{1,2}\s+de\s+\w+',
            r'mañana|pasado mañana|hoy|ayer',
            r'lunes|martes|miércoles|jueves|viernes|sábado|domingo'
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            entities["dates"].extend(matches)
        
        # Extraer números
        number_patterns = [
            r'\d+\s*personas?',
            r'\d+\s*huéspedes?',
            r'\d+\s*noches?',
            r'\d+\s*días?'
        ]
        
        for pattern in number_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            entities["numbers"].extend(matches)
        
        # Extraer ubicaciones
        location_patterns = [
            r'centro|downtown|ciudad|pueblo',
            r'playa|beach|montaña|mountain',
            r'aeropuerto|airport|estación|station'
        ]
        
        for pattern in location_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            entities["locations"].extend(matches)
        
        # Extraer amenidades específicas
        amenity_patterns = [
            r'wifi|internet|piscina|pileta|parking|estacionamiento',
            r'desayuno|comida|restaurant|bar',
            r'aire acondicionado|calefacción|tv|television'
        ]
        
        for pattern in amenity_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            entities["amenities"].extend(matches)
        
        return entities
    
    def _assess_urgency(self, message: str) -> str:
        """Evalúa la urgencia de la consulta"""
        urgent_keywords = [
            r'urgente|emergency|ahora|now|ya|inmediatamente',
            r'hoy|today|mañana|tomorrow',
            r'necesito|need|require|requiero'
        ]
        
        for pattern in urgent_keywords:
            if re.search(pattern, message, re.IGNORECASE):
                return "high"
        
        return "normal"
    
    def _assess_sentiment(self, message: str) -> str:
        """Evalúa el sentimiento del mensaje"""
        positive_keywords = [
            r'gracias|thank|perfecto|excelente|genial|bueno',
            r'me gusta|love|encanta|feliz|contento'
        ]
        
        negative_keywords = [
            r'problema|problem|mal|bad|terrible|horrible',
            r'no funciona|broken|roto|molesto|enojado'
        ]
        
        positive_score = sum(1 for pattern in positive_keywords 
                           if re.search(pattern, message, re.IGNORECASE))
        
        negative_score = sum(1 for pattern in negative_keywords 
                           if re.search(pattern, message, re.IGNORECASE))
        
        if positive_score > negative_score:
            return "positive"
        elif negative_score > positive_score:
            return "negative"
        else:
            return "neutral"
    
    def _requires_dates(self, message: str) -> bool:
        """Determina si la consulta requiere información de fechas"""
        date_required_patterns = [
            r'disponible|libre|reservar|booking',
            r'cuando|cuándo|fecha|día',
            r'check.?in|check.?out|llegada|salida'
        ]
        
        return any(re.search(pattern, message, re.IGNORECASE) 
                  for pattern in date_required_patterns)
    
    def _requires_numbers(self, message: str) -> bool:
        """Determina si la consulta requiere información numérica"""
        number_required_patterns = [
            r'precio|costo|tarifa|cuanto|cuánto',
            r'capacidad|personas|huéspedes',
            r'distancia|kilómetros|metros'
        ]
        
        return any(re.search(pattern, message, re.IGNORECASE) 
                  for pattern in number_required_patterns)
    
    def get_suggested_followup_questions(self, category: str) -> List[str]:
        """Sugiere preguntas de seguimiento basadas en la categoría"""
        followup_questions = {
            "precios": [
                "¿Para qué fechas necesitas la información?",
                "¿Cuántas personas serían?",
                "¿Te interesa alguna promoción especial?"
            ],
            "disponibilidad": [
                "¿Qué fechas tienes en mente?",
                "¿Cuántas noches te gustaría quedarte?",
                "¿Prefieres algún tipo de habitación en particular?"
            ],
            "servicios": [
                "¿Hay algún servicio específico que te interese?",
                "¿Necesitas información sobre horarios?",
                "¿Tienes alguna necesidad especial?"
            ],
            "ubicacion": [
                "¿Desde dónde vas a venir?",
                "¿Prefieres caminar o usar transporte?",
                "¿Hay algún lugar específico que quieras visitar?"
            ]
        }
        
        return followup_questions.get(category, [
            "¿En qué más te puedo ayudar?",
            "¿Tienes alguna otra consulta?",
            "¿Necesitas información adicional?"
        ]) 

    def _analyze_context_for_ambiguous_queries(self, message: str, context: Optional[Dict[str, Any]]) -> Optional[str]:
        """Analiza el contexto para resolver consultas ambiguas sobre servicios"""
        try:
            if not context:
                return None
            
            # 🔧 EXCLUSIÓN CRÍTICA: Si es claramente una consulta de precio, NO aplicar lógica de servicios
            price_keywords = ["precio", "costo", "tarifa", "cuanto", "cuánto", "valor", "importe", "sale", "abonar", "pagar", "cobran", "dinero"]
            if any(keyword in message.lower() for keyword in price_keywords):
                logger.info(f"🔍 DEBUG - Consulta contiene palabras clave de PRECIO, NO aplicando lógica de servicios contextuales")
                return None  # Dejar que el clasificador normal maneje esto
            
            # Detectar consultas ambiguas de servicios (solo si NO es consulta de precio)
            servicios_ambiguos = [
                r"servicios?(?!\s+(del\s+hospedaje|del\s+hotel|generales|comunes))",
                r"que.*tiene(?!\s+(el\s+hospedaje|el\s+hotel|el\s+lugar))",
                r"cuenta\s+con(?!\s+(el\s+hospedaje|el\s+hotel|el\s+lugar))",
                r"incluye(?!\s+(el\s+hospedaje|el\s+hotel|la\s+estadia))",
                r"comodidades?(?!\s+(del\s+hospedaje|del\s+hotel|generales))",
                r"amenities?(?!\s+(del\s+hospedaje|del\s+hotel|generales))"
            ]
            
            is_ambiguous_service_query = any(
                re.search(pattern, message, re.IGNORECASE) 
                for pattern in servicios_ambiguos
            )
            
            if not is_ambiguous_service_query:
                return None
            
            logger.info(f"🔍 DEBUG - Consulta de servicios ambigua detectada: '{message}'")
            
            # 🔧 PRIORIDAD MÁXIMA: Revisar el contexto híbrido del frontend (más actualizado)
            current_query = context.get("currentQuery", {})
            if current_query:
                habitacion_contexto = current_query.get("habitacion")
                logger.info(f"🔍 DEBUG - Habitación en currentQuery: {habitacion_contexto}")
                
                # Si la habitación es explícitamente undefined/None, es consulta del hospedaje
                if habitacion_contexto is None or habitacion_contexto == "undefined":
                    logger.info(f"🔍 DEBUG - Contexto híbrido indica consulta GENERAL del hospedaje (habitación limpiada)")
                    return "hospedaje_servicios"
                
                # Si hay habitación específica, es consulta de habitación
                if habitacion_contexto and habitacion_contexto != "undefined":
                    logger.info(f"🔍 DEBUG - Contexto híbrido indica habitación específica: {habitacion_contexto}")
                    return "habitacion_servicios"
            else:
                logger.info(f"🔍 DEBUG - No hay currentQuery en contexto, continuando con otras verificaciones")
            
            # 1. SOLO si no hay contexto híbrido, revisar contexto del frontend (mensajes recientes)
            frontend_conversation = context.get("frontend_conversation", {})
            if frontend_conversation:
                recent_messages = frontend_conversation.get("recent_messages", [])
                for msg in recent_messages:
                    if msg.get("role") == "assistant":
                        bot_response = msg.get("message", "").lower()
                        # Si mencionó habitaciones específicas, asumir que se refiere a habitación
                        if any(word in bot_response for word in ["suite", "habitación", "cuarto", "room"]):
                            logger.info(f"🔍 DEBUG - Contexto frontend (sin híbrido) indica habitación específica")
                            return "habitacion_servicios"
            
            # 2. Contexto de sesión de BD (solo si no hay información más reciente)
            session_context = context.get("session_context", {})
            if session_context:
                # Si hay habitación mencionada en el contexto
                if session_context.get("last_habitacion"):
                    logger.info(f"🔍 DEBUG - Contexto BD indica habitación: {session_context.get('last_habitacion')}")
                    return "habitacion_servicios"
                
                # Si hay disponibilidad confirmada, probablemente se refiere a esa habitación
                if session_context.get("last_availability"):
                    logger.info(f"🔍 DEBUG - Contexto BD indica disponibilidad previa confirmada")
                    return "habitacion_servicios"
            
            # 3. Si hay información de habitación específica en el contexto
            if context.get("habitacion_especifica"):
                logger.info(f"🔍 DEBUG - Hay habitación específica en contexto")
                return "habitacion_servicios"
            
            # 4. Si hay disponibilidad real con una sola habitación
            availability_real = context.get("availability_real", {})
            if availability_real:
                hospedaje_disp = availability_real.get("hospedaje_disponibilidad", {})
                detalle_habitaciones = hospedaje_disp.get("detalle_habitaciones", [])
                if len(detalle_habitaciones) == 1:
                    logger.info(f"🔍 DEBUG - Una sola habitación disponible, asumir servicios de habitación")
                    return "habitacion_servicios"
            
            # 5. DEFAULT: Si no hay contexto específico, asumir hospedaje
            logger.info(f"🔍 DEBUG - Sin contexto específico, defaultear a servicios del hospedaje")
            return "hospedaje_servicios"
            
        except Exception as e:
            logger.error(f"Error analizando contexto para consultas ambiguas: {e}")
            return None 