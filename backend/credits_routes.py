"""
Credits API routes for purchasing and managing credits.
"""
import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import uuid
import shutil

from credits_service import CreditsService
from credits_config import (
    get_all_packages, 
    get_package, 
    BANK_INFO, 
    format_price,
    DURATION_TIERS
)

router = APIRouter(prefix="/api/credits", tags=["credits"])

credits_service = CreditsService()

# Directory for storing proof images
PROOF_UPLOAD_DIR = os.getenv("PROOF_UPLOAD_DIR", "/tmp/proofs")
os.makedirs(PROOF_UPLOAD_DIR, exist_ok=True)


@router.get("/proofs/{filename}")
async def get_proof_image(filename: str, admin_key: str):
    """Serve proof image (admin only)."""
    if admin_key != os.getenv("ADMIN_KEY", "admin123"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    file_path = os.path.join(PROOF_UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path)


class PurchaseRequest(BaseModel):
    package_id: str


@router.get("/packages")
async def get_credit_packages():
    """Get all available credit packages."""
    packages = get_all_packages()
    return {
        "packages": [
            {
                "id": p.id,
                "name": p.name,
                "credits": p.credits,
                "price": p.price,
                "price_formatted": format_price(p.price),
                "price_per_credit": p.price_per_credit,
                "retention_period": p.retention_period,
                "is_popular": p.is_popular
            }
            for p in packages
        ],
        "bank_info": BANK_INFO,
        "duration_tiers": [
            {
                "max_minutes": t.max_minutes,
                "credits_required": t.credits_required,
                "max_file_mb": t.max_file_mb
            }
            for t in DURATION_TIERS
        ]
    }


@router.get("/balance")
async def get_credit_balance(user_id: str):
    """Get user's credit balance."""
    try:
        credits = credits_service.get_user_credits(user_id)
        total = credits.get("balance", 0) + credits.get("free_credits", 0)
        
        return {
            "paid_credits": credits.get("balance", 0),
            "free_credits": credits.get("free_credits", 0),
            "total_credits": total,
            "total_purchased": credits.get("total_purchased", 0),
            "total_used": credits.get("total_used", 0),
            "free_credits_reset_at": credits.get("free_credits_reset_at"),
            "max_duration": credits.get("max_duration", 20)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-upload")
async def check_can_upload(user_id: str, file_size_mb: float, estimated_duration: int = 20):
    """Check if user can upload based on credits."""
    try:
        result = credits_service.check_can_upload(user_id, file_size_mb, estimated_duration)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/purchase")
async def create_purchase(
    user_id: str = Form(...),
    package_id: str = Form(...),
    proof: UploadFile = File(...)
):
    """Create a credit purchase with proof upload."""
    # Validate package
    package = get_package(package_id)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package ID")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if proof.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images allowed")
    
    # Save proof file
    file_ext = proof.filename.split(".")[-1]
    proof_filename = f"{uuid.uuid4()}.{file_ext}"
    proof_path = os.path.join(PROOF_UPLOAD_DIR, proof_filename)
    
    try:
        with open(proof_path, "wb") as f:
            shutil.copyfileobj(proof.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create purchase record
    try:
        purchase = credits_service.create_purchase(
            user_id=user_id,
            package_id=package_id,
            proof_url=f"/proofs/{proof_filename}",
            proof_filename=proof_filename
        )
        
        return {
            "success": True,
            "purchase_id": purchase["id"],
            "status": "pending",
            "message": "Bukti transfer berhasil diupload. Mohon tunggu verifikasi admin (1x24 jam)."
        }
    except Exception as e:
        # Clean up uploaded file on error
        os.remove(proof_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchases")
async def get_user_purchases(user_id: str):
    """Get user's purchase history."""
    try:
        purchases = credits_service.get_user_purchases(user_id)
        return {"purchases": purchases}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recordings")
async def get_user_recordings(user_id: str, limit: int = 50):
    """Get user's recording history."""
    try:
        recordings = credits_service.get_user_recordings(user_id, limit)
        return {"recordings": recordings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ADMIN ENDPOINTS
# ============================================

@router.get("/admin/pending")
async def get_pending_purchases(admin_key: str):
    """Get all pending purchases (admin only)."""
    # Simple admin auth via key
    if admin_key != os.getenv("ADMIN_KEY", "admin123"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    try:
        purchases = credits_service.get_pending_purchases()
        return {"purchases": purchases}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/history")
async def get_verification_history(admin_key: str, limit: int = 50):
    """Get verification history (admin only)."""
    if admin_key != os.getenv("ADMIN_KEY", "admin123"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    try:
        purchases = credits_service.get_verified_purchases(limit)
        return {"purchases": purchases}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/approve/{purchase_id}")
async def approve_purchase(purchase_id: str, admin_key: str, notes: str = None):
    """Approve a purchase (admin only)."""
    if admin_key != os.getenv("ADMIN_KEY", "admin123"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    try:
        result = credits_service.approve_purchase(purchase_id, notes)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/reject/{purchase_id}")
async def reject_purchase(purchase_id: str, admin_key: str, notes: str = None):
    """Reject a purchase (admin only)."""
    if admin_key != os.getenv("ADMIN_KEY", "admin123"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    try:
        result = credits_service.reject_purchase(purchase_id, notes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
