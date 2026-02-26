from fastapi import APIRouter, HTTPException, Form, Depends
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.db import leave_requests_collection, users_collection, logs_collection
from app.security import require_role, get_current_user

router = APIRouter(prefix="/leave", tags=["Leave Application"])

class LeaveRequestBase(BaseModel):
    email: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    attachment_url: Optional[str] = None

@router.post("/apply")
async def apply_leave(request: LeaveRequestBase, current_user: dict = Depends(get_current_user)):
    user = users_collection.find_one({"email": request.email})
    if not user or user["email"] != current_user["email"]:
        raise HTTPException(status_code=403, detail="Unauthorized leave request")

    try:
        sd = datetime.strptime(request.start_date, "%d %b %Y")
        ed = datetime.strptime(request.end_date, "%d %b %Y")
        days = (ed - sd).days + 1
        if days <= 0:
            raise HTTPException(status_code=400, detail="End date must be after start date")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use 'DD MMM YYYY'")
        
    leave_balance = user.get("leave_balance", 20)
    
    # Certain leaves might not deduct from standard balance, but for simplicity assuming all do,
    # except maybe Unpaid Leave or Compensatory Off.
    if request.leave_type not in ["Unpaid Leave", "Half-Day Leave"]:
        if days > leave_balance:
            raise HTTPException(status_code=400, detail=f"Insufficient leave balance. You are applying for {days} days but have {leave_balance} balance.")
            
    # Leave Limit per year validation (Example limit: max 30 days total in a year)
    current_year = datetime.utcnow().year
    yearly_leaves = list(leave_requests_collection.find({
        "employee_email": request.email,
        "status": "Approved"
    }))
    yearly_days_taken = sum([r.get("days", 0) for r in yearly_leaves if r.get("applied_at", datetime.utcnow()).year == current_year])
    if yearly_days_taken + days > 30:
        raise HTTPException(status_code=400, detail="Yearly leave limit of 30 days exceeded.")

    leave_requests_collection.insert_one({
        "employee_email": request.email,
        "employee_name": user.get("name", request.email),
        "leave_type": request.leave_type,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "days": days,
        "reason": request.reason,
        "attachment_url": request.attachment_url,
        "status": "Pending",
        "applied_at": datetime.utcnow(),
        "year": current_year
    })

    from app.main import notify_dashboard
    await notify_dashboard("leave_applied", {
        "email": request.email,
        "name": user.get("name", request.email),
        "leave_type": request.leave_type,
        "start_date": request.start_date,
        "end_date": request.end_date
    })

    return {"status": "success", "message": "Leave application submitted."}

@router.get("/history")
def get_user_leave_history(current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    requests = list(leave_requests_collection.find({"employee_email": email}).sort("applied_at", -1))
    
    for r in requests:
        r["_id"] = str(r["_id"])
        
    user = users_collection.find_one({"email": email})
        
    return {
        "status": "success", 
        "history": requests,
        "leave_balance": user.get("leave_balance", 20)
    }

@router.get("/admin/pending")
def get_pending_leaves(admin: dict = Depends(require_role("admin"))):

    requests = list(leave_requests_collection.find({"status": "Pending"}))
    for r in requests:
        r["_id"] = str(r["_id"])
    
    return requests

@router.get("/admin/history")
def get_all_leave_history(admin: dict = Depends(require_role("admin"))):
    requests = list(leave_requests_collection.find({
        "status": {"$in": ["Approved", "Rejected"]}
    }).sort("processed_at", -1))
    
    for r in requests:
        r["_id"] = str(r["_id"])
        
    return requests

from app.websocket_manager import send_system_notification

@router.post("/admin/approve")
async def approve_leave(request_id: str = Form(...), admin: dict = Depends(require_role("admin"))):
    admin_email = admin["email"]

    from bson import ObjectId
    try:
        obj_id = ObjectId(request_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    leave_req = leave_requests_collection.find_one({"_id": obj_id})
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    if leave_req.get("status") == "Approved":
        raise HTTPException(status_code=400, detail="Leave is already approved")
    
    leave_requests_collection.update_one(
        {"_id": obj_id},
        {"$set": {"status": "Approved", "approved_by": admin_email, "processed_at": datetime.utcnow()}}
    )

    # Deduct Leave Balance
    days = leave_req.get("days", 1)
    if leave_req["leave_type"] == "Half-Day Leave":
        days = 0.5
        
    if leave_req["leave_type"] != "Unpaid Leave":
        users_collection.update_one(
            {"email": leave_req["employee_email"]},
            {"$inc": {"leave_balance": -days}}
        )

    # Insert attendance log for the duration
    from datetime import timedelta
    try:
        sd = datetime.strptime(leave_req["start_date"], "%d %b %Y")
        ed = datetime.strptime(leave_req["end_date"], "%d %b %Y")
        
        current_date = sd
        while current_date <= ed:
            date_str = current_date.strftime("%d %b %Y")
            
            log = logs_collection.find_one({"email": leave_req["employee_email"], "date": date_str})
            if log:
                logs_collection.update_one(
                    {"_id": log["_id"]},
                    {"$set": {"status": f"Leave: {leave_req['leave_type']}"}}
                )
            else:
                logs_collection.insert_one({
                    "email": leave_req["employee_email"],
                    "date": date_str,
                    "in": "--",
                    "out": "--",
                    "hours": 0,
                    "status": f"Leave: {leave_req['leave_type']}",
                    "location": "System (Leave Approved)",
                    "timestamp": datetime.now()
                })
            current_date += timedelta(days=1)
    except Exception as e:
        print(f"Error inserting logs: {e}")
    
    await send_system_notification(
        email=leave_req["employee_email"],
        title="Leave Approved",
        message=f"Your {leave_req['leave_type']} leave from {leave_req.get('start_date')} to {leave_req.get('end_date')} has been approved."
    )
    
    return {"status": "success", "message": "Leave approved"}

@router.post("/admin/reject")
async def reject_leave(request_id: str = Form(...), admin: dict = Depends(require_role("admin"))):
    admin_email = admin["email"]

    from bson import ObjectId
    try:
        obj_id = ObjectId(request_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    leave_requests_collection.update_one(
        {"_id": obj_id},
        {"$set": {"status": "Rejected", "rejected_by": admin_email, "processed_at": datetime.utcnow()}}
    )

    leave_req = leave_requests_collection.find_one({"_id": obj_id})
    if leave_req:
        await send_system_notification(
            email=leave_req["employee_email"],
            title="Leave Rejected",
            message=f"Your {leave_req['leave_type']} leave from {leave_req.get('start_date')} to {leave_req.get('end_date')} was rejected."
        )

    return {"status": "success", "message": "Leave rejected"}
