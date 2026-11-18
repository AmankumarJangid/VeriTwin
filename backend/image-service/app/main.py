import os
import io
import time
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Request
from fastapi.responses import Response

from app.watermark import encode_image
from app.preprocess import multi_variant_decode
from app.schemas import DecodeResponse, HealthResponse

app = FastAPI(title="VeriTwin Image Service", version="1.0.0")

INTERNAL_KEY = os.environ.get("IMAGE_SERVICE_KEY", "internal-shared-secret")

def check_key(x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

def read_image(file_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Cannot decode image")
    return img

@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "ok"}

@app.post("/internal/watermark/encode")
async def encode(
    image: UploadFile = File(...),
    twin_code: str = Form(...),
    x_internal_key: str = Header(None)
):
    check_key(x_internal_key)
    
    if len(twin_code) != 8 or not all(c in '0123456789ABCDEFabcdef' for c in twin_code.upper()):
        raise HTTPException(status_code=400, detail="invalid twin_code")
    
    img_bytes = await image.read()
    img = read_image(img_bytes)
    
    h, w = img.shape[:2]
    if h < 512 or w < 512:
        raise HTTPException(status_code=400, detail="image too small (min 512x512)")
    
    encoded = encode_image(img, twin_code.upper())
    
    # Compute PSNR
    psnr = cv2.PSNR(img, encoded)
    
    # Encode to PNG
    success, png_buf = cv2.imencode('.png', encoded)
    if not success:
        raise HTTPException(status_code=500, detail="encoding failed")
    
    return Response(
        content=png_buf.tobytes(),
        media_type="image/png",
        headers={
            "X-Psnr": str(round(psnr, 1)),
            "X-Payload-Bits": "40"
        }
    )

@app.post("/internal/watermark/decode", response_model=DecodeResponse)
async def decode(
    image: UploadFile = File(...),
    x_internal_key: str = Header(None)
):
    check_key(x_internal_key)
    
    img_bytes = await image.read()
    img = read_image(img_bytes)
    
    result = multi_variant_decode(img)
    return result
