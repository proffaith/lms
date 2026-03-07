import os
from pathlib import Path
from urllib.parse import urlparse

from .base import *  # noqa: F401, F403

# Use PyMySQL if mysqlclient (C extension) isn't available (e.g. on Heroku)
try:
    import MySQLdb  # noqa: F401
except ImportError:
    import pymysql
    pymysql.install_as_MySQLdb()

# QuotaGuard proxy — route all outbound connections through static IPs
# so Azure MySQL firewall can whitelist them
QUOTAGUARD_URL = os.environ.get('QUOTAGUARDSTATIC_URL')
if QUOTAGUARD_URL:
    import socks
    import socket
    parsed = urlparse(QUOTAGUARD_URL)
    # Use SOCKS5 endpoint on port 1080 (HTTP CONNECT on 9293 has auth issues)
    socks.set_default_proxy(
        socks.SOCKS5,
        parsed.hostname,
        1080,
        True,  # rdns: let proxy resolve DNS
        parsed.username,
        parsed.password,
    )
    socket.socket = socks.socksocket

DEBUG = False

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()]

# CORS
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]
if os.environ.get('FRONTEND_URL'):
    CORS_ALLOWED_ORIGINS.append(os.environ['FRONTEND_URL'])

# Heroku reverse proxy
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'true').lower() == 'true'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Whitenoise — serve static files without nginx
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

# Frontend build output — collectstatic will gather these
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent.parent / 'frontend' / 'dist'
STATICFILES_DIRS = [
    FRONTEND_DIR / 'assets',  # Vite puts JS/CSS in assets/
]

# Serve index.html at the root via whitenoise
WHITENOISE_ROOT = FRONTEND_DIR

# Azure MySQL requires SSL from external connections (Heroku → Azure)
if os.environ.get('DB_SSL', 'true').lower() == 'true':
    DATABASES['default']['OPTIONS']['ssl'] = {'ca': '/etc/ssl/certs/ca-certificates.crt'}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
