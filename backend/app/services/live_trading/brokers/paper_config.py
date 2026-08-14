from typing import Optional
from pydantic import BaseModel, Field

class PaperSimulationConfig(BaseModel):
    """Configuration for deterministic paper trading simulations."""
    slippage_bps: float = Field(default=1.0, description="Slippage in basis points applied to market orders.")
    commission_model: str = Field(default="fixed_bps", description="Model for calculating fees, e.g., 'fixed_bps' or 'zero'.")
    commission_rate_bps: float = Field(default=1.0, description="Commission rate in basis points.")
    max_fill_per_tick: Optional[float] = Field(default=None, description="Maximum quantity to fill per tick. If None, infinite liquidity is assumed.")
    liquidity_model: str = Field(default="infinite", description="Model for available liquidity: 'infinite' or 'deterministic'.")
    latency_ms: int = Field(default=0, description="Simulated execution latency in milliseconds.")
    price_source: str = Field(default="kline", description="Source of pricing data.")

    @classmethod
    def default(cls) -> "PaperSimulationConfig":
        return cls()
