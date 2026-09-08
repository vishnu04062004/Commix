"""
Production-level Google OAuth configuration using Authlib.
Handles multi-user OAuth flow for production deployment.
"""

from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from typing import Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Load configuration
config = Config(str(Path(__file__).resolve().parents[2] / '.env'))

# Initialize OAuth
oauth = OAuth()

# Register Google OAuth provider
oauth.register(
    name='google',
    client_id=config('GOOGLE_CLIENT_ID', default=''),
    client_secret=config('GOOGLE_CLIENT_SECRET', default=''),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': ' '.join([
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/drive.file',
        ]),
        # Request offline access to get refresh token
        'access_type': 'offline',
        # Force consent screen to ensure refresh token
        'prompt': 'consent'
    }
)


def get_google_oauth_client():
    """Get configured Google OAuth client"""
    return oauth.google


class GoogleOAuthConfig:
    """Google OAuth configuration helper"""
    
    def __init__(self):
        self.client_id = config('GOOGLE_CLIENT_ID', default='')
        self.client_secret = config('GOOGLE_CLIENT_SECRET', default='')
        self.redirect_uri = config('GOOGLE_REDIRECT_URI', default='http://localhost:8000/auth/callback')
        
    def validate(self) -> bool:
        """Validate OAuth configuration"""
        if not self.client_id or not self.client_secret:
            logger.error("Google OAuth credentials not configured")
            return False
        return True
    
    @property
    def scopes(self) -> list[str]:
        """Get required OAuth scopes"""
        return [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/drive.file',
        ]
