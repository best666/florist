"""Input sanitization utilities."""

from __future__ import annotations

import re

import bleach

MAX_INPUT_LENGTH = 4000
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


def sanitize_user_input(text: str) -> str:
    """Clean user input to prevent XSS and injection."""
    if not text:
        return ""

    # Trim length
    text = text[:MAX_INPUT_LENGTH]

    # Strip HTML tags
    text = bleach.clean(text, tags=[], attributes={}, strip=True)

    # Remove control characters except common whitespace
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    return text


def validate_image_data_url(data_url: str) -> bool:
    """Basic validation of image data URLs."""
    if not data_url or not data_url.startswith("data:image/"):
        return False

    # Check size (approximate from base64 length)
    base64_part = data_url.split(",", 1)[-1] if "," in data_url else ""
    estimated_bytes = len(base64_part) * 3 // 4
    return estimated_bytes <= MAX_IMAGE_SIZE_BYTES
