# LakeGuard — Lake Monitoring System

A full-stack lake monitoring platform with AI-powered contamination detection, volunteer management, campaign coordination, and real-time alerts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Node.js API server (port varies, see workflow)
- `pnpm --filter @workspace/lake-monitor run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- Required env: Firebase credentials (FIREBASE_*), AWS credentials (AWS_*)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Mobile**: Expo (React Native) with Firebase SDK
- **API**: Express 5 (Node.js) — proxies to AI service
- **AI Service**: Python FastAPI + YOLO (see `artifacts/ai-service/`)
- **Auth**: Firebase Auth (email/password + Google OAuth)
- **Database**: Firebase Firestore
- **File Storage**: AWS S3
- **AI**: YOLOv8 (Ultralytics) + PIL color heuristics fallback

## Where things live

- `artifacts/lake-monitor/` — Expo mobile app (React Native)
  - `app/` — Expo Router screens (login, register, tabs)
  - `app/(tabs)/` — main tab screens (home, monitor, notifications, organize, campaigns, profile)
  - `context/AuthContext.tsx` — Firebase auth context & user state
  - `lib/firebase.ts` — Firebase app/auth/db initialization
  - `constants/colors.ts` — design tokens (teal/green lake theme)
- `artifacts/api-server/` — Node.js Express API (proxy to AI service)
  - `src/routes/proxy.ts` — proxies image upload and AI routes
- `artifacts/ai-service/` — Python FastAPI AI service
  - `main.py` — FastAPI app with S3 upload, Firebase write, RSVP endpoints
  - `vision.py` — YOLO vision layer (algae bloom + plastic debris detection)
  - `requirements.txt` — Python dependencies

## Architecture decisions

- Firebase used as mobile BaaS (auth, Firestore, real-time listeners)
- EXPO_PUBLIC_* env vars expose Firebase config to Expo bundle at build time
- Node API server acts as proxy between Expo and Python FastAPI AI service (avoids CORS issues and adds auth middleware opportunity)
- Python AI service runs independently and can be deployed separately; fallback heuristics work without YOLO model present
- RBAC enforced at UI level via Firebase `users` collection role field; Monitor and Organize screens only visible to admins

## Product

- **Registration** — Email registration with contact number, pincode, role selection (Admin/User)
- **Login** — Email/password sign-in
- **Home Dashboard** — Role-aware quick actions, recent alerts, active campaigns
- **Monitor Screen** (Admin only) — Upload lake images, YOLO AI analysis for algae bloom + plastic debris, scan history with confidence scores
- **Notification Center** — Real-time Firebase notifications (alerts, campaigns, broadcasts)
- **Organize a Drive** (Admin only) — Browse volunteers by pincode, send broadcast messages to all users
- **Campaign Drive** — View active/upcoming campaigns, RSVP accept/decline

## RBAC

| Screen            | Admin | User |
|-------------------|-------|------|
| Registration      | ✓     | ✓    |
| Login             | ✓     | ✓    |
| Home              | ✓     | ✓    |
| Monitor Screen    | ✓     | ✗    |
| Notification Center | ✓   | ✓    |
| Organize a Drive  | ✓     | ✗    |
| Campaign Drive    | ✓     | ✓    |
| Profile           | ✓     | ✓    |

## User preferences

- Tech stack specified: React Native + Expo GO, Firebase, AWS S3, Python FastAPI, YOLO AI

## Gotchas

- EXPO_PUBLIC_* vars must be set before starting Expo (they're inlined at bundle time)
- Firebase STORAGE_BUCKET may need verification — user provided "NA" which was corrected to `lakemonitoringsystem.firebasestorage.app`
- Python AI service (`artifacts/ai-service/`) must be installed separately: `pip install -r artifacts/ai-service/requirements.txt` then `python artifacts/ai-service/main.py`
- The Node API server proxies `/api/upload-image` → AI service at `AI_SERVICE_URL` (default localhost:8001)
- Set `AI_SERVICE_URL` env var to your deployed Python FastAPI URL

## Pointers

- See `artifacts/ai-service/README.md` for AI service setup
- Firebase Firestore collections used: `users`, `notifications`, `campaigns`, `rsvp`, `monitor_results`
