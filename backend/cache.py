"""
Cache module for storing transcription results.
Allows retry of summarization without re-transcribing.
"""

import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from config import TEMP_DIR

# Cache directory
CACHE_DIR = TEMP_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Cache expiry (24 hours)
CACHE_EXPIRY_HOURS = 24


def generate_cache_key(filename: str, file_size: int) -> str:
    """Generate a unique cache key based on filename and size."""
    data = f"{filename}:{file_size}"
    return hashlib.md5(data.encode()).hexdigest()[:16]


def save_transcript_cache(
    cache_key: str,
    filename: str,
    duration_minutes: float,
    transcript: str
) -> str:
    """
    Save transcription result to cache.
    
    Returns:
        Cache file path
    """
    cache_data = {
        "cache_key": cache_key,
        "filename": filename,
        "duration_minutes": duration_minutes,
        "transcript": transcript,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=CACHE_EXPIRY_HOURS)).isoformat()
    }
    
    cache_file = CACHE_DIR / f"{cache_key}.json"
    
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)
    
    return str(cache_file)


def get_transcript_cache(cache_key: str) -> Optional[dict]:
    """
    Retrieve cached transcription if available and not expired.
    
    Returns:
        Dict with cached data or None if not found/expired
    """
    cache_file = CACHE_DIR / f"{cache_key}.json"
    
    if not cache_file.exists():
        return None
    
    try:
        with open(cache_file, "r", encoding="utf-8") as f:
            cache_data = json.load(f)
        
        # Check expiry
        expires_at = datetime.fromisoformat(cache_data["expires_at"])
        if datetime.now() > expires_at:
            # Cache expired, delete it
            cache_file.unlink(missing_ok=True)
            return None
        
        return cache_data
        
    except (json.JSONDecodeError, KeyError):
        # Invalid cache file
        cache_file.unlink(missing_ok=True)
        return None


def delete_transcript_cache(cache_key: str) -> bool:
    """Delete a specific cache entry."""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if cache_file.exists():
        cache_file.unlink()
        return True
    return False


def cleanup_expired_cache() -> int:
    """Remove all expired cache entries. Returns count of deleted entries."""
    deleted = 0
    
    for cache_file in CACHE_DIR.glob("*.json"):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cache_data = json.load(f)
            
            expires_at = datetime.fromisoformat(cache_data["expires_at"])
            if datetime.now() > expires_at:
                cache_file.unlink()
                deleted += 1
                
        except (json.JSONDecodeError, KeyError):
            cache_file.unlink()
            deleted += 1
    
    return deleted


def list_cached_transcripts() -> list:
    """List all valid cached transcripts."""
    cached = []
    
    for cache_file in CACHE_DIR.glob("*.json"):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cache_data = json.load(f)
            
            expires_at = datetime.fromisoformat(cache_data["expires_at"])
            if datetime.now() <= expires_at:
                cached.append({
                    "cache_key": cache_data["cache_key"],
                    "filename": cache_data["filename"],
                    "duration_minutes": cache_data["duration_minutes"],
                    "created_at": cache_data["created_at"],
                    "expires_at": cache_data["expires_at"]
                })
                
        except (json.JSONDecodeError, KeyError):
            continue
    
    return cached
