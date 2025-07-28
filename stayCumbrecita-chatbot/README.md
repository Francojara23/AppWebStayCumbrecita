# 🤖 Stay Chatbot

Chatbot inteligente para hospedajes en La Cumbrecita. Cada hospedaje tiene su propio asistente virtual personalizado.

## 🎯 Características

- **Chatbot por hospedaje**: Cada hospedaje tiene su propio asistente especializado
- **4 fuentes de información**: PDF personalizado, base de datos, historial y GPT-3.5
- **Tono personalizable**: Formal, cordial, juvenil, amigable o corporativo
- **Historial completo**: Seguimiento de conversaciones por usuario y hospedaje
- **Integración con backend**: Usa endpoints existentes para datos actualizados
- **Escalable**: Arquitectura preparada para múltiples hospedajes

## 🏗️ Arquitectura

```
Frontend (Next.js) → Chatbot (FastAPI) → Backend (NestJS)
     ↓                      ↓                    ↓
Widget Chat          Procesamiento IA      Configuración
User Context         4 Fuentes Info        Datos Hospedaje
Historial UI         Respuesta GPT         Permisos/Auth
```

## 🔄 Flujo de Datos

1. Usuario abre chat en hospedaje específico
2. Frontend envía: `hospedaje_id` + `user_id` + `message`
3. Chatbot procesa con 4 fuentes de información
4. GPT-3.5 genera respuesta personalizada
5. Se guarda en historial con contexto completo

## 🚀 Instalación

### Prerrequisitos

- Python 3.11+
- PostgreSQL con extensión pgvector
- Docker y Docker Compose
- OpenAI API Key

### Configuración

1. **Clonar y configurar**:
```bash
cd stay-chatbot
cp env.example .env
# Editar .env con tus credenciales
```

2. **Variables de entorno requeridas**:
```bash
DATABASE_URL=postgresql://adminCumbrecita:123456@postgres:5432/StayAtCumbrecita
OPENAI_API_KEY=sk-your-openai-api-key-here
BACKEND_URL=http://backend:5001
```

3. **Ejecutar con Docker**:
```bash
# Construir y ejecutar
docker-compose up --build

# Solo ejecutar (si ya está construido)
docker-compose up -d
```

4. **Desarrollo local**:
```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate     # Windows

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar
uvicorn app.main:app --reload --port 8000
```

## 📡 API Endpoints

### Chat Principal
```http
POST /chat/{hospedaje_id}
Content-Type: application/json

{
  "user_id": "user-123",
  "message": "¿Tienen habitaciones disponibles?",
  "session_id": "session-456"
}
```

### Historial por Usuario
```http
GET /chat/{hospedaje_id}/history/{user_id}?page=1&limit=20
```

### Historial Completo del Usuario
```http
GET /chat/user/{user_id}/all-hospedajes
```

### Re-entrenamiento
```http
POST /chat/retrain/{hospedaje_id}
```

### Health Check
```http
GET /health
```

## 🗄️ Base de Datos

### Tablas Principales

**vectores_docs**: Almacena chunks de PDFs vectorizados
```sql
CREATE TABLE vectores_docs (
    id UUID PRIMARY KEY,
    hospedaje_id UUID NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}'
);
```

**chat_history**: Historial completo de conversaciones
```sql
CREATE TABLE chat_history (
    id UUID PRIMARY KEY,
    hospedaje_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id VARCHAR(255),
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    sources_used JSONB DEFAULT '[]',
    response_time FLOAT DEFAULT 0
);
```

## 🔧 Configuración por Hospedaje

### Tono del Chatbot
- **FORMAL**: Profesional y cortés
- **CORDIAL**: Amable y servicial
- **JUVENIL**: Dinámico y entusiasta
- **AMIGABLE**: Cercano y cálido
- **CORPORATIVO**: Ejecutivo y eficiente

### Fuentes de Información

1. **PDF Personalizado**: Subido por el propietario via backend
2. **Base de Datos**: Habitaciones, servicios, precios (via endpoints)
3. **Historial**: Consultas previas del mismo hospedaje
4. **GPT-3.5**: Procesamiento de lenguaje natural

## 🎯 Ejemplos de Uso

### Consulta Básica
```
👤 Usuario: "Hola, ¿qué habitaciones tienen?"
🤖 Bot: "¡Hola! En Hotel Las Magnolias tenemos:
       
       🏨 HABITACIÓN SUPERIOR (2 personas) - ARS $ 15.000/noche
       ✅ Vista al jardín, balcón privado, wifi gratuito
       
       🏨 SUITE ROMÁNTICA (2 personas) - ARS $ 22.000/noche
       ✅ Jacuzzi privado, vista panorámica
       
       ¿Te interesa alguna opción específica?"
```

### Consulta con Fechas
```
👤 Usuario: "¿Tienen disponible para este fin de semana?"
🤖 Bot: "Para este fin de semana (21-22 de enero) tenemos disponibilidad:
       
       ✅ Habitación Superior: ARS $ 30.000 por 2 noches
       ✅ Suite Romántica: ARS $ 44.000 por 2 noches
       
       ¿Te gustaría hacer una reserva?"
```

## 🔍 Monitoreo y Logs

### Logs Importantes
- Configuración de hospedajes
- Errores de procesamiento
- Tiempos de respuesta
- Uso de fuentes de información

### Métricas
- Consultas por hospedaje
- Tiempo promedio de respuesta
- Satisfacción del usuario
- Uso de diferentes fuentes

## 🛠️ Desarrollo

### Estructura del Proyecto
```
stay-chatbot/
├── app/
│   ├── core/           # Configuración y DB
│   ├── models/         # Modelos Pydantic
│   ├── services/       # Lógica de negocio
│   ├── routers/        # Endpoints API
│   ├── prompts/        # Plantillas de prompts
│   └── utils/          # Utilidades
├── sql/                # Scripts SQL
├── tests/              # Testing
└── requirements.txt
```

### Agregar Nuevo Tipo de Consulta

1. **Actualizar clasificación** en `utils/query_classifier.py`
2. **Agregar lógica** en `services/database_service.py`
3. **Crear prompt** en `prompts/`
4. **Testear** con diferentes hospedajes

## 🚨 Troubleshooting

### Problemas Comunes

**Error de conexión a base de datos**:
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres

# Verificar extensiones
psql -h localhost -p 5433 -U adminCumbrecita -d StayAtCumbrecita
\dx
```

**Error de OpenAI API**:
```bash
# Verificar API key
echo $OPENAI_API_KEY

# Verificar límites de uso
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/usage
```

**Error de backend**:
```bash
# Verificar que el backend esté corriendo
curl http://localhost:5001/health

# Verificar logs
docker-compose logs backend
```

## 📈 Roadmap

- [ ] Soporte multiidioma (inglés/español)
- [ ] Integración con WhatsApp
- [ ] Analytics avanzados
- [ ] Modo offline con respuestas pre-cargadas
- [ ] Integración con sistemas de reservas
- [ ] Machine Learning para mejores respuestas

## 🤝 Contribuir

1. Fork del proyecto
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico:
- 📧 Email: soporte@staycumbrecita.com
- 💬 Chat: En la plataforma principal
- 📚 Documentación: [docs.staycumbrecita.com](https://docs.staycumbrecita.com) 