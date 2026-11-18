import cv2
import numpy as np
import time
from app.watermark import decode_image
from collections import Counter

def normalize_size(img: np.ndarray, long_side: int = 1024) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) > long_side:
        scale = long_side / max(h, w)
        img = cv2.resize(img, (int(w*scale), int(h*scale)))
    return img

def perspective_correct(img: np.ndarray) -> np.ndarray:
    """Try to find largest quadrilateral and warp to 512x512."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    edges = cv2.Canny(blur, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    img_area = img.shape[0] * img.shape[1]
    best = None
    best_area = 0
    
    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        area = cv2.contourArea(cnt)
        if len(approx) == 4 and area > 0.4 * img_area and area > best_area:
            best = approx
            best_area = area
    
    if best is not None:
        pts = best.reshape(4, 2).astype(np.float32)
        dst = np.array([[0,0],[511,0],[511,511],[0,511]], dtype=np.float32)
        M = cv2.getPerspectiveTransform(pts, dst)
        return cv2.warpPerspective(img, M, (512, 512))
    
    # Fallback: center square crop
    h, w = img.shape[:2]
    s = min(h, w)
    y, x = (h-s)//2, (w-s)//2
    return cv2.resize(img[y:y+s, x:x+s], (512, 512))

def enhance(img: np.ndarray) -> np.ndarray:
    """Denoise + CLAHE on luminance."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    lab = cv2.merge([l, a, b])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    img = cv2.fastNlMeansDenoisingColored(img, None, 5, 5, 7, 21)
    return img

def sharpen(img: np.ndarray) -> np.ndarray:
    kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
    return cv2.filter2D(img, -1, kernel)

def multi_variant_decode(image_bgr: np.ndarray) -> dict:
    """
    Run decode on multiple variants (scale x rotation x sharpening).
    Returns DecodeResponse dict.
    """
    start = time.time()
    img = normalize_size(image_bgr, 1024)
    img = perspective_correct(img)
    img = enhance(img)
    
    scales = [0.9, 1.0, 1.1]
    rotations = [-2, 0, 2]
    variants = ['raw', 'sharp']
    
    votes = Counter()
    attempts = 0
    valid_attempts = 0
    preprocessing_steps = ['perspective', 'denoise', 'scale_variants']
    
    h, w = img.shape[:2]
    
    for scale in scales:
        scaled = cv2.resize(img, (int(w*scale), int(h*scale))) if scale != 1.0 else img.copy()
        for angle in rotations:
            if angle != 0:
                M = cv2.getRotationMatrix2D((scaled.shape[1]//2, scaled.shape[0]//2), angle, 1.0)
                rotated = cv2.warpAffine(scaled, M, (scaled.shape[1], scaled.shape[0]))
            else:
                rotated = scaled
            for variant in variants:
                frame = sharpen(rotated) if variant == 'sharp' else rotated
                attempts += 1
                ok, code, conf, _ = decode_image(frame)
                if ok and code:
                    valid_attempts += 1
                    votes[code] += 1
                    if votes[code] >= 8:  # early stop
                        break
            if votes and max(votes.values()) >= 8:
                break
        if votes and max(votes.values()) >= 8:
            break
    
    ms = (time.time() - start) * 1000
    
    if not votes:
        return {
            "decoded": False, "twin_code": None, "confidence": 0.0,
            "attempts": attempts, "valid_attempts": valid_attempts,
            "votes": {}, "preprocessing": preprocessing_steps, "processing_ms": ms
        }
    
    winner = votes.most_common(1)[0][0]
    confidence = votes[winner] / attempts
    
    return {
        "decoded": True, "twin_code": winner, "confidence": confidence,
        "attempts": attempts, "valid_attempts": valid_attempts,
        "votes": dict(votes), "preprocessing": preprocessing_steps, "processing_ms": ms
    }
