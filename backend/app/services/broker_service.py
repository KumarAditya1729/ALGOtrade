import pyotp
import logging
from smartapi import SmartConnect

logger = logging.getLogger(__name__)

def verify_angel_one_credentials(client_id: str, pin: str, api_key: str, totp_secret: str):
    """
    Attempts a live login to Angel One using the SmartApi SDK.
    Generates TOTP automatically.
    Returns (True, user_profile) if successful, (False, error_message) otherwise.
    """
    try:
        if not all([client_id, pin, api_key, totp_secret]):
            return False, "All fields (Client ID, PIN, API Key, TOTP Secret) are required for Angel One."
        
        # Initialize SmartAPI
        obj = SmartConnect(api_key=api_key)
        
        # Generate TOTP
        try:
            totp = pyotp.TOTP(totp_secret.replace(" ", "")).now()
        except Exception as e:
            return False, f"Invalid TOTP Secret. Please check the 16-character string. Error: {str(e)}"
            
        # Attempt Login
        data = obj.generateSession(client_id, pin, totp)
        
        if data.get('status') == False:
            return False, data.get('message', 'Login failed. Please check your credentials.')
            
        if 'data' in data and data['data'] is not None and data['data'].get('jwtToken'):
            try:
                profile = obj.getProfile(data['data']['refreshToken'])
                user_name = profile.get('data', {}).get('name', client_id)
            except Exception:
                user_name = client_id
                profile = {'data': {}}
            return True, {"message": f"Successfully connected as {user_name}", "profile": profile.get('data')}
        
        return False, "Failed to retrieve session token."

    except Exception as e:
        logger.error(f"Angel One Verification Error: {e}", exc_info=True)
        return False, f"Connection Error: {str(e)}"
