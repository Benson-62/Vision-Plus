from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from datetime import datetime
from app.db import users_collection, logs_collection
from app.security import require_role

router = APIRouter(prefix="/admin", tags=["Analytics & Leaderboard"])

@router.get("/analytics")
def get_analytics(
    month_year: str = Query(None, description="Format: 'Feb 2026'"),
    branch: Optional[str] = Query(None),
    admin: dict = Depends(require_role("admin"))
):
    
    if not month_year:
        month_year = datetime.now().strftime("%b %Y")
        
    query = {"date": {"$regex": f"{month_year}$"}}
    if branch:
        query["branch"] = branch
        
    logs = list(logs_collection.find(query))
    total_users_query = {"role": "employee", "active": True}
    if branch:
        total_users_query["branch"] = branch
        
    total_users = users_collection.count_documents(total_users_query)
    
    # We will approximate "valid working days" for the month dynamically
    import calendar
    now = datetime.now()
    try:
        req_month = datetime.strptime(month_year, "%b %Y")
    except:
        req_month = now
        
    year = req_month.year
    month = req_month.month
    
    # Calculate total working days (Mon-Fri) until today or end of the month
    today_date = now.date()
    cal = calendar.monthcalendar(year, month)
    working_days = 0
    
    for week in cal:
        for i, day in enumerate(week):
            if day == 0:
                continue
            # i=5 is Sat, i=6 is Sun
            if i < 5:
                current_date = datetime(year, month, day).date()
                if year == today_date.year and month == today_date.month:
                    if current_date <= today_date:
                        working_days += 1
                else:
                    working_days += 1
                    
    expected_logs = working_days * total_users if total_users > 0 else 0
    
    present = sum(1 for log in logs if log.get("status") == "Present")
    half_day = sum(1 for log in logs if log.get("status") == "Half Day")
    leave = sum(1 for log in logs if log.get("status", "").startswith("Leave"))
    
    # Calculate true absent correctly
    taken_actions = present + half_day + leave
    absent = expected_logs - taken_actions
    absent = max(0, absent)
    
    # Late mapping, Overtime sum
    lates_by_day = {}
    overtime_by_day = {}
    
    for log in logs:
        d = log["date"]
        lates_by_day[d] = lates_by_day.get(d, 0) + (1 if log.get("late") else 0)
        overtime_by_day[d] = overtime_by_day.get(d, 0.0) + log.get("overtime_hours", 0.0)
        
    # Prepare chart data
    late_trend = [{"name": k, "late_count": v} for k, v in lates_by_day.items()]
    late_trend.sort(key=lambda x: datetime.strptime(x["name"], "%d %b %Y"))
    
    overtime_trend = [{"name": k, "hours": round(v, 2)} for k, v in overtime_by_day.items()]
    overtime_trend.sort(key=lambda x: datetime.strptime(x["name"], "%d %b %Y"))
    
    pie_data = [
        {"name": "Absent", "value": absent},
        {"name": "Half Day", "value": half_day},
        {"name": "Leave", "value": leave},
        {"name": "Present", "value": present}
    ]
    
    attendance_percentage = 0
    if expected_logs > 0:
        attendance_percentage = round(((present + half_day) / expected_logs) * 100, 1)
        
    return {
        "attendance_percentage": attendance_percentage,
        "pie_data": pie_data,
        "late_trend": late_trend,
        "overtime_trend": overtime_trend
    }

@router.get("/leaderboard")
def get_leaderboard(
    month_year: str = Query(None, description="Format: 'Feb 2026'"),
    branch: Optional[str] = Query(None),
    admin: dict = Depends(require_role("admin"))
):
    
    if not month_year:
        month_year = datetime.now().strftime("%b %Y")
        
    users_query = {"role": "employee", "active": True}
    if branch:
        users_query["branch"] = branch
        
    employees = list(users_collection.find(users_query, {"password_hash": 0, "embedding": 0}))
    
    leaderboard = []
    
    for emp in employees:
        emp_email = emp["email"]
        logs = list(logs_collection.find({"email": emp_email, "date": {"$regex": f"{month_year}$"}}))
        
        # Calculate stats
        total_days = len(logs)
        if total_days == 0:
            continue
            
        present_count = 0
        half_day_count = 0
        late_count = 0
        early_exit_count = 0
        total_overtime = 0.0
        
        for log in logs:
            if log.get("status") == "Present":
                present_count += 1
            elif log.get("status") == "Half Day":
                half_day_count += 0.5
            if log.get("late"):
                late_count += 1
            if log.get("early_exit"):
                early_exit_count += 1
            total_overtime += log.get("overtime_hours", 0.0)
            
        attendance_pct = ((present_count + half_day_count) / total_days) * 100
        
        # Scoring formula
        base_score = attendance_pct * 0.8
        overtime_bonus = min(total_overtime * 2, 20)
        late_penalty = late_count * 2
        early_penalty = early_exit_count * 2
        
        score = base_score + overtime_bonus - late_penalty - early_penalty
        score = max(0, min(100, round(score, 1))) # clamp between 0 and 100
        
        badge = "Bronze"
        if score >= 90:
            badge = "Gold"
        elif score >= 75:
            badge = "Silver"
            
        leaderboard.append({
            "name": emp["name"],
            "email": emp["email"],
            "branch": emp.get("branch", "Main Office"),
            "attendance_pct": round(attendance_pct, 1),
            "late_count": late_count,
            "early_exits": early_exit_count,
            "overtime_hours": round(total_overtime, 1),
            "score": score,
            "badge": badge
        })
        
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return {"month": month_year, "leaderboard": leaderboard}
