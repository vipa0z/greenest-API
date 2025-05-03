# scan_controller.py
print('[DIAG] scan_controller.py loaded')
import logging
from io import BytesIO
import requests

import cv2
import numpy as np
import torch
import torchvision.transforms as transforms
from PIL import Image, UnidentifiedImageError
from models.model import SUPPORTED_TYPES, predict as predict_disease

logger = logging.getLogger(__name__)

# ← Make sure this is **top‐level**, not indented under the class!
def is_likely_leaf_heuristic(img_pil: Image.Image, min_leaf_color_percentage=15.0) -> bool:
    try:
        if not isinstance(img_pil, Image.Image):
            raise TypeError("Input must be a PIL Image object")

        img_cv = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
        if img_cv.size == 0:
            logger.warning("Heuristic check: Image has zero dimension.")
            return False

        hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)
        # Green range
        lower_green, upper_green = np.array([30,40,40]), np.array([90,255,255])
        # Brown range
        lower_brown, upper_brown = np.array([10,50,20]), np.array([25,255,180])

        green_mask = cv2.inRange(hsv, lower_green, upper_green)
        brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)
        total_pixels = img_cv.shape[0] * img_cv.shape[1]
        if total_pixels == 0:
            return False

        combined = (cv2.countNonZero(green_mask) + cv2.countNonZero(brown_mask)) / total_pixels * 100
        logger.debug(f"Heuristic combined%={combined:.2f}")
        return combined >= min_leaf_color_percentage

    except Exception as e:
        logger.error(f"Heuristic error: {e}")
        return False


class ScanController:
    def __init__(self, image_size=(256, 256)):
        print('[DIAG] ScanController.__init__ called')
        self.logger = logging.getLogger(__name__)
        self.preprocess_transform = transforms.Compose([
            transforms.Resize(image_size),
            transforms.ToTensor(),
        ])
        self.logger.info("ScanController initialized.")

    def _process_pil_image(self, img_pil: Image.Image):
        # ← calls the **global** is_likely_leaf_heuristic
        if not is_likely_leaf_heuristic(img_pil):
            return {
                "success": False,
                "message": "The image does not appear to be a leaf…",
                "supported_plants": SUPPORTED_TYPES
            }
        try:
            return self.preprocess_transform(img_pil.convert('RGB'))
        except Exception as e:
            self.logger.error(f"Preprocess error: {e}")
            return {"success": False, "message": "Error during preprocessing"}

    def handle_prediction_request(self, image_url: str):
        print(f"[DIAG] Entered handle_prediction_request with image_url: {image_url}")
        logging.basicConfig(level=logging.INFO)
        logging.info(f"[DIAG] Entered handle_prediction_request with image_url: {image_url}")
        # 1) Validate
        if not isinstance(image_url, str) or not image_url:
            print("[DIAG] image_url is not a valid non-empty string. Returning 400.")
            return {"success": False, "message": "'image_url' must be a non-empty string"}, 400

        print("[DIAG] Passed validation, starting download...")
        logging.info("[DIAG] Passed validation, starting download...")
        # 2) Download
        try:
            resp = requests.get(image_url, timeout=5)
            print(f"[DIAG] Downloaded image. Status: {resp.status_code}, Headers: {resp.headers}")
            logging.info(f"[DIAG] Downloaded image. Status: {resp.status_code}, Headers: {resp.headers}")
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"[DIAG] Download failed: {e}")
            logging.error(f"[DIAG] Download failed: {e}")
            return {"success": False, "message": f"Could not download image: {e}"}, 400

        print("[DIAG] Download succeeded, attempting to open image with PIL...")
        logging.info("[DIAG] Download succeeded, attempting to open image with PIL...")
        # 3) Open PIL
        try:
            img_pil = Image.open(BytesIO(resp.content)).convert('RGB')
            print("[DIAG] PIL image opened successfully.")
            logging.info("[DIAG] PIL image opened successfully.")
        except UnidentifiedImageError as e:
            print(f"[DIAG] PIL could not identify image: {e}")
            logging.error(f"[DIAG] PIL could not identify image: {e}")
            return {"success": False, "message": "URL did not contain a valid image (UnidentifiedImageError)"}, 400
        except Exception as e:
            print(f"[DIAG] Unexpected error opening image: {e}")
            logging.error(f"[DIAG] Unexpected error opening image: {e}")
            return {"success": False, "message": f"Error opening image: {e}"}, 400

        # 4) Heuristic + preprocess
        processed = self._process_pil_image(img_pil)
        if isinstance(processed, dict):
            return {
                "success": False,
                "message": processed["message"],
                "supported_plants": processed.get("supported_plants", [])
            }, 400

        # 5) Prediction
        try:
            result = predict_disease(processed)
        except Exception as e:
            self.logger.error(f"Prediction error: {e}")
            return {"success": False, "message": "Prediction failed"}, 500

        return {"success": True, "scanResult": result}, 200
