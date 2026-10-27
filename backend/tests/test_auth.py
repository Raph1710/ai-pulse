import pytest
from app.auth import hash_password, verify_password


def test_password_hashing_and_verification():
    raw = "super-secret-password-123"
    hashed = hash_password(raw)
    assert hashed != raw
    assert hashed.startswith("pbkdf2:sha256:")
    assert verify_password(raw, hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_legacy_sha256_backward_compatibility():
    # Legacy unsalted SHA-256 for 'pulse123'
    import hashlib
    legacy_hash = hashlib.sha256("pulse123".encode()).hexdigest()
    assert verify_password("pulse123", legacy_hash) is True
    assert verify_password("wrong-pass", legacy_hash) is False
