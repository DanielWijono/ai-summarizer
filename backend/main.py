"""
AI Meeting Notes & Summarizer - Backend API
FastAPI application for processing audio/video files into transcripts and summaries.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from config import validate_config, TEMP_DIR
from validators import validate_file, is_video_file
from media_processor import process_media, MediaProcessorError
from transcription import transcribe_audio, TranscriptionError
from summarization import summarize_transcript, SummarizationError
from cleanup import cleanup_file
from cache import (
    generate_cache_key, 
    save_transcript_cache, 
    get_transcript_cache,
    delete_transcript_cache,
    list_cached_transcripts
)
from credits_service import CreditsService

# Initialize credits service
credits_service = CreditsService()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Pydantic models for response
class SummaryResponse(BaseModel):
    ringkasan_singkat: str
    poin_penting: List[str]
    action_items: List[str]


class ProcessingResponse(BaseModel):
    status: str
    original_filename: str
    duration_minutes: float
    transcript: str
    summary: SummaryResponse
    cache_key: Optional[str] = None


class PartialResponse(BaseModel):
    """Response when transcription succeeds but summarization fails."""
    status: str
    stage: str
    original_filename: str
    duration_minutes: float
    transcript: str
    cache_key: str
    error: str
    message: str


class CachedTranscript(BaseModel):
    cache_key: str
    filename: str
    duration_minutes: float
    created_at: str
    expires_at: str


class ErrorResponse(BaseModel):
    status: str
    error: str
    detail: Optional[str] = None
    cache_key: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    config_valid: bool
    config_issues: List[str]
    ffmpeg_installed: bool


class RetrySummarizationRequest(BaseModel):
    cache_key: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting AI Meeting Summarizer API...")
    logger.info(f"Temporary directory: {TEMP_DIR}")
    
    config_status = validate_config()
    if not config_status["valid"]:
        logger.warning(f"Configuration issues: {config_status['issues']}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Meeting Summarizer API...")


# Create FastAPI app
app = FastAPI(
    title="AI Meeting Notes & Summarizer",
    description="API untuk mengubah file Audio/Video meeting menjadi transkrip dan ringkasan terstruktur",
    version="1.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include credits routes
from credits_routes import router as credits_router
app.include_router(credits_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API info."""
    return {
        "name": "AI Meeting Notes & Summarizer API",
        "version": "1.1.0",
        "description": "Upload audio/video files to get transcripts and summaries",
        "endpoints": {
            "health": "/health",
            "process": "/api/process",
            "retry_summary": "/api/retry-summary",
            "cached_transcripts": "/api/cached-transcripts"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint with configuration status."""
    from media_processor import check_ffmpeg_installed
    
    config_status = validate_config()
    ffmpeg_ok = check_ffmpeg_installed()
    
    return HealthResponse(
        status="healthy" if config_status["valid"] and ffmpeg_ok else "degraded",
        config_valid=config_status["valid"],
        config_issues=config_status["issues"],
        ffmpeg_installed=ffmpeg_ok
    )


@app.get("/api/cached-transcripts", response_model=List[CachedTranscript], tags=["Cache"])
async def get_cached_transcripts():
    """List all cached transcripts available for retry."""
    cached = list_cached_transcripts()
    return [CachedTranscript(**item) for item in cached]


@app.post(
    "/api/retry-summary",
    response_model=ProcessingResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Cache not found"},
        502: {"model": ErrorResponse, "description": "AI service error"}
    },
    tags=["Processing"]
)
async def retry_summarization(request: RetrySummarizationRequest):
    """
    Retry summarization using cached transcript.
    
    Use this when transcription succeeded but summarization failed.
    """
    # Get cached transcript
    cache_data = get_transcript_cache(request.cache_key)
    
    if not cache_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cache tidak ditemukan atau sudah expired. Silakan upload ulang file."
        )
    
    try:
        logger.info(f"Retrying summarization for cached transcript: {cache_data['filename']}")
        
        # Summarize transcript
        summary = await summarize_transcript(cache_data["transcript"])
        logger.info("Summary generated successfully from cache")
        
        # Delete cache after successful summarization
        delete_transcript_cache(request.cache_key)
        
        return ProcessingResponse(
            status="success",
            original_filename=cache_data["filename"],
            duration_minutes=cache_data["duration_minutes"],
            transcript=cache_data["transcript"],
            summary=SummaryResponse(**summary),
            cache_key=None
        )
        
    except SummarizationError as e:
        logger.error(f"Retry summarization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )


@app.post(
    "/api/process",
    responses={
        200: {"model": ProcessingResponse, "description": "Full success"},
        206: {"model": PartialResponse, "description": "Partial success - transcription done, summarization failed"},
        413: {"model": ErrorResponse, "description": "File too large"},
        415: {"model": ErrorResponse, "description": "Unsupported media type"},
        500: {"model": ErrorResponse, "description": "Processing error"},
        502: {"model": ErrorResponse, "description": "AI service error"}
    },
    tags=["Processing"]
)
async def process_meeting_file(file: UploadFile = File(...), user_id: Optional[str] = None):
    """
    Process uploaded audio/video file.
    
    - Accepts: .mp3, .wav, .m4a, .ogg (audio), .mp4, .mov, .mkv, .avi, .webm (video)
    - Max size: 50MB
    - Returns: Transcript and structured summary in Indonesian
    - If summarization fails, returns partial result with cache_key for retry
    - If user_id is provided, saves recording to user's history
    """
    audio_path = None
    cache_key = None
    
    try:
        # Step 1: Validate file
        logger.info(f"Processing file: {file.filename}")
        file_info = await validate_file(file)
        logger.info(f"File validated: {file_info['size_mb']}MB, type: {file_info['file_type']}")
        
        # Generate cache key
        cache_key = generate_cache_key(file_info["filename"], file_info["size_bytes"])
        
        # Step 2: Process media (extract audio if video, normalize)
        logger.info("Processing media...")
        is_video = is_video_file(file_info["filename"])
        audio_path, duration_minutes = await process_media(
            content=file_info["content"],
            extension=file_info["extension"],
            is_video=is_video
        )
        logger.info(f"Media processed: {duration_minutes} minutes")
        
        # Step 3: Transcribe audio
        logger.info("Transcribing audio...")
        transcript = await transcribe_audio(audio_path)
        logger.info(f"Transcription complete: {len(transcript)} characters")
        
        # Save transcript to cache immediately after successful transcription
        save_transcript_cache(
            cache_key=cache_key,
            filename=file_info["filename"],
            duration_minutes=duration_minutes,
            transcript=transcript
        )
        logger.info(f"Transcript cached with key: {cache_key}")
        
        # Cleanup audio file after caching
        if audio_path:
            cleanup_file(audio_path)
            audio_path = None
        
        # Step 4: Summarize transcript
        try:
            logger.info("Generating summary...")
            summary = await summarize_transcript(transcript)
            logger.info("Summary generated successfully")
            
            # Delete cache on full success
            delete_transcript_cache(cache_key)
            
            # Save recording to user's history if user_id provided
            if user_id:
                try:
                    credits_service.save_recording(
                        user_id=user_id,
                        filename=file_info["filename"],
                        duration_minutes=int(duration_minutes),
                        file_size_mb=file_info["size_bytes"] / (1024 * 1024),
                        credits_used=1,
                        transcript=transcript,
                        summary=summary
                    )
                    logger.info(f"Recording saved for user: {user_id}")
                except Exception as save_err:
                    logger.warning(f"Failed to save recording to history: {save_err}")
            
            # Return full success response
            return ProcessingResponse(
                status="success",
                original_filename=file_info["filename"],
                duration_minutes=duration_minutes,
                transcript=transcript,
                summary=SummaryResponse(**summary),
                cache_key=None
            )
            
        except SummarizationError as e:
            # Summarization failed but transcription succeeded
            # Return partial success with cache key for retry
            logger.warning(f"Summarization failed, but transcript is cached: {e}")
            
            return JSONResponse(
                status_code=status.HTTP_206_PARTIAL_CONTENT,
                content={
                    "status": "partial",
                    "stage": "summarization_failed",
                    "original_filename": file_info["filename"],
                    "duration_minutes": duration_minutes,
                    "transcript": transcript,
                    "cache_key": cache_key,
                    "error": str(e),
                    "message": "Transkripsi berhasil! Gunakan cache_key untuk retry summarization tanpa biaya transkripsi."
                }
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions (from validation)
        raise
        
    except MediaProcessorError as e:
        logger.error(f"Media processing error: {e}")
        if audio_path:
            cleanup_file(audio_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
        
    except TranscriptionError as e:
        logger.error(f"Transcription error: {e}")
        if audio_path:
            cleanup_file(audio_path)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        if audio_path:
            cleanup_file(audio_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan: {str(e)}"
        )


@app.delete("/api/cache/{cache_key}", tags=["Cache"])
async def delete_cache(cache_key: str):
    """Delete a specific cache entry."""
    deleted = delete_transcript_cache(cache_key)
    if deleted:
        return {"status": "success", "message": "Cache deleted"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cache not found"
        )


# Custom exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler for consistent error format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": exc.detail
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
