"""
Subscription API routes for managing tiers and payments.
"""
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
import os

from subscription_service import SubscriptionService
from xendit_service import XenditService
from tier_config import TIER_LIMITS, TIER_PRICING, get_tier_limits

router = APIRouter(prefix="/api/subscription", tags=["subscription"])

subscription_service = SubscriptionService()
xendit_service = XenditService()


class UpgradeRequest(BaseModel):
    tier: str
    user_email: str


class UsageResponse(BaseModel):
    tier: str
    tier_name: str
    uploads_used: int
    uploads_limit: int
    uploads_remaining: int
    period_type: str  # "weekly" or "monthly"
    max_file_mb: int
    max_duration_minutes: int
    has_pdf_export: bool
    has_priority_queue: bool


@router.get("/tiers")
async def get_available_tiers():
    """Get all available subscription tiers with their limits and pricing."""
    tiers = []
    for tier_id, limits in TIER_LIMITS.items():
        tiers.append({
            "id": tier_id,
            "name": limits.name,
            "price": TIER_PRICING.get(tier_id, 0),
            "price_formatted": f"Rp {TIER_PRICING.get(tier_id, 0):,}".replace(",", "."),
            "uploads_per_period": limits.uploads_per_period,
            "period_days": limits.period_days,
            "max_file_mb": limits.max_file_mb,
            "max_duration_minutes": limits.max_duration_minutes,
            "has_pdf_export": limits.has_pdf_export,
            "has_priority_queue": limits.has_priority_queue,
            "history_days": limits.history_days,
        })
    return {"tiers": tiers}


@router.get("/current")
async def get_current_subscription(user_id: str):
    """Get user's current subscription and usage."""
    try:
        subscription = subscription_service.get_user_subscription(user_id)
        tier = subscription.get("tier", "free")
        limits = get_tier_limits(tier)
        usage = subscription_service.get_usage(user_id)
        
        return {
            "subscription": {
                "tier": tier,
                "tier_name": limits.name,
                "status": subscription.get("status", "active"),
                "expires_at": subscription.get("expires_at"),
            },
            "usage": {
                "uploads_used": usage.get("uploads_used", 0),
                "uploads_limit": limits.uploads_per_period,
                "uploads_remaining": limits.uploads_per_period - usage.get("uploads_used", 0),
                "period_start": usage.get("period_start"),
                "period_end": usage.get("period_end"),
            },
            "limits": {
                "max_file_mb": limits.max_file_mb,
                "max_duration_minutes": limits.max_duration_minutes,
                "has_pdf_export": limits.has_pdf_export,
                "has_priority_queue": limits.has_priority_queue,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upgrade")
async def upgrade_subscription(request: UpgradeRequest, user_id: str):
    """Create a Xendit invoice for subscription upgrade."""
    if request.tier not in ["basic", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Choose 'basic' or 'pro'.")
    
    try:
        invoice = xendit_service.create_invoice(
            user_id=user_id,
            user_email=request.user_email,
            tier=request.tier
        )
        return {
            "success": True,
            "invoice_url": invoice["invoice_url"],
            "invoice_id": invoice["invoice_id"],
            "amount": invoice["amount"],
            "expires_at": invoice["expires_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def handle_xendit_webhook(
    request: Request,
    x_callback_token: Optional[str] = Header(None)
):
    """Handle Xendit payment webhook callbacks."""
    body = await request.body()
    
    # Verify signature in production
    if os.getenv("XENDIT_WEBHOOK_TOKEN"):
        if not xendit_service.verify_webhook_signature(body, x_callback_token or ""):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    data = await request.json()
    event_type = data.get("status")
    invoice_id = data.get("id")
    external_id = data.get("external_id")
    
    try:
        if event_type == "PAID":
            result = xendit_service.handle_invoice_paid(invoice_id, external_id)
            return {"success": True, "action": "subscription_upgraded", **result}
        
        elif event_type == "EXPIRED":
            result = xendit_service.handle_invoice_expired(invoice_id)
            return {"success": True, "action": "invoice_expired"}
        
        else:
            return {"success": True, "action": "ignored", "event": event_type}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-upload")
async def check_can_upload(user_id: str, file_size_mb: float, duration_minutes: int = 0):
    """Check if user can upload a file based on their subscription limits."""
    try:
        result = subscription_service.check_can_upload(
            user_id=user_id,
            file_size_mb=file_size_mb,
            duration_minutes=duration_minutes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
