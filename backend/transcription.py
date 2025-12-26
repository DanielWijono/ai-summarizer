"""
Transcription module using OpenAI Whisper API.
Handles speech-to-text conversion for audio files.
"""

from pathlib import Path
from openai import OpenAI

from config import OPENAI_API_KEY, WHISPER_MODEL, WHISPER_LANGUAGE


class TranscriptionError(Exception):
    """Custom exception for transcription errors."""
    pass


def get_openai_client() -> OpenAI:
    """Get configured OpenAI client."""
    if not OPENAI_API_KEY:
        raise TranscriptionError(
            "OPENAI_API_KEY tidak dikonfigurasi. "
            "Silakan tambahkan API key di file .env"
        )
    return OpenAI(api_key=OPENAI_API_KEY)


async def transcribe_audio(audio_path: Path) -> str:
    """
    Transcribe audio file to text using OpenAI Whisper API.
    
    Args:
        audio_path: Path to the audio file (MP3 format recommended)
        
    Returns:
        Transcribed text as string
        
    Raises:
        TranscriptionError: If transcription fails
    """
    if not audio_path.exists():
        raise TranscriptionError(f"Audio file not found: {audio_path}")
    
    try:
        client = get_openai_client()
        
        with open(audio_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model=WHISPER_MODEL,
                file=audio_file,
                language=WHISPER_LANGUAGE,
                response_format="text"
            )
        
        # Response is directly the text when response_format="text"
        transcript = response if isinstance(response, str) else response.text
        
        if not transcript or not transcript.strip():
            raise TranscriptionError(
                "Transkripsi kosong. Pastikan file audio memiliki suara yang jelas."
            )
        
        return transcript.strip()
        
    except TranscriptionError:
        raise
    except Exception as e:
        error_message = str(e)
        
        # Handle specific OpenAI errors
        if "invalid_api_key" in error_message.lower():
            raise TranscriptionError(
                "API key OpenAI tidak valid. Silakan periksa kembali."
            )
        elif "rate_limit" in error_message.lower():
            raise TranscriptionError(
                "Rate limit OpenAI tercapai. Silakan coba lagi nanti."
            )
        elif "insufficient_quota" in error_message.lower():
            raise TranscriptionError(
                "Kuota OpenAI habis. Silakan periksa billing account Anda."
            )
        else:
            raise TranscriptionError(f"Gagal melakukan transkripsi: {error_message}")
