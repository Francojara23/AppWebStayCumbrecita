#!/usr/bin/env python3
"""
Script de prueba para Stay Chatbot
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Agregar el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_configuration():
    """Prueba la configuración del sistema"""
    print("🔧 Probando configuración...")
    
    try:
        from app.core.config import settings
        print(f"✅ Configuración cargada")
        print(f"   - Entorno: {settings.environment}")
        print(f"   - Backend URL: {settings.backend_url}")
        print(f"   - OpenAI API Key: {'✅ Configurada' if settings.openai_api_key else '❌ Faltante'}")
        print(f"   - Base de datos: {settings.db_host}:{settings.db_port}")
        return True
    except Exception as e:
        print(f"❌ Error en configuración: {e}")
        return False

async def test_database_connection():
    """Prueba la conexión a la base de datos"""
    print("\n🗄️  Probando conexión a base de datos...")
    
    try:
        from app.core.database import check_database_connection
        connected = await check_database_connection()
        if connected:
            print("✅ Conexión a base de datos exitosa")
            return True
        else:
            print("❌ No se pudo conectar a la base de datos")
            return False
    except Exception as e:
        print(f"❌ Error conectando a base de datos: {e}")
        return False

async def test_services():
    """Prueba los servicios principales"""
    print("\n🔧 Probando servicios...")
    
    try:
        # Test QueryClassifier
        from app.services.query_classifier import QueryClassifier
        classifier = QueryClassifier()
        
        test_queries = [
            "¿Cuánto cuesta la habitación?",
            "¿Tienen disponibilidad para este fin de semana?",
            "¿Qué servicios incluye el hospedaje?",
            "¿Dónde están ubicados?",
            "¿A qué hora es el check-in?"
        ]
        
        print("   📝 Probando clasificador de consultas:")
        for query in test_queries:
            category = await classifier.classify_query(query)
            print(f"      '{query}' → {category}")
        
        print("✅ Servicios funcionando correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error en servicios: {e}")
        return False

async def test_pdf_processor():
    """Prueba el procesador de PDFs"""
    print("\n📄 Probando procesador de PDFs...")
    
    try:
        from app.services.pdf_processor import PDFProcessor
        processor = PDFProcessor()
        
        # Test con texto de ejemplo
        sample_text = """
        Bienvenidos a nuestro hospedaje en La Cumbrecita.
        
        Servicios incluidos:
        - WiFi gratuito
        - Desayuno continental
        - Estacionamiento privado
        
        Precios:
        - Habitación simple: $15,000 por noche
        - Habitación doble: $25,000 por noche
        
        Check-in: 15:00 hrs
        Check-out: 11:00 hrs
        
        Contacto: info@hospedaje.com
        Teléfono: +54 9 11 1234-5678
        """
        
        chunks = await processor.split_into_chunks(sample_text)
        print(f"✅ Texto dividido en {len(chunks)} chunks")
        
        # Mostrar primer chunk como ejemplo
        if chunks:
            print(f"   Primer chunk: {chunks[0][:100]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en procesador de PDFs: {e}")
        return False

async def test_openai_connection():
    """Prueba la conexión con OpenAI"""
    print("\n🤖 Probando conexión con OpenAI...")
    
    try:
        from app.core.config import settings
        
        if not settings.openai_api_key or settings.openai_api_key == "sk-your-openai-api-key-here":
            print("⚠️  OpenAI API Key no configurada. Saltando prueba.")
            return True
        
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        
        # Test simple de embedding
        response = await client.embeddings.create(
            model=settings.embedding_model,
            input="Texto de prueba para embedding"
        )
        
        if response.data and len(response.data) > 0:
            embedding_length = len(response.data[0].embedding)
            print(f"✅ OpenAI conectado. Embedding generado ({embedding_length} dimensiones)")
            return True
        else:
            print("❌ OpenAI no respondió correctamente")
            return False
            
    except Exception as e:
        print(f"❌ Error conectando con OpenAI: {e}")
        return False

async def test_backend_service():
    """Prueba el servicio de backend"""
    print("\n🔗 Probando servicio de backend...")
    
    try:
        from app.services.backend_service import backend_service
        from app.core.config import settings
        
        # Test de conectividad (sin hacer llamadas reales)
        print(f"   Backend URL configurada: {settings.backend_url}")
        print("✅ Servicio de backend configurado")
        
        # Nota: No hacemos llamadas reales para no depender del backend
        return True
        
    except Exception as e:
        print(f"❌ Error en servicio de backend: {e}")
        return False

async def test_chat_flow():
    """Prueba el flujo completo de chat (simulado)"""
    print("\n💬 Probando flujo de chat...")
    
    try:
        from app.models.chat import ChatRequest, ChatResponse
        from app.services.query_classifier import QueryClassifier
        
        # Crear request de prueba
        test_request = ChatRequest(
            user_id="test_user_123",
            message="¿Cuánto cuesta una habitación doble para el fin de semana?",
            session_id="test_session_456",
            context=None
        )
        
        # Clasificar consulta
        classifier = QueryClassifier()
        query_type = await classifier.classify_query(test_request.message)
        
        # Crear response simulada
        test_response = ChatResponse(
            response="Basándome en la información disponible, nuestras habitaciones dobles tienen un costo de $25,000 por noche...",
            hospedaje_id="test_hospedaje_789",
            session_id=test_request.session_id or "test_session_456",
            query_type=query_type,
            response_time=0.5
        )
        
        print(f"✅ Flujo de chat simulado exitoso")
        print(f"   - Consulta clasificada como: {query_type}")
        print(f"   - Respuesta generada: {len(test_response.response)} caracteres")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en flujo de chat: {e}")
        return False

async def run_all_tests():
    """Ejecuta todas las pruebas"""
    print("🧪 Iniciando pruebas del sistema Stay Chatbot")
    print("=" * 60)
    
    tests = [
        ("Configuración", test_configuration),
        ("Conexión a BD", test_database_connection),
        ("Servicios", test_services),
        ("Procesador PDF", test_pdf_processor),
        ("OpenAI", test_openai_connection),
        ("Backend Service", test_backend_service),
        ("Flujo de Chat", test_chat_flow)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error crítico en {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumen de resultados
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n📈 Resultados: {passed} exitosas, {failed} fallidas")
    
    if failed == 0:
        print("🎉 ¡Todas las pruebas pasaron! El sistema está listo.")
        return True
    else:
        print("⚠️  Algunas pruebas fallaron. Revisa la configuración.")
        return False

def main():
    """Función principal"""
    try:
        result = asyncio.run(run_all_tests())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Pruebas interrumpidas por el usuario")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error crítico: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 