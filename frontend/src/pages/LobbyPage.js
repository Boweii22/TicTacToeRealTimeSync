import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/context/PlayerContext';
import { getWaitingGames, createGame, joinGame } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, RefreshCw, Users, Copy, Check } from 'lucide-react';
import ParticleBackground from '@/components/ui/ParticleBackground';

const LobbyPage = () => {
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchGames = useCallback(async () => {
    try {
      const waitingGames = await getWaitingGames();
      setGames(waitingGames);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!player) {
      navigate('/');
      return;
    }
    fetchGames();

    // Poll for new games every 5 seconds
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, [player, navigate, fetchGames]);

  const handleCreateGame = async () => {
    if (!player) return;
    
    setCreating(true);
    try {
      const game = await createGame('online', player.id);
      toast.success('Game created! Share the code with your friend.');
      navigate(`/game/${game.id}`);
    } catch (error) {
      toast.error('Failed to create game');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async (gameId) => {
    if (!player) return;
    
    setJoining(gameId);
    try {
      await joinGame(gameId, player.id);
      toast.success('Joined game!');
      navigate(`/game/${gameId}`);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to join game';
      toast.error(errorMsg);
      fetchGames();
    } finally {
      setJoining(null);
    }
  };

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const availableGames = games.filter(g => g.player_x_id !== player?.id);
  const myWaitingGame = games.find(g => g.player_x_id === player?.id);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 relative overflow-hidden bg-grid" data-testid="lobby-page">
      <ParticleBackground />
      
      <div className="relative z-10">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
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
          
          <Button
            variant="ghost"
            onClick={fetchGames}
            disabled={loading}
            className="text-white/60 hover:text-white hover:bg-white/5"
            data-testid="refresh-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Content */}
        <motion.div 
          className="flex-1 max-w-2xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="text-center mb-8" variants={itemVariants}>
            <h1 className="font-heading font-black text-4xl uppercase tracking-tight mb-2 title-glow">
              Online Lobby
            </h1>
            <p className="text-white/60 text-sm">
              Create a game or join an existing one
            </p>
          </motion.div>

          {/* My Waiting Game with Game Code */}
          <AnimatePresence>
            {myWaitingGame && (
              <motion.div 
                className="glass-panel rounded-xl p-6 mb-6 border-yellow-500/30"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="text-center space-y-4">
                  <p className="text-yellow-400 font-semibold text-sm uppercase tracking-wider">
                    Your Game is Ready
                  </p>
                  
                  {/* Game Code Display */}
                  <div className="space-y-2">
                    <p className="text-white/60 text-xs uppercase tracking-wider">Share this code</p>
                    <motion.div 
                      className="game-code inline-block"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {myWaitingGame.code}
                    </motion.div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(myWaitingGame.code)}
                      className="ml-2 text-white/60 hover:text-white"
                      data-testid="copy-code-btn"
                    >
                      {copiedCode === myWaitingGame.code ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-white/40 text-sm loading-dots">
                    Waiting for opponent to join<span>.</span><span>.</span><span>.</span>
                  </p>
                  
                  <Button
                    onClick={() => navigate(`/game/${myWaitingGame.id}`)}
                    className="btn-animated bg-white/10 hover:bg-white/20 text-white"
                    data-testid="view-my-game-btn"
                  >
                    View Game
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Create Game Button */}
          {!myWaitingGame && (
            <motion.div variants={itemVariants}>
              <Button
                onClick={handleCreateGame}
                disabled={creating}
                className="w-full h-16 btn-animated bg-gradient-to-r from-[#FF3B30] to-[#007AFF] text-white font-semibold text-lg mb-6"
                data-testid="create-game-btn"
              >
                {creating ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Plus className="h-6 w-6 mr-2" />
                    <span>Create New Game</span>
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Available Games */}
          <motion.div className="mb-4" variants={itemVariants}>
            <h2 className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-3">
              Available Games ({availableGames.length})
            </h2>
          </motion.div>

          {loading && games.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner" />
            </div>
          ) : availableGames.length === 0 ? (
            <motion.div 
              className="text-center p-6 glass-panel rounded-xl"
              variants={itemVariants}
            >
              <Users className="h-8 w-8 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No games available</p>
              <p className="text-white/40 text-sm">Create a new game to start playing</p>
            </motion.div>
          ) : (
            <ScrollArea className="h-[50vh]">
              <motion.div className="space-y-3" variants={containerVariants}>
                {availableGames.map((game, index) => (
                  <motion.div
                    key={game.id}
                    className="glass-panel rounded-xl p-4 flex items-center justify-between hover:border-white/30 transition-all"
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, x: 5 }}
                    data-testid={`game-item-${game.id}`}
                  >
                    <div>
                      <p className="text-white font-semibold">
                        {game.player_x_username}'s Game
                      </p>
                      <div className="flex items-center gap-2 text-white/40 text-xs font-mono">
                        <span className="px-2 py-0.5 bg-white/10 rounded">
                          {game.code}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={joining === game.id}
                      className="btn-animated bg-[#007AFF] hover:bg-[#007AFF]/90 text-white"
                      data-testid={`join-game-btn-${game.id}`}
                    >
                      {joining === game.id ? (
                        <span className="spinner" />
                      ) : (
                        'Join'
                      )}
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            </ScrollArea>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LobbyPage;
