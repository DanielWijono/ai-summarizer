"""
Cleanup module for temporary files.
Handles automatic deletion of processed files.
"""

from pathlib import Path
from typing import List
import logging

logger = logging.getLogger(__name__)


def cleanup_file(filepath: Path) -> bool:
    """
    Delete a single file safely.
    
    Args:
        filepath: Path to the file to delete
        
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        if filepath.exists():
            filepath.unlink()
            logger.info(f"Cleaned up file: {filepath}")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to cleanup file {filepath}: {e}")
        return False


def cleanup_files(filepaths: List[Path]) -> dict:
    """
    Delete multiple files safely.
    
    Args:
        filepaths: List of file paths to delete
        
    Returns:
        Dict with cleanup results
    """
    results = {
        "total": len(filepaths),
        "deleted": 0,
        "failed": 0,
        "not_found": 0
    }
    
    for filepath in filepaths:
        try:
            if filepath.exists():
                filepath.unlink()
                results["deleted"] += 1
            else:
                results["not_found"] += 1
        except Exception as e:
            logger.error(f"Failed to cleanup {filepath}: {e}")
            results["failed"] += 1
    
    return results


def cleanup_temp_directory(temp_dir: Path, max_age_hours: int = 24) -> dict:
    """
    Clean up old files in temporary directory.
    
    Args:
        temp_dir: Path to temporary directory
        max_age_hours: Maximum age of files to keep (in hours)
        
    Returns:
        Dict with cleanup results
    """
    import time
    
    results = {
        "deleted": 0,
        "kept": 0,
        "errors": 0
    }
    
    if not temp_dir.exists():
        return results
    
    current_time = time.time()
    max_age_seconds = max_age_hours * 3600
    
    for filepath in temp_dir.iterdir():
        if filepath.is_file():
            try:
                file_age = current_time - filepath.stat().st_mtime
                if file_age > max_age_seconds:
                    filepath.unlink()
                    results["deleted"] += 1
                else:
                    results["kept"] += 1
            except Exception as e:
                logger.error(f"Error processing {filepath}: {e}")
                results["errors"] += 1
    
    return results
