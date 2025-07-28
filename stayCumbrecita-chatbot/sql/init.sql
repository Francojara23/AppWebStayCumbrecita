-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla para vectores de documentos PDF (renombrada para coincidir con el código)
CREATE TABLE IF NOT EXISTS chatbot_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospedaje_id UUID NOT NULL,
    document_id VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(hospedaje_id, document_id, chunk_index)
);

-- Tabla para historial de chat
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospedaje_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id VARCHAR(255),
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    sources_used JSONB DEFAULT '[]',
    response_time FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para sesiones y contexto de reservas pendientes
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospedaje_id UUID NOT NULL,
    user_id UUID NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(hospedaje_id, user_id, conversation_id)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_hospedaje ON chatbot_knowledge(hospedaje_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_embedding ON chatbot_knowledge USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_document ON chatbot_knowledge(document_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_hospedaje_user ON chat_history(hospedaje_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lookup ON chat_sessions(hospedaje_id, user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at);

-- Comentarios para documentación
COMMENT ON TABLE chatbot_knowledge IS 'Almacena chunks de PDFs vectorizados por hospedaje';
COMMENT ON TABLE chat_history IS 'Historial completo de conversaciones del chatbot';
COMMENT ON TABLE chat_sessions IS 'Contexto de sesiones y reservas pendientes para memoria conversacional';
COMMENT ON COLUMN chat_history.sources_used IS 'Array JSON con las fuentes utilizadas: pdf, database, history, gpt';
COMMENT ON COLUMN chat_history.response_time IS 'Tiempo de respuesta en segundos';
COMMENT ON COLUMN chat_sessions.session_data IS 'Datos JSON con contexto de reserva: habitación, fechas, huéspedes'; 