import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const updateUsername = async (playerId, newUsername) => {
  const response = await api.put(`/players/${playerId}/username`, { username: newUsername });
  return response.data;
};

// Player APIs
export const createOrGetPlayer = async (username) => {
  const response = await api.post('/players', { username });
  return response.data;
};

export const getPlayer = async (playerId) => {
  const response = await api.get(`/players/${playerId}`);
  return response.data;
};

export const getPlayerStats = async (playerId) => {
  const response = await api.get(`/players/${playerId}/stats`);
  return response.data;
};

export const getPlayerHistory = async (playerId, limit = 20) => {
  const response = await api.get(`/players/${playerId}/history?limit=${limit}`);
  return response.data;
};

export const searchPlayers = async (query) => {
  const response = await api.get(`/players/search/${encodeURIComponent(query)}`);
  return response.data;
};

export const getPlayerGamesByUsername = async (username, limit = 20) => {
  const response = await api.get(`/players/${encodeURIComponent(username)}/games?limit=${limit}`);
  return response.data;
};

// Game APIs
export const createGame = async (mode, playerId) => {
  const response = await api.post('/games', { mode, player_id: playerId });
  return response.data;
};

export const getWaitingGames = async () => {
  const response = await api.get('/games/waiting');
  return response.data;
};

export const getGame = async (gameId) => {
  const response = await api.get(`/games/${gameId}`);
  return response.data;
};

export const getGameByCode = async (code) => {
  const response = await api.get(`/games/by-code/${code.toUpperCase()}`);
  return response.data;
};

export const joinGame = async (gameId, playerId) => {
  const response = await api.post(`/games/${gameId}/join`, { player_id: playerId });
  return response.data;
};

export const joinGameByCode = async (code, playerId) => {
  const response = await api.post('/games/join-by-code', { player_id: playerId, code: code.toUpperCase() });
  return response.data;
};

export const makeMove = async (gameId, playerId, position) => {
  const response = await api.post(`/games/${gameId}/move`, { player_id: playerId, position });
  return response.data;
};

export const requestRematch = async (gameId, playerId, mode) => {
  const response = await api.post(`/games/${gameId}/rematch`, { player_id: playerId, mode });
  return response.data;
};

export const getGameReplay = async (gameId) => {
  const response = await api.get(`/games/${gameId}/replay`);
  return response.data;
};

// WebSocket URL builder
export const getWebSocketUrl = (gameId, playerId) => {
  const wsProtocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
  const wsHost = BACKEND_URL.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${wsHost}/api/ws/${gameId}/${playerId}`;
};

export default api;
