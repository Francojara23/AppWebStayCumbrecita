# 🤖 StayAtCumbrecita Chatbot IA

<p align="center">
  <img src="https://www.python.org/static/favicon.ico" width="32" alt="Python" />
  <img src="https://fastapi.tiangolo.com/img/favicon.png" width="32" alt="FastAPI" />
  <img src="https://openai.com/favicon.ico" width="32" alt="OpenAI" />
  <img src="https://www.postgresql.org/media/img/about/press/elephant.png" width="32" alt="PostgreSQL" />
</p>

<p align="center">
  <strong>Sistema de Chatbot Inteligente con IA para Hospedajes Turísticos</strong><br/>
  Construido con <strong>FastAPI</strong>, <strong>OpenAI GPT-3.5</strong>, <strong>PostgreSQL</strong> y <strong>Vector Embeddings</strong>
</p>

<p align="center">
  <a href="https://fastapi.tiangolo.com" target="_blank"><img src="https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat&logo=fastapi" alt="FastAPI" /></a>
  <a href="https://www.python.org" target="_blank"><img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python" alt="Python 3.11+" /></a>
  <a href="https://openai.com" target="_blank"><img src="https://img.shields.io/badge/OpenAI-GPT3.5-412991?style=flat&logo=openai" alt="OpenAI GPT-3.5" /></a>
  <a href="https://www.postgresql.org" target="_blank"><img src="https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat&logo=postgresql" alt="PostgreSQL 15+" /></a>
</p>

## 📋 Descripción

**StayAtCumbrecita Chatbot** es un sistema de inteligencia artificial conversacional especializado en hospedajes turísticos. Cada hospedaje cuenta con su propio asistente virtual personalizado, capaz de responder consultas sobre disponibilidad, precios, servicios y realizar el proceso completo de reservas.

El sistema utiliza **4 fuentes de información integradas** para proporcionar respuestas precisas y contextualizadas, combinando documentos personalizados, datos de la base de datos en tiempo real, historial conversacional y el conocimiento de GPT-3.5 Turbo.

---

## 🚀 Características Principales

### **🧠 Inteligencia Artificial Avanzada**
- **OpenAI GPT-3.5 Turbo**: Motor de IA conversacional de última generación
- **Embeddings Vectoriales**: Búsqueda semántica con PostgreSQL + pgvector
- **Clasificación Inteligente**: Análisis automático del tipo de consulta
- **Contexto Persistente**: Memoria conversacional por usuario y hospedaje
- **4 Fuentes de Información**: PDF, Base de Datos, Historial, GPT

### **🏨 Especialización Hotelera**
- **Chatbot por Hospedaje**: Cada hospedaje tiene su asistente personalizado
- **Consultas Especializadas**: Disponibilidad, precios, servicios, reservas
- **Proceso de Reserva Completo**: Desde consulta hasta confirmación
- **Tonos Personalizables**: 5 estilos de conversación (Formal, Cordial, Juvenil, Amigable, Corporativo)
- **Información en Tiempo Real**: Datos actualizados desde el backend

### **🔄 Integración Completa**
- **Backend Integration**: API REST completa con NestJS backend
- **Frontend Widget**: Integración perfecta con Next.js frontend
- **Multi-idioma**: Preparado para expansión internacional
- **Escalabilidad**: Arquitectura cloud-ready para múltiples hospedajes

---

## 🏗️ Arquitectura del Sistema

### **Flujo de Datos Completo**
```
Frontend (Next.js) → Chatbot (FastAPI) → Backend (NestJS) → Database (PostgreSQL)
     ↓                      ↓                    ↓                     ↓
Widget Chat          Procesamiento IA      Configuración         Datos Vectoriales
User Context         4 Fuentes Info        Datos Hospedaje       Embeddings PDF
Historial UI         Respuesta GPT         Permisos/Auth         Vector Search
```

### **4 Fuentes de Información Integradas**

#### 📄 **1. Documentos PDF Personalizados**
- **Procesamiento Automático**: Extracción y chunking inteligente de PDFs
- **Embeddings Vectoriales**: Conversión a vectores para búsqueda semántica
- **Información Específica**: Reglamentos, políticas, información local
- **Actualización Dinámica**: Upload y re-entrenamiento en tiempo real

#### 🗄️ **2. Base de Datos en Tiempo Real**
- **Disponibilidad Actual**: Consulta directa de habitaciones disponibles
- **Precios Dinámicos**: Tarifas actualizadas por temporada y ocupación
- **Servicios y Comodidades**: Catálogo completo de servicios
- **Información del Hospedaje**: Datos actualizados del establecimiento

#### 💬 **3. Historial Conversacional**
- **Contexto de Sesión**: Memoria de la conversación actual
- **Continuidad**: Referencias a mensajes anteriores
- **Seguimiento de Consultas**: Evita repetir información ya proporcionada
- **Personalización**: Adaptación basada en preferencias del usuario

#### 🌐 **4. Conocimiento GPT-3.5**
- **Conocimiento General**: Información sobre turismo y hospitalidad
- **Procesamiento Natural**: Comprensión avanzada del lenguaje
- **Generación Contextual**: Respuestas naturales y personalizadas
- **Razonamiento**: Capacidad de inferencia y análisis

---

## 📂 Estructura del Proyecto

### **🧩 Módulos Principales**

#### **🔧 Core (`/app/core/`)**
```
core/
├── config.py          - Configuración centralizada del sistema
├── database.py        - Conexión PostgreSQL con pgvector
└── __init__.py        - Inicialización del módulo core
```

**Características:**
- **Configuración Validada**: Pydantic para validación de variables
- **Conexión Optimizada**: Pool de conexiones PostgreSQL
- **Vector Support**: Extensión pgvector para embeddings
- **Health Checks**: Monitoreo de estado de la base de datos

#### **🗄️ Modelos (`/app/models/`)**
```
models/
├── chat.py            - Modelo de historial conversacional
├── knowledge.py       - Modelo de base de conocimiento vectorial
└── __init__.py        - Inicialización de modelos
```

**Esquemas de Datos:**
```python
# Chat Model
class ChatHistory:
    session_id: UUID
    hospedaje_id: int
    user_id: int
    message: str
    response: str
    message_type: MessageType
    query_type: QueryType
    created_at: datetime

# Knowledge Model  
class KnowledgeBase:
    id: UUID
    hospedaje_id: int
    content: str
    embedding: List[float]  # Vector embedding
    source_type: SourceType
    metadata: dict
    created_at: datetime
```

#### **🛣️ Routers (`/app/routers/`)**
```
routers/
├── chat.py            - Endpoint principal de conversación
├── health.py          - Health checks y monitoreo
└── __init__.py        - Inicialización de routers
```

**Endpoints Disponibles:**
```python
# Chat Endpoints
POST   /chat                    # Conversación principal
GET    /chat/history/{session}  # Obtener historial
DELETE /chat/clear/{session}    # Limpiar historial

# Health Endpoints  
GET    /health                  # Estado general
GET    /health/db               # Estado base de datos
GET    /health/openai           # Estado OpenAI API
```

#### **⚙️ Servicios (`/app/services/`)**
```
services/
├── chat_service.py           - Lógica principal de conversación
├── query_classifier.py      - Clasificación inteligente de consultas
├── knowledge_service.py     - Gestión de base de conocimiento
├── backend_service.py       - Integración con backend NestJS
├── pdf_processor.py         - Procesamiento de documentos PDF
└── __init__.py              - Inicialización de servicios
```

##### **🎯 ChatService - Motor Principal**
```python
class ChatService:
    """Motor principal del chatbot con 4 fuentes de información"""
    
    async def process_message(
        self,
        hospedaje_id: int,
        message: str,
        user_id: int,
        context: Optional[dict] = None
    ) -> ChatResponse:
        # 1. Clasificar tipo de consulta
        query_type = await self.classifier.classify_query(message, context)
        
        # 2. Obtener información de las 4 fuentes
        knowledge = await self.get_combined_knowledge(
            hospedaje_id, message, query_type, context
        )
        
        # 3. Generar respuesta con GPT-3.5
        response = await self.generate_response(
            message, knowledge, query_type, context
        )
        
        # 4. Guardar en historial
        await self.save_conversation(hospedaje_id, user_id, message, response)
        
        return response
```

##### **🔍 QueryClassifier - Inteligencia de Clasificación**
```python
class QueryClassifier:
    """Clasificador inteligente de tipos de consulta"""
    
    QUERY_TYPES = {
        'disponibilidad': ['disponible', 'libre', 'ocupado', 'fecha'],
        'precios': ['precio', 'costo', 'tarifa', 'valor', 'cuanto'],
        'servicios': ['servicio', 'incluye', 'wifi', 'desayuno'],
        'proceso_reserva': ['reservar', 'booking', 'confirmar'],
        'hospedaje_services': ['hotel', 'servicios generales'],
        'habitacion_services': ['habitación', 'room', 'cuarto'],
        'general': ['información', 'ayuda', 'consulta']
    }
    
    async def classify_query(
        self, 
        message: str, 
        context: Optional[dict] = None
    ) -> str:
        # Análisis de patrones + contexto conversacional
        scores = self._calculate_pattern_scores(message)
        context_influence = self._analyze_context(context)
        
        # Combinación inteligente de factores
        final_classification = self._combine_factors(scores, context_influence)
        
        return final_classification
```

##### **📚 KnowledgeService - Base de Conocimiento**
```python
class KnowledgeService:
    """Gestión de embeddings y búsqueda vectorial"""
    
    async def process_pdf_document(
        self, 
        hospedaje_id: int, 
        pdf_url: str
    ) -> bool:
        # 1. Descargar y extraer texto
        text_content = await self.pdf_processor.extract_text(pdf_url)
        
        # 2. Dividir en chunks semánticamente coherentes
        chunks = await self.pdf_processor.create_chunks(
            text_content, 
            chunk_size=500, 
            overlap=50
        )
        
        # 3. Generar embeddings para cada chunk
        embeddings = await self.generate_embeddings(chunks)
        
        # 4. Almacenar en base vectorial
        await self.store_embeddings(hospedaje_id, chunks, embeddings)
        
        return True
    
    async def search_relevant_content(
        self, 
        hospedaje_id: int, 
        query: str, 
        limit: int = 5
    ) -> List[str]:
        # Búsqueda semántica por similitud vectorial
        query_embedding = await self.generate_embedding(query)
        
        similar_content = await self.vector_search(
            hospedaje_id, 
            query_embedding, 
            limit
        )
        
        return similar_content
```

##### **🔗 BackendService - Integración API**
```python
class BackendService:
    """Integración completa con backend NestJS"""
    
    async def get_hospedaje_availability(
        self, 
        hospedaje_id: int,
        check_in: date,
        check_out: date,
        guests: int = 1
    ) -> dict:
        """Consulta disponibilidad en tiempo real"""
        endpoint = f"/habitaciones/disponibilidad"
        params = {
            'hospedajeId': hospedaje_id,
            'checkIn': check_in.isoformat(),
            'checkOut': check_out.isoformat(),
            'huespedes': guests
        }
        
        response = await self.api_client.get(endpoint, params=params)
        return response.json()
    
    async def get_room_prices(
        self, 
        hospedaje_id: int,
        dates: List[date]
    ) -> dict:
        """Obtiene precios dinámicos actualizados"""
        endpoint = f"/habitaciones/precios"
        data = {
            'hospedajeId': hospedaje_id,
            'fechas': [d.isoformat() for d in dates]
        }
        
        response = await self.api_client.post(endpoint, json=data)
        return response.json()
```

#### **🎭 Sistema de Prompts (`/app/prompts/`)**
```
prompts/ (21 archivos especializados)
├── system_base.txt                    - Prompt base del sistema
├── system_base_positive.txt           - Variante optimista
├── availability_rules.txt             - Reglas de disponibilidad
├── price_rules.txt                    - Reglas de precios
├── service_rules.txt                  - Reglas generales de servicios
├── hospedaje_services_rules.txt       - Servicios del hospedaje
├── habitacion_services_rules.txt      - Servicios de habitaciones
├── servicio_especifico_rules.txt      - Servicios específicos
├── proceso_reserva_caso[1-6].txt      - 6 casos de proceso de reserva
├── metodos_pago_rules.txt             - Información de pagos
├── checkin_rules.txt                  - Reglas de check-in
├── consultas_mensuales_rules.txt      - Consultas de disponibilidad mensual
├── data_fusion_rules.txt              - Fusión de fuentes de información
├── error_fecha_pasada.txt             - Manejo de fechas inválidas
└── fallback.txt                       - Respuesta de fallback
```

**Ejemplos de Prompts Especializados:**
```python
# availability_rules.txt
"""
REGLAS DE DISPONIBILIDAD:

1. VALIDACIÓN DE FECHAS:
   - NO permitir fechas pasadas
   - Verificar formato de fechas válido
   - Check-in debe ser anterior a check-out
   - Mínimo 1 noche de estadía

2. CONSULTA DE DISPONIBILIDAD:
   - Usar endpoint /habitaciones/disponibilidad
   - Incluir: hospedajeId, checkIn, checkOut, huespedes
   - Mostrar habitaciones disponibles con precios
   - Indicar si no hay disponibilidad

3. PRESENTACIÓN DE RESULTADOS:
   - Listar habitaciones disponibles
   - Mostrar precio por noche y total
   - Incluir servicios incluidos
   - Ofrecer proceso de reserva
"""

# proceso_reserva_caso1.txt  
"""
CASO 1: USUARIO QUIERE RESERVAR - HAY DISPONIBILIDAD

Contexto: El usuario expresó intención de reserva y hay habitaciones disponibles.

Respuesta Estructura:
1. Confirmar disponibilidad encontrada
2. Resumir: fechas + habitación + precio total
3. Explicar proceso de reserva:
   - Datos personales requeridos
   - Métodos de pago disponibles
   - Políticas de cancelación
4. Call-to-action: "¿Te gustaría proceder con la reserva?"
5. Incluir contacto directo para asistencia

Tono: Entusiasta pero profesional
"""
```

---

## 🛠️ Configuración e Instalación

### **Prerrequisitos**
- **Python 3.11+** con pip/poetry
- **PostgreSQL 15+** con extensión pgvector
- **OpenAI API Key** (GPT-3.5 Turbo access)
- **Backend NestJS** ejecutándose (para integración)

### **1. Configuración del Entorno**
```bash
# Clonar repositorio
git clone <repository-url>
cd stayCumbrecita-chatbot

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales
```

### **2. Variables de Entorno Críticas**
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/stayatcumbrecita
PGVECTOR_EXTENSION=true

# Backend Integration
BACKEND_API_URL=http://localhost:5001
BACKEND_API_VERSION=v1
BACKEND_TIMEOUT=30

# Chatbot Configuration
DEFAULT_LANGUAGE=es
MAX_CONVERSATION_HISTORY=10
EMBEDDING_MODEL=text-embedding-ada-002
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# Security
JWT_SECRET=your-jwt-secret-for-backend-integration
CORS_ORIGINS=["http://localhost:3000"]

# Performance
REDIS_URL=redis://localhost:6379  # Optional for caching
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=30
```

### **3. Configuración de Base de Datos**
```sql
-- Instalar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Las tablas se crean automáticamente con SQLAlchemy
-- pero puedes ejecutar el script de inicialización:
```

```bash
# Ejecutar migraciones (si hay)
python -m alembic upgrade head

# O ejecutar script de inicialización
python -c "from app.core.database import init_database; init_database()"
```

### **4. Ejecución del Servicio**
```bash
# Desarrollo con recarga automática
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Producción
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Con Docker
docker build -t stayatcumbrecita-chatbot .
docker run -p 8000:8000 --env-file .env stayatcumbrecita-chatbot
```

---

## 🔄 Flujo de Procesamiento de Mensajes

### **Proceso Completo Paso a Paso**

#### **1. Recepción del Mensaje**
```python
# POST /chat
{
  "hospedaje_id": 123,
  "message": "¿Tienen habitaciones disponibles para el 15 de enero?",
  "user_id": "user_456",
  "session_id": "session_789",
  "context": {
    "conversationHistory": [...],
    "currentQuery": {...}
  }
}
```

#### **2. Clasificación Inteligente**
```python
# Análisis del mensaje
clasificacion = await query_classifier.classify_query(
    message="¿Tienen habitaciones disponibles para el 15 de enero?",
    context=context
)
# Resultado: "disponibilidad"
```

#### **3. Extracción de Entidades**
```python
# Extracción de fechas y parámetros
entidades = await date_extractor.extract_dates(message)
# Resultado: {
#   "check_in": "2024-01-15",
#   "check_out": "2024-01-16",  # +1 día por defecto
#   "guests": 1
# }
```

#### **4. Recopilación de las 4 Fuentes**
```python
# Fuente 1: PDF Knowledge Base
pdf_context = await knowledge_service.search_relevant_content(
    hospedaje_id=123,
    query="disponibilidad habitaciones",
    limit=3
)

# Fuente 2: Database en Tiempo Real
availability = await backend_service.get_hospedaje_availability(
    hospedaje_id=123,
    check_in=date(2024, 1, 15),
    check_out=date(2024, 1, 16),
    guests=1
)

# Fuente 3: Historial Conversacional
conversation_context = await chat_service.get_conversation_context(
    session_id="session_789",
    limit=5
)

# Fuente 4: GPT Knowledge (se integra en la generación)
```

#### **5. Generación de Respuesta**
```python
# Construcción del prompt completo
prompt = await prompt_builder.build_prompt(
    query_type="disponibilidad",
    hospedaje_data=hospedaje_info,
    availability_data=availability,
    pdf_context=pdf_context,
    conversation_history=conversation_context,
    user_message=message
)

# Llamada a OpenAI GPT-3.5
response = await openai_client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": prompt["system"]},
        {"role": "user", "content": prompt["user"]}
    ],
    temperature=0.7,
    max_tokens=1000
)
```

#### **6. Post-procesamiento y Respuesta**
```python
# Guardar en historial
await chat_service.save_conversation(
    hospedaje_id=123,
    user_id="user_456",
    session_id="session_789",
    message=message,
    response=ai_response,
    query_type="disponibilidad"
)

# Respuesta final
return {
    "response": ai_response,
    "query_type": "disponibilidad",
    "context_used": ["pdf", "database", "history"],
    "confidence": 0.95,
    "suggestions": ["¿Quieres ver más opciones?", "¿Te interesa reservar?"]
}
```

---

## 🎯 Tipos de Consulta Especializadas

### **📅 Consultas de Disponibilidad**
```python
# Ejemplos de entrada:
- "¿Tienen habitaciones para el 20 de febrero?"
- "Disponibilidad para 2 personas del 15 al 18 de marzo"
- "¿Hay lugar libre este fin de semana?"

# Procesamiento:
1. Extraer fechas y número de huéspedes
2. Validar fechas (no pasadas, formato correcto)
3. Consultar backend en tiempo real
4. Combinar con información de PDF sobre políticas
5. Responder con opciones disponibles + precios
```

### **💰 Consultas de Precios**
```python
# Ejemplos de entrada:
- "¿Cuánto cuesta una habitación doble?"
- "Precios para la semana del 10 al 17 de abril"
- "¿Hay descuentos por estadías largas?"

# Procesamiento:
1. Identificar tipo de habitación y fechas
2. Consultar precios dinámicos del backend
3. Incluir información de PDF sobre descuentos/promociones
4. Presentar desglose detallado de costos
```

### **🛎️ Consultas de Servicios**
```python
# Ejemplos de entrada:
- "¿Qué servicios incluye la habitación?"
- "¿Tienen wifi gratis?"
- "¿El desayuno está incluido?"

# Procesamiento:
1. Clasificar entre servicios de hospedaje vs habitación
2. Consultar base de datos de servicios
3. Complementar con información detallada del PDF
4. Presentar lista organizada de servicios
```

### **📝 Proceso de Reserva**
```python
# Ejemplos de entrada:
- "Quiero reservar"
- "¿Cómo hago una reserva?"
- "Me interesa la habitación suite"

# Procesamiento:
1. Verificar disponibilidad previa en conversación
2. Seleccionar caso de proceso de reserva (1-6)
3. Explicar pasos necesarios
4. Proporcionar información de contacto
5. Ofrecer asistencia para completar reserva
```

---

## 🎨 Sistema de Personalización

### **5 Tonos de Conversación**
```python
class ConversationTone(Enum):
    FORMAL = "formal"        # Profesional y respetuoso
    CORDIAL = "cordial"      # Amigable pero profesional  
    JUVENIL = "juvenil"      # Casual y relajado
    AMIGABLE = "amigable"    # Cálido y acogedor
    CORPORATIVO = "corporativo"  # Empresarial y directo

# Configuración por hospedaje
hospedaje_config = {
    "tono": ConversationTone.CORDIAL,
    "saludo_personalizado": "¡Hola! Bienvenido a Hotel Vista Montaña",
    "despedida": "¡Esperamos verte pronto!",
    "idioma": "es",
    "usar_emojis": True
}
```

### **Personalización de Respuestas**
```python
# Ejemplo de prompt con tono cordial:
"""
Eres el asistente virtual de {hospedaje_nombre}. 
Tu tono es cordial y amigable, utilizas emojis ocasionalmente.
Saluda a los usuarios con calidez y ofrece ayuda proactivamente.
Siempre menciona el nombre del hospedaje de manera natural.
"""

# Ejemplo de prompt con tono formal:
"""
Es usted el asistente digital de {hospedaje_nombre}.
Mantenga un tono profesional y respetuoso en todo momento.
Proporcione información precisa y completa.
Evite contracciones y utilice un lenguaje formal.
"""
```

---

## 📊 Monitoreo y Analytics

### **Métricas de Conversación**
```python
class ChatMetrics:
    """Sistema de métricas y analytics"""
    
    async def track_conversation(
        self,
        hospedaje_id: int,
        session_id: str,
        query_type: str,
        response_time: float,
        user_satisfaction: Optional[int] = None
    ):
        # Registro de métricas
        await self.db.execute(
            """
            INSERT INTO chat_metrics 
            (hospedaje_id, session_id, query_type, response_time, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            """,
            (hospedaje_id, session_id, query_type, response_time)
        )
    
    async def get_hospedaje_analytics(
        self, 
        hospedaje_id: int,
        date_range: tuple
    ) -> dict:
        """Analytics por hospedaje"""
        return {
            "total_conversations": 1245,
            "avg_response_time": 2.3,
            "most_common_queries": ["disponibilidad", "precios", "servicios"],
            "user_satisfaction": 4.2,
            "conversion_rate": 0.15  # % que resulta en reserva
        }
```

### **Health Checks Avanzados**
```python
# GET /health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": {
      "status": "up",
      "response_time": "12ms",
      "connections": "5/20"
    },
    "openai": {
      "status": "up", 
      "response_time": "847ms",
      "rate_limit": "90%"
    },
    "backend_api": {
      "status": "up",
      "response_time": "156ms",
      "endpoints": ["hospedajes", "habitaciones", "reservas"]
    }
  },
  "performance": {
    "avg_response_time": "2.1s",
    "requests_per_minute": 45,
    "error_rate": "0.02%"
  }
}
```

---

## 🔒 Seguridad y Privacidad

### **Medidas de Seguridad**
- **Rate Limiting**: Límites por IP y usuario para prevenir abuso
- **Input Validation**: Sanitización estricta de todas las entradas
- **JWT Integration**: Autenticación con backend mediante JWT
- **Data Encryption**: Cifrado de datos sensibles en reposo
- **CORS Protection**: Configuración estricta de orígenes permitidos

### **Privacidad de Datos**
```python
class PrivacyManager:
    """Gestión de privacidad y GDPR compliance"""
    
    async def anonymize_conversation(
        self, 
        session_id: str,
        retention_days: int = 90
    ):
        """Anonimizar conversaciones después del período de retención"""
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        
        await self.db.execute(
            """
            UPDATE chat_history 
            SET user_id = 'anonymous', 
                message = '[REDACTED]',
                personal_data_removed = true
            WHERE session_id = %s AND created_at < %s
            """,
            (session_id, cutoff_date)
        )
    
    async def delete_user_data(self, user_id: str):
        """Eliminación completa de datos de usuario (derecho al olvido)"""
        await self.db.execute(
            "DELETE FROM chat_history WHERE user_id = %s",
            (user_id,)
        )
```

---

## 🚀 Deployment y Escalabilidad

### **Docker Configuration**
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY ./app ./app

# Configurar usuario no-root
RUN useradd -m -u 1000 chatbot && chown -R chatbot:chatbot /app
USER chatbot

# Exposer puerto
EXPOSE 8000

# Comando de ejecución
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### **Docker Compose Integration**
```yaml
# docker-compose.yml
version: '3.8'

services:
  chatbot:
    build: ./stayCumbrecita-chatbot
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/stayatcumbrecita
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - BACKEND_API_URL=http://backend:5001
    depends_on:
      - db
      - backend
    restart: unless-stopped
    
  db:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=stayatcumbrecita
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
      
volumes:
  postgres_data:
```

### **Escalabilidad Horizontal**
```python
# Configuración para múltiples workers
# gunicorn_config.py
bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 10000
max_requests_jitter = 1000
preload_app = True

# Variables de entorno para producción
worker_tmp_dir = "/dev/shm"
timeout = 30
keepalive = 2
```

---

## 🧪 Testing y Calidad

### **Testing Strategy**
```python
# tests/test_chat_service.py
import pytest
from app.services.chat_service import ChatService

class TestChatService:
    
    @pytest.fixture
    async def chat_service(self):
        return ChatService()
    
    @pytest.mark.asyncio
    async def test_availability_query(self, chat_service):
        """Test consulta de disponibilidad"""
        response = await chat_service.process_message(
            hospedaje_id=1,
            message="¿Tienen habitaciones para mañana?",
            user_id="test_user"
        )
        
        assert response.query_type == "disponibilidad"
        assert "disponible" in response.message.lower()
        assert response.confidence > 0.8
    
    @pytest.mark.asyncio 
    async def test_price_query(self, chat_service):
        """Test consulta de precios"""
        response = await chat_service.process_message(
            hospedaje_id=1,
            message="¿Cuánto cuesta una habitación doble?",
            user_id="test_user"
        )
        
        assert response.query_type == "precios"
        assert any(word in response.message.lower() 
                  for word in ["precio", "costo", "$"])
```

### **Performance Testing**
```python
# tests/test_performance.py
import asyncio
import time
from app.services.chat_service import ChatService

async def test_concurrent_requests():
    """Test manejo de múltiples requests concurrentes"""
    chat_service = ChatService()
    
    async def single_request():
        start_time = time.time()
        await chat_service.process_message(
            hospedaje_id=1,
            message="Información general",
            user_id=f"user_{asyncio.current_task().get_name()}"
        )
        return time.time() - start_time
    
    # 50 requests concurrentes
    tasks = [single_request() for _ in range(50)]
    response_times = await asyncio.gather(*tasks)
    
    avg_response_time = sum(response_times) / len(response_times)
    assert avg_response_time < 5.0  # Menos de 5 segundos promedio
    assert max(response_times) < 10.0  # Ninguna request > 10 segundos
```

---

## 📚 API Documentation

### **Swagger/OpenAPI**
El servicio incluye documentación automática generada con FastAPI:

- **Desarrollo**: http://localhost:8000/docs
- **Redoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### **Ejemplos de Requests**

#### **Conversación Básica**
```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "hospedaje_id": 123,
    "message": "¿Qué servicios incluye el hotel?",
    "user_id": "user_456",
    "session_id": "session_789"
  }'
```

#### **Conversación con Contexto**
```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "hospedaje_id": 123,
    "message": "¿Cuánto cuesta?",
    "user_id": "user_456", 
    "session_id": "session_789",
    "context": {
      "conversationHistory": [
        {
          "role": "user",
          "message": "¿Tienen habitaciones para 2 personas?"
        },
        {
          "role": "assistant", 
          "message": "Sí, tenemos habitaciones dobles disponibles..."
        }
      ],
      "currentQuery": {
        "checkIn": "2024-02-15",
        "checkOut": "2024-02-17",
        "guests": 2
      }
    }
  }'
```

#### **Response Structure**
```json
{
  "response": "Nuestras habitaciones dobles tienen un costo de $8.500 por noche para las fechas que consultas. El precio total para 2 noches sería de $17.000. ¿Te gustaría conocer más detalles sobre los servicios incluidos?",
  "query_type": "precios",
  "confidence": 0.92,
  "context_used": ["database", "pdf", "history"],
  "suggestions": [
    "¿Qué servicios están incluidos?",
    "¿Cómo puedo hacer la reserva?",
    "¿Tienen descuentos disponibles?"
  ],
  "metadata": {
    "response_time": 2.1,
    "tokens_used": 245,
    "sources": ["backend_api", "knowledge_base"]
  }
}
```

---

## 🤝 Contribución y Desarrollo

### **Development Setup**
```bash
# Setup para desarrollo
git clone <repository-url>
cd stayCumbrecita-chatbot

# Entorno virtual
python -m venv venv
source venv/bin/activate

# Instalación con dependencias de desarrollo
pip install -r requirements-dev.txt

# Pre-commit hooks
pre-commit install

# Tests
pytest tests/ -v

# Linting
flake8 app/
black app/
isort app/
mypy app/
```

### **Coding Standards**
- **Python 3.11+** con type hints completos
- **Black** para formateo de código
- **isort** para ordenamiento de imports
- **flake8** para linting
- **mypy** para verificación de tipos
- **pytest** para testing

### **Conventional Commits**
```
feat: agregar clasificación de consultas de servicios
fix: corregir timeout en llamadas a OpenAI
docs: actualizar documentación de API
refactor: optimizar búsqueda vectorial
test: agregar tests para query classifier
```

---

## 📞 Soporte y Documentación

### **Recursos Adicionales**
- **[FastAPI Docs](https://fastapi.tiangolo.com)** - Framework web
- **[OpenAI API](https://platform.openai.com/docs)** - Documentación GPT-3.5
- **[pgvector](https://github.com/pgvector/pgvector)** - Vector similarity search
- **[SQLAlchemy](https://docs.sqlalchemy.org/)** - ORM para Python

### **Troubleshooting**
```bash
# Verificar conexión a base de datos
python -c "from app.core.database import test_connection; test_connection()"

# Test de OpenAI API
python -c "from app.services.chat_service import test_openai; test_openai()"

# Verificar pgvector
psql -d stayatcumbrecita -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Logs detallados
uvicorn app.main:app --log-level debug
```

### **Common Issues**
1. **OpenAI Rate Limits**: Implementar retry con backoff exponencial
2. **Database Connections**: Configurar pool de conexiones adecuado  
3. **Memory Usage**: Monitorear uso de memoria en embeddings
4. **Response Time**: Optimizar prompts y reducir tokens

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE) - ver el archivo LICENSE para más detalles.

---

<p align="center">
  <strong>🤖 StayAtCumbrecita Chatbot - IA Conversacional para Turismo</strong><br/>
  <em>Desarrollado con FastAPI, OpenAI GPT-3.5 y PostgreSQL para ofrecer asistencia inteligente 24/7</em>
</p> 