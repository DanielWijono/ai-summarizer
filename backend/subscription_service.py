"""
Subscription service for managing user tiers and usage.
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from supabase import create_client, Client
from tier_config import get_tier_limits, TierLimits

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_supabase_client() -> Client:
    """Get Supabase client with service role key."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class SubscriptionService:
    """Service for managing subscriptions and usage."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def get_user_subscription(self, user_id: str) -> Dict[str, Any]:
        """Get user's current subscription."""
        result = self.supabase.table("subscriptions").select("*").eq("user_id", user_id).single().execute()
        
        if result.data:
            return result.data
        
        # Create default free subscription if not exists
        new_sub = {
            "user_id": user_id,
            "tier": "free",
            "status": "active"
        }
        self.supabase.table("subscriptions").insert(new_sub).execute()
        return new_sub
    
    def get_user_tier(self, user_id: str) -> str:
        """Get user's current tier."""
        sub = self.get_user_subscription(user_id)
        
        # Check if subscription is expired
        if sub.get("expires_at"):
            expires = datetime.fromisoformat(sub["expires_at"].replace("Z", "+00:00"))
            if expires < datetime.now(expires.tzinfo):
                # Subscription expired, downgrade to free
                self.supabase.table("subscriptions").update({
                    "tier": "free",
                    "status": "expired"
                }).eq("user_id", user_id).execute()
                return "free"
        
        return sub.get("tier", "free")
    
    def get_tier_limits(self, user_id: str) -> TierLimits:
        """Get limits for user's current tier."""
        tier = self.get_user_tier(user_id)
        return get_tier_limits(tier)
    
    def get_current_period(self, tier: str) -> tuple[datetime, datetime]:
        """Get current billing period start and end dates."""
        limits = get_tier_limits(tier)
        now = datetime.now()
        
        if limits.period_days == 7:
            # Weekly period: Start on Monday
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        else:
            # Monthly period: Start on 1st of month
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end = start.replace(year=now.year + 1, month=1)
            else:
                end = start.replace(month=now.month + 1)
        
        return start, end
    
    def get_usage(self, user_id: str) -> Dict[str, Any]:
        """Get user's current usage for the period."""
        tier = self.get_user_tier(user_id)
        period_start, period_end = self.get_current_period(tier)
        
        result = self.supabase.table("usage_tracking").select("*").eq(
            "user_id", user_id
        ).eq(
            "period_start", period_start.date().isoformat()
        ).single().execute()
        
        if result.data:
            return result.data
        
        # Create new usage record
        new_usage = {
            "user_id": user_id,
            "period_start": period_start.date().isoformat(),
            "period_end": period_end.date().isoformat(),
            "uploads_used": 0,
            "total_minutes_used": 0
        }
        self.supabase.table("usage_tracking").insert(new_usage).execute()
        return new_usage
    
    def check_can_upload(self, user_id: str, file_size_mb: float, duration_minutes: int) -> Dict[str, Any]:
        """
        Check if user can upload a file.
        Returns: {"allowed": bool, "reason": str, "upgrade_required": bool}
        """
        tier = self.get_user_tier(user_id)
        limits = get_tier_limits(tier)
        usage = self.get_usage(user_id)
        
        # Check upload count
        if usage["uploads_used"] >= limits.uploads_per_period:
            return {
                "allowed": False,
                "reason": f"Anda telah mencapai batas {limits.uploads_per_period} upload untuk periode ini.",
                "upgrade_required": True,
                "current_usage": usage["uploads_used"],
                "limit": limits.uploads_per_period
            }
        
        # Check file size
        if file_size_mb > limits.max_file_mb:
            return {
                "allowed": False,
                "reason": f"File terlalu besar. Maksimal {limits.max_file_mb}MB untuk tier {limits.name}.",
                "upgrade_required": True,
                "max_allowed": limits.max_file_mb
            }
        
        # Check duration
        if duration_minutes > limits.max_duration_minutes:
            return {
                "allowed": False,
                "reason": f"Durasi terlalu panjang. Maksimal {limits.max_duration_minutes} menit untuk tier {limits.name}.",
                "upgrade_required": True,
                "max_allowed": limits.max_duration_minutes
            }
        
        return {
            "allowed": True,
            "reason": "OK",
            "upgrade_required": False,
            "remaining_uploads": limits.uploads_per_period - usage["uploads_used"]
        }
    
    def increment_usage(self, user_id: str, duration_minutes: int = 0) -> None:
        """Increment usage after successful upload."""
        tier = self.get_user_tier(user_id)
        period_start, _ = self.get_current_period(tier)
        
        # Get or create usage record
        self.get_usage(user_id)
        
        # Increment
        self.supabase.rpc("increment_usage", {
            "p_user_id": user_id,
            "p_period_start": period_start.date().isoformat(),
            "p_duration": duration_minutes
        }).execute()
    
    def save_recording(self, user_id: str, filename: str, duration_minutes: int, 
                       file_size_mb: float, transcript: str, summary: Dict) -> str:
        """Save recording to history."""
        tier = self.get_user_tier(user_id)
        limits = get_tier_limits(tier)
        
        # Calculate expiry date
        expires_at = None
        if limits.history_days > 0:
            expires_at = (datetime.now() + timedelta(days=limits.history_days)).isoformat()
        
        result = self.supabase.table("recordings").insert({
            "user_id": user_id,
            "filename": filename,
            "duration_minutes": duration_minutes,
            "file_size_mb": file_size_mb,
            "transcript": transcript,
            "summary": summary,
            "expires_at": expires_at
        }).execute()
        
        return result.data[0]["id"]
    
    def upgrade_subscription(self, user_id: str, tier: str) -> None:
        """Upgrade user's subscription tier."""
        expires_at = (datetime.now() + timedelta(days=30)).isoformat()
        
        self.supabase.table("subscriptions").update({
            "tier": tier,
            "status": "active",
            "started_at": datetime.now().isoformat(),
            "expires_at": expires_at,
            "updated_at": datetime.now().isoformat()
        }).eq("user_id", user_id).execute()
        
        # Update history expiry for upgraded recordings
        if tier == "pro":
            # Pro tier: Remove expiry from all recordings
            self.supabase.table("recordings").update({
                "expires_at": None
            }).eq("user_id", user_id).execute()
