import os
from jose import jwt, JWTError

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3NzIwOTkzNzN9.SVokf0eE-7lUosNWbdv_6dCGIJpE_e2RN4A92-CDuO8"

SECRET_KEY = "super-secret-key-please-change-in-prod-1234"
ALGORITHM = "HS256"

try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    print("SUCCESS", payload)
except JWTError as e:
    print("JWTError:", type(e).__name__, str(e))
except Exception as e:
    print("Exception", type(e).__name__, str(e))
