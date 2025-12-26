"""
Configuration module for AI Meeting Summarizer Backend.
Loads environment variables and provides centralized config access.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# File Upload Settings
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes

# Temporary Directory for processing
TEMP_DIR = Path(os.getenv("TEMP_DIR", "/tmp/ai_summarizer"))
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Allowed File Extensions
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
ALLOWED_EXTENSIONS = ALLOWED_AUDIO_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

# AI Model Settings
WHISPER_MODEL = "whisper-1"
WHISPER_LANGUAGE = "id"  # Indonesian

GROQ_MODEL = "llama-3.1-8b-instant"

# FFmpeg Settings
AUDIO_SAMPLE_RATE = 16000  # 16kHz
AUDIO_CHANNELS = 1  # Mono


def validate_config() -> dict:
    """Validate that all required configurations are set."""
    issues = []
    
    if not OPENAI_API_KEY:
        issues.append("OPENAI_API_KEY is not set")
    
    if not GROQ_API_KEY:
        issues.append("GROQ_API_KEY is not set")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues
    }
