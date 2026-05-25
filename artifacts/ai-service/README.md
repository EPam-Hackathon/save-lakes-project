# LakeGuard AI Service

Python FastAPI service for lake image processing and AI detection.

## Setup

```bash
pip install -r requirements.txt
python main.py
```

## Endpoints

- `GET /health` — health check
- `POST /upload-image` — upload lake image, runs YOLO detection, stores in S3 + Firebase
- `GET /images` — list all images from S3
- `POST /notify` — send notification to all users
- `POST /rsvp` — update campaign RSVP
- `GET /rsvp/{campaign_id}` — get attendees for a campaign

## AI Detection

The vision layer uses YOLOv8 for:
- **Algae Bloom** detection (green surface coverage)
- **Plastic Debris** detection (floating waste objects)

Falls back to color heuristics when model is unavailable.
