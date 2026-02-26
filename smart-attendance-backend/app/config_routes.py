from fastapi import APIRouter

router = APIRouter(prefix="/config", tags=["Config"])

# Hardcoded office location for now
office_location = {
    "latitude": 10.0274,  # example coordinates, should ideally come from db/env
    "longitude": 76.3075,
    "radius": 120  # meters
}

@router.get("/office-location")
def get_office_location():
    return office_location
