import re
import unicodedata
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

def normalize_text(text: str) -> str:
    """Normaliza texto removiendo acentos y caracteres especiales"""
    if not text:
        return ""
    
    # Normalizar unicode
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    
    # Convertir a minúsculas
    text = text.lower()
    
    # Remover caracteres especiales excepto espacios y algunos signos
    text = re.sub(r'[^a-zA-Z0-9\s\.,;:!?¡¿\-\(\)]', '', text)
    
    # Normalizar espacios
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def extract_dates_from_text(text: str) -> List[str]:
    """Extrae fechas del texto en diferentes formatos"""
    date_patterns = [
        r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}',  # 25/12/2024 o 25-12-2024
        r'\d{1,2}\s+de\s+\w+\s+de\s+\d{4}',  # 25 de diciembre de 2024
        r'\d{1,2}\s+de\s+\w+',  # 25 de diciembre
        r'(lunes|martes|miércoles|jueves|viernes|sábado|domingo)',  # días de la semana
        r'(hoy|mañana|pasado mañana|ayer)',  # referencias relativas
        r'(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)',  # meses
    ]
    
    found_dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        found_dates.extend(matches)
    
    return found_dates

def extract_numbers_from_text(text: str) -> List[Dict[str, Any]]:
    """Extrae números con contexto del texto"""
    number_patterns = [
        (r'(\d+)\s*(personas?|huéspedes?|guests?)', 'guests'),
        (r'(\d+)\s*(noches?|nights?)', 'nights'),
        (r'(\d+)\s*(días?|days?)', 'days'),
        (r'(\d+)\s*(habitaciones?|rooms?)', 'rooms'),
        (r'(\d+)\s*(camas?|beds?)', 'beds'),
        (r'(\$|\€|\£|pesos?|euros?|dolares?)\s*(\d+)', 'price'),
        (r'(\d+)\s*(\$|\€|\£|pesos?|euros?|dolares?)', 'price'),
        (r'(\d+)\s*(km|kilómetros?|metros?|m)', 'distance'),
        (r'(\d+)\s*(años?|years?)', 'age'),
    ]
    
    found_numbers = []
    for pattern, category in number_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple) and len(match) >= 2:
                number = match[0] if match[0].isdigit() else match[1]
                unit = match[1] if match[0].isdigit() else match[0]
                found_numbers.append({
                    'number': int(number),
                    'unit': unit,
                    'category': category,
                    'original': ' '.join(match)
                })
    
    return found_numbers

def extract_contact_info(text: str) -> Dict[str, List[str]]:
    """Extrae información de contacto del texto"""
    contact_info = {
        'emails': [],
        'phones': [],
        'websites': [],
        'social_media': []
    }
    
    # Emails
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    contact_info['emails'] = re.findall(email_pattern, text)
    
    # Teléfonos
    phone_patterns = [
        r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
        r'\b\d{4}[-.\s]?\d{4}\b'
    ]
    
    for pattern in phone_patterns:
        matches = re.findall(pattern, text)
        contact_info['phones'].extend(matches)
    
    # Websites
    website_pattern = r'https?://[^\s<>"{}|\\^`[\]]*'
    contact_info['websites'] = re.findall(website_pattern, text)
    
    # Social media
    social_patterns = [
        r'@[A-Za-z0-9_]+',  # Twitter/Instagram handles
        r'facebook\.com/[A-Za-z0-9._]+',
        r'instagram\.com/[A-Za-z0-9._]+',
        r'whatsapp[^\s]*'
    ]
    
    for pattern in social_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        contact_info['social_media'].extend(matches)
    
    return contact_info

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calcula similitud básica entre dos textos"""
    if not text1 or not text2:
        return 0.0
    
    # Normalizar textos
    text1_norm = normalize_text(text1)
    text2_norm = normalize_text(text2)
    
    # Convertir a conjuntos de palabras
    words1 = set(text1_norm.split())
    words2 = set(text2_norm.split())
    
    # Calcular intersección y unión
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    if not union:
        return 0.0
    
    # Índice de Jaccard
    return len(intersection) / len(union)

def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """Trunca texto a una longitud máxima"""
    if len(text) <= max_length:
        return text
    
    # Buscar el último espacio antes del límite
    truncated = text[:max_length - len(suffix)]
    last_space = truncated.rfind(' ')
    
    if last_space > 0:
        truncated = truncated[:last_space]
    
    return truncated + suffix

def format_price(amount: float, currency: str = "ARS") -> str:
    """Formatea precio con moneda en formato argentino"""
    if currency == "ARS":
        # Formato argentino: ARS $139.900,00 (puntos de miles, coma decimal)
        if amount == int(amount):
            # Número entero, agregar ,00
            precio_str = f"{int(amount):,}".replace(",", ".")
            return f"ARS ${precio_str},00"
        else:
            # Número con decimales
            precio_str = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            return f"ARS ${precio_str}"
    else:
        # Para otras monedas, mantener formato original
        currency_symbols = {
            "USD": "USD$",
            "EUR": "€",
            "GBP": "£"
        }
        symbol = currency_symbols.get(currency, currency)
        return f"{symbol} {amount:,.0f}"

def format_date_range(start_date: str, end_date: str) -> str:
    """Formatea rango de fechas"""
    try:
        if start_date and end_date:
            return f"desde {start_date} hasta {end_date}"
        elif start_date:
            return f"a partir del {start_date}"
        elif end_date:
            return f"hasta el {end_date}"
        else:
            return "fechas no especificadas"
    except:
        return "fechas no válidas"

def clean_html_tags(text: str) -> str:
    """Remueve tags HTML del texto"""
    if not text:
        return ""
    
    # Remover tags HTML
    text = re.sub(r'<[^>]+>', '', text)
    
    # Decodificar entidades HTML comunes
    html_entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
    }
    
    for entity, char in html_entities.items():
        text = text.replace(entity, char)
    
    return text.strip()

def is_question(text: str) -> bool:
    """Determina si el texto es una pregunta"""
    if not text:
        return False
    
    # Verificar signos de interrogación
    if '?' in text or '¿' in text:
        return True
    
    # Verificar palabras interrogativas
    question_words = [
        'qué', 'que', 'cuál', 'cual', 'cuándo', 'cuando', 'cuánto', 'cuanto',
        'cómo', 'como', 'dónde', 'donde', 'por qué', 'porque', 'para qué',
        'quién', 'quien', 'cuáles', 'cuales', 'hay', 'tiene', 'puede', 'puedo'
    ]
    
    text_lower = text.lower()
    words = text_lower.split()
    
    return any(word in question_words for word in words[:3])  # Verificar primeras 3 palabras

def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    """Extrae palabras clave del texto"""
    if not text:
        return []
    
    # Palabras comunes a ignorar
    stop_words = {
        'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te',
        'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los',
        'las', 'una', 'como', 'pero', 'sus', 'fue', 'ser', 'ha', 'si', 'más',
        'ya', 'muy', 'me', 'mi', 'tu', 'ti', 'nos', 'o', 'este', 'esta', 'eso'
    }
    
    # Normalizar y dividir en palabras
    normalized = normalize_text(text)
    words = normalized.split()
    
    # Filtrar palabras cortas y stop words
    keywords = [
        word for word in words 
        if len(word) > 2 and word not in stop_words
    ]
    
    # Contar frecuencias
    word_freq = {}
    for word in keywords:
        word_freq[word] = word_freq.get(word, 0) + 1
    
    # Ordenar por frecuencia y retornar top keywords
    sorted_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    
    return [word for word, freq in sorted_keywords[:max_keywords]] 