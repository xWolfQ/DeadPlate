import cv2
import pytesseract
import re
import numpy as np
import json

pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

PL_PATTERN = r"[A-Z]{1,3}[A-Z0-9]{4,5}"

def preprocess(gray: np.ndarray) -> np.ndarray:
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def find_plate_heuristic(img: np.ndarray):
    h, w = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    _, th = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    th = cv2.bitwise_not(th)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 3))
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        x, y, wc, hc = cv2.boundingRect(cnt)
        if hc == 0:
            continue

        aspect = wc / float(hc)
        if 3.5 < aspect < 6.5 and wc > w * 0.25 and y > h * 0.3:
            return img[y:y + hc, x:x + wc]

    return None

def normalize_plate(text: str) -> str:
    return text.replace("Q", "O")

def fix_leading_letters(plate: str) -> str:
    replacements = {"1": "I", "0": "O", "8": "B", "2": "Z"}
    chars = list(plate)
    for i in range(min(3, len(chars))):
        if chars[i].isdigit():
            chars[i] = replacements.get(chars[i], chars[i])
    return "".join(chars)

def plate_confidence_debug(plate: str):
    if not plate:
        return 0

    score = 0

    if re.fullmatch(PL_PATTERN, plate):
        score += 50

    if len(plate) in (7, 8):
        score += 20


    digits = sum(c.isdigit() for c in plate)
    dscore = min(digits * 5, 20)
    score += dscore

    vowels = sum(c in "AEIOUY" for c in plate)

    if vowels == 0:
        score += 10
    elif vowels >= 4:
        score -= 10

    score = max(0, min(100, score))
    return score


def ocr_and_filter(img: np.ndarray):
    gray = preprocess(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))

    text = pytesseract.image_to_string(
        gray,
        config="--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    ).upper()

    if not text.strip():
        return None, 0

    collapsed = re.sub(r"[^A-Z0-9]", "", text)

    if len(collapsed) < 7:
        return None, 0


    if collapsed[0] in "S5I" and len(collapsed) > 7:
        collapsed = collapsed[1:]

    matches = re.findall(PL_PATTERN, collapsed)
    candidate = matches[0] if matches else collapsed[:7]

    candidate = normalize_plate(candidate)
    candidate = fix_leading_letters(candidate)

    conf = plate_confidence_debug(candidate)
    return candidate, conf


def read_plate(image_path: str):
    img = cv2.imread(image_path)
    if img is None:
        return {
            "plate": None,
            "confidence": 0,
        }

    roi = find_plate_heuristic(img)
    if roi is not None:
        plate, conf = ocr_and_filter(roi)
        if plate and conf >= 60:
            return {
                "plate": plate,
                "confidence": conf,

            }

    plate, conf = ocr_and_filter(img)
    return {
        "plate": plate,
        "confidence": conf,
    }


if __name__ == "__main__":
    result = read_plate("plate.jpg")
    print(json.dumps(result))