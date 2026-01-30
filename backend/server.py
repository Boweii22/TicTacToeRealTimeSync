from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from enum import Enum

# ================== ENV ==================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "tictactoe")

# ================== LOGGING ==================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("server")

# ================== APP ==================
app = FastAPI(title="Tic-Tac-Toe API", version="1.0.0")
api_router = APIRouter()  # IMPORTANT: no prefix here

# ================== DB ==================
client: AsyncIOMotorClient | None = None
db = None
USE_MEMORY_DB = False
memory_players: Dict[str, Dict[str, Any]] = {}
memory_games: Dict[str, Dict[str, Any]] = {}

async def create_indexes():
    await db.players.create_index("username", unique=True)
    await db.games.create_index("code", unique=True)
    await db.games.create_index("status")
    await db.games.create_index("player_x_id")
    await db.games.create_index("player_o_id")

@app.on_event("startup")
async def startup():
    global client, db, USE_MEMORY_DB
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.command("ping")
        await create_indexes()
        USE_MEMORY_DB = False
        logger.info("MongoDB connected and indexes created")
    except Exception as exc:
        USE_MEMORY_DB = True
        logger.warning("MongoDB unavailable, using in-memory storage: %s", exc)

@app.on_event("shutdown")
async def shutdown():
    if client and not USE_MEMORY_DB:
        client.close()
        logger.info("MongoDB connection closed")

# ================== ENUMS ==================
class GameMode(str, Enum):
    LOCAL = "local"
    ONLINE = "online"

class GameStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class PlayerSymbol(str, Enum):
    X = "X"
    O = "O"

# ================== MODELS ==================
class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CreatePlayerRequest(BaseModel):
    username: str

class GameState(BaseModel):
    board: List[Optional[str]] = Field(default_factory=lambda: [None] * 9)
    current_turn: PlayerSymbol = PlayerSymbol.X
    winner: Optional[str] = None
    winning_line: Optional[List[int]] = None
    is_draw: bool = False

class GameMove(BaseModel):
    player_id: str
    symbol: PlayerSymbol
    position: int
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Game(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    mode: GameMode
    status: GameStatus
    player_x_id: str
    player_x_username: str
    player_o_id: Optional[str] = None
    player_o_username: Optional[str] = None
    state: GameState = Field(default_factory=GameState)
    moves: List[GameMove] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

class UpdateUsernameRequest(BaseModel):
    username: str

class CreateGameRequest(BaseModel):
    mode: GameMode
    player_id: str

class JoinGameRequest(BaseModel):
    player_id: str

class JoinByCodeRequest(BaseModel):
    player_id: str
    code: str

class MoveRequest(BaseModel):
    player_id: str
    position: int

class RematchRequest(BaseModel):
    mode: GameMode
    player_id: str

# ================== HELPERS ==================
def generate_game_code():
    import random, string
    chars = string.ascii_uppercase + string.digits
    for c in ["O", "0", "I", "1", "L"]:
        chars = chars.replace(c, "")
    return "".join(random.choices(chars, k=6))

WINNING_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def evaluate_board(board: List[Optional[str]]) -> tuple[Optional[str], Optional[List[int]], bool]:
    for line in WINNING_LINES:
        a, b, c = line
        if board[a] and board[a] == board[b] == board[c]:
            return board[a], line, False
    if all(cell is not None for cell in board):
        return None, None, True
    return None, None, False

def normalize_game(game_doc: Dict[str, Any]) -> Dict[str, Any]:
    if not game_doc:
        return {}
    return Game(**game_doc).model_dump()

async def get_player_by_id(player_id: str) -> Optional[Dict[str, Any]]:
    if USE_MEMORY_DB:
        return memory_players.get(player_id)
    return await db.players.find_one({"id": player_id}, {"_id": 0})

async def get_player_by_username(username: str) -> Optional[Dict[str, Any]]:
    if USE_MEMORY_DB:
        return next((p for p in memory_players.values() if p["username"] == username), None)
    return await db.players.find_one({"username": username}, {"_id": 0})

async def save_player(player: Dict[str, Any]) -> None:
    if USE_MEMORY_DB:
        memory_players[player["id"]] = player
    else:
        await db.players.insert_one(player)

async def update_player_username(player_id: str, username: str) -> None:
    if USE_MEMORY_DB:
        if player_id in memory_players:
            memory_players[player_id]["username"] = username
        for game in memory_games.values():
            if game["player_x_id"] == player_id:
                game["player_x_username"] = username
            if game.get("player_o_id") == player_id:
                game["player_o_username"] = username
    else:
        await db.players.update_one({"id": player_id}, {"$set": {"username": username}})
        await db.games.update_many({"player_x_id": player_id}, {"$set": {"player_x_username": username}})
        await db.games.update_many({"player_o_id": player_id}, {"$set": {"player_o_username": username}})

async def get_game_by_id(game_id: str) -> Optional[Dict[str, Any]]:
    if USE_MEMORY_DB:
        return memory_games.get(game_id)
    return await db.games.find_one({"id": game_id}, {"_id": 0})

async def get_game_by_code(code: str) -> Optional[Dict[str, Any]]:
    if USE_MEMORY_DB:
        return next((g for g in memory_games.values() if g["code"] == code), None)
    return await db.games.find_one({"code": code}, {"_id": 0})

async def save_game(game: Dict[str, Any]) -> None:
    if USE_MEMORY_DB:
        memory_games[game["id"]] = game
    else:
        await db.games.insert_one(game)

async def update_game(game_id: str, update_fields: Dict[str, Any]) -> None:
    if USE_MEMORY_DB:
        if game_id in memory_games:
            memory_games[game_id].update(update_fields)
    else:
        await db.games.update_one({"id": game_id}, {"$set": update_fields})

async def generate_unique_code() -> str:
    while True:
        code = generate_game_code()
        existing = await get_game_by_code(code)
        if not existing:
            return code

# ================== PLAYER ROUTES ==================
@api_router.post("/players", response_model=Player, status_code=200)
async def create_or_get_player(req: CreatePlayerRequest):
    username = req.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    existing = await get_player_by_username(username)
    if existing:
        return Player(**existing)

    player = Player(username=username)
    await save_player(player.model_dump())
    return player

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str):
    player = await get_player_by_id(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return Player(**player)

@api_router.put("/players/{player_id}/username", response_model=Player)
async def update_player(player_id: str, req: UpdateUsernameRequest):
    username = req.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    existing = await get_player_by_username(username)
    if existing and existing["id"] != player_id:
        raise HTTPException(status_code=400, detail="Username already taken")
    player = await get_player_by_id(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    await update_player_username(player_id, username)
    player["username"] = username
    return Player(**player)

@api_router.get("/players/search/{query}", response_model=List[Player])
async def search_players(query: str):
    if len(query) < 2:
        return []
    if USE_MEMORY_DB:
        results = [
            p for p in memory_players.values()
            if query.lower() in p["username"].lower()
        ][:20]
        return [Player(**p) for p in results]
    cursor = db.players.find(
        {"username": {"$regex": query, "$options": "i"}},
        {"_id": 0},
    ).limit(20)
    return [Player(**doc) async for doc in cursor]

@api_router.get("/players/{player_id}/stats")
async def get_player_stats(player_id: str):
    player = await get_player_by_id(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if USE_MEMORY_DB:
        games = [
            g for g in memory_games.values()
            if g["status"] == GameStatus.COMPLETED.value
            and (g["player_x_id"] == player_id or g.get("player_o_id") == player_id)
        ]
    else:
        cursor = db.games.find(
            {
                "status": GameStatus.COMPLETED.value,
                "$or": [{"player_x_id": player_id}, {"player_o_id": player_id}],
            },
            {"_id": 0},
        )
        games = [doc async for doc in cursor]

    total_games = len(games)
    wins = 0
    draws = 0
    for game in games:
        if game["state"].get("is_draw"):
            draws += 1
            continue
        is_player_x = game["player_x_id"] == player_id
        winner = game["state"].get("winner")
        if (winner == PlayerSymbol.X.value and is_player_x) or (winner == PlayerSymbol.O.value and not is_player_x):
            wins += 1
    losses = total_games - wins - draws
    win_rate = round((wins / total_games) * 100) if total_games else 0

    return {
        "username": player["username"],
        "total_games": total_games,
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "win_rate": win_rate,
    }

@api_router.get("/players/{player_id}/history", response_model=List[Game])
async def get_player_history(player_id: str, limit: int = 20):
    player = await get_player_by_id(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if USE_MEMORY_DB:
        games = [
            g for g in memory_games.values()
            if g["status"] == GameStatus.COMPLETED.value
            and (g["player_x_id"] == player_id or g.get("player_o_id") == player_id)
        ]
        games.sort(key=lambda g: g.get("completed_at") or g["created_at"], reverse=True)
        return [Game(**g) for g in games[:limit]]
    cursor = db.games.find(
        {
            "status": GameStatus.COMPLETED.value,
            "$or": [{"player_x_id": player_id}, {"player_o_id": player_id}],
        },
        {"_id": 0},
    ).sort("completed_at", -1).limit(limit)
    return [Game(**doc) async for doc in cursor]

@api_router.get("/players/{username}/games", response_model=List[Game])
async def get_player_games_by_username(username: str, limit: int = 20):
    if USE_MEMORY_DB:
        games = [
            g for g in memory_games.values()
            if g["status"] == GameStatus.COMPLETED.value
            and (g["player_x_username"] == username or g.get("player_o_username") == username)
        ]
        games.sort(key=lambda g: g.get("completed_at") or g["created_at"], reverse=True)
        return [Game(**g) for g in games[:limit]]
    cursor = db.games.find(
        {
            "status": GameStatus.COMPLETED.value,
            "$or": [{"player_x_username": username}, {"player_o_username": username}],
        },
        {"_id": 0},
    ).sort("completed_at", -1).limit(limit)
    return [Game(**doc) async for doc in cursor]

# ================== ROOT ==================
@api_router.get("/")
async def root():
    return {"message": "Tic-Tac-Toe API running"}

# ================== WEBSOCKET ==================
class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: str, player_id: str):
        await websocket.accept()
        self.connections.setdefault(game_id, {})[player_id] = websocket

    def disconnect(self, game_id: str, player_id: str):
        self.connections.get(game_id, {}).pop(player_id, None)

    async def send_to_game(self, game_id: str, message: Dict[str, Any]):
        for websocket in list(self.connections.get(game_id, {}).values()):
            try:
                await websocket.send_json(message)
            except Exception:
                continue

manager = ConnectionManager()

@api_router.websocket("/ws/{game_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    await manager.connect(websocket, game_id, player_id)
    try:
        game = await get_game_by_id(game_id)
        if game:
            await websocket.send_json({"type": "connected", "game": normalize_game(game)})
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(game_id, player_id)
        await manager.send_to_game(game_id, {"type": "player_disconnected", "player_id": player_id})

# ================== CORS ==================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://tic-tac-toe-real-time-sync.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== ROUTER ==================
# ================== GAME ROUTES ==================
@api_router.post("/games", response_model=Game)
async def create_game(req: CreateGameRequest):
    player = await get_player_by_id(req.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    code = await generate_unique_code()
    if req.mode == GameMode.LOCAL:
        game = Game(
            code=code,
            mode=req.mode,
            status=GameStatus.IN_PROGRESS,
            player_x_id=player["id"],
            player_x_username=player["username"],
            player_o_id=None,
            player_o_username="Player O",
        )
    else:
        game = Game(
            code=code,
            mode=req.mode,
            status=GameStatus.WAITING,
            player_x_id=player["id"],
            player_x_username=player["username"],
        )

    await save_game(game.model_dump())
    return game

@api_router.get("/games/waiting", response_model=List[Game])
async def get_waiting_games():
    if USE_MEMORY_DB:
        games = [
            g for g in memory_games.values()
            if g["status"] == GameStatus.WAITING.value and g["mode"] == GameMode.ONLINE.value
        ]
        return [Game(**g) for g in games]
    cursor = db.games.find(
        {"status": GameStatus.WAITING.value, "mode": GameMode.ONLINE.value},
        {"_id": 0},
    )
    return [Game(**doc) async for doc in cursor]

@api_router.get("/games/{game_id}", response_model=Game)
async def get_game(game_id: str):
    game = await get_game_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return Game(**game)

@api_router.get("/games/by-code/{code}", response_model=Game)
async def get_game_by_code_endpoint(code: str):
    game = await get_game_by_code(code.upper())
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return Game(**game)

@api_router.post("/games/{game_id}/join", response_model=Game)
async def join_game(game_id: str, req: JoinGameRequest):
    game = await get_game_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game["mode"] != GameMode.ONLINE.value:
        raise HTTPException(status_code=400, detail="Cannot join a local game")
    if game["player_x_id"] == req.player_id:
        raise HTTPException(status_code=400, detail="Cannot join your own game")
    if game.get("player_o_id"):
        raise HTTPException(status_code=400, detail="Game already has two players")

    player = await get_player_by_id(req.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    update_fields = {
        "player_o_id": player["id"],
        "player_o_username": player["username"],
        "status": GameStatus.IN_PROGRESS.value,
    }
    await update_game(game_id, update_fields)
    game.update(update_fields)

    await manager.send_to_game(game_id, {"type": "player_joined", "game": normalize_game(game)})
    return Game(**game)

@api_router.post("/games/join-by-code", response_model=Game)
async def join_game_by_code(req: JoinByCodeRequest):
    game = await get_game_by_code(req.code.upper())
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return await join_game(game["id"], JoinGameRequest(player_id=req.player_id))

@api_router.post("/games/{game_id}/move", response_model=Game)
async def make_move(game_id: str, req: MoveRequest):
    game = await get_game_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game["status"] == GameStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Game already completed")
    if game["status"] == GameStatus.WAITING.value:
        raise HTTPException(status_code=400, detail="Waiting for opponent")

    if req.position < 0 or req.position > 8:
        raise HTTPException(status_code=400, detail="Invalid position")
    if req.player_id not in {game["player_x_id"], game.get("player_o_id")}:
        raise HTTPException(status_code=400, detail="Player not in this game")
    board = list(game["state"]["board"])
    if board[req.position] is not None:
        raise HTTPException(status_code=400, detail="Cell already occupied")

    current_turn = PlayerSymbol(game["state"]["current_turn"])
    is_local = game["mode"] == GameMode.LOCAL.value
    if not is_local:
        if current_turn == PlayerSymbol.X and req.player_id != game["player_x_id"]:
            raise HTTPException(status_code=400, detail="Not your turn")
        if current_turn == PlayerSymbol.O and req.player_id != game.get("player_o_id"):
            raise HTTPException(status_code=400, detail="Not your turn")

    board[req.position] = current_turn.value
    move = GameMove(player_id=req.player_id, symbol=current_turn, position=req.position)
    moves = list(game.get("moves", []))
    moves.append(move.model_dump())

    winner, winning_line, is_draw = evaluate_board(board)
    new_status = game["status"]
    completed_at = game.get("completed_at")
    next_turn = PlayerSymbol.O if current_turn == PlayerSymbol.X else PlayerSymbol.X
    if winner or is_draw:
        new_status = GameStatus.COMPLETED.value
        completed_at = now_iso()
    else:
        game["state"]["current_turn"] = next_turn.value

    game["state"]["board"] = board
    game["state"]["winner"] = winner
    game["state"]["winning_line"] = winning_line
    game["state"]["is_draw"] = is_draw
    game["status"] = new_status
    game["moves"] = moves
    game["completed_at"] = completed_at

    await update_game(game_id, {
        "state": game["state"],
        "status": new_status,
        "moves": moves,
        "completed_at": completed_at,
    })

    if game["mode"] == GameMode.ONLINE.value:
        await manager.send_to_game(game_id, {"type": "game_update", "game": normalize_game(game)})

    return Game(**game)

@api_router.post("/games/{game_id}/rematch", response_model=Game)
async def request_rematch(game_id: str, req: RematchRequest):
    game = await get_game_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    player = await get_player_by_id(req.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    code = await generate_unique_code()
    player_o_id = game.get("player_o_id")
    player_o_username = game.get("player_o_username")
    if req.mode == GameMode.ONLINE and not player_o_id:
        raise HTTPException(status_code=400, detail="Opponent not connected")

    if req.mode == GameMode.LOCAL:
        status = GameStatus.IN_PROGRESS
    else:
        status = GameStatus.IN_PROGRESS

    new_game = Game(
        code=code,
        mode=req.mode,
        status=status,
        player_x_id=game["player_x_id"],
        player_x_username=game["player_x_username"],
        player_o_id=player_o_id if req.mode == GameMode.LOCAL or player_o_id else None,
        player_o_username=player_o_username if req.mode == GameMode.LOCAL or player_o_username else None,
    )
    await save_game(new_game.model_dump())

    if req.mode == GameMode.ONLINE:
        await manager.send_to_game(
            game_id,
            {"type": "rematch_created", "new_game_id": new_game.id, "game": new_game.model_dump()},
        )

    return new_game

@api_router.get("/games/{game_id}/replay")
async def get_game_replay(game_id: str):
    game = await get_game_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    game_data = normalize_game(game)
    moves = game_data.get("moves", [])
    snapshots = []
    board = [None] * 9
    snapshots.append({"board": list(board), "move": None})
    for move in moves:
        board[move["position"]] = move["symbol"]
        snapshots.append({"board": list(board), "move": move})

    return {
        "game": game_data,
        "snapshots": snapshots,
        "total_moves": len(moves),
    }

app.include_router(api_router, prefix="/api")
