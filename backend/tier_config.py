"""
Tier configuration and limits for subscription plans.
"""
from dataclasses import dataclass
from typing import Dict

@dataclass
class TierLimits:
    """Limits for a subscription tier."""
    name: str
    uploads_per_period: int
    period_days: int  # 7 for weekly, 30 for monthly
    max_file_mb: int
    max_duration_minutes: int
    has_pdf_export: bool
    has_priority_queue: bool
    history_days: int  # 0 = unlimited

# Tier configurations
TIER_LIMITS: Dict[str, TierLimits] = {
    "free": TierLimits(
        name="Free",
        uploads_per_period=2,
        period_days=7,  # weekly
        max_file_mb=40,
        max_duration_minutes=20,
        has_pdf_export=False,
        has_priority_queue=False,
        history_days=30,
    ),
    "basic": TierLimits(
        name="Basic",
        uploads_per_period=30,
        period_days=30,  # monthly
        max_file_mb=50,
        max_duration_minutes=60,
        has_pdf_export=True,
        has_priority_queue=False,
        history_days=180,  # 6 months
    ),
    "pro": TierLimits(
        name="Pro",
        uploads_per_period=40,
        period_days=30,  # monthly
        max_file_mb=100,
        max_duration_minutes=90,  # 1.5 hours
        has_pdf_export=True,
        has_priority_queue=True,
        history_days=0,  # unlimited
    ),
}

# Pricing in IDR
TIER_PRICING: Dict[str, int] = {
    "free": 0,
    "basic": 199000,
    "pro": 399000,
}

def get_tier_limits(tier: str) -> TierLimits:
    """Get limits for a specific tier."""
    return TIER_LIMITS.get(tier, TIER_LIMITS["free"])

def get_tier_price(tier: str) -> int:
    """Get price for a specific tier in IDR."""
    return TIER_PRICING.get(tier, 0)
