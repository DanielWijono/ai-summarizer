"""
Credits configuration and package definitions.
"""
from dataclasses import dataclass
from typing import Dict, List

# Bank account info for manual transfer
BANK_INFO = {
    "bank_name": "BCA",
    "account_number": "5271332972",
    "account_holder": "Silverius Daniel Wijono"
}

@dataclass
class CreditPackage:
    """Credit package definition."""
    id: str
    name: str
    credits: int
    price: int  # in IDR
    price_per_credit: float
    retention_period: str
    is_popular: bool = False


# Available credit packages
CREDIT_PACKAGES: Dict[str, CreditPackage] = {
    "starter": CreditPackage(
        id="starter",
        name="Starter",
        credits=10,
        price=99000,
        price_per_credit=9900,
        retention_period="1 bulan",
        is_popular=False
    ),
    "value": CreditPackage(
        id="value",
        name="Value",
        credits=30,
        price=249000,
        price_per_credit=8300,
        retention_period="3 bulan",
        is_popular=True
    ),
    "pro": CreditPackage(
        id="pro",
        name="Pro",
        credits=60,
        price=449000,
        price_per_credit=7483,
        retention_period="Selamanya",
        is_popular=False
    ),
}


@dataclass
class DurationTier:
    """Duration tier for credit calculation."""
    max_minutes: int
    credits_required: int
    max_file_mb: int


# Duration-based credit tiers
DURATION_TIERS: List[DurationTier] = [
    DurationTier(max_minutes=20, credits_required=1, max_file_mb=150),
    DurationTier(max_minutes=45, credits_required=2, max_file_mb=300),
    DurationTier(max_minutes=90, credits_required=3, max_file_mb=500),
]

# Free tier config
FREE_TIER = {
    "credits_per_week": 2,
    "max_duration_minutes": 20,
    "max_file_mb": 150,
    "reset_day": 0,  # Monday = 0
    "retention_period": "1 bulan"
}


def get_credits_required(duration_minutes: int) -> int:
    """Get credits required based on video duration."""
    for tier in DURATION_TIERS:
        if duration_minutes <= tier.max_minutes:
            return tier.credits_required
    return 3  # Max credits for very long videos


def get_max_file_size(duration_minutes: int) -> int:
    """Get max file size in MB based on expected duration."""
    for tier in DURATION_TIERS:
        if duration_minutes <= tier.max_minutes:
            return tier.max_file_mb
    return 500


def get_package(package_id: str) -> CreditPackage:
    """Get package by ID."""
    return CREDIT_PACKAGES.get(package_id)


def get_all_packages() -> List[CreditPackage]:
    """Get all available packages."""
    return list(CREDIT_PACKAGES.values())


def format_price(amount: int) -> str:
    """Format price in IDR."""
    return f"Rp {amount:,}".replace(",", ".")
