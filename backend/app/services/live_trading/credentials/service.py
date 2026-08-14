from typing import Dict, Any, Optional
from app.utils.db import get_db_connection
from app.utils.credential_crypto import decrypt_credential_blob
from app.utils.logger import get_logger
from .models import BrokerCredentials
import json

logger = get_logger(__name__)

def safe_json(value: Any, default=None):
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value) if isinstance(value, str) else default
    except Exception:
        return default

class CredentialService:
    """Service to load and decrypt exchange credentials securely."""
    
    @staticmethod
    def load_credential(credential_id: int, user_id: int) -> BrokerCredentials:
        """
        Load exchange credential JSON for the given user, decrypt it, 
        and return a typed BrokerCredentials object.
        """
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "SELECT exchange, encrypted_config FROM qd_exchange_credentials WHERE id = %s AND user_id = %s",
                (int(credential_id), int(user_id)),
            )
            row = cur.fetchone()
            cur.close()
            
        if not row:
            raise ValueError(f"Credential {credential_id} not found or access denied for user {user_id}")
            
        try:
            plain = decrypt_credential_blob(row.get("encrypted_config"))
        except ValueError as exc:
            logger.warning("decrypt credential_id=%s: %s", credential_id, exc)
            raise ValueError(f"Failed to decrypt credential {credential_id}") from exc
            
        config = safe_json(plain, {})
        
        return BrokerCredentials(
            credential_id=credential_id,
            user_id=user_id,
            exchange_id=str(row.get("exchange") or config.get("exchange_id", "")),
            api_key=config.get("api_key", ""),
            api_secret=config.get("api_secret", ""),
            passphrase=config.get("passphrase", ""),
            access_token=config.get("access_token", ""),
            raw_config=config,
        )

    @staticmethod
    def load_by_exchange(user_id: int, exchange: str) -> BrokerCredentials:
        """
        Load exchange credential JSON for the given user and exchange name, decrypt it, 
        and return a typed BrokerCredentials object.
        """
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "SELECT id, encrypted_config FROM qd_exchange_credentials WHERE exchange = %s AND user_id = %s LIMIT 1",
                (str(exchange).lower(), int(user_id)),
            )
            row = cur.fetchone()
            cur.close()
            
        if not row:
            raise ValueError(f"Credential for {exchange} not found or access denied for user {user_id}")
            
        credential_id = row.get("id")
        try:
            plain = decrypt_credential_blob(row.get("encrypted_config"))
        except ValueError as exc:
            logger.warning("decrypt credential_id=%s: %s", credential_id, exc)
            raise ValueError(f"Failed to decrypt credential {credential_id}") from exc
            
        config = safe_json(plain, {})
        
        return BrokerCredentials(
            credential_id=credential_id,
            user_id=user_id,
            exchange_id=str(exchange).lower(),
            api_key=config.get("api_key", ""),
            api_secret=config.get("api_secret", ""),
            passphrase=config.get("passphrase", ""),
            access_token=config.get("access_token", ""),
            raw_config=config,
        )
