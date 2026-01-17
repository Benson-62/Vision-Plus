# app/face_utils.py
import numpy as np
import io
from PIL import Image
from deepface import DeepFace

def get_face_embedding(image_bytes: bytes):
    """
    Takes raw image bytes, returns embedding vector (numpy array)
    or None if face not found.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_np = np.array(img)

    try:
        reps = DeepFace.represent(
            img_path=img_np,
            model_name="Facenet",  # good balance of speed/accuracy
            enforce_detection=True
        )
        emb = reps[0]["embedding"]
        return np.array(emb, dtype="float32")
    except Exception as e:
        print("DeepFace error:", e)
        return None


def compare_embeddings(emb1, emb2, threshold: float = 10.0):
    """
    Returns (is_match: bool, distance: float)
    Smaller distance = more similar.
    Threshold ~ 10 is reasonable for Facenet in DeepFace, can tune later.
    """
    emb1 = np.array(emb1)
    emb2 = np.array(emb2)
    dist = np.linalg.norm(emb1 - emb2)
    is_match = dist < threshold
    return is_match, float(dist)
