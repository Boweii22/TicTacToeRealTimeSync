# Tic-Tac-Toe Live

Real-time multiplayer Tic-Tac-Toe with replays and player stats.

## Features
- Local and online play
- Matchmaking lobby and join-by-code
- Live game updates via WebSocket
- Game replays with timeline controls
- Player stats and match history
- Profile username updates

## Tech Stack
- Frontend: React (Create React App) + Tailwind
- Backend: FastAPI + Motor (MongoDB)
- Realtime: WebSocket

## Requirements
- Node.js 18+
- Python 3.10+
- MongoDB (optional, in-memory fallback supported)

## Quick Start

### Backend
```bash
cd Tic-Tac-Toe-realtime-sync/backend
.\venv\Scripts\Activate.ps1
python -m uvicorn server:app --host 0.0.0.0 --port 8080 --reload
```

### Frontend
```bash
cd Tic-Tac-Toe-realtime-sync/frontend
npm install
npm start
```

Open `http://localhost:3000`.

## Configuration
Set the backend URL for the frontend:
```bash
$env:REACT_APP_BACKEND_URL="http://localhost:8080"
```

## Testing
```bash
cd Tic-Tac-Toe-realtime-sync
python backend_test.py
```

## Project Structure
```
Tic-Tac-Toe-realtime-sync/
  backend/        FastAPI server
  frontend/       React app
  tests/          Test helpers
```
