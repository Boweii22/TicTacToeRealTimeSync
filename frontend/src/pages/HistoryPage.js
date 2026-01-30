import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/context/PlayerContext';
import { getPlayerHistory } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Clock, Trophy, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ParticleBackground from '@/components/ui/ParticleBackground';

const HistoryPage = () => {
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!player) {
        navigate('/');
        return;
      }

      try {
        const historyData = await getPlayerHistory(player.id);
        setGames(historyData);
      } catch (error) {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [player, navigate]);

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameResult = (game) => {
    if (game.state.is_draw) return 'draw';
    const isPlayerX = player?.id === game.player_x_id;
    const playerWon = (game.state.winner === 'X' && isPlayerX) || 
                      (game.state.winner === 'O' && !isPlayerX);
    return playerWon ? 'win' : 'loss';
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'win': return Trophy;
      case 'loss': return X;
      default: return Minus;
    }
  };

  const getResultLabel = (result) => {
    switch (result) {
      case 'win': return 'Victory';
      case 'loss': return 'Defeat';
      default: return 'Draw';
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'win': return 'text-[#34C759]';
      case 'loss': return 'text-[#FF3B30]';
      default: return 'text-[#FFCC00]';
    }
  };

  const getResultBg = (result) => {
    switch (result) {
      case 'win': return 'bg-[#34C759]/10 border-[#34C759]/30';
      case 'loss': return 'bg-[#FF3B30]/10 border-[#FF3B30]/30';
      default: return 'bg-[#FFCC00]/10 border-[#FFCC00]/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 relative overflow-hidden bg-grid" data-testid="history-page">
      <ParticleBackground />
      
      <div className="relative z-10">
        {/* Header */}
        <motion.div 
          className="flex items-center mb-8"
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
        </motion.div>

        {/* Content */}
        <div className="flex-1 max-w-2xl mx-auto w-full">
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h1 className="font-heading font-black text-4xl uppercase tracking-tight mb-2 title-glow">
              Match History
            </h1>
            <p className="text-white/60 text-sm uppercase tracking-wider">
              {games.length} {games.length === 1 ? 'Game' : 'Games'} Played
            </p>
          </motion.div>

          {games.length === 0 ? (
            <motion.div 
              className="text-center p-6 glass-panel rounded-xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-white/60 mb-4">No completed games yet</p>
              <Button
                onClick={() => navigate('/')}
                className="btn-animated bg-white text-black hover:bg-gray-100"
                data-testid="play-first-game-btn"
              >
                Play Your First Game
              </Button>
            </motion.div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <motion.div 
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } }
                }}
              >
                <AnimatePresence>
                  {games.map((game, index) => {
                    const result = getGameResult(game);
                    const isPlayerX = player?.id === game.player_x_id;
                    const opponent = isPlayerX ? game.player_o_username : game.player_x_username;
                    const ResultIcon = getResultIcon(result);
                    
                    return (
                      <motion.div
                        key={game.id}
                        className={cn(
                          "glass-panel rounded-xl p-4 flex items-center justify-between cursor-pointer border transition-all",
                          getResultBg(result)
                        )}
                        onClick={() => navigate(`/replay/${game.id}`)}
                        variants={{
                          hidden: { opacity: 0, x: -20 },
                          visible: { opacity: 1, x: 0 }
                        }}
                        whileHover={{ scale: 1.02, x: 8 }}
                        whileTap={{ scale: 0.98 }}
                        data-testid={`history-item-${game.id}`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Result Badge */}
                          <motion.div 
                            className={cn(
                              "w-16 h-16 rounded-lg flex flex-col items-center justify-center",
                              getResultBg(result)
                            )}
                            whileHover={{ rotate: [0, -5, 5, 0] }}
                          >
                            <ResultIcon className={cn("h-5 w-5", getResultColor(result))} />
                            <p className={cn(
                              "font-heading font-bold text-xs uppercase mt-1",
                              getResultColor(result)
                            )}>
                              {getResultLabel(result)}
                            </p>
                          </motion.div>
                          
                          {/* Game Info */}
                          <div>
                            <p className="text-white font-semibold">
                              vs {opponent || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-2 text-white/40 text-xs mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(game.completed_at)}</span>
                              <span>•</span>
                              <span className="capitalize">{game.mode}</span>
                              <span>•</span>
                              <span>{game.moves.length} moves</span>
                            </div>
                            {/* Game Code */}
                            <div className="mt-1">
                              <span className="text-xs font-mono text-white/30 px-2 py-0.5 bg-white/5 rounded">
                                {game.code}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Watch Replay Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "hover:bg-white/10",
                            getResultColor(result)
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/replay/${game.id}`);
                          }}
                          data-testid={`replay-btn-${game.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Replay
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
