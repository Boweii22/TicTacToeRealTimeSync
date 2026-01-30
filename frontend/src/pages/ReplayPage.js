import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/context/PlayerContext';
import { getGameReplay } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import GameBoard from '@/components/game/GameBoard';
import ReplayControls from '@/components/game/ReplayControls';
import MoveHistory from '@/components/game/MoveHistory';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { ArrowLeft, RefreshCw, Share2, Copy, Check } from 'lucide-react';

const ReplayPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [replayData, setReplayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const playIntervalRef = useRef(null);

  // Fetch replay data
  useEffect(() => {
    const fetchReplay = async () => {
      try {
        const data = await getGameReplay(gameId);
        setReplayData(data);
      } catch (error) {
        toast.error('Failed to load replay');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchReplay();
    }
  }, [gameId, navigate]);

  // Handle playback
  useEffect(() => {
    if (isPlaying && replayData) {
      playIntervalRef.current = setInterval(() => {
        setCurrentMoveIndex(prev => {
          if (prev >= replayData.total_moves) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, replayData]);

  // Stop playing when reaching the end
  useEffect(() => {
    if (replayData && currentMoveIndex >= replayData.total_moves) {
      setIsPlaying(false);
    }
  }, [currentMoveIndex, replayData]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  
  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentMoveIndex(prev => Math.max(0, prev - 1));
  }, []);
  
  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentMoveIndex(prev => Math.min(replayData?.total_moves || 0, prev + 1));
  }, [replayData]);
  
  const handleGoToStart = useCallback(() => {
    setIsPlaying(false);
    setCurrentMoveIndex(0);
  }, []);
  
  const handleGoToEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentMoveIndex(replayData?.total_moves || 0);
  }, [replayData]);
  
  const handleSeek = useCallback((value) => {
    setIsPlaying(false);
    setCurrentMoveIndex(value);
  }, []);
  
  const handleSpeedChange = useCallback((speed) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleMoveClick = useCallback((index) => {
    setIsPlaying(false);
    setCurrentMoveIndex(index);
  }, []);

  const handlePlayAgain = () => {
    navigate('/');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
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

  if (!replayData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Replay not found</p>
      </div>
    );
  }

  const currentSnapshot = replayData.snapshots[currentMoveIndex];
  const game = replayData.game;
  const currentMove = currentSnapshot.move;
  
  // Determine winning line if we're at the final state
  const showWinningLine = currentMoveIndex === replayData.total_moves && game.state.winning_line;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 relative overflow-hidden bg-grid" data-testid="replay-page">
      <ParticleBackground />
      
      <div className="relative z-10">
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
          
          <motion.h1 
            className="font-heading font-bold text-lg uppercase tracking-wider"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Match Replay
          </motion.h1>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleCopyLink}
              className="text-white/60 hover:text-white hover:bg-white/5"
              data-testid="share-replay-btn"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              onClick={handlePlayAgain}
              className="text-white/60 hover:text-white hover:bg-white/5"
              data-testid="play-again-btn"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Game
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center">
          {/* Left Panel - Move History */}
          <motion.div 
            className="hidden lg:block w-64"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <MoveHistory
              moves={replayData.game.moves}
              currentMoveIndex={currentMoveIndex}
              onMoveClick={handleMoveClick}
            />
          </motion.div>

          {/* Center - Game Board */}
          <motion.div 
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Player Info */}
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-[#FF3B30] font-heading font-bold text-2xl neon-text-x">X</p>
                <p className="text-white/60">{game.player_x_username}</p>
              </div>
              <span className="text-white/20 text-2xl">vs</span>
              <div className="text-center">
                <p className="text-[#007AFF] font-heading font-bold text-2xl neon-text-o">O</p>
                <p className="text-white/60">{game.player_o_username}</p>
              </div>
            </div>

            {/* Result Banner (only at final state) */}
            <AnimatePresence>
              {currentMoveIndex === replayData.total_moves && (
                <motion.div 
                  className={`winner-banner ${
                    game.state.is_draw ? 'winner-draw' : 
                    game.state.winner === 'X' ? 'winner-x' : 'winner-o'
                  }`}
                  data-testid="replay-result"
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {game.state.is_draw ? "Draw!" : `${game.state.winner === 'X' ? game.player_x_username : game.player_o_username} Wins!`}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Game Board */}
            <GameBoard
              board={currentSnapshot.board}
              winningLine={showWinningLine ? game.state.winning_line : null}
              highlightedMove={currentMove?.position}
              onCellClick={() => {}}
              disabled={true}
            />

            {/* Replay Controls */}
            <motion.div 
              className="w-full max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ReplayControls
                currentMove={currentMoveIndex}
                totalMoves={replayData.total_moves}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                onPlay={handlePlay}
                onPause={handlePause}
                onStepBack={handleStepBack}
                onStepForward={handleStepForward}
                onGoToStart={handleGoToStart}
                onGoToEnd={handleGoToEnd}
                onSeek={handleSeek}
                onSpeedChange={handleSpeedChange}
              />
            </motion.div>
          </motion.div>

          {/* Right Panel - Game Info */}
          <motion.div 
            className="hidden lg:block w-64"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="glass-panel rounded-xl p-4 space-y-4">
              <h3 className="font-heading font-bold uppercase tracking-wider text-xs text-white/60">
                Game Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Code</span>
                  <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded">{game.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Mode</span>
                  <span className="text-white capitalize">{game.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Total Moves</span>
                  <span className="text-white font-mono">{replayData.total_moves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Result</span>
                  <span className={
                    game.state.is_draw ? 'text-[#FFCC00]' : 
                    game.state.winner === 'X' ? 'text-[#FF3B30]' : 'text-[#007AFF]'
                  }>
                    {game.state.is_draw ? 'Draw' : `${game.state.winner} Won`}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile Move History */}
        <motion.div 
          className="lg:hidden mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <MoveHistory
            moves={replayData.game.moves}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={handleMoveClick}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default ReplayPage;
