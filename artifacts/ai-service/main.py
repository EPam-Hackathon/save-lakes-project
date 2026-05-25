import os
import io
import json
import uuid
import boto3
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

from vision import analyze_image

app = FastAPI(title="LakeGuard AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.environ.get("AWS_S3_BUCKET_NAME", "")
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

if not firebase_admin._apps:
    try:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID})
    except Exception:
        firebase_admin.initialize_app(options={"projectId": FIREBASE_PROJECT_ID})

try:
    db_firestore = firestore.client()
except Exception:
    db_firestore = None


class AnalysisResult(BaseModel):
    image_url: str
    algae_bloom: bool
    plastic_debris: bool
    confidence: float
    status: str
    message: str


class NotificationPayload(BaseModel):
    title: str
    message: str
    type: str = "info"
    target_pincode: Optional[str] = None


class RsvpPayload(BaseModel):
    user_email: str
    campaign_id: str
    status: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "lakeguard-ai"}


@app.post("/upload-image", response_model=AnalysisResult)
async def upload_image(file: UploadFile = File(...)):
    """
    Accepts an image, uploads to S3, runs YOLO analysis, stores result in Firebase.
    """
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    ext = (file.filename or "image.jpg").split(".")[-1]
    key = f"lake-images/{uuid.uuid4()}.{ext}"

    try:
        s3_client.upload_fileobj(
            io.BytesIO(contents),
            AWS_S3_BUCKET,
            key,
            ExtraArgs={"ContentType": file.content_type or "image/jpeg"},
        )
        image_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{key}"
    except Exception as e:
        image_url = ""
        print(f"S3 upload failed: {e}")

    result = analyze_image(contents)

    detected = []
    if result["algae_bloom"]:
        detected.append("algae bloom")
    if result["plastic_debris"]:
        detected.append("plastic debris")

    status = "alert" if detected else "clear"
    message = (
        f"Detected: {', '.join(detected)}" if detected else "No contamination detected"
    )

    if db_firestore and detected:
        try:
            db_firestore.collection("notifications").add({
                "title": "Lake Alert",
                "message": f"AI detected {' and '.join(detected)} at lake site",
                "type": "alert",
                "createdAt": firestore.SERVER_TIMESTAMP,
                "imageUrl": image_url,
            })
        except Exception as e:
            print(f"Firestore write failed: {e}")

    return AnalysisResult(
        image_url=image_url,
        algae_bloom=result["algae_bloom"],
        plastic_debris=result["plastic_debris"],
        confidence=result["confidence"],
        status=status,
        message=message,
    )


@app.get("/images")
def list_images():
    """List all lake images from S3 with analysis results."""
    try:
        response = s3_client.list_objects_v2(
            Bucket=AWS_S3_BUCKET, Prefix="lake-images/"
        )
        objects = response.get("Contents", [])
        images = []
        for obj in objects:
            url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{obj['Key']}"
            images.append({
                "key": obj["Key"],
                "url": url,
                "size": obj["Size"],
                "lastModified": obj["LastModified"].isoformat(),
            })
        return {"images": images}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/notify")
def send_notification(payload: NotificationPayload):
    """Push notification to all users (stored in Firebase)."""
    if not db_firestore:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    try:
        doc_ref = db_firestore.collection("notifications").add({
            "title": payload.title,
            "message": payload.message,
            "type": payload.type,
            "targetPincode": payload.target_pincode or "all",
            "createdAt": firestore.SERVER_TIMESTAMP,
        })
        return {"success": True, "id": doc_ref[1].id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rsvp")
def update_rsvp(payload: RsvpPayload):
    """Update RSVP for a campaign."""
    if not db_firestore:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    try:
        rsvp_id = f"{payload.campaign_id}_{payload.user_email.replace('@', '_').replace('.', '_')}"
        db_firestore.collection("rsvp").document(rsvp_id).set({
            "campaignId": payload.campaign_id,
            "userEmail": payload.user_email,
            "status": payload.status,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rsvp/{campaign_id}")
def get_rsvp(campaign_id: str):
    """Get all RSVPs for a campaign."""
    if not db_firestore:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    try:
        docs = (
            db_firestore.collection("rsvp")
            .where("campaignId", "==", campaign_id)
            .where("status", "==", "accepted")
            .stream()
        )
        attendees = [{"id": d.id, **d.to_dict()} for d in docs]
        return {"campaign_id": campaign_id, "attendees": attendees, "count": len(attendees)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
