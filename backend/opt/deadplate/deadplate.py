import cv2
import pytesseract
import re
import numpy as np

# === KONFIGURACJA ===
pytesseract.pytesseract.tesseract_cmd = r"/usr/bin/tesseract"

# granice słowa są KLUCZOWE – zapobiegają dodawaniu losowych liter
PL_PATTERN = r"[A-Z]{1,3}\s?[A-Z0-9]{4,5}"


# === PREPROCESSING ===
def preprocess(gray):
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    return gray


# === HEURYSTYCZNA PRÓBA WYKRYCIA TABLICY ===
def find_plate_heuristic(img):
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
        aspect = wc / float(hc)

        # szeroka, niska, w dolnej połowie obrazu
        if (
                3.5 < aspect < 6.5 and
                wc > w * 0.25 and
                y > h * 0.3
        ):
            return img[y:y+hc, x:x+wc]

    return None


# === NORMALIZACJA OCR ===
def normalize_plate(plate: str) -> str:
    plate = plate.replace(" ", "")

    replacements = {
        "Q": "O",

    }

    fixed = ""
    for ch in plate:
        fixed += replacements.get(ch, ch)

    return fixed

def fix_leading_letters(plate: str) -> str:
    # zamiana cyfr na litery tylko w CZĘŚCI WOJEWÓDZKIEJ
    replacements = {
        "1": "I",
        "0": "O",
        "8": "B",
        "2": "Z"
    }

    chars = list(plate)

    # sprawdzamy pierwsze 3 pozycje
    for i in range(min(3, len(chars))):
        if chars[i].isdigit():
            chars[i] = replacements.get(chars[i], chars[i])

    return "".join(chars)


# === OCR + FILTR ===
def ocr_and_filter(img):
    gray = preprocess(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))

    text = pytesseract.image_to_string(
        gray,
        config="--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 "
    )

    text = text.upper()

    candidates = re.findall(PL_PATTERN, text)

    # 🔥 FALLBACK JEŚLI REGEX NIC NIE ZNALAZŁ
    if not candidates:
        cleaned = re.sub(r"[^A-Z0-9]", "", text)
        if len(cleaned) >= 7:
            return normalize_plate(cleaned[:7])

    # wybór najlepszego kandydata (najbliżej 7 znaków)
    def score(c):
        return abs(len(c.replace(" ", "")) - 7)

    candidates = sorted(candidates, key=score)

    result = normalize_plate(candidates[0])
    result = fix_leading_letters(result)
    result = strip_left_garbage(result)
    result = strip_edge_garbage(result)
    return result


def strip_left_garbage(plate: str) -> str:
    # jeśli po odcięciu pierwszego znaku zostaje poprawna tablica PL
    if (
        len(plate) == 8 and
        re.match(r"^[A-Z]{1,3}[A-Z0-9]{4,5}$", plate[1:])
    ):
        return plate[1:]
    return plate

def strip_edge_garbage(plate: str) -> str:
    plate = plate.replace(" ", "")

    # jeśli jest za długa
    if len(plate) > 7:
        left = plate[1:]
        right = plate[:-1]

        pattern = re.compile(r"^[A-Z]{1,3}[A-Z0-9]{4}$")

        if pattern.match(left):
            return left
        if pattern.match(right):
            return right

    return plate


# === GŁÓWNA FUNKCJA ===
def read_plate(image_path: str):
    img = cv2.imread(image_path)
    if img is None:
        print("❌ Nie udało się wczytać obrazu")
        return None

    # 1️⃣ próba heurystyczna
    roi = find_plate_heuristic(img)
    if roi is not None:
        result = ocr_and_filter(roi)
        if result:
            return result

    # 2️⃣ fallback – OCR całego obrazu
    return ocr_and_filter(img)


# === TEST ===
if __name__ == "__main__":
    result = read_plate("plate.jpg")
    print(result)