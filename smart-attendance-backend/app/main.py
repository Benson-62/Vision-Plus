from fastapi import (
    FastAPI, UploadFile, File, Form, Request,
    HTTPException, WebSocket, WebSocketDisconnect, Query, Depends
)
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from datetime import datetime, date
import numpy as np
import cv2
import io
import base64
from PIL import Image

from .db import users_collection, logs_collection, attendance_audit_collection
from .face_utils import get_face_embedding, compare_embeddings
from .security import hash_password, verify_password, get_current_user, require_role
from apscheduler.schedulers.background import BackgroundScheduler
import math

# ================= APP =================
app = FastAPI(title="Smart Attendance API", version="1.0.0")

# ================= CORS =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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

# ================= BACKGROUND SCHEDULER =================
def auto_checkout_job():
    now = datetime.now()
    # Find all records where person is marked outside and grace period is active
    records = list(logs_collection.find({"inside_status": "Outside", "grace_active": True}))
    for record in records:
        exit_time = record.get("exit_time")
        if exit_time and (now - exit_time).total_seconds() >= 15 * 60:
            # 15 minutes elapsed since exit - Auto Checkout
            
            # Recreate in_time
            in_time_str = record.get("in")
            date_str = record.get("date")
            if not in_time_str or not date_str:
                continue
            
            try:
                in_time = datetime.strptime(f"{date_str} {in_time_str}", "%d %b %Y %I:%M %p")
            except Exception:
                in_time = exit_time # fallback
                
            hours = round((exit_time - in_time).total_seconds() / 3600, 2)
            early_exit = hours < 8.0
            overtime_hours = max(0.0, hours - 8.0)
            
            out_str = exit_time.strftime("%I:%M %p")
            
            from app.db import notifications_collection
            
            logs_collection.update_one(
                {"_id": record["_id"]},
                {"$set": {
                    "out": out_str,
                    "hours": hours,
                    "status": "Completed", 
                    "inside_status": "Outside",
                    "auto_checkout": True,
                    "checkout_reason": "Left Premises (Auto Checkout)",
                    "grace_active": False,
                    "early_exit": early_exit,
                    "overtime_hours": overtime_hours,
                    "timestamp": now
                }}
            )

            # Insert system notification
            notif_doc = {
                "user_email": record.get("email"),
                "title": "Auto Checkout Triggered",
                "message": f"You were automatically checked out at {out_str} because you left the premises.",
                "type": "system",
                "read": False,
                "timestamp": datetime.utcnow().isoformat()
            }
            notifications_collection.insert_one(notif_doc)

scheduler = BackgroundScheduler()
scheduler.add_job(auto_checkout_job, 'interval', minutes=2)

@app.on_event("startup")
def startup_event():
    scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

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

# ================= PROFILE =================
@app.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    user = users_collection.find_one(
        {"email": current_user["email"]},
        {"password_hash": 0, "embedding": 0}
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["_id"] = str(user["_id"])
    return user

# ================= UPDATE USER =================
@app.post("/update_user")
async def update_user(
    name: str = Form(None),
    image: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
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

    users_collection.update_one({"email": current_user["email"]}, {"$set": update})
    return {"status": "updated"}

# ================= HELPERS =================
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def liveness_pass(img1: bytes, img2: bytes) -> bool:
    def to_gray(b):
        img = Image.open(io.BytesIO(b)).convert("L")
        return np.array(img, dtype="float32")

    g1 = to_gray(img1)
    g2 = cv2.resize(to_gray(img2), (g1.shape[1], g1.shape[0]))
    diff = float(np.mean(np.abs(g1 - g2)))
    return diff >= 5.0

# ================= CHECK‑IN =================
from app.config_routes import office_location

@app.post("/checkin_live")
async def checkin_live(
    email: str = Form(...),
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
    latitude: float = Form(None),
    longitude: float = Form(None)
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

    if latitude is not None and longitude is not None:
        dist = haversine(latitude, longitude, office_location["latitude"], office_location["longitude"])
        if dist > office_location["radius"]:
            raise HTTPException(status_code=400, detail="Not inside office radius")

    now = datetime.now()
    today = now.strftime("%d %b %Y")

    # Add 10-minute cooldown check
    existing_log = logs_collection.find_one({"email": email, "date": today})
    if existing_log:
        last_time = existing_log.get("timestamp")
        if last_time and (now - last_time).total_seconds() < 600:
            raise HTTPException(status_code=400, detail="Please wait 10 minutes between attendance actions.")

    late = False
    late_minutes = 0
    start_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
    grace_time = now.replace(hour=9, minute=15, second=0, microsecond=0)
    
    if now > grace_time:
        late = True
        late_minutes = int((now - start_time).total_seconds() / 60)
        
    branch = user.get("branch", "Main Office")

    if not existing_log:
        logs_collection.insert_one({
            "email": email,
            "date": today,
            "in": now.strftime("%I:%M %p"),
            "out": None,
            "hours": 0,
            "status": "Present",
            "location": "Reception",
            "inside_status": "Inside",
            "grace_active": False,
            "late": late,
            "late_minutes": late_minutes,
            "branch": branch,
            "timestamp": now
        })
    else:
        # If checked in again (e.g. after checking out), just update timestamp
        logs_collection.update_one(
            {"_id": existing_log["_id"]},
            {"$set": {"timestamp": now}}
        )

    user_name = user.get("name", email)
    await notify_dashboard("checkin", {"email": email, "name": user_name, "time": now.strftime("%I:%M %p"), "status": "Present"})
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
    # 10 minute cooldown check
    last_time = log.get("timestamp")
    if last_time and (now - last_time).total_seconds() < 600:
        raise HTTPException(status_code=400, detail="Please wait 10 minutes between attendance actions.")

    in_time = datetime.strptime(
        f"{today} {log['in']}",
        "%d %b %Y %I:%M %p"
    )

    hours = round((now - in_time).total_seconds() / 3600, 2)

    early_exit = hours < 8.0
    overtime_hours = max(0.0, hours - 8.0)

    # Half day logic
    if hours >= 8:
        new_status = "Present"
    elif hours >= 4:
        new_status = "Half Day"
    else:
        new_status = "Absent"

    logs_collection.update_one(
        {"_id": log["_id"]},
        {"$set": {
            "out": now.strftime("%I:%M %p"),
            "hours": hours,
            "status": new_status,
            "inside_status": "Outside",
            "grace_active": False,
            "early_exit": early_exit,
            "overtime_hours": round(overtime_hours, 2),
            "timestamp": now
        }}
    )

    user_name = user.get("name", email)
    await notify_dashboard("checkout", {
        "email": email,
        "name": user_name,
        "out": now.strftime("%I:%M %p"),
        "hours": hours,
        "status": new_status
    })

    return {
        "status": "success",
        "out": now.strftime("%I:%M %p"),
        "hours": hours,
        "attendance_status": new_status
    }

# ================= ADMIN =================
attendance_collection = logs_collection

@app.get("/admin/me")
def admin_me(admin: dict = Depends(require_role("admin"))):
    return {
        "status": "success",
        "name": admin["name"],
        "email": admin["email"],
        "role": admin["role"]
    }

@app.get("/admin/dashboard/stats")
def admin_dashboard_stats(admin: dict = Depends(require_role("admin"))):
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

@app.get("/admin/attendance/daily-summary")
def get_daily_summary(
    date: str = Query(None), 
    admin: dict = Depends(require_role("admin"))
):
    
    if not date:
        date = datetime.now().strftime("%d %b %Y")
        
    total_users = users_collection.count_documents({"role": "employee", "active": True})
    
    logs = list(logs_collection.find({"date": date}))
    present_count = 0
    half_day_count = 0
    leave_count = 0
    
    for log in logs:
        status = log.get("status", "")
        if status == "Present":
            present_count += 1
        elif status == "Half Day":
            half_day_count += 1
        elif status.startswith("Leave"):
            leave_count += 1
            
    absent_count = total_users - (present_count + half_day_count + leave_count)
    
    return {
        "date": date,
        "total_employees": total_users,
        "present_count": present_count,
        "half_day_count": half_day_count,
        "leave_count": leave_count,
        "absent_count": max(absent_count, 0)
    }

@app.get("/users")
def get_public_users(current_user: dict = Depends(get_current_user)):
    # Any logged in user can fetch the list of active users to chat with
    users = list(users_collection.find(
        {"active": True},
        {"password_hash": 0, "embedding": 0}
    ))
    for u in users:
        u["_id"] = str(u["_id"])
    return users

@app.get("/admin/users")
def admin_get_users(admin: dict = Depends(require_role("admin"))):
    users = list(users_collection.find(
        {"role": "employee"},
        {"password_hash": 0, "embedding": 0}
    ))

    for u in users:
        u["_id"] = str(u["_id"])

    return users

@app.get("/admin/live-presence")
def admin_live_presence(admin: dict = Depends(require_role("admin"))):
    today = datetime.now().strftime("%d %b %Y")
    
    # Get all active records for today (not checked out)
    records = list(logs_collection.find({"date": today, "out": None}))
    
    total_inside = 0
    total_outside = 0
    employees = []
    
    for r in records:
        inside = r.get("inside_status", "Inside")
        if inside == "Inside":
            total_inside += 1
        else:
            total_outside += 1
            
        employees.append({
            "email": r.get("email"),
            "inside_status": inside,
            "last_verified": r.get("timestamp"),
            "auto_checkout": r.get("auto_checkout", False)
        })
        
    return {
        "total_inside": total_inside,
        "total_outside": total_outside,
        "employees": employees
    }

@app.get("/admin/attendance/user")
def admin_attendance_by_user(
    email: str, 
    admin: dict = Depends(require_role("admin"))
):

    records = list(logs_collection.find(
        {"email": email},
        {"_id": 0}
    ))

    return {"employee": email, "records": records}

@app.get("/admin/attendance/date")
def admin_attendance_by_date(
    date: str, 
    admin: dict = Depends(require_role("admin"))
):

    records = list(logs_collection.find(
        {"date": date},
        {"_id": 0}
    ))

    return {"date": date, "records": records}

@app.get("/admin/attendance/range")
def admin_attendance_range(
    start_date: str,
    end_date: str,
    admin: dict = Depends(require_role("admin"))
):

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
    admin: dict = Depends(require_role("admin"))
):
    admin_email = admin["email"]

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

    attendance_audit_collection.insert_one({
        "record_id": str(record["_id"]),
        "old_data": {k: v for k, v in record.items() if k in update},
        "new_data": update,
        "edited_by": admin_email,
        "timestamp": datetime.utcnow()
    })

    return {"status": "updated", "updated_fields": list(update.keys())}
@app.post("/admin/user/toggle")
def toggle_user(
    email: str = Form(...),
    active: bool = Form(...),
    admin: dict = Depends(require_role("admin"))
):

    users_collection.update_one(
        {"email": email},
        {"$set": {"active": active}}
    )

    return {"status": "updated"}


@app.get("/admin/audit")
def get_audit_logs(
    limit: int = Query(50),
    admin: dict = Depends(require_role("admin"))
):
    
    # Needs attendance_audit_collection imported at the top, which it is.
    logs = list(attendance_audit_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return logs
    
from app.db import notifications_collection
from app.websocket_manager import manager

@app.post("/admin/broadcast")
async def admin_broadcast(
    message: str = Form(...),
    admin: dict = Depends(require_role("admin"))
):
    """Sends a broadcast message to all users and saves it as a notification."""
    now_str = datetime.utcnow().isoformat()
    
    notif_doc = {
        "user_email": "ALL",
        "title": "Admin Broadcast",
        "message": message,
        "type": "broadcast",
        "read": False,
        "timestamp": now_str
    }
    
    res = notifications_collection.insert_one(notif_doc)
    notif_doc["_id"] = str(res.inserted_id)
    
    # Push via websocket to all connected clients
    await manager.broadcast(notif_doc)
    
    return {"status": "broadcast_sent"}


# ================= ROUTERS =================
from app.attendance_routes import router as attendance_router
app.include_router(attendance_router)

from app.auth_routes import router as auth_router
app.include_router(auth_router)

from app.leave_routes import router as leave_router
app.include_router(leave_router)

from app.analytics_routes import router as analytics_router
app.include_router(analytics_router)

from app.export_routes import router as export_router
app.include_router(export_router)

from app.config_routes import router as config_router
app.include_router(config_router)

from app.messaging_routes import router as messaging_router
app.include_router(messaging_router)

from app.admin_routes import router as admin_router
app.include_router(admin_router)

from app.upload_routes import router as upload_router
app.include_router(upload_router)

