from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
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

    records = logs_collection.find({
        "email": email,
        "date": {"$regex": month_prefix}
    })

    days = []

    for r in records:
        days.append({
            "date": r.get("date"),
            "in": r.get("in"),
            "out": r.get("out"),
            "hours": r.get("hours", 0),
            "status": r.get("status", "Present"),
            "location": r.get("location", "Reception")
        })

    return days
