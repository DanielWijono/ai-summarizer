"""
Media processing module using FFmpeg.
Handles audio extraction from video and audio normalization.
"""

import subprocess
import uuid
from pathlib import Path
from typing import Tuple

from config import TEMP_DIR, AUDIO_SAMPLE_RATE, AUDIO_CHANNELS


class MediaProcessorError(Exception):
    """Custom exception for media processing errors."""
    pass


def check_ffmpeg_installed() -> bool:
    """Check if FFmpeg is installed and accessible."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def save_temp_file(content: bytes, extension: str) -> Path:
    """
    Save uploaded content to a temporary file.
    
    Args:
        content: File content as bytes
        extension: File extension (e.g., ".mp4")
        
    Returns:
        Path to the saved temporary file
    """
    filename = f"{uuid.uuid4()}{extension}"
    filepath = TEMP_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    return filepath


def extract_audio_from_video(video_path: Path) -> Path:
    """
    Extract audio track from video file using FFmpeg.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Path to the extracted audio file (.mp3)
        
    Raises:
        MediaProcessorError: If extraction fails
    """
    output_path = video_path.with_suffix(".extracted.mp3")
    
    cmd = [
        "ffmpeg",
        "-i", str(video_path),
        "-vn",  # No video
        "-acodec", "libmp3lame",
        "-ar", str(AUDIO_SAMPLE_RATE),
        "-ac", str(AUDIO_CHANNELS),
        "-y",  # Overwrite output
        str(output_path)
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode != 0:
            raise MediaProcessorError(f"FFmpeg error: {result.stderr}")
        
        if not output_path.exists():
            raise MediaProcessorError("Output file was not created")
        
        return output_path
        
    except subprocess.TimeoutExpired:
        raise MediaProcessorError("Media processing timed out")
    except subprocess.SubprocessError as e:
        raise MediaProcessorError(f"FFmpeg subprocess error: {str(e)}")


def normalize_audio(audio_path: Path) -> Path:
    """
    Normalize audio to MP3 format with consistent settings.
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        Path to the normalized audio file (.mp3)
        
    Raises:
        MediaProcessorError: If normalization fails
    """
    # If already normalized format, might still need conversion for sample rate
    output_path = audio_path.with_suffix(".normalized.mp3")
    
    cmd = [
        "ffmpeg",
        "-i", str(audio_path),
        "-acodec", "libmp3lame",
        "-ar", str(AUDIO_SAMPLE_RATE),
        "-ac", str(AUDIO_CHANNELS),
        "-y",
        str(output_path)
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            raise MediaProcessorError(f"FFmpeg normalization error: {result.stderr}")
        
        if not output_path.exists():
            raise MediaProcessorError("Normalized output file was not created")
        
        return output_path
        
    except subprocess.TimeoutExpired:
        raise MediaProcessorError("Audio normalization timed out")
    except subprocess.SubprocessError as e:
        raise MediaProcessorError(f"FFmpeg subprocess error: {str(e)}")


def get_audio_duration(audio_path: Path) -> float:
    """
    Get duration of audio file in seconds using FFprobe.
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        Duration in seconds
    """
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(audio_path)
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
        return 0.0
        
    except (subprocess.SubprocessError, ValueError):
        return 0.0


async def process_media(content: bytes, extension: str, is_video: bool) -> Tuple[Path, float]:
    """
    Process uploaded media file: save, extract audio if video, normalize.
    
    Args:
        content: File content as bytes
        extension: File extension
        is_video: Whether the file is a video
        
    Returns:
        Tuple of (path to processed audio file, duration in minutes)
        
    Raises:
        MediaProcessorError: If processing fails
    """
    # Check FFmpeg is available
    if not check_ffmpeg_installed():
        raise MediaProcessorError(
            "FFmpeg tidak terinstall. Pastikan FFmpeg sudah terinstall di sistem."
        )
    
    # Save to temp file
    temp_file = save_temp_file(content, extension)
    
    try:
        if is_video:
            # Extract audio from video
            audio_file = extract_audio_from_video(temp_file)
            # Clean up original video file
            temp_file.unlink(missing_ok=True)
        else:
            audio_file = temp_file
        
        # Normalize audio
        normalized_file = normalize_audio(audio_file)
        
        # Clean up intermediate audio file if different
        if audio_file != temp_file:
            audio_file.unlink(missing_ok=True)
        elif audio_file.exists() and normalized_file.exists():
            audio_file.unlink(missing_ok=True)
        
        # Get duration
        duration_seconds = get_audio_duration(normalized_file)
        duration_minutes = round(duration_seconds / 60, 1)
        
        return normalized_file, duration_minutes
        
    except Exception as e:
        # Clean up on error
        temp_file.unlink(missing_ok=True)
        raise MediaProcessorError(f"Gagal memproses media: {str(e)}")
