from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt

security = HTTPBearer()

ASTRON_API_KEY = os.getenv("ASTRON_API_KEY", "default-secret")
VALID_ISSUERS = ["openclaw"]

async def validate_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validate JWT token from OpenClaw.
    Returns decoded payload if valid, else raises HTTPException.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, ASTRON_API_KEY, algorithms=["HS256"])
        if payload.get("iss") not in VALID_ISSUERS:
            raise jwt.InvalidIssuerError("Invalid issuer")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
