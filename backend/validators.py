"""
File validation module for AI Meeting Summarizer.
Handles file size and format validation.
"""

from pathlib import Path
from fastapi import HTTPException, UploadFile, status

from config import (
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB,
    ALLOWED_EXTENSIONS,
    ALLOWED_AUDIO_EXTENSIONS,
    ALLOWED_VIDEO_EXTENSIONS,
)


def get_file_extension(filename: str) -> str:
    """Extract lowercase file extension from filename."""
    return Path(filename).suffix.lower()


def is_audio_file(filename: str) -> bool:
    """Check if file is an audio file based on extension."""
    return get_file_extension(filename) in ALLOWED_AUDIO_EXTENSIONS


def is_video_file(filename: str) -> bool:
    """Check if file is a video file based on extension."""
    return get_file_extension(filename) in ALLOWED_VIDEO_EXTENSIONS


async def validate_file(file: UploadFile) -> dict:
    """
    Validate uploaded file for size and format.
    
    Args:
        file: The uploaded file from FastAPI
        
    Returns:
        dict with file info if valid
        
    Raises:
        HTTPException: If file is invalid (413 for size, 415 for format)
    """
    # Check filename exists
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama file tidak valid"
        )
    
    # Check file extension
    extension = get_file_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        allowed_list = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Format file tidak didukung. Format yang didukung: {allowed_list}"
        )
    
    # Check file size by reading content
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File terlalu besar. Maksimal {MAX_FILE_SIZE_MB}MB, file Anda: {file_size / (1024*1024):.1f}MB"
        )
    
    # Reset file position for later reading
    await file.seek(0)
    
    # Determine file type
    file_type = "audio" if is_audio_file(file.filename) else "video"
    
    return {
        "filename": file.filename,
        "extension": extension,
        "size_bytes": file_size,
        "size_mb": round(file_size / (1024 * 1024), 2),
        "file_type": file_type,
        "content": content
    }
