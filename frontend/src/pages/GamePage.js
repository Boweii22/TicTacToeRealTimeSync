import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/context/PlayerContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getGame, makeMove, requestRematch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import GameBoard from '@/components/game/GameBoard';
import GameStatus from '@/components/game/GameStatus';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { ArrowLeft, RefreshCw, Play, Wifi, WifiOff, Copy, Check } from 'lucide-react';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const { isConnected, lastMessage, connectionError } = useWebSocket(
    game?.mode === 'online' ? gameId : null,
    player?.id
  );

  // Fetch initial game state
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const gameData = await getGame(gameId);
        setGame(gameData);
      } catch (error) {
        toast.error('Failed to load game');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchGame();
    }
  }, [gameId, navigate]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'game_update' || lastMessage.type === 'connected' || lastMessage.type === 'player_joined') {
        setGame(lastMessage.game);
        
        if (lastMessage.type === 'player_joined') {
          toast.success('Opponent joined the game!');
        }
      } else if (lastMessage.type === 'player_disconnected') {
        toast.warning('Opponent disconnected');
      } else if (lastMessage.type === 'rematch_created') {
        toast.success('Rematch starting...');
        navigate(`/game/${lastMessage.new_game_id}`);
      }
    }
  }, [lastMessage, navigate]);

  // Redirect if no player
  useEffect(() => {
    if (!player && !loading) {
      navigate('/');
    }
  }, [player, loading, navigate]);

  const handleCellClick = useCallback(async (position) => {
    if (!game || game.status !== 'in_progress' || actionLoading) return;
    
    // Check if it's the player's turn
    const isPlayerX = player?.id === game.player_x_id;
    const isMyTurn = (game.state.current_turn === 'X' && isPlayerX) || 
                     (game.state.current_turn === 'O' && !isPlayerX);
    
    // For local games, always allow moves
    if (game.mode === 'local' || isMyTurn) {
      setActionLoading(true);
      try {
        const updatedGame = await makeMove(gameId, player.id, position);
        setGame(updatedGame);
        
        // Check for game end
        if (updatedGame.status === 'completed') {
          if (updatedGame.state.is_draw) {
            toast.info("It's a draw!");
          } else {
            const winnerName = updatedGame.state.winner === 'X' 
              ? updatedGame.player_x_username 
              : updatedGame.player_o_username;
            toast.success(`${winnerName} wins!`);
          }
        }
      } catch (error) {
        const errorMsg = error.response?.data?.detail || 'Failed to make move';
        toast.error(errorMsg);
      } finally {
        setActionLoading(false);
      }
    }
  }, [game, gameId, player, actionLoading]);

  // const handleRematch = async () => {
  //   if (!game || !player) return;
    
  //   setActionLoading(true);
  //   try {
  //     const newGame = await requestRematch(gameId, player.id, game.mode);
  //     toast.success('Rematch started!');
  //     navigate(`/game/${newGame.id}`);
  //   } catch (error) {
  //     toast.error('Failed to create rematch');
  //   } finally {
  //     setActionLoading(false);
  //   }
  // };

  const handleRematch = async () => {
  if (!game || !player) return;
  
  setActionLoading(true);
  try {
    const newGame = await requestRematch(gameId, player.id, game.mode);
    // Clear any existing game state
    setGame(null);
    // Small delay to ensure state is cleared before navigation
    setTimeout(() => {
      navigate(`/game/${newGame.id}`, { replace: true });
    }, 100);
  } catch (error) {
    toast.error('Failed to create rematch');
  } finally {
    setActionLoading(false);
  }
};
  const handleViewReplay = () => {
    navigate(`/replay/${gameId}`);
  };

  const handleCopyCode = async () => {
    if (!game?.code) return;
    try {
      await navigator.clipboard.writeText(game.code);
      setCopiedCode(true);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid">
        <motion.div 
          className="spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Game not found</p>
      </div>
    );
  }

  const isGameOver = game.status === 'completed';

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 relative overflow-hidden bg-grid" data-testid="game-page">
      <ParticleBackground />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white/60 hover:text-white hover:bg-white/5"
            data-testid="back-home-btn"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Button>
          
          <div className="flex items-center gap-4">
            {/* Game Code (for online waiting games) */}
            {game.mode === 'online' && game.status === 'waiting' && (
              <motion.div 
                className="flex items-center gap-2 px-3 py-1.5 glass-panel rounded-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <span className="text-xs text-white/60 uppercase tracking-wider">Code:</span>
                <span className="font-mono font-bold text-[#007AFF]">{game.code}</span>
                <button
                  onClick={handleCopyCode}
                  className="text-white/60 hover:text-white transition-colors"
                  data-testid="copy-game-code-btn"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </motion.div>
            )}
            
            {game.mode === 'online' && (
              <div className="flex items-center gap-2 text-xs">
                {isConnected ? (
                  <motion.span 
                    className="text-green-400 flex items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Wifi className="h-3 w-3" /> Connected
                  </motion.span>
                ) : (
                  <motion.span 
                    className="text-red-400 flex items-center gap-1"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <WifiOff className="h-3 w-3" /> {connectionError || 'Disconnected'}
                  </motion.span>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Player Info */}
          <motion.div 
            className="flex items-center justify-center gap-8 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div 
              className="text-center"
              animate={game.state.current_turn === 'X' && game.status === 'in_progress' ? 
                { scale: [1, 1.1, 1] } : {}
              }
              transition={{ duration: 0.5 }}
            >
              <p className="text-[#FF3B30] font-heading font-bold text-2xl neon-text-x">X</p>
              <p className="text-white/60">{game.player_x_username}</p>
            </motion.div>
            <motion.span 
              className="text-white/20 text-2xl font-light"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              vs
            </motion.span>
            <motion.div 
              className="text-center"
              animate={game.state.current_turn === 'O' && game.status === 'in_progress' ? 
                { scale: [1, 1.1, 1] } : {}
              }
              transition={{ duration: 0.5 }}
            >
              <p className="text-[#007AFF] font-heading font-bold text-2xl neon-text-o">O</p>
              <p className="text-white/60">{game.player_o_username || 'Waiting...'}</p>
            </motion.div>
          </motion.div>

          {/* Game Status */}
          <GameStatus
            status={game.status}
            currentTurn={game.state.current_turn}
            winner={game.state.winner}
            isDraw={game.state.is_draw}
            playerXUsername={game.player_x_username}
            playerOUsername={game.player_o_username}
            currentPlayerId={player?.id}
            playerXId={game.player_x_id}
          />

          {/* Game Board */}
          <GameBoard
            board={game.state.board}
            winningLine={game.state.winning_line}
            onCellClick={handleCellClick}
            disabled={isGameOver || game.status === 'waiting' || actionLoading}
          />

          {/* Game Over Actions */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div 
                className="flex gap-4 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <Button
                  onClick={handleRematch}
                  className="btn-animated bg-gradient-to-r from-[#FF3B30] to-[#FF3B30]/80 text-white flex items-center gap-2"
                  disabled={actionLoading}
                  data-testid="rematch-btn"
                >
                  <RefreshCw className="h-4 w-4" />
                  Rematch
                </Button>
                <Button
                  onClick={handleViewReplay}
                  className="btn-animated bg-gradient-to-r from-[#007AFF] to-[#007AFF]/80 text-white flex items-center gap-2"
                  data-testid="view-replay-btn"
                >
                  <Play className="h-4 w-4" />
                  View Replay
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Move Count */}
        <motion.div 
          className="text-center mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-white/40 text-xs font-mono">
            Moves: {game.moves.length}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default GamePage;
