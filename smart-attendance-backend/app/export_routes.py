import pandas as pd
import io
from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime
from typing import Optional
from app.db import users_collection, logs_collection
from app.security import require_role

router = APIRouter(prefix="/admin/export", tags=["Exports"])

def _generate_excel_response(records: list, filename: str):
    if not records:
        raise HTTPException(status_code=404, detail="No attendance records found.")
        
    df = pd.DataFrame(records)
    # Drop mongodb _id if it exists
    if "_id" in df.columns:
        df = df.drop(columns=["_id"])
        
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
        
    stream.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}.xlsx"'
    }
    return StreamingResponse(iter([stream.getvalue()]), headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@router.get("/day")
def export_day(
    date: str = Query(..., description="Format: '28 Feb 2026'"),
    branch: Optional[str] = Query(None),
    admin: dict = Depends(require_role("admin"))
):
    
    query = {"date": date}
    if branch:
        query["branch"] = branch
        
    logs = list(logs_collection.find(query))
    return _generate_excel_response(logs, f"Attendance_{date.replace(' ', '_')}")


@router.get("/range")
def export_range(
    start_date: str = Query(..., description="Format: '01 Feb 2026'"),
    end_date: str = Query(..., description="Format: '28 Feb 2026'"),
    branch: Optional[str] = Query(None),
    admin: dict = Depends(require_role("admin"))
):
    
    # Simple greater-than-equal text matching relies on alphabetical sorting which is NOT safe for date strings.
    # We should fetch all and parse, but for MVP we fetch matching regex if it's within same month, or just fetch all and filter in Python.
    
    start_dt = datetime.strptime(start_date, "%d %b %Y")
    end_dt = datetime.strptime(end_date, "%d %b %Y")
    
    query = {}
    if branch:
        query["branch"] = branch
        
    logs = list(logs_collection.find(query))
    
    filtered_logs = []
    for log in logs:
        try:
            log_dt = datetime.strptime(log["date"], "%d %b %Y")
            if start_dt <= log_dt <= end_dt:
                filtered_logs.append(log)
        except Exception:
            continue
            
    return _generate_excel_response(filtered_logs, "Attendance_Range_Export")


@router.get("/employee")
def export_employee(
    employee_email: str = Query(...),
    start_date: Optional[str] = Query(None, description="Format: '01 Feb 2026'"),
    end_date: Optional[str] = Query(None, description="Format: '28 Feb 2026'"),
    month_year: Optional[str] = Query(None, description="Format: 'Feb 2026'"),
    admin: dict = Depends(require_role("admin"))
):
    
    query = {"email": employee_email}
    if month_year:
        query["date"] = {"$regex": f"{month_year}$"}
        
    logs = list(logs_collection.find(query))
    
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%d %b %Y")
            end_dt = datetime.strptime(end_date, "%d %b %Y")
            filtered_logs = []
            for log in logs:
                try:
                    log_dt = datetime.strptime(log["date"], "%d %b %Y")
                    if start_dt <= log_dt <= end_dt:
                        filtered_logs.append(log)
                except Exception:
                    continue
            logs = filtered_logs
        except Exception:
            pass
            
    safe_email = employee_email.split('@')[0]
    return _generate_excel_response(logs, f"Attendance_{safe_email}")

