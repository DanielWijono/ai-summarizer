"""
Credits service for managing user credits and purchases.
"""
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from supabase import create_client, Client
from credits_config import (
    get_credits_required, 
    get_package, 
    get_all_packages,
    CREDIT_PACKAGES,
    FREE_TIER
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def get_supabase_client() -> Client:
    """Get Supabase client with service role key."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class CreditsService:
    """Service for managing user credits."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def get_user_max_duration(self, user_id: str) -> int:
        """Get max recording duration based on highest package purchased."""
        # Get all approved purchases
        result = self.supabase.table("credit_purchases").select("package_id").eq(
            "user_id", user_id
        ).eq("status", "approved").execute()
        
        purchases = result.data or []
        package_ids = [p["package_id"] for p in purchases]
        
        # Check hierarchy: Pro > Value > Starter/Free
        if "pro" in package_ids:
            return 90
        if "value" in package_ids:
            return 45
            
        # Default (Starter or Free)
        return 20

    def get_user_credits(self, user_id: str) -> Dict[str, Any]:
        """Get user's credit balance and info."""
        result = self.supabase.table("user_credits").select("*").eq("user_id", user_id).single().execute()
        
        max_duration = self.get_user_max_duration(user_id)
        
        if result.data:
            # Check if free credits need reset
            self._reset_free_credits_if_needed(user_id, result.data)
            # Refresh data after potential reset
            result = self.supabase.table("user_credits").select("*").eq("user_id", user_id).single().execute()
            data = result.data
            data["max_duration"] = max_duration
            return data
        
        # Create default credits record
        new_credits = {
            "user_id": user_id,
            "balance": 0,
            "free_credits": FREE_TIER["credits_per_week"],
            "free_credits_reset_at": datetime.now().isoformat(),
            "total_purchased": 0,
            "total_used": 0
        }
        self.supabase.table("user_credits").insert(new_credits).execute()
        new_credits["max_duration"] = max_duration
        return new_credits
    
    def _reset_free_credits_if_needed(self, user_id: str, credits: Dict) -> None:
        """Reset free credits if a week has passed."""
        if not credits.get("free_credits_reset_at"):
            return
        
        reset_at = datetime.fromisoformat(credits["free_credits_reset_at"].replace("Z", "+00:00"))
        now = datetime.now(reset_at.tzinfo) if reset_at.tzinfo else datetime.now()
        
        if (now - reset_at).days >= 7:
            self.supabase.table("user_credits").update({
                "free_credits": FREE_TIER["credits_per_week"],
                "free_credits_reset_at": now.isoformat(),
                "updated_at": now.isoformat()
            }).eq("user_id", user_id).execute()
    
    def get_total_available_credits(self, user_id: str) -> int:
        """Get total available credits (paid + free)."""
        credits = self.get_user_credits(user_id)
        return credits.get("balance", 0) + credits.get("free_credits", 0)
    
    def check_can_upload(self, user_id: str, file_size_mb: float, estimated_duration: int = 20) -> Dict[str, Any]:
        """Check if user can upload based on credits and limits."""
        credits = self.get_user_credits(user_id)
        total_credits = credits.get("balance", 0) + credits.get("free_credits", 0)
        credits_needed = get_credits_required(estimated_duration)
        
        if total_credits < credits_needed:
            return {
                "allowed": False,
                "reason": f"Credit tidak cukup. Butuh {credits_needed} credit, Anda punya {total_credits}.",
                "credits_needed": credits_needed,
                "credits_available": total_credits,
                "buy_credits": True
            }
        
        # Check file size limit (use highest tier for now, actual check after transcription)
        max_file = 500  # Max allowed
        if file_size_mb > max_file:
            return {
                "allowed": False,
                "reason": f"File terlalu besar. Maksimal {max_file}MB.",
                "buy_credits": False
            }
        
        return {
            "allowed": True,
            "credits_needed": credits_needed,
            "credits_available": total_credits,
            "buy_credits": False
        }
    
    def use_credits(self, user_id: str, duration_minutes: int, filename: str, recording_id: str = None) -> Dict[str, Any]:
        """Deduct credits after successful upload."""
        credits = self.get_user_credits(user_id)
        credits_needed = get_credits_required(duration_minutes)
        
        free_credits = credits.get("free_credits", 0)
        paid_balance = credits.get("balance", 0)
        
        # Use free credits first, then paid
        free_used = min(free_credits, credits_needed)
        paid_used = credits_needed - free_used
        
        # Update credits
        new_free = free_credits - free_used
        new_balance = paid_balance - paid_used
        
        self.supabase.table("user_credits").update({
            "free_credits": new_free,
            "balance": new_balance,
            "total_used": credits.get("total_used", 0) + credits_needed,
            "updated_at": datetime.now().isoformat()
        }).eq("user_id", user_id).execute()
        
        # Log usage
        self.supabase.table("credit_usage").insert({
            "user_id": user_id,
            "credits_used": credits_needed,
            "credit_type": "free" if free_used > 0 else "paid",
            "duration_minutes": duration_minutes,
            "filename": filename,
            "recording_id": recording_id
        }).execute()
        
        return {
            "credits_used": credits_needed,
            "free_used": free_used,
            "paid_used": paid_used,
            "remaining_free": new_free,
            "remaining_paid": new_balance
        }
    
    def create_purchase(self, user_id: str, package_id: str, proof_url: str = None, proof_filename: str = None) -> Dict[str, Any]:
        """Create a credit purchase request."""
        package = get_package(package_id)
        if not package:
            raise ValueError(f"Invalid package: {package_id}")
        
        result = self.supabase.table("credit_purchases").insert({
            "user_id": user_id,
            "package_id": package_id,
            "credits": package.credits,
            "amount": package.price,
            "status": "pending",
            "proof_url": proof_url,
            "proof_filename": proof_filename
        }).execute()
        
        return result.data[0]
    
    def get_user_purchases(self, user_id: str) -> List[Dict]:
        """Get user's purchase history."""
        result = self.supabase.table("credit_purchases").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).execute()
        return result.data or []
    
    def get_pending_purchases(self) -> List[Dict]:
        """Get all pending purchases for admin review."""
        result = self.supabase.table("credit_purchases").select("*").eq(
            "status", "pending"
        ).order("created_at").execute()
        purchases = result.data or []
        return self._enrich_purchases_with_user_info(purchases)
    
    def get_verified_purchases(self, limit: int = 50) -> List[Dict]:
        """Get verified (approved/rejected) purchases history."""
        result = self.supabase.table("credit_purchases").select("*").neq(
            "status", "pending"
        ).order("verified_at", desc=True).limit(limit).execute()
        purchases = result.data or []
        return self._enrich_purchases_with_user_info(purchases)
    
    def _enrich_purchases_with_user_info(self, purchases: List[Dict]) -> List[Dict]:
        """Add user email info to purchases."""
        if not purchases:
            return purchases
        
        # Get unique user IDs
        user_ids = list(set(p["user_id"] for p in purchases))
        
        # Lookup users from auth.users via admin API
        user_map = {}
        for user_id in user_ids:
            try:
                user = self.supabase.auth.admin.get_user_by_id(user_id)
                if user and user.user:
                    user_map[user_id] = {
                        "email": user.user.email,
                        "name": user.user.user_metadata.get("full_name") or user.user.user_metadata.get("name") or user.user.email.split("@")[0]
                    }
            except Exception:
                user_map[user_id] = {"email": "Unknown", "name": "Unknown"}
        
        # Enrich purchases
        for purchase in purchases:
            user_info = user_map.get(purchase["user_id"], {"email": "Unknown", "name": "Unknown"})
            purchase["user_email"] = user_info["email"]
            purchase["user_name"] = user_info["name"]
        
        return purchases
    
    def approve_purchase(self, purchase_id: str, admin_notes: str = None) -> Dict[str, Any]:
        """Approve a purchase and add credits to user."""
        # Get purchase
        purchase = self.supabase.table("credit_purchases").select("*").eq(
            "id", purchase_id
        ).single().execute()
        
        if not purchase.data:
            raise ValueError("Purchase not found")
        
        if purchase.data["status"] != "pending":
            raise ValueError("Purchase already processed")
        
        user_id = purchase.data["user_id"]
        credits_to_add = purchase.data["credits"]
        
        # Update purchase status
        self.supabase.table("credit_purchases").update({
            "status": "approved",
            "admin_notes": admin_notes,
            "verified_at": datetime.now().isoformat()
        }).eq("id", purchase_id).execute()
        
        # Add credits to user
        user_credits = self.get_user_credits(user_id)
        new_balance = user_credits.get("balance", 0) + credits_to_add
        new_total = user_credits.get("total_purchased", 0) + credits_to_add
        
        self.supabase.table("user_credits").update({
            "balance": new_balance,
            "total_purchased": new_total,
            "updated_at": datetime.now().isoformat()
        }).eq("user_id", user_id).execute()
        
        return {
            "success": True,
            "credits_added": credits_to_add,
            "new_balance": new_balance
        }
    
    def reject_purchase(self, purchase_id: str, admin_notes: str = None) -> Dict[str, Any]:
        """Reject a purchase."""
        self.supabase.table("credit_purchases").update({
            "status": "rejected",
            "admin_notes": admin_notes,
            "verified_at": datetime.now().isoformat()
        }).eq("id", purchase_id).execute()
        
        return {"success": True, "status": "rejected"}
    
    def save_recording(self, user_id: str, filename: str, duration_minutes: int, 
                       file_size_mb: float, credits_used: int, transcript: str, summary: Dict) -> str:
        """Save recording to history and deduct credits."""
        # 1. Deduct credits logic
        user_credits = self.get_user_credits(user_id)
        
        # Determine source of credits (free first, then paid)
        free_credits = user_credits.get("free_credits", 0)
        balance = user_credits.get("balance", 0)
        
        remaining_cost = credits_used
        new_free = free_credits
        new_balance = balance
        
        # Use free credits first
        if free_credits >= remaining_cost:
            new_free -= remaining_cost
            remaining_cost = 0
            credit_type = 'free'
        else:
            remaining_cost -= free_credits
            new_free = 0
            # Use paid balance
            if balance >= remaining_cost:
                new_balance -= remaining_cost
                credit_type = 'mixed' if free_credits > 0 else 'paid'
            else:
                # Not enough credits - but we already processed it
                # Log negative balance or allow it? 
                # For now let's allow negative balance since we already processed the file
                new_balance -= remaining_cost
                credit_type = 'paid'

        # Update user credits
        self.supabase.table("user_credits").update({
            "free_credits": new_free,
            "balance": new_balance,
            "total_used": user_credits.get("total_used", 0) + credits_used,
            "updated_at": datetime.now().isoformat()
        }).eq("user_id", user_id).execute()

        # 2. Insert recording
        result = self.supabase.table("recordings").insert({
            "user_id": user_id,
            "filename": filename,
            "duration_minutes": duration_minutes,
            "file_size_mb": file_size_mb,
            "credits_used": credits_used,
            "transcript": transcript,
            "summary": summary
        }).execute()
        
        # 3. Log usage
        self.supabase.table("credit_usage").insert({
            "user_id": user_id,
            "credits_used": credits_used,
            "credit_type": credit_type,
            "duration_minutes": duration_minutes,
            "filename": filename,
            "recording_id": result.data[0]["id"]
        }).execute()
        
        return result.data[0]["id"]
    
    def get_user_recordings(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get user's recording history."""
        result = self.supabase.table("recordings").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).limit(limit).execute()
        return result.data or []
