# LungVision AI Platform

Full-stack web platform for AI-powered lung disease classification and severity assessment.

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, NextAuth.js, Recharts
- Backend: PHP 8.x REST API with JWT
- AI inference: Python FastAPI service serving trained Keras models (TensorFlow)
- Database: MySQL
- Storage: Local filesystem under `backend/uploads`

## Project Structure

- `frontend` - Next.js application (public pages + protected dashboard flows)
- `backend` - PHP API endpoints (`auth`, `user`, `scans`, `admin`)
- `ai-service` - Python inference microservice (DenseNet121 default, + EfficientNetV2B3 / V2S)
- `models` - Trained `.keras` models and training notebooks
- `database.sql` - MySQL schema

## Backend Setup (XAMPP)

1. Create database and tables:
   - Import `database.sql` in phpMyAdmin.
2. Update DB/JWT config:
   - Edit `backend/config/db.php` with your MySQL credentials.
   - Edit `backend/config/jwt.php` and set a secure secret.
3. Ensure upload folders exist:
   - `backend/uploads/xrays`
   - `backend/uploads/gradcam`

## Frontend Setup

1. Go to `frontend`.
2. Copy `.env.example` to `.env.local`.
3. Start app:

```bash
npm install
npm run dev
```

## API Base URL

Frontend expects:

`http://localhost/pneumonia/backend/api`

## AI Model Integration (real inference)

Predictions are produced by the trained models via the Python service in `ai-service`.
**DenseNet121 is the default production model** (highest test accuracy, 85.31%).

1. Start the inference service (keep it running alongside Apache/MySQL):

   ```bash
   cd ai-service
   start.bat            # first run creates the venv + installs deps, then serves on :8001
   ```

   Or manually: `pip install -r requirements.txt` then
   `python -m uvicorn main:app --host 127.0.0.1 --port 8001`.

2. Apply the database migration once (adds `covid_score` + `model` columns):

   - Import `database_migration_ai.sql` in phpMyAdmin (new installs from `database.sql`
     already include them).

3. Upload an X-ray in the app. `backend/api/scans/upload.php` forwards the image to the
   service, stores the returned class scores + Grad-CAM heatmap, and persists the result.

Model classes: `COVID-19`, `Normal`, `Bacterial Pneumonia`, `Viral Pneumonia`.
The backend AI service URL is configured in `backend/config/ai.php`.
To switch the default model, set `DEFAULT_MODEL` before launching the service.
