# Znapfile Quick Start Guide

## Prerequisites
- Python 3.8+
- Node.js 16+
- npm

## Quick Setup

1. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Environment Setup**
   The project includes a `.env` file with development defaults.
   No additional configuration needed for local development.

## Running the Application

### Option 1: Run Both Services (Recommended)
```bash
./run-dev.sh
```

### Option 2: Run Services Separately

**Backend:**
```bash
python start-backend.py
# or
cd backend && python -m uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend && npm run dev
```

## Access Points
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Test Credentials
Create a new account by clicking "Get Started" on the homepage.

## Troubleshooting

### Upload Failed Error
1. Make sure backend is running (check http://localhost:8000/docs)
2. Check browser console for specific errors
3. Ensure you're logged in before uploading

### Database Issues
The app uses SQLite for development. If you have issues:
```bash
cd backend
rm fileshare.db
# Restart the backend - it will create a new database
```

### Common Issues
- **CORS errors**: Make sure frontend is on http://localhost:5173
- **Authentication errors**: Clear browser storage and re-login
- **File size limits**: Free accounts limited to 500MB per file