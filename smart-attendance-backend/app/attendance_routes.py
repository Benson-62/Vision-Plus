from fastapi import APIRouter, Query, HTTPException, Body
from datetime import datetime
from pydantic import BaseModel
from app.db import logs_collection

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# ================= HISTORY =================
@router.get("/history")
def get_attendance_history(email: str = Query(...)):
    records = logs_collection.find(
        {"email": email}
    ).sort("date", -1)

    result = []

    for r in records:
        result.append({
            "date": r.get("date", ""),
            "in": r.get("in", "--"),
            "out": r.get("out", "--"),
            "hours": r.get("hours", 0),
            "status": r.get("status", "Present"),
            "location": r.get("location", "Reception")
        })

    return result


# ================= STATUS =================
@router.get("/status")
def get_attendance_status(email: str = Query(...)):
    today = datetime.now().strftime("%d %b %Y")

    record = logs_collection.find_one({
        "email": email,
        "date": today
    })

    return {
        "active": bool(record)
    }


# ================= MONTH VIEW (CALENDAR) =================
@router.get("/month")
def get_month_attendance(
    email: str,
    year: int,
    month: int
):
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    month_prefix = datetime(year, month, 1).strftime("%b %Y")

    records = list(logs_collection.find({
        "email": email,
        "date": {"$regex": month_prefix}
    }))

    days = []
    
    total_days = len(records)
    present_days = 0
    late_days = 0
    half_days = 0
    absent_days = 0
    total_hours = 0
    
    for r in records:
        status = r.get("status", "Present")
        hours = r.get("hours", 0)
        
        if status == "Present": present_days += 1
        elif status == "Half Day": half_days += 1
        elif status == "Absent": absent_days += 1
        
        if r.get("late"): late_days += 1
        
        total_hours += hours
        
        days.append({
            "date": r.get("date"),
            "check_in": r.get("in"),
            "check_out": r.get("out"),
            "total_hours": hours,
            "late": r.get("late", False),
            "late_minutes": r.get("late_minutes", 0),
            "early_exit": r.get("early_exit", False),
            "overtime": r.get("overtime_hours", 0),
            "status": status,
            "location": r.get("location", "Reception")
        })

    attendance_percentage = 0
    if total_days > 0:
        attendance_percentage = round(((present_days + (half_days * 0.5)) / total_days) * 100, 2)
        
    return {
        "days": days,
        "summary": {
            "total_working_days": total_days,
            "present_days": present_days,
            "half_days": half_days,
            "absent_days": absent_days,
            "late_days": late_days,
            "total_hours": round(total_hours, 2),
            "attendance_percentage": attendance_percentage
        }
    }

# ================= GEOFENCE DETECTIONS =================
class GeofencePayload(BaseModel):
    email: str
    exit_time: str = None

@router.post("/exit-detected")
def exit_detected(payload: GeofencePayload):
    today = datetime.now().strftime("%d %b %Y")
    now = datetime.now()
    
    # Parse exit time or use now
    exit_dt = now
    if payload.exit_time:
        try:
            exit_dt = datetime.fromisoformat(payload.exit_time.replace('Z', '+00:00'))
        except Exception:
            pass

    record = logs_collection.find_one({"email": payload.email, "date": today, "out": None})
    if not record:
        raise HTTPException(status_code=400, detail="Cannot process exit: Not checked in or already checked out")
        
    logs_collection.update_one(
        {"_id": record["_id"]},
        {"$set": {
            "inside_status": "Outside",
            "exit_time": exit_dt,
            "grace_active": True
        }}
    )
    return {"status": "success", "message": "Exit marked, grace period started"}

@router.post("/return-detected")
def return_detected(payload: GeofencePayload):
    today = datetime.now().strftime("%d %b %Y")
    
    record = logs_collection.find_one({"email": payload.email, "date": today, "out": None})
    if not record:
        raise HTTPException(status_code=400, detail="Cannot process return: Not checked in or already checked out")
        
    logs_collection.update_one(
        {"_id": record["_id"]},
        {"$set": {
            "inside_status": "Inside",
            "grace_active": False,
            "exit_time": None
        }}
    )
    return {"status": "success", "message": "Return marked, grace period cancelled"}

