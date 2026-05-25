"""
AI Vision Layer — YOLO-based lake contamination detection.

Uses Ultralytics YOLO for object detection. When the full model is not
available (e.g., development), falls back to a heuristic based on
image color statistics to simulate detection.
"""
import io
import os
from typing import TypedDict

import numpy as np

try:
    from PIL import Image as PILImage
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


class AnalysisResult(TypedDict):
    algae_bloom: bool
    plastic_debris: bool
    confidence: float
    detections: list


_model = None

ALGAE_CLASSES = {"algae", "algae_bloom", "green_algae", "cyanobacteria"}
DEBRIS_CLASSES = {"plastic", "plastic_debris", "trash", "waste", "litter", "bottle", "bag"}

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "lake_monitor.pt")


def _load_model():
    global _model
    if _model is not None:
        return _model

    if not YOLO_AVAILABLE:
        return None

    if os.path.exists(MODEL_PATH):
        try:
            _model = YOLO(MODEL_PATH)
            return _model
        except Exception as e:
            print(f"Failed to load custom model: {e}")

    try:
        _model = YOLO("yolov8n.pt")
        return _model
    except Exception as e:
        print(f"Failed to load YOLOv8: {e}")
        return None


def _heuristic_analysis(image_bytes: bytes) -> AnalysisResult:
    """
    Color-statistics heuristic for environments without YOLO.
    Algae bloom: elevated green channel relative to red/blue.
    Plastic debris: bright non-water pixels at surface level.
    """
    if not PIL_AVAILABLE:
        return {
            "algae_bloom": False,
            "plastic_debris": False,
            "confidence": 0.5,
            "detections": [],
        }

    try:
        img = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))
        arr = np.array(img, dtype=np.float32) / 255.0

        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

        green_excess = g - (r + b) / 2
        algae_score = float(np.mean(green_excess > 0.12))
        algae_bloom = algae_score > 0.18

        brightness = (r + g + b) / 3
        saturation = np.max(arr, axis=2) - np.min(arr, axis=2)
        bright_non_blue = (brightness > 0.65) & (saturation < 0.25)
        debris_score = float(np.mean(bright_non_blue))
        plastic_debris = debris_score > 0.08

        max_score = max(algae_score, debris_score)
        confidence = min(0.95, 0.55 + max_score * 2)

        return {
            "algae_bloom": algae_bloom,
            "plastic_debris": plastic_debris,
            "confidence": round(confidence, 3),
            "detections": [],
        }
    except Exception as e:
        print(f"Heuristic analysis failed: {e}")
        return {
            "algae_bloom": False,
            "plastic_debris": False,
            "confidence": 0.5,
            "detections": [],
        }


def analyze_image(image_bytes: bytes) -> AnalysisResult:
    """
    Main entry point. Runs YOLO detection if available, otherwise falls
    back to heuristic color analysis.

    Args:
        image_bytes: Raw image bytes (JPEG, PNG, etc.)

    Returns:
        AnalysisResult with algae_bloom, plastic_debris, confidence, detections
    """
    model = _load_model()

    if model is None:
        return _heuristic_analysis(image_bytes)

    try:
        if not PIL_AVAILABLE:
            return _heuristic_analysis(image_bytes)

        img = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
        results = model(img, verbose=False)

        detections = []
        algae_bloom = False
        plastic_debris = False
        max_conf = 0.0

        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                conf = float(box.conf[0])
                class_name = result.names.get(class_id, "unknown").lower()

                detections.append({
                    "class": class_name,
                    "confidence": round(conf, 3),
                    "bbox": box.xyxy[0].tolist(),
                })

                if class_name in ALGAE_CLASSES and conf > 0.4:
                    algae_bloom = True
                    max_conf = max(max_conf, conf)

                if class_name in DEBRIS_CLASSES and conf > 0.4:
                    plastic_debris = True
                    max_conf = max(max_conf, conf)

        if not detections:
            heuristic = _heuristic_analysis(image_bytes)
            algae_bloom = heuristic["algae_bloom"]
            plastic_debris = heuristic["plastic_debris"]
            max_conf = heuristic["confidence"]

        return {
            "algae_bloom": algae_bloom,
            "plastic_debris": plastic_debris,
            "confidence": round(max_conf if max_conf > 0 else 0.72, 3),
            "detections": detections,
        }

    except Exception as e:
        print(f"YOLO analysis failed: {e}")
        return _heuristic_analysis(image_bytes)
