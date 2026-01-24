from fastapi import (
    FastAPI, UploadFile, File, Form,
    HTTPException, WebSocket, WebSocketDisconnect
)
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, date
import numpy as np
import cv2
import io
import base64
from PIL import Image

from .db import users_collection, logs_collection
from .face_utils import get_face_embedding, compare_embeddings
from .security import hash_password, verify_password

# ================= APP =================
app = FastAPI()

# ================= CORS =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= WEBSOCKET =================
active_connections: list[WebSocket] = []

@app.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def notify_dashboard(event: str, payload: dict | None = None):
    for ws in active_connections:
        await ws.send_json({
            "event": event,
            "payload": payload or {},
            "timestamp": datetime.now().isoformat()
        })

# ================= ROOT (API HEALTH) =================
@app.get("/login")
def root():
    return {
        "message": "Smart attendance API is running",
        "user_count": users_collection.count_documents({})
    }

# ================= REGISTER =================
@app.post("/register")
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    image: UploadFile = File(...)
):
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="User already registered")

    image_bytes = await image.read()
    embedding = get_face_embedding(image_bytes)
    if embedding is None:
        raise HTTPException(status_code=400, detail="No face detected")

    users_collection.insert_one({
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "role": "employee",
        "active": True,
        "embedding": embedding.tolist(),
        "profile_image": base64.b64encode(image_bytes).decode(),
        "created_at": datetime.utcnow()
    })

    return {"status": "ok"}

# ================= LOGIN (EMPLOYEE + ADMIN ROLE RETURN) =================
@app.post("/login")
async def login_user(
    email: str = Form(...),
    password: str = Form(...)
):
    user = users_collection.find_one({"email": email})

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "status": "success",
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "employee")
    }

# ================= PROFILE =================
@app.get("/profile")
def get_profile(email: str):
    user = users_collection.find_one(
        {"email": email},
        {"password_hash": 0, "embedding": 0}
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["_id"] = str(user["_id"])
    return user

# ================= UPDATE USER =================
@app.post("/update_user")
async def update_user(
    email: str = Form(...),
    name: str = Form(None),
    image: UploadFile = File(None)
):
    update = {}

    if name:
        update["name"] = name

    if image:
        img = await image.read()
        emb = get_face_embedding(img)
        if emb is None:
            raise HTTPException(status_code=400, detail="No face detected")

        update["embedding"] = emb.tolist()
        update["profile_image"] = base64.b64encode(img).decode()

    users_collection.update_one({"email": email}, {"$set": update})
    return {"status": "updated"}

# ================= HELPERS =================
def liveness_pass(img1: bytes, img2: bytes) -> bool:
    def to_gray(b):
        img = Image.open(io.BytesIO(b)).convert("L")
        return np.array(img, dtype="float32")

    g1 = to_gray(img1)
    g2 = cv2.resize(to_gray(img2), (g1.shape[1], g1.shape[0]))
    diff = float(np.mean(np.abs(g1 - g2)))
    return diff >= 5.0

# ================= CHECK‑IN =================
@app.post("/checkin_live")
async def checkin_live(
    email: str = Form(...),
    image1: UploadFile = File(...),
    image2: UploadFile = File(...)
):
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    img1 = await image1.read()
    img2 = await image2.read()

    emb1 = get_face_embedding(img1)
    emb2 = get_face_embedding(img2)
    if emb1 is None or emb2 is None:
        raise HTTPException(status_code=400, detail="Face not detected")

    known = np.array(user["embedding"], dtype="float32")
    if not (compare_embeddings(known, emb1)[0] and compare_embeddings(known, emb2)[0]):
        raise HTTPException(status_code=401, detail="Face mismatch")

    if not liveness_pass(img1, img2):
        raise HTTPException(status_code=400, detail="Liveness failed")

    now = datetime.now()
    today = now.strftime("%d %b %Y")

    if not logs_collection.find_one({"email": email, "date": today}):
        logs_collection.insert_one({
            "email": email,
            "date": today,
            "in": now.strftime("%I:%M %p"),
            "out": None,
            "hours": 0,
            "status": "Present",
            "location": "Reception",
            "timestamp": now
        })

    await notify_dashboard("checkin", {"email": email})
    return {"status": "success", "time": now.strftime("%I:%M %p")}

# ================= CHECK‑OUT =================
@app.post("/checkout_live")
async def checkout_live(
    email: str = Form(...),
    image1: UploadFile = File(...),
    image2: UploadFile = File(...)
):
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = datetime.now().strftime("%d %b %Y")
    log = logs_collection.find_one({"email": email, "date": today})

    if not log:
        raise HTTPException(status_code=400, detail="Not checked in today")

    if log.get("out"):
        raise HTTPException(status_code=400, detail="Already checked out")

    img1 = await image1.read()
    img2 = await image2.read()

    emb1 = get_face_embedding(img1)
    emb2 = get_face_embedding(img2)
    if emb1 is None or emb2 is None:
        raise HTTPException(status_code=400, detail="Face not detected")

    known = np.array(user["embedding"], dtype="float32")
    if not (compare_embeddings(known, emb1)[0] and compare_embeddings(known, emb2)[0]):
        raise HTTPException(status_code=401, detail="Face mismatch")

    if not liveness_pass(img1, img2):
        raise HTTPException(status_code=400, detail="Liveness failed")

    now = datetime.now()
    in_time = datetime.strptime(
        f"{today} {log['in']}",
        "%d %b %Y %I:%M %p"
    )

    hours = round((now - in_time).total_seconds() / 3600, 2)

    logs_collection.update_one(
        {"_id": log["_id"]},
        {"$set": {
            "out": now.strftime("%I:%M %p"),
            "hours": hours
        }}
    )

    await notify_dashboard("checkout", {
        "email": email,
        "out": now.strftime("%I:%M %p")
    })

    return {
        "status": "success",
        "out": now.strftime("%I:%M %p"),
        "hours": hours
    }

# ================= ADMIN =================
attendance_collection = logs_collection

@app.post("/admin/login")
async def admin_login(
    email: str = Form(...),
    password: str = Form(...)
):
    user = users_collection.find_one({"email": email})

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account disabled")

    return {
        "status": "success",
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }

def admin_only(email: str):
    user = users_collection.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account disabled")

    return user

@app.get("/admin/me")
def admin_me(email: str):
    admin = admin_only(email)
    return {
        "status": "success",
        "name": admin["name"],
        "email": admin["email"],
        "role": admin["role"]
    }

@app.get("/admin/dashboard/stats")
def admin_dashboard_stats(email: str):
    admin_only(email)

    total_users = users_collection.count_documents({"role": "employee"})
    active_users = users_collection.count_documents(
        {"role": "employee", "active": True}
    )

    today = datetime.now().strftime("%d %b %Y")

    present_today = attendance_collection.count_documents({
        "date": today,
        "in": {"$exists": True}
    })

    absent_today = active_users - present_today

    return {
        "total_employees": total_users,
        "active_employees": active_users,
        "present_today": present_today,
        "absent_today": max(absent_today, 0)
    }

@app.get("/admin/users")
def admin_get_users(email: str):
    admin_only(email)

    users = list(users_collection.find(
        {"role": "employee"},
        {"password_hash": 0, "embedding": 0}
    ))

    for u in users:
        u["_id"] = str(u["_id"])

    return users

@app.get("/admin/attendance/user")
def admin_attendance_by_user(email: str, admin_email: str):
    admin_only(admin_email)

    records = list(logs_collection.find(
        {"email": email},
        {"_id": 0}
    ))

    return {"employee": email, "records": records}

@app.get("/admin/attendance/date")
def admin_attendance_by_date(date: str, admin_email: str):
    admin_only(admin_email)

    records = list(logs_collection.find(
        {"date": date},
        {"_id": 0}
    ))

    return {"date": date, "records": records}

@app.get("/admin/attendance/range")
def admin_attendance_range(
    start_date: str,
    end_date: str,
    admin_email: str
):
    admin_only(admin_email)

    records = list(logs_collection.find(
        {"date": {"$gte": start_date, "$lte": end_date}},
        {"_id": 0}
    ))

    return {
        "from": start_date,
        "to": end_date,
        "records": records
    }

@app.post("/admin/attendance/edit")
def admin_edit_attendance(
    record_email: str = Form(...),
    date: str = Form(...),
    new_in: str = Form(None),
    new_out: str = Form(None),
    new_status: str = Form(None),
    admin_email: str = Form(...)
):
    admin_only(admin_email)

    record = logs_collection.find_one({
        "email": record_email,
        "date": date
    })

    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    update = {}

    if new_in:
        update["in"] = new_in
    if new_out:
        update["out"] = new_out
    if new_status:
        update["status"] = new_status

    if update.get("in") and update.get("out"):
        try:
            in_time = datetime.strptime(
                f"{date} {update['in']}",
                "%d %b %Y %I:%M %p"
            )
            out_time = datetime.strptime(
                f"{date} {update['out']}",
                "%d %b %Y %I:%M %p"
            )
            update["hours"] = round(
                (out_time - in_time).total_seconds() / 3600, 2
            )
        except Exception:
            pass

    logs_collection.update_one(
        {"_id": record["_id"]},
        {"$set": update}
    )

    db = logs_collection.database
    db.attendance_audit.insert_one({
        "record_email": record_email,
        "date": date,
        "before": record,
        "edited_by": admin_email,
        "edited_at": datetime.utcnow()
    })

    return {"status": "updated", "updated_fields": list(update.keys())}
@app.post("/admin/user/toggle")
def toggle_user(
    email: str = Form(...),
    active: bool = Form(...),
    admin_email: str = Form(...)
):
    admin_only(admin_email)

    users_collection.update_one(
        {"email": email},
        {"$set": {"active": active}}
    )

    return {"status": "updated"}


# ================= ROUTERS =================
from app.attendance_routes import router as attendance_router
app.include_router(attendance_router)

from app.auth_routes import router as auth_router
app.include_router(auth_router)
