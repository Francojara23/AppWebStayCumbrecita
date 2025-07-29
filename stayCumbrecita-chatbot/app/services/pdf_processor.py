import logging
import httpx
import io
from typing import List, Optional, Dict, Any
from PyPDF2 import PdfReader
import re
import cloudinary
from cloudinary.utils import cloudinary_url
from ..core.config import settings

logger = logging.getLogger(__name__)

class PDFProcessor:
    def __init__(self):
        self.chunk_size = 1000  # Tamaño de chunk en caracteres
        self.chunk_overlap = 200  # Solapamiento entre chunks
        
        # Configurar Cloudinary para autenticación
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret
        )
    
    def _extract_public_id_from_url(self, pdf_url: str) -> Optional[str]:
        """Extrae el public_id de una URL de Cloudinary"""
        try:
            # Patrón para URLs de Cloudinary: 
            # https://res.cloudinary.com/{cloud_name}/raw/upload/v{version}/{public_id}.pdf
            import re
            pattern = r'https://res\.cloudinary\.com/[^/]+/raw/upload/(?:v\d+/)?(.+)\.pdf'
            match = re.search(pattern, pdf_url)
            
            if match:
                public_id = match.group(1)
                logger.info(f"Public ID extraído: {public_id}")
                return public_id
            else:
                logger.error(f"No se pudo extraer public_id de la URL: {pdf_url}")
                return None
                
        except Exception as e:
            logger.error(f"Error extrayendo public_id: {e}")
            return None
        
    async def extract_text_from_url(self, pdf_url: str) -> Optional[str]:
        """Extrae texto de un PDF desde una URL (Cloudinary) con autenticación"""
        try:
            # Primero, intentar descargar con la URL original (puede ser pública)
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(pdf_url)
                
                # Si funciona, usar la URL original
                if response.status_code == 200:
                    logger.info("PDF descargado exitosamente con URL original")
                else:
                    logger.info(f"URL original falló ({response.status_code}), intentando con autenticación...")
                    
                    # Extraer public_id para generar URL autenticada
                    public_id = self._extract_public_id_from_url(pdf_url)
                    if not public_id:
                        logger.error("No se pudo extraer public_id de la URL")
                        return None
                    
                    # Generar URL autenticada usando Cloudinary
                    auth_url, _ = cloudinary_url(
                        public_id,
                        resource_type="raw",    # PDFs se almacenan como 'raw' en Cloudinary
                        type="private",         # Especificar que es un recurso privado
                        sign_url=True,
                        secure=True
                    )
                    
                    logger.info(f"URL autenticada generada: {auth_url[:100]}...")
                    
                    # Intentar con URL autenticada
                    response = await client.get(auth_url)
                    
                    if response.status_code != 200:
                        logger.error(f"Error descargando PDF con auth: {response.status_code}")
                        return None
                
                # Leer PDF desde bytes
                pdf_bytes = io.BytesIO(response.content)
                reader = PdfReader(pdf_bytes)
                
                # Extraer texto de todas las páginas
                text_content = []
                for page in reader.pages:
                    text_content.append(page.extract_text())
                
                full_text = "\n".join(text_content)
                
                # Limpiar texto
                cleaned_text = self._clean_text(full_text)
                
                if not cleaned_text.strip():
                    logger.warning("No se pudo extraer texto del PDF")
                    return None
                
                logger.info(f"Texto extraído exitosamente: {len(cleaned_text)} caracteres")
                return cleaned_text
                
        except Exception as e:
            logger.error(f"Error procesando PDF: {e}")
            return None
    
    async def extract_text_from_backend_proxy(self, document_id: str) -> Optional[str]:
        """Extrae texto de un PDF usando el endpoint proxy del backend"""
        try:
            backend_url = f"{settings.backend_url}/chatbot/download/{document_id}"
            logger.info(f"Descargando PDF a través del backend: {backend_url}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(backend_url)
                
                if response.status_code != 200:
                    logger.error(f"Error descargando PDF desde backend: {response.status_code}")
                    return None
                
                # Leer PDF desde bytes
                pdf_bytes = io.BytesIO(response.content)
                reader = PdfReader(pdf_bytes)
                
                # Extraer texto de todas las páginas
                text_content = []
                for page in reader.pages:
                    text_content.append(page.extract_text())
                
                full_text = "\n".join(text_content)
                
                # Limpiar texto
                cleaned_text = self._clean_text(full_text)
                
                if not cleaned_text.strip():
                    logger.warning("El PDF no contiene texto extraíble")
                    return None
                
                logger.info(f"Texto extraído exitosamente: {len(cleaned_text)} caracteres")
                return cleaned_text
                
        except Exception as e:
            logger.error(f"Error extrayendo texto del PDF via backend: {e}")
            return None
    
    def _clean_text(self, text: str) -> str:
        """Limpia y normaliza el texto extraído"""
        if not text:
            return ""
        
        # Remover caracteres de control y espacios extra
        text = re.sub(r'\s+', ' ', text)
        
        # Remover caracteres especiales problemáticos
        text = re.sub(r'[^\w\s\.,;:!?¡¿\-\(\)\[\]\"\'áéíóúñüÁÉÍÓÚÑÜ]', '', text)
        
        # Normalizar saltos de línea
        text = re.sub(r'\n+', '\n', text)
        
        # Limpiar espacios al inicio y final
        text = text.strip()
        
        return text
    
    async def split_into_chunks(self, text: str) -> List[str]:
        """Divide el texto en chunks manejables"""
        if not text:
            return []
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Determinar el final del chunk
            end = start + self.chunk_size
            
            # Si no es el último chunk, buscar un punto de corte natural
            if end < len(text):
                # Buscar el último punto, salto de línea o espacio antes del límite
                for separator in ['. ', '\n', ' ']:
                    last_separator = text.rfind(separator, start, end)
                    if last_separator != -1:
                        end = last_separator + len(separator)
                        break
            
            # Extraer chunk
            chunk = text[start:end].strip()
            
            if chunk:
                chunks.append(chunk)
            
            # Mover al siguiente chunk con solapamiento
            start = end - self.chunk_overlap
            
            # Evitar chunks muy pequeños al final
            if start >= len(text) - self.chunk_overlap:
                break
        
        logger.info(f"Texto dividido en {len(chunks)} chunks")
        return chunks
    
    def get_chunk_metadata(self, chunk: str, chunk_index: int, total_chunks: int) -> Dict[str, Any]:
        """Genera metadata para un chunk"""
        return {
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "character_count": len(chunk),
            "word_count": len(chunk.split()),
            "has_numbers": bool(re.search(r'\d', chunk)),
            "has_dates": bool(re.search(r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}', chunk)),
            "has_prices": bool(re.search(r'[$\$]\s*\d+|precio|costo|tarifa', chunk.lower())),
            "has_contact": bool(re.search(r'@|tel|phone|contacto|email', chunk.lower()))
        }
    
    async def validate_pdf_url(self, pdf_url: str) -> bool:
        """Valida que la URL sea accesible y contenga un PDF"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Hacer HEAD request para verificar sin descargar
                response = await client.head(pdf_url)
                
                if response.status_code != 200:
                    return False
                
                # Verificar content-type
                content_type = response.headers.get('content-type', '').lower()
                if 'pdf' not in content_type:
                    logger.warning(f"URL no parece ser un PDF: {content_type}")
                    return False
                
                return True
                
        except Exception as e:
            logger.error(f"Error validando PDF URL: {e}")
            return False
    
    def estimate_processing_time(self, pdf_url: str) -> int:
        """Estima el tiempo de procesamiento en segundos"""
        # Estimación básica - en producción podría ser más sofisticado
        return 30  # 30 segundos por PDF
    
    async def get_pdf_info(self, pdf_url: str) -> Dict[str, Any]:
        """Obtiene información básica del PDF"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(pdf_url)
                
                if response.status_code != 200:
                    return {}
                
                pdf_bytes = io.BytesIO(response.content)
                reader = PdfReader(pdf_bytes)
                
                info = {
                    "num_pages": len(reader.pages),
                    "file_size_bytes": len(response.content),
                    "title": reader.metadata.get('/Title', '') if reader.metadata else '',
                    "author": reader.metadata.get('/Author', '') if reader.metadata else '',
                    "subject": reader.metadata.get('/Subject', '') if reader.metadata else '',
                    "creator": reader.metadata.get('/Creator', '') if reader.metadata else ''
                }
                
                return info
                
        except Exception as e:
            logger.error(f"Error obteniendo info del PDF: {e}")
            return {} 