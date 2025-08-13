import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DateExtractor:
    def __init__(self):
        # Patrones para extraer fechas - ORDENADOS DE MÁS ESPECÍFICO A MÁS GENERAL
        self.date_patterns = [
            # 🔥 PATRONES DE RANGOS PRIMERO (más específicos)
            # del DD al DD de MMMM (ej: del 11 al 14 de julio)
            (r'del\s+(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+(\w+)', self._parse_range_month),
            # DD/MM/YYYY o DD-MM-YYYY
            (r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})', self._parse_dmy),
            # DD de MMMM (ej: 11 de julio, 14 de enero) - DESPUÉS de los rangos
            (r'(\d{1,2})\s+de\s+(\w+)', self._parse_day_month),
            # desde DD hasta DD de MMMM
            (r'desde\s+(\d{1,2})\s+hasta\s+(\d{1,2})\s+de\s+(\w+)', self._parse_range_month),
            # entre DD y DD de MMMM
            (r'entre\s+(\d{1,2})\s+y\s+(\d{1,2})\s+de\s+(\w+)', self._parse_range_month),
            # del DD al DD (sin mes - asumir mes actual)
            (r'del\s+(\d{1,2})\s+al\s+(\d{1,2})(?!\s+de)', self._parse_range_current_month),
            # desde DD hasta DD (sin mes - asumir mes actual)
            (r'desde\s+(\d{1,2})\s+hasta\s+(\d{1,2})(?!\s+de)', self._parse_range_current_month),
            # DD al DD (sin del/desde - asumir mes actual)
            (r'(\d{1,2})\s+al\s+(\d{1,2})(?!\s+de)', self._parse_range_current_month),
            # el DD (día específico - asumir mes actual) - Mejorado para evitar conflictos
            (r'el\s+(\d{1,2})(?!\d)(?!\s+de\s+\w+)', self._parse_single_day_current_month),
            # DD solo (día específico - asumir mes actual si no hay otro contexto)
            # 🔧 MEJORADO: Excluir también cuando va seguido de personas/huéspedes/noches/días
            (r'\b(\d{1,2})\b(?!\s*(?:de|al|/|\-|\d|personas?|huéspedes?|noches?|días?|habitaciones?))', self._parse_single_day_current_month),
            # este mes
            (r'este\s+mes', self._parse_current_month),
            # este fin de semana / este finde
            (r'este\s+(?:fin\s+de\s+semana|finde)', self._parse_this_weekend),
        ]
        
        # Patrones para consultas mensuales
        self.monthly_patterns = [
            # "este mes"
            (r'este\s+mes', self._parse_current_month_monthly),
            # "en este mes", "para este mes"
            (r'(?:en|para|durante)\s+este\s+mes', self._parse_current_month_monthly),
            # "hay algo este mes"
            (r'hay\s+(?:algo|alguna?\s+habitaci[óo]n)\s+este\s+mes', self._parse_current_month_monthly),
            # "disponible este mes"
            (r'disponible\s+este\s+mes', self._parse_current_month_monthly),
            # "en julio", "para julio", "durante julio"
            (r'(?:en|para|durante)\s+(\w+)', self._parse_single_month),
            # "en el mes de julio"
            (r'en\s+el\s+mes\s+de\s+(\w+)', self._parse_single_month),
            # "hay algo en julio"
            (r'hay\s+(?:algo|alguna?\s+habitaci[óo]n)\s+(?:en|para|durante)\s+(\w+)', self._parse_single_month),
            # "disponible en julio"
            (r'disponible\s+(?:en|para|durante)\s+(\w+)', self._parse_single_month),
            # "julio y agosto" o "julio, agosto y septiembre"
            (r'(\w+)(?:\s*,\s*(\w+))*\s+y\s+(\w+)', self._parse_multiple_months),
        ]
        
        # Meses en español
        self.months_es = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
            'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4,
            'may': 5, 'jun': 6, 'jul': 7, 'ago': 8,
            'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
        }
        
        # Patrones para extraer números (personas, noches, etc.)
        self.number_patterns = [
            (r'(\d+)\s*personas?', 'guests'),
            (r'(\d+)\s*huéspedes?', 'guests'),
            (r'(\d+)\s*noches?', 'nights'),
            (r'(\d+)\s*días?', 'days'),
            (r'(\d+)\s*habitaciones?', 'rooms'),
        ]

    def extract_date_info(self, message: str) -> Dict[str, Any]:
        """Extrae información de fechas del mensaje"""
        message_lower = message.lower()
        logger.info(f"🔍 DEBUG EXTRACT - Mensaje original: '{message}'")
        logger.info(f"🔍 DEBUG EXTRACT - Mensaje lower: '{message_lower}'")
        
        result = {
            'has_dates': False,
            'check_in': None,
            'check_out': None,
            'single_date': None,
            'date_range': None,
            'raw_dates': []
        }
        
        try:
            # 🔧 BUSCAR PATRONES CON PRIORIDAD - detener en el primer patrón que funcione
            for pattern, parser in self.date_patterns:
                matches = list(re.finditer(pattern, message_lower, re.IGNORECASE))
                if matches:
                    logger.info(f"🔍 DEBUG PATTERN - Patrón encontrado: {pattern}")
                    pattern_dates = []
                    for match in matches:
                        parsed_dates = parser(match.groups())
                        if parsed_dates:
                            logger.info(f"🔍 DEBUG PATTERN - Fechas parseadas: {parsed_dates}")
                            pattern_dates.extend(parsed_dates)
                    
                    if pattern_dates:
                        result['raw_dates'].extend(pattern_dates)
                        result['has_dates'] = True
                        break  # Detener búsqueda después del primer patrón exitoso
            
            # Procesar fechas encontradas
            if result['raw_dates']:
                if len(result['raw_dates']) == 1:
                    result['single_date'] = result['raw_dates'][0]
                elif len(result['raw_dates']) == 2:
                    # 🔧 ORDENAR las 2 fechas cronológicamente 
                    sorted_dates = sorted(result['raw_dates'])
                    result['check_in'] = sorted_dates[0]  # Fecha más temprana
                    result['check_out'] = sorted_dates[1]  # Fecha más tardía
                    result['date_range'] = {
                        'start': sorted_dates[0],
                        'end': sorted_dates[1]
                    }
                    logger.info(f"🔍 DEBUG FECHAS 2 - Original: {result['raw_dates']}, Ordenadas: {sorted_dates}")
                elif len(result['raw_dates']) > 2:
                    # 🔧 ORDENAR fechas cronológicamente para tomar check_in y check_out correctos
                    unique_dates = list(set(result['raw_dates']))  # Eliminar duplicados
                    unique_dates.sort()  # Ordenar cronológicamente
                    
                    logger.info(f"🔍 DEBUG FECHAS - Raw dates: {result['raw_dates']}")
                    logger.info(f"🔍 DEBUG FECHAS - Unique sorted dates: {unique_dates}")
                    
                    if len(unique_dates) >= 2:
                        result['check_in'] = unique_dates[0]  # Primera fecha (más temprana)
                        result['check_out'] = unique_dates[1]  # Segunda fecha (más tardía) 
                        result['date_range'] = {
                            'start': unique_dates[0],
                            'end': unique_dates[1]
                        }
                        logger.info(f"🔍 DEBUG FECHAS - Asignadas: check_in={unique_dates[0]}, check_out={unique_dates[1]}")
                    else:
                        result['single_date'] = unique_dates[0]
                        logger.info(f"🔍 DEBUG FECHAS - Solo una fecha única: {unique_dates[0]}")
        
        except Exception as e:
            logger.error(f"Error extrayendo fechas: {e}")
        
        return result

    def extract_numbers(self, message: str) -> Dict[str, Any]:
        """Extrae números y cantidades del mensaje"""
        result = {
            'guests': None,
            'nights': None,
            'days': None,
            'rooms': None,
            'raw_numbers': []
        }
        
        try:
            for pattern, category in self.number_patterns:
                matches = re.finditer(pattern, message, re.IGNORECASE)
                for match in matches:
                    number = int(match.group(1))
                    result[category] = number
                    result['raw_numbers'].append({
                        'number': number,
                        'category': category,
                        'original': match.group(0)
                    })
        
        except Exception as e:
            logger.error(f"Error extrayendo números: {e}")
        
        return result

    def _parse_dmy(self, groups: Tuple[str, ...]) -> List[str]:
        """Parse DD/MM/YYYY format"""
        try:
            day, month, year = groups
            if len(year) == 2:
                year = f"20{year}"
            
            date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            datetime.strptime(date_str, "%Y-%m-%d")  # Validate
            return [date_str]
        except:
            return []

    def _parse_day_month(self, groups: Tuple[str, ...]) -> List[str]:
        """Parse DD de MMMM format"""
        try:
            day, month_name = groups
            month_num = self.months_es.get(month_name.lower())
            if not month_num:
                return []
            
            # Asumir año actual
            current_year = datetime.now().year
            date_str = f"{current_year}-{month_num:02d}-{int(day):02d}"
            datetime.strptime(date_str, "%Y-%m-%d")  # Validate
            return [date_str]
        except:
            return []

    def _parse_range_month(self, groups: Tuple[str, ...]) -> List[str]:
        """Parse del DD al DD de MMMM format"""
        try:
            start_day, end_day, month_name = groups
            logger.info(f"🔍 DEBUG RANGE_MONTH - grupos: start_day={start_day}, end_day={end_day}, month_name={month_name}")
            
            month_num = self.months_es.get(month_name.lower())
            if not month_num:
                logger.info(f"🔍 DEBUG RANGE_MONTH - Mes no encontrado: {month_name}")
                return []
            
            # Asumir año actual
            current_year = datetime.now().year
            start_date = f"{current_year}-{month_num:02d}-{int(start_day):02d}"
            end_date = f"{current_year}-{month_num:02d}-{int(end_day):02d}"
            
            logger.info(f"🔍 DEBUG RANGE_MONTH - Fechas generadas: start_date={start_date}, end_date={end_date}")
            
            # Validate dates
            datetime.strptime(start_date, "%Y-%m-%d")
            datetime.strptime(end_date, "%Y-%m-%d")
            
            result = [start_date, end_date]
            logger.info(f"🔍 DEBUG RANGE_MONTH - Resultado final: {result}")
            return result
        except Exception as e:
            logger.error(f"🔍 DEBUG RANGE_MONTH - Error: {e}")
            return []

    def _parse_range_current_month(self, groups: Tuple[str, ...]) -> List[str]:
        """Parse del DD al DD format (asumir mes actual)"""
        try:
            start_day, end_day = groups
            
            # Usar mes y año actual
            current_date = datetime.now()
            current_year = current_date.year
            current_month = current_date.month
            
            start_date = f"{current_year}-{current_month:02d}-{int(start_day):02d}"
            end_date = f"{current_year}-{current_month:02d}-{int(end_day):02d}"
            
            # Validate dates
            datetime.strptime(start_date, "%Y-%m-%d")
            datetime.strptime(end_date, "%Y-%m-%d")
            
            return [start_date, end_date]
        except:
            return []

    def _parse_single_day_current_month(self, groups: Tuple[str, ...]) -> List[str]:
        """Parse DD format (asumir mes actual)"""
        try:
            day = groups[0]
            
            # Usar mes y año actual
            current_date = datetime.now()
            current_year = current_date.year
            current_month = current_date.month
            
            date_str = f"{current_year}-{current_month:02d}-{int(day):02d}"
            datetime.strptime(date_str, "%Y-%m-%d")  # Validate
            return [date_str]
        except:
            return []

    def _parse_current_month(self, groups: Tuple[str, ...]) -> List[str]:
        """Parse 'este mes' - marca como consulta mensual pero no retorna fechas específicas"""
        # Este patrón se usa para identificar consultas mensuales,
        # no para extraer fechas específicas
        return []

    def _parse_this_weekend(self, groups: Tuple[str, ...]) -> List[str]:
        """Parse 'este fin de semana' - próximo viernes a domingo"""
        try:
            today = datetime.now()
            
            # Encontrar el próximo viernes
            days_until_friday = (4 - today.weekday()) % 7  # 4 = viernes
            if days_until_friday == 0 and today.weekday() == 4:  # Si hoy es viernes
                days_until_friday = 0  # Usar este viernes
            elif days_until_friday == 0:  # Si hoy no es viernes pero days_until es 0
                days_until_friday = 7  # Próximo viernes
            
            friday = today + timedelta(days=days_until_friday)
            sunday = friday + timedelta(days=2)  # Domingo
            
            friday_str = friday.strftime("%Y-%m-%d")
            sunday_str = sunday.strftime("%Y-%m-%d")
            
            return [friday_str, sunday_str]
        except:
            return []

    def _parse_current_month_monthly(self, groups: Tuple[str, ...]) -> List[str]:
        """Parse 'este mes' para consultas mensuales"""
        try:
            current_date = datetime.now()
            month_name = list(self.months_es.keys())[current_date.month - 1]  # Obtener nombre del mes actual
            return [f"{current_date.year}-{current_date.month:02d}"]
        except:
            return []

    def _parse_single_month(self, groups: Tuple[str, ...]) -> List[str]:
        """Parsea un mes individual (ej: 'julio')"""
        try:
            month_name = groups[0]
            month_num = self.months_es.get(month_name.lower())
            if not month_num:
                return []
            
            # Retornar información del mes
            current_year = datetime.now().year
            return [f"{current_year}-{month_num:02d}"]
        except:
            return []

    def _parse_multiple_months(self, groups: Tuple[str, ...]) -> List[str]:
        """Parsea múltiples meses (ej: 'julio y agosto', 'julio, agosto y septiembre')"""
        try:
            # Filtrar grupos no None y procesar cada mes
            month_names = [group for group in groups if group]
            months = []
            
            for month_name in month_names:
                month_num = self.months_es.get(month_name.lower())
                if month_num:
                    current_year = datetime.now().year
                    months.append(f"{current_year}-{month_num:02d}")
            
            return months
        except:
            return []

    def extract_monthly_info(self, message: str) -> Dict[str, Any]:
        """Extrae información de consultas mensuales del mensaje"""
        message_lower = message.lower()
        
        result = {
            'is_monthly_query': False,
            'single_month': None,
            'multiple_months': None,
            'months_list': []
        }
        
        try:
            # Buscar patrones mensuales
            for pattern, parser in self.monthly_patterns:
                matches = re.finditer(pattern, message_lower, re.IGNORECASE)
                for match in matches:
                    parsed_months = parser(match.groups())
                    if parsed_months:
                        result['is_monthly_query'] = True
                        result['months_list'].extend(parsed_months)
            
            # Procesar meses encontrados
            if result['months_list']:
                if len(result['months_list']) == 1:
                    result['single_month'] = result['months_list'][0]
                else:
                    result['multiple_months'] = result['months_list']
        
        except Exception as e:
            logger.error(f"Error extrayendo información mensual: {e}")
        
        return result

    def get_query_params(self, message: str) -> Dict[str, Any]:
        """Extrae todos los parámetros relevantes del mensaje"""
        date_info = self.extract_date_info(message)
        number_info = self.extract_numbers(message)
        monthly_info = self.extract_monthly_info(message)
        
        return {
            **date_info,
            **number_info,
            **monthly_info,
            'original_message': message
        } 