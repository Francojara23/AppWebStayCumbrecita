import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
import httpx
from ..core.config import settings
from ..core.database import execute_vector_query, execute_vector_query_one
from ..services.pdf_processor import PDFProcessor
import json

logger = logging.getLogger(__name__)

class KnowledgeService:
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.pdf_processor = PDFProcessor()
        
    async def generate_embedding(self, text: str) -> List[float]:
        """Genera embedding para un texto"""
        try:
            response = await self.openai_client.embeddings.create(
                model=settings.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generando embedding: {e}")
            return []
    
    async def search_similar_content(
        self, 
        hospedaje_id: str, 
        query: str, 
        limit: Optional[int] = None
    ) -> Optional[str]:
        """Busca contenido similar en los documentos del hospedaje"""
        try:
            if limit is None:
                limit = settings.max_chunks_per_query
                
            # Generar embedding de la consulta
            query_embedding = await self.generate_embedding(query)
            if not query_embedding:
                return None
            
            # Buscar chunks similares
            search_query = """
            SELECT content, metadata, 
                   1 - (embedding <=> %s::vector) as similarity
            FROM chatbot_knowledge 
            WHERE hospedaje_id = %s
            AND 1 - (embedding <=> %s::vector) > %s
            ORDER BY similarity DESC
            LIMIT %s
            """
            
            results = await execute_vector_query(search_query, [
                query_embedding,
                hospedaje_id,
                settings.similarity_threshold,
                limit
            ])
            
            if not results:
                return None
            
            # Formatear resultados
            formatted_content = []
            for row in results:
                content = row[0]
                metadata = json.loads(row[1]) if row[1] else {}
                similarity = row[2]
                
                formatted_content.append({
                    "content": content,
                    "source": metadata.get("source", "documento"),
                    "similarity": similarity
                })
            
            return self._format_search_results(formatted_content)
            
        except Exception as e:
            logger.error(f"Error buscando contenido similar: {e}")
            return None
    
    def _format_search_results(self, results: List[Dict[str, Any]]) -> str:
        """Formatea los resultados de búsqueda para el prompt"""
        formatted = []
        
        for i, result in enumerate(results, 1):
            formatted.append(
                f"DOCUMENTO {i} (similitud: {result['similarity']:.2f}):\n"
                f"Fuente: {result['source']}\n"
                f"Contenido: {result['content']}\n"
            )
        
        return "\n".join(formatted)
    
    async def process_hospedaje_documents(self, hospedaje_id: str) -> bool:
        """Procesa todos los documentos de un hospedaje"""
        try:
            # Obtener documentos desde el backend
            documents = await self._get_hospedaje_documents(hospedaje_id)
            
            if not documents:
                logger.info(f"No se encontraron documentos para hospedaje {hospedaje_id}")
                return True
            
            # Procesar cada documento
            for doc in documents:
                success = await self._process_single_document(hospedaje_id, doc)
                if not success:
                    logger.error(f"Error procesando documento {doc['id']}")
                    return False
            
            logger.info(f"Procesados {len(documents)} documentos para hospedaje {hospedaje_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error procesando documentos del hospedaje: {e}")
            return False
    
    async def _get_hospedaje_documents(self, hospedaje_id: str) -> List[Dict[str, Any]]:
        """Obtiene los documentos de un hospedaje desde el backend"""
        try:
            backend_url = settings.backend_url
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{backend_url}/chatbot/{hospedaje_id}/documents")
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Error obteniendo documentos: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error consultando documentos: {e}")
            return []
    
    async def _process_single_document(
        self, 
        hospedaje_id: str, 
        document: Dict[str, Any]
    ) -> bool:
        """Procesa un documento individual"""
        try:
            doc_id = document["id"]
            doc_url = document["url"]
            doc_name = document.get("nombre", "documento")
            
            # Verificar si ya fue procesado
            if await self._is_document_processed(hospedaje_id, doc_id):
                logger.info(f"Documento {doc_id} ya fue procesado")
                return True
            
            # Descargar PDF a través del proxy del backend
            text_content = await self.pdf_processor.extract_text_from_backend_proxy(doc_id)
            if not text_content:
                logger.error(f"No se pudo extraer texto del documento {doc_id}")
                return False
            
            # Dividir en chunks
            chunks = await self.pdf_processor.split_into_chunks(text_content)
            
            # Procesar cada chunk
            for i, chunk in enumerate(chunks):
                # Generar embedding
                embedding = await self.generate_embedding(chunk)
                
                # ⚠️ TEMPORAL: Guardar chunk aunque falle el embedding
                if not embedding:
                    logger.warning(f"No se pudo generar embedding para chunk {i}, guardando sin embedding")
                    embedding = [0.0] * 1536  # Vector vacío compatible con text-embedding-3-small
                
                # Guardar en base de datos
                await self._save_chunk(
                    hospedaje_id=hospedaje_id,
                    document_id=doc_id,
                    chunk_index=i,
                    content=chunk,
                    embedding=embedding,
                    metadata={
                        "source": doc_name,
                        "document_id": doc_id,
                        "chunk_index": i,
                        "total_chunks": len(chunks)
                    }
                )
            
            logger.info(f"Procesado documento {doc_id} en {len(chunks)} chunks")
            return True
            
        except Exception as e:
            logger.error(f"Error procesando documento individual: {e}")
            return False
    
    async def _is_document_processed(self, hospedaje_id: str, document_id: str) -> bool:
        """Verifica si un documento ya fue procesado"""
        try:
            query = """
            SELECT COUNT(*) FROM chatbot_knowledge 
            WHERE hospedaje_id = %s AND document_id = %s
            """
            
            result = await execute_vector_query_one(query, [hospedaje_id, document_id])
            return result[0] > 0 if result else False
            
        except Exception as e:
            logger.error(f"Error verificando documento procesado: {e}")
            return False
    
    async def _save_chunk(
        self,
        hospedaje_id: str,
        document_id: str,
        chunk_index: int,
        content: str,
        embedding: List[float],
        metadata: Dict[str, Any]
    ):
        """Guarda un chunk en la base de datos"""
        try:
            query = """
            INSERT INTO chatbot_knowledge 
            (hospedaje_id, document_id, chunk_index, content, embedding, metadata, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (hospedaje_id, document_id, chunk_index) 
            DO UPDATE SET 
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            """
            
            await execute_vector_query(query, [
                hospedaje_id,
                document_id,
                chunk_index,
                content,
                embedding,
                json.dumps(metadata)
            ])
            
        except Exception as e:
            logger.error(f"Error guardando chunk: {e}")
    
    async def retrain_hospedaje_knowledge(self, hospedaje_id: str) -> bool:
        """Re-entrena el conocimiento de un hospedaje"""
        try:
            # Eliminar conocimiento existente
            await self._delete_hospedaje_knowledge(hospedaje_id)
            
            # Re-procesar documentos
            success = await self.process_hospedaje_documents(hospedaje_id)
            
            if success:
                logger.info(f"Re-entrenamiento completado para hospedaje {hospedaje_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error re-entrenando conocimiento: {e}")
            return False
    
    async def _delete_hospedaje_knowledge(self, hospedaje_id: str):
        """Elimina el conocimiento existente de un hospedaje"""
        try:
            query = "DELETE FROM chatbot_knowledge WHERE hospedaje_id = %s"
            await execute_vector_query(query, [hospedaje_id])
            
        except Exception as e:
            logger.error(f"Error eliminando conocimiento: {e}")
    
    async def get_hospedaje_knowledge_stats(self, hospedaje_id: str) -> Dict[str, Any]:
        """Obtiene estadísticas del conocimiento de un hospedaje"""
        try:
            query = """
            SELECT 
                COUNT(*) as total_chunks,
                COUNT(DISTINCT document_id) as total_documents,
                AVG(LENGTH(content)) as avg_chunk_length,
                MIN(created_at) as first_processed,
                MAX(updated_at) as last_updated
            FROM chatbot_knowledge 
            WHERE hospedaje_id = %s
            """
            
            result = await execute_vector_query_one(query, [hospedaje_id])
            
            if result:
                return {
                    "total_chunks": result[0],
                    "total_documents": result[1],
                    "avg_chunk_length": float(result[2]) if result[2] else 0,
                    "first_processed": result[3].isoformat() if result[3] else None,
                    "last_updated": result[4].isoformat() if result[4] else None
                }
            
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "avg_chunk_length": 0,
                "first_processed": None,
                "last_updated": None
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas: {e}")
            return {} 