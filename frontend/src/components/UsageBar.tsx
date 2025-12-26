"use client";

interface UsageBarProps {
    used: number;
    limit: number;
    periodType: string;
    tierName: string;
}

export default function UsageBar({ used, limit, periodType, tierName }: UsageBarProps) {
    const percentage = Math.min((used / limit) * 100, 100);
    const remaining = limit - used;
    const isLow = remaining <= 1;
    const isExhausted = remaining <= 0;

    return (
        <div className="usage-bar-container">
            <div className="usage-bar-header">
                <span className="usage-bar-label">
                    Upload ({tierName})
                </span>
                <span className={`usage-bar-count ${isLow ? "low" : ""}`}>
                    {used} / {limit} per {periodType}
                </span>
            </div>

            <div className="usage-bar-track">
                <div
                    className={`usage-bar-fill ${isExhausted ? "exhausted" : isLow ? "low" : ""}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {isExhausted && (
                <p className="usage-bar-warning">
                    Limit tercapai! Upgrade untuk upload lebih banyak.
                </p>
            )}
        </div>
    );
}
