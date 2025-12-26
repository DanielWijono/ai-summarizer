"""
Xendit payment service for handling subscriptions.
"""
import os
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import xendit
from xendit.apis import InvoiceApi
from xendit.invoice import CreateInvoiceRequest
from supabase import create_client
from tier_config import get_tier_price, get_tier_limits

# Configure Xendit
XENDIT_SECRET_KEY = os.getenv("XENDIT_SECRET_KEY", "")
XENDIT_WEBHOOK_TOKEN = os.getenv("XENDIT_WEBHOOK_TOKEN", "")

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def get_supabase_client():
    """Get Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class XenditService:
    """Service for Xendit payment operations."""
    
    def __init__(self):
        self.api_key = XENDIT_SECRET_KEY
        self.webhook_token = XENDIT_WEBHOOK_TOKEN
        self.supabase = get_supabase_client()
        
        # Configure Xendit client
        xendit.set_api_key(self.api_key)
    
    def create_invoice(self, user_id: str, user_email: str, tier: str) -> Dict[str, Any]:
        """
        Create a Xendit invoice for subscription upgrade.
        
        Returns:
            {
                "invoice_id": str,
                "invoice_url": str,
                "amount": int,
                "expires_at": str
            }
        """
        amount = get_tier_price(tier)
        limits = get_tier_limits(tier)
        
        if amount == 0:
            raise ValueError("Cannot create invoice for free tier")
        
        # Generate unique external ID
        external_id = f"sub_{user_id}_{tier}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create invoice request
        invoice_request = CreateInvoiceRequest(
            external_id=external_id,
            amount=amount,
            payer_email=user_email,
            description=f"Langganan {limits.name} - AI Summarizer",
            currency="IDR",
            invoice_duration=86400,  # 24 hours
            success_redirect_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/payment/success",
            failure_redirect_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/payment/failed",
        )
        
        # Create invoice via Xendit API
        invoice_api = InvoiceApi()
        response = invoice_api.create_invoice(invoice_request)
        
        # Save payment record
        self.supabase.table("payments").insert({
            "user_id": user_id,
            "amount": amount,
            "tier": tier,
            "status": "pending",
            "xendit_invoice_id": response.id,
            "xendit_invoice_url": response.invoice_url
        }).execute()
        
        return {
            "invoice_id": response.id,
            "invoice_url": response.invoice_url,
            "amount": amount,
            "expires_at": response.expiry_date.isoformat() if response.expiry_date else None
        }
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Xendit webhook callback signature."""
        if not self.webhook_token:
            return True  # Skip verification in development
        
        expected_signature = hmac.new(
            self.webhook_token.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    
    def handle_invoice_paid(self, invoice_id: str, external_id: str) -> Dict[str, Any]:
        """
        Handle successful payment callback.
        Updates subscription and payment record.
        """
        # Get payment record
        payment_result = self.supabase.table("payments").select("*").eq(
            "xendit_invoice_id", invoice_id
        ).single().execute()
        
        if not payment_result.data:
            raise ValueError(f"Payment not found for invoice: {invoice_id}")
        
        payment = payment_result.data
        user_id = payment["user_id"]
        tier = payment["tier"]
        
        # Update payment status
        self.supabase.table("payments").update({
            "status": "paid",
            "paid_at": datetime.now().isoformat()
        }).eq("xendit_invoice_id", invoice_id).execute()
        
        # Upgrade subscription
        expires_at = (datetime.now() + timedelta(days=30)).isoformat()
        
        self.supabase.table("subscriptions").update({
            "tier": tier,
            "status": "active",
            "started_at": datetime.now().isoformat(),
            "expires_at": expires_at,
            "updated_at": datetime.now().isoformat()
        }).eq("user_id", user_id).execute()
        
        # If upgraded to Pro, remove expiry from all recordings
        if tier == "pro":
            self.supabase.table("recordings").update({
                "expires_at": None
            }).eq("user_id", user_id).execute()
        
        return {
            "success": True,
            "user_id": user_id,
            "tier": tier,
            "expires_at": expires_at
        }
    
    def handle_invoice_expired(self, invoice_id: str) -> Dict[str, Any]:
        """Handle expired invoice callback."""
        self.supabase.table("payments").update({
            "status": "expired"
        }).eq("xendit_invoice_id", invoice_id).execute()
        
        return {"success": True, "status": "expired"}
