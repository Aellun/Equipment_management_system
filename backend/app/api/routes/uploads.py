import os
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from app.api.deps import require_staff

router = APIRouter(prefix="/uploads", tags=["Uploads"])

UPLOAD_DIR = "uploads"
ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/image", dependencies=[Depends(require_staff)])
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP or GIF images are allowed")

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 10 MB limit")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ALLOWED[file.content_type]}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(contents)

    # Served under /uploads (StaticFiles mount). Through nginx this resolves to /api/uploads/...
    return {"url": f"/uploads/{filename}"}
