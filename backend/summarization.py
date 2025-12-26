"""
Summarization module using Groq API with Llama 3.
Handles text summarization with structured output.
"""

import json
import re
from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL


class SummarizationError(Exception):
    """Custom exception for summarization errors."""
    pass


def get_groq_client() -> Groq:
    """Get configured Groq client."""
    if not GROQ_API_KEY:
        raise SummarizationError(
            "GROQ_API_KEY tidak dikonfigurasi. "
            "Silakan tambahkan API key di file .env"
        )
    return Groq(api_key=GROQ_API_KEY)


SYSTEM_PROMPT = """Anda adalah asisten AI yang ahli dalam meringkas transkrip meeting dalam Bahasa Indonesia.

Tugas Anda adalah menganalisis transkrip meeting dan menghasilkan ringkasan terstruktur.

PENTING: Anda HARUS mengembalikan output dalam format JSON yang valid dengan struktur berikut:
{
    "ringkasan_singkat": "Ringkasan singkat dalam 2-3 kalimat tentang inti pembahasan meeting",
    "poin_penting": [
        "Poin penting pertama",
        "Poin penting kedua",
        "Dan seterusnya..."
    ],
    "action_items": [
        "Nama: Tugas yang harus dikerjakan beserta deadline jika ada",
        "Nama: Tugas lainnya"
    ]
}

Jika tidak ada action items yang jelas, berikan array kosong [].
Pastikan output adalah JSON yang valid tanpa teks tambahan sebelum atau sesudahnya."""


USER_PROMPT_TEMPLATE = """Berikut adalah transkrip meeting yang perlu diringkas:

---
{transcript}
---

Silakan buat ringkasan dalam format JSON yang diminta."""


def parse_summary_response(response_text: str) -> dict:
    """
    Parse the LLM response to extract JSON summary.
    
    Args:
        response_text: Raw response from LLM
        
    Returns:
        Parsed summary dictionary
        
    Raises:
        SummarizationError: If parsing fails
    """
    # Try to extract JSON from response
    try:
        # First, try direct JSON parsing
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON block in response
    json_patterns = [
        r'\{[\s\S]*\}',  # Match JSON object
        r'```json\s*([\s\S]*?)\s*```',  # Match JSON in code block
        r'```\s*([\s\S]*?)\s*```',  # Match any code block
    ]
    
    for pattern in json_patterns:
        matches = re.findall(pattern, response_text)
        for match in matches:
            try:
                # Clean the match
                cleaned = match.strip()
                if cleaned.startswith('{'):
                    return json.loads(cleaned)
            except json.JSONDecodeError:
                continue
    
    # If all parsing fails, create a basic structure
    return {
        "ringkasan_singkat": response_text[:500] if len(response_text) > 500 else response_text,
        "poin_penting": ["Tidak dapat mengekstrak poin penting secara otomatis"],
        "action_items": []
    }


async def summarize_transcript(transcript: str) -> dict:
    """
    Summarize transcript using Groq Llama 3 API.
    
    Args:
        transcript: The transcribed text to summarize
        
    Returns:
        Dictionary with structured summary:
        {
            "ringkasan_singkat": str,
            "poin_penting": List[str],
            "action_items": List[str]
        }
        
    Raises:
        SummarizationError: If summarization fails
    """
    if not transcript or not transcript.strip():
        raise SummarizationError("Transkrip kosong, tidak dapat membuat ringkasan")
    
    try:
        client = get_groq_client()
        
        # Truncate very long transcripts to avoid token limits
        max_chars = 30000  # Roughly 7500 tokens for Indonesian
        if len(transcript) > max_chars:
            transcript = transcript[:max_chars] + "... [teks dipotong karena terlalu panjang]"
        
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT_TEMPLATE.format(transcript=transcript)}
            ],
            temperature=0.3,  # Lower temperature for more consistent output
            max_tokens=2000
        )
        
        response_text = response.choices[0].message.content
        
        if not response_text:
            raise SummarizationError("Respons dari AI kosong")
        
        # Parse the response
        summary = parse_summary_response(response_text)
        
        # Validate structure
        if "ringkasan_singkat" not in summary:
            summary["ringkasan_singkat"] = "Ringkasan tidak tersedia"
        if "poin_penting" not in summary:
            summary["poin_penting"] = []
        if "action_items" not in summary:
            summary["action_items"] = []
        
        return summary
        
    except SummarizationError:
        raise
    except Exception as e:
        error_message = str(e)
        
        if "invalid_api_key" in error_message.lower():
            raise SummarizationError(
                "API key Groq tidak valid. Silakan periksa kembali."
            )
        elif "rate_limit" in error_message.lower():
            raise SummarizationError(
                "Rate limit Groq tercapai. Silakan coba lagi nanti."
            )
        else:
            raise SummarizationError(f"Gagal membuat ringkasan: {error_message}")
