from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
import uuid

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
os.makedirs("simple_uploads", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Simple FileShare API", "version": "1.0.0"}

@app.post("/api/v1/upload/")
async def upload_file(
    file: UploadFile = File(...),
    expiry_minutes: int = Form(30),
    password: str = Form(None)
):
    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        filepath = os.path.join("simple_uploads", filename)
        
        # Save file
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        # Return response
        return {
            "id": file_id,
            "short_code": file_id[:8],
            "download_url": f"/d/{file_id[:8]}",
            "expires_at": datetime.utcnow().isoformat(),
            "file_size": len(content),
            "original_filename": file.filename,
            "message": "Upload successful!"
        }
    except Exception as e:
        return {"error": str(e)}, 500

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)