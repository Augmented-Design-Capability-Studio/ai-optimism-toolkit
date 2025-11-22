"""
Encryption utilities for API keys
Uses Fernet symmetric encryption to encrypt/decrypt API keys before storage
"""
import os
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

# Path to the encryption key file
ENCRYPTION_KEY_FILE = Path(__file__).parent.parent.parent / ".encryption_key"

def _get_fernet() -> Fernet:
    """
    Get a Fernet instance with the encryption key.
    The key file contains a base64-encoded Fernet key.
    """
    if ENCRYPTION_KEY_FILE.exists():
        # Read existing key (as text, it's base64 encoded)
        with open(ENCRYPTION_KEY_FILE, 'r') as f:
            key_str = f.read().strip()
        # Fernet expects base64-encoded bytes
        return Fernet(key_str.encode())
    else:
        # Generate new key
        key = Fernet.generate_key()
        # Save it to file as base64 string
        ENCRYPTION_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(ENCRYPTION_KEY_FILE, 'w') as f:
            f.write(key.decode())  # Fernet.generate_key() returns base64-encoded bytes
        return Fernet(key)

def encrypt_api_key(api_key: str) -> str:
    """
    Encrypt an API key using Fernet symmetric encryption.
    
    Args:
        api_key: The plaintext API key to encrypt
        
    Returns:
        Base64-encoded encrypted string
    """
    if not api_key:
        raise ValueError("API key cannot be empty")
    
    fernet = _get_fernet()
    encrypted = fernet.encrypt(api_key.encode())
    # Return as base64 string for storage
    return base64.urlsafe_b64encode(encrypted).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    """
    Decrypt an API key that was encrypted with encrypt_api_key.
    
    Args:
        encrypted_key: The base64-encoded encrypted API key
        
    Returns:
        The plaintext API key
    """
    if not encrypted_key:
        raise ValueError("Encrypted key cannot be empty")
    
    try:
        fernet = _get_fernet()
        # Decode from base64
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_key.encode())
        # Decrypt
        decrypted = fernet.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception as e:
        raise ValueError(f"Failed to decrypt API key: {str(e)}")

