from fastapi import APIRouter, Depends, HTTPException, Query, Form, UploadFile, File
from app.db import users_collection, logs_collection, leave_requests_collection
from app.security import require_role, hash_password
from app.face_utils import get_face_embedding
from bson import ObjectId
from typing import Optional
from datetime import datetime
import os
import uuid
import pandas as pd
import io

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.post("/add-employee")
async def add_employee(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form("employee"),
    department: str = Form(None),
    reporting_manager: str = Form(None),
    leave_balance: int = Form(20),
    photo: UploadFile = File(None),
    admin: dict = Depends(require_role("admin"))
):
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = {
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "role": role,
        "active": True,
        "department": department,
        "reporting_manager": reporting_manager,
        "leave_balance": leave_balance,
        "created_at": datetime.utcnow()
    }

    if photo:
        content = await photo.read()
        emb = get_face_embedding(content)
        if emb is None:
            raise HTTPException(status_code=400, detail="Could not detect a face in the provided photo. Try another image.")
        
        # Save photo
        upload_dir = os.path.join("uploads", "faces")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(photo.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(upload_dir, unique_filename)
        with open(filepath, "wb") as buffer:
            buffer.write(content)

        new_user["face_embedding"] = emb.tolist()
        new_user["photo_url"] = f"/uploads/faces/{unique_filename}"
    
    users_collection.insert_one(new_user)
    return {"status": "success", "message": "Employee created successfully"}

@router.put("/update-employee/{id}")
async def update_employee(
    id: str,
    name: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    reporting_manager: Optional[str] = Form(None),
    leave_balance: Optional[int] = Form(None),
    active: Optional[bool] = Form(None),
    password: Optional[str] = Form(None),
    admin: dict = Depends(require_role("admin"))
):
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid employee ID")
        
    user = users_collection.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = {}
    if name is not None: update_data["name"] = name
    if role is not None: update_data["role"] = role
    if department is not None: update_data["department"] = department
    if reporting_manager is not None: update_data["reporting_manager"] = reporting_manager
    if leave_balance is not None: update_data["leave_balance"] = leave_balance
    if active is not None: update_data["active"] = active
    if password is not None: update_data["password_hash"] = hash_password(password)
    
    if update_data:
        users_collection.update_one({"_id": obj_id}, {"$set": update_data})
        
    return {"status": "success", "message": "Employee updated successfully"}

@router.delete("/delete-employee/{id}")
async def delete_employee(
    id: str,
    admin: dict = Depends(require_role("admin")) # Super Admin checking could be done here if needed
):
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid employee ID")
        
    result = users_collection.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    return {"status": "success", "message": "Employee deleted"}

@router.post("/bulk-upload")
async def bulk_upload_employees(
    file: UploadFile = File(...),
    admin: dict = Depends(require_role("admin"))
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Only Excel or CSV files are allowed")
        
    try:
        content = await file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        required_cols = {"name", "email", "password"}
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(status_code=400, detail=f"Missing required columns. Required: {required_cols}")
            
        inserted_count = 0
        skipped_count = 0
        
        for _, row in df.iterrows():
            email = str(row.get("email")).strip()
            if users_collection.find_one({"email": email}):
                skipped_count += 1
                continue
                
            new_user = {
                "name": str(row.get("name")).strip(),
                "email": email,
                "password_hash": hash_password(str(row.get("password"))),
                "role": str(row.get("role", "employee")).strip() or "employee",
                "department": str(row.get("department", "")).strip() or None,
                "reporting_manager": str(row.get("reporting_manager", "")).strip() or None,
                "leave_balance": int(row.get("leave_balance", 20)) if pd.notna(row.get("leave_balance")) else 20,
                "active": True,
                "created_at": datetime.utcnow()
            }
            users_collection.insert_one(new_user)
            inserted_count += 1
            
        return {
            "status": "success", 
            "message": f"Bulk upload completed. Inserted: {inserted_count}, Skipped (Already exists): {skipped_count}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

# ================= ATTENDANCE TABLE API =================

@router.get("/attendance-table")
async def get_attendance_table(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    date: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: dict = Depends(require_role("admin"))
):
    query = {}
    if date:
        query["date"] = date
        
    users_filter = {}
    if department:
        users_filter["department"] = department
    if search:
        users_filter["name"] = {"$regex": search, "$options": "i"}
        
    if users_filter:
        matching_users = list(users_collection.find(users_filter, {"email": 1, "name": 1, "department": 1}))
        matching_emails = [u["email"] for u in matching_users]
        query["email"] = {"$in": matching_emails}
        
        # Build lookup map for efficiency
        user_map = {u["email"]: {"name": u.get("name"), "department": u.get("department")} for u in matching_users}
    else:
        user_map = {}
        
    total = logs_collection.count_documents(query)
    
    records = list(logs_collection.find(query)
                 .sort("timestamp", -1)
                 .skip((page - 1) * limit)
                 .limit(limit))
                 
    # If users weren't filtered above, fetch their details now
    if not users_filter:
        emails_to_fetch = [r["email"] for r in records if r["email"] not in user_map]
        if emails_to_fetch:
            fetched_users = users_collection.find({"email": {"$in": emails_to_fetch}}, {"email": 1, "name": 1, "department": 1})
            for u in fetched_users:
                user_map[u["email"]] = {"name": u.get("name"), "department": u.get("department")}
                
    result = []
    for r in records:
        email = r.get("email")
        u_info = user_map.get(email, {})
        
        result.append({
            "id": str(r["_id"]),
            "employee_id": str(r.get("employee_id", "")), # Assuming employee_id field might exist, fallback to string
            "email": email,
            "name": u_info.get("name", email),
            "department": u_info.get("department", "N/A"),
            "date": r.get("date"),
            "check_in": r.get("in"),
            "check_out": r.get("out"),
            "total_hours": r.get("hours", 0),
            "late_minutes": r.get("late_minutes", 0),
            "early_exit_minutes": max(0, int((8 - r.get("hours", 8)) * 60)) if r.get("early_exit") else 0,
            "overtime_minutes": int(r.get("overtime_hours", 0) * 60),
            "attendance_status": r.get("status"),
            "auto_checkout": r.get("auto_checkout", False)
        })
        
    return {
        "status": "success",
        "data": result,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    }
