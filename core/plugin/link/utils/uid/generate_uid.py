"""Unique identifier generator module.

Provides functionality to generate short random UIDs using
cryptographic hash functions for secure identifier creation.
"""

import hashlib
import os


def new_uid() -> str:
    """Generate a short random unique identifier.

    Returns:
        str: 8-character hexadecimal unique identifier
    """
    random_bytes = os.urandom(16)
    random_hash = hashlib.sha256(random_bytes).hexdigest()
    short_random_string = random_hash[:8]
    return short_random_string


if __name__ == "__main__":
    print(new_uid())
