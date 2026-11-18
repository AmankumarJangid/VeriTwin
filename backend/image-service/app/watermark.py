import numpy as np
import cv2
from imwatermark import WatermarkEncoder, WatermarkDecoder

def compute_crc8(data: int) -> int:
    """CRC-8 of a 32-bit integer (4 bytes, big-endian)."""
    crc = 0
    for byte in data.to_bytes(4, 'big'):
        crc ^= byte
        for _ in range(8):
            if crc & 0x80:
                crc = ((crc << 1) ^ 0x07) & 0xFF
            else:
                crc = (crc << 1) & 0xFF
    return crc

def encode_image(image_bgr: np.ndarray, twin_code: str) -> np.ndarray:
    """Embed twin_code (8 hex chars = 32-bit) into image using DWT-DCT watermark."""
    # Validate
    assert len(twin_code) == 8 and all(c in '0123456789ABCDEFabcdef' for c in twin_code)
    
    # Prepare image: ensure min 512x512, max 2048 on any side, RGB
    h, w = image_bgr.shape[:2]
    if h < 512 or w < 512:
        scale = max(512/h, 512/w)
        image_bgr = cv2.resize(image_bgr, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_LANCZOS4)
    if max(image_bgr.shape[:2]) > 2048:
        scale = 2048 / max(image_bgr.shape[:2])
        image_bgr = cv2.resize(image_bgr, (int(image_bgr.shape[1]*scale), int(image_bgr.shape[0]*scale)))
    
    # Handle alpha channel
    if len(image_bgr.shape) == 3 and image_bgr.shape[2] == 4:
        alpha = image_bgr[:,:,3:4] / 255.0
        image_bgr = (image_bgr[:,:,:3] * alpha + 255 * (1 - alpha)).astype(np.uint8)
    
    # Build 40-bit payload: 32-bit twin_code + 8-bit CRC
    code_int = int(twin_code, 16)
    crc = compute_crc8(code_int)
    payload_bits = []
    for i in range(31, -1, -1):
        payload_bits.append((code_int >> i) & 1)
    for i in range(7, -1, -1):
        payload_bits.append((crc >> i) & 1)
    
    # Encode using imwatermark DWT-DCT
    bgr = image_bgr[:,:,:3].copy() if image_bgr.shape[2] >= 3 else cv2.cvtColor(image_bgr, cv2.COLOR_GRAY2BGR)
    encoder = WatermarkEncoder()
    encoder.set_watermark('bits', payload_bits)
    encoded = encoder.encode(bgr, 'dwtDct')
    return encoded

def decode_image(image_bgr: np.ndarray) -> tuple[bool, str | None, float, list]:
    """
    Try to extract twin_code from image. Returns (decoded, twin_code, confidence, votes_dict).
    """
    decoder = WatermarkDecoder('bits', 40)
    
    bits = decoder.decode(image_bgr, 'dwtDct')
    if bits is None or len(bits) < 40:
        return False, None, 0.0, []
    
    # Extract 32-bit code and 8-bit CRC
    code_int = 0
    for b in bits[:32]:
        code_int = (code_int << 1) | int(b)
    crc_extracted = 0
    for b in bits[32:40]:
        crc_extracted = (crc_extracted << 1) | int(b)
    
    crc_expected = compute_crc8(code_int)
    if code_int == 0 or crc_extracted != crc_expected:
        return False, None, 0.0, []
    
    twin_code = format(code_int, '08X')
    return True, twin_code, 1.0, [twin_code]
