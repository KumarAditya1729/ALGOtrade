from dataclasses import dataclass, field
from typing import Dict, Any, Optional

@dataclass
class BrokerCredentials:
    """Explicit credential container to isolate secrets from broker modules."""
    credential_id: int
    user_id: int
    exchange_id: str
    api_key: str
    api_secret: str = field(repr=False)
    passphrase: str = field(repr=False, default="")
    access_token: str = field(repr=False, default="")
    raw_config: Dict[str, Any] = field(default_factory=dict, repr=False)
