# app/main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import numpy as np

from .db import users_collection, logs_collection
from .face_utils import get_face_embedding, compare_embeddings

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    count = users_collection.count_documents({})
    return {"message": "Smart attendance API is running", "user_count": count}


@app.post("/register")
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    image: UploadFile = File(...)
):
    existing = users_collection.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User already registered")

    image_bytes = await image.read()
    embedding = get_face_embedding(image_bytes)
    if embedding is None:
        raise HTTPException(status_code=400, detail="No face detected in image")

    user_doc = {
        "name": name,
        "email": email,
        "embedding": embedding.tolist(),
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)

    return {"status": "ok", "user_id": str(result.inserted_id)}


@app.post("/checkin")
# async def checkin(
#     email: str = Form(...),
#     image: UploadFile = File(...)
# ):
#     user = users_collection.find_one({"email": email})
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     image_bytes = await image.read()
#     new_emb = get_face_embedding(image_bytes)
#     if new_emb is None:
#         raise HTTPException(status_code=400, detail="No face detected in image")

#     known_emb = np.array(user["embedding"], dtype="float32")
#     is_match, dist = compare_embeddings(known_emb, new_emb)

#     if not is_match:
#         return {"status": "fail", "reason": "Face mismatch", "distance": dist}

#     log_doc = {
#         "user_id": user["_id"],
#         "email": user["email"],
#         "timestamp": datetime.utcnow(),
#         "type": "checkin",
#         "distance": dist
#     }
#     logs_collection.insert_one(log_doc)

#     return {"status": "success", "distance": dist}
@app.post("/checkin_live")
async def checkin_live(
    email: str = Form(...),
    image1: UploadFile = File(...),
    image2: UploadFile = File(...)
):
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    img1_bytes = await image1.read()
    img2_bytes = await image2.read()

    # Embeddings for both images
    emb1 = get_face_embedding(img1_bytes)
    emb2 = get_face_embedding(img2_bytes)
    if emb1 is None or emb2 is None:
        raise HTTPException(status_code=400, detail="Face not detected")

    known_emb = np.array(user["embedding"], dtype="float32")
    is_match1, dist1 = compare_embeddings(known_emb, emb1)
    is_match2, dist2 = compare_embeddings(known_emb, emb2)

    if not (is_match1 and is_match2):
        return {"status": "fail", "reason": "Face mismatch"}

    # --- Liveness check: difference between two frames ---
    import cv2
    from PIL import Image
    import io

    def to_gray(b):
        img = Image.open(io.BytesIO(b)).convert("L")
        return np.array(img, dtype="float32")

    g1 = to_gray(img1_bytes)
    g2 = to_gray(img2_bytes)

    # resize second image to match first
    g2 = cv2.resize(g2, (g1.shape[1], g1.shape[0]))

    diff = float(np.mean(np.abs(g1 - g2)))

    # Tune this threshold by trial
    if diff < 5.0:
        return {
            "status": "fail",
            "reason": "Liveness failed (no movement)",
            "diff": diff
        }

    logs_collection.insert_one({
        "user_id": user["_id"],
        "email": user["email"],
        "timestamp": datetime.utcnow(),
        "type": "checkin_live",
        "diff": diff,
        "dist1": dist1,
        "dist2": dist2
    })

    return {
        "status": "success",
        "diff": diff,
        "dist1": dist1,
        "dist2": dist2
    }
