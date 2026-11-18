from pydantic import BaseModel
from typing import Optional, Dict, Any

class DecodeResponse(BaseModel):
    decoded: bool
    twin_code: Optional[str]
    confidence: float
    attempts: int
    valid_attempts: int
    votes: Dict[str, int]
    preprocessing: list[str]
    processing_ms: float

class HealthResponse(BaseModel):
    status: str
