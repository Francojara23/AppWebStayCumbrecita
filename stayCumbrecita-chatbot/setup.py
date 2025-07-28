#!/usr/bin/env python3
"""
Script de instalación y configuración para Stay Chatbot
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, description):
    """Ejecuta un comando y maneja errores"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completado")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en {description}: {e.stderr}")
        return None

def check_requirements():
    """Verifica que los requisitos estén instalados"""
    print("🔍 Verificando requisitos...")
    
    # Verificar Python
    if sys.version_info < (3, 8):
        print("❌ Se requiere Python 3.8 o superior")
        return False
    
    # Verificar pip
    if not shutil.which('pip'):
        print("❌ pip no está instalado")
        return False
    
    # Verificar Docker (opcional)
    if shutil.which('docker'):
        print("✅ Docker disponible")
    else:
        print("⚠️  Docker no está disponible (opcional)")
    
    print("✅ Requisitos verificados")
    return True

def install_dependencies():
    """Instala las dependencias de Python"""
    print("📦 Instalando dependencias...")
    
    # Crear entorno virtual si no existe
    if not os.path.exists('venv'):
        run_command('python -m venv venv', 'Creando entorno virtual')
    
    # Activar entorno virtual e instalar dependencias
    if os.name == 'nt':  # Windows
        activate_cmd = 'venv\\Scripts\\activate'
    else:  # Unix/Linux/Mac
        activate_cmd = 'source venv/bin/activate'
    
    install_cmd = f"{activate_cmd} && pip install -r requirements.txt"
    return run_command(install_cmd, 'Instalando dependencias')

def setup_database():
    """Configura la base de datos"""
    print("🗄️  Configurando base de datos...")
    
    # Verificar que PostgreSQL esté disponible
    if not shutil.which('psql'):
        print("⚠️  PostgreSQL no está disponible. Asegúrate de que esté instalado y ejecutándose.")
        return False
    
    # Crear extensión pgvector (si es necesario)
    create_extension_cmd = """
    psql -h localhost -U adminCumbrecita -d StayAtCumbrecita -c "CREATE EXTENSION IF NOT EXISTS vector;"
    """
    
    result = run_command(create_extension_cmd, 'Creando extensión pgvector')
    if result is None:
        print("⚠️  No se pudo crear la extensión pgvector. Continúa manualmente.")
    
    return True

def create_env_file():
    """Crea el archivo .env si no existe"""
    print("⚙️  Configurando variables de entorno...")
    
    if os.path.exists('.env'):
        print("✅ Archivo .env ya existe")
        return True
    
    # Copiar desde ejemplo
    if os.path.exists('env.example'):
        shutil.copy('env.example', '.env')
        print("✅ Archivo .env creado desde env.example")
        print("⚠️  Recuerda configurar tu OPENAI_API_KEY en el archivo .env")
        return True
    else:
        print("❌ No se encontró env.example")
        return False

def run_tests():
    """Ejecuta pruebas básicas"""
    print("🧪 Ejecutando pruebas básicas...")
    
    # Test de importaciones
    test_imports = """
python -c "
import sys
sys.path.append('.')
try:
    from app.core.config import settings
    from app.core.database import check_database_connection
    from app.services.chat_service import ChatService
    print('✅ Importaciones exitosas')
except Exception as e:
    print(f'❌ Error en importaciones: {e}')
    sys.exit(1)
"
    """
    
    return run_command(test_imports, 'Verificando importaciones')

def main():
    """Función principal de instalación"""
    print("🚀 Iniciando instalación de Stay Chatbot...")
    print("=" * 50)
    
    # Verificar requisitos
    if not check_requirements():
        sys.exit(1)
    
    # Instalar dependencias
    if not install_dependencies():
        print("❌ Error instalando dependencias")
        sys.exit(1)
    
    # Configurar base de datos
    setup_database()
    
    # Crear archivo .env
    if not create_env_file():
        print("❌ Error configurando variables de entorno")
        sys.exit(1)
    
    # Ejecutar pruebas
    run_tests()
    
    print("\n" + "=" * 50)
    print("🎉 Instalación completada!")
    print("\n📋 Próximos pasos:")
    print("1. Configura tu OPENAI_API_KEY en el archivo .env")
    print("2. Verifica la conexión a la base de datos")
    print("3. Ejecuta: python -m uvicorn app.main:app --reload")
    print("4. Visita: http://localhost:8000/docs")
    print("\n📚 Documentación: README.md")

if __name__ == "__main__":
    main() 