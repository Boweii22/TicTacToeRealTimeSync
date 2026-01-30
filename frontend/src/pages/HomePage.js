import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/context/PlayerContext';
import { createOrGetPlayer, createGame, searchPlayers, getPlayerGamesByUsername, joinGameByCode } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Globe, BarChart3, History, Search, Hash, ArrowRight, Sparkles } from 'lucide-react';
import ParticleBackground from '@/components/ui/ParticleBackground';

const HomePage = () => {
  const navigate = useNavigate();
  const { player, setPlayer } = usePlayer();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerGames, setPlayerGames] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSetUsername = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      const playerData = await createOrGetPlayer(username.trim());
      setPlayer(playerData);
      toast.success(`Welcome, ${playerData.username}!`);
    } catch (error) {
      toast.error('Failed to create player');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalGame = async () => {
    if (!player) return;
    
    setLoading(true);
    try {
      const game = await createGame('local', player.id);
      navigate(`/game/${game.id}`);
    } catch (error) {
      toast.error('Failed to create game');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnlineGame = () => {
    if (!player) return;
    navigate('/lobby');
  };

  const handleJoinByCode = async () => {
    if (!player || !gameCode.trim()) {
      toast.error('Please enter a game code');
      return;
    }
    
    setLoading(true);
    try {
      const game = await joinGameByCode(gameCode.trim(), player.id);
      toast.success('Joined game!');
      setShowJoinDialog(false);
      navigate(`/game/${game.id}`);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Invalid game code';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Search players with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchPlayers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectPlayer = async (selectedPlayer) => {
    setSelectedPlayer(selectedPlayer);
    setSearchLoading(true);
    try {
      const games = await getPlayerGamesByUsername(selectedPlayer.username);
      setPlayerGames(games);
    } catch (error) {
      toast.error('Failed to load player games');
    } finally {
      setSearchLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-grid">
      <ParticleBackground />
      
      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div className="text-center mb-12" variants={itemVariants}>
          <motion.h1 
            className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight uppercase mb-4 title-glow"
            data-testid="hero-title"
            animate={{ 
              textShadow: [
                "0 0 10px rgba(255,255,255,0.1)",
                "0 0 20px rgba(255,255,255,0.3)",
                "0 0 10px rgba(255,255,255,0.1)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Tic-Tac-Toe
          </motion.h1>
          <p className="text-white/60 text-base lg:text-lg max-w-md mx-auto">
            Real-time multiplayer with match replays and player statistics
          </p>
        </motion.div>

        {/* Username Input or Game Options */}
        {!player ? (
          <motion.form 
            onSubmit={handleSetUsername} 
            className="w-full space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/60 font-semibold">
                Enter Your Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="bg-[#111111] border-white/10 focus:border-white/40 text-white h-12 search-input"
                maxLength={20}
                disabled={loading}
                data-testid="username-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 btn-animated bg-white text-black font-semibold hover:bg-gray-100"
              disabled={loading}
              data-testid="submit-username-btn"
            >
              {loading ? <span className="spinner" /> : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </motion.form>
        ) : (
          <motion.div 
            className="w-full space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Welcome Back */}
            <div className="text-center mb-8">
              <p className="text-white/60 text-sm uppercase tracking-wider">Playing as</p>
              <motion.p 
                className="font-heading font-bold text-2xl"
                data-testid="player-username"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {player.username}
              </motion.p>
            </div>

            {/* Game Mode Selection */}
            <motion.div 
              className="grid gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Button
                onClick={handleLocalGame}
                className="w-full h-14 btn-animated bg-white text-black font-semibold hover:bg-gray-100 flex items-center justify-center gap-3"
                disabled={loading}
                data-testid="local-game-btn"
              >
                <Users className="h-5 w-5" />
                <span>Local 2-Player</span>
              </Button>
              
              <Button
                onClick={handleOnlineGame}
                variant="outline"
                className="w-full h-14 btn-animated border-white/20 hover:border-white/60 text-white flex items-center justify-center gap-3"
                disabled={loading}
                data-testid="online-game-btn"
              >
                <Globe className="h-5 w-5" />
                <span>Online Multiplayer</span>
              </Button>

              {/* Join by Code Button */}
              <Button
                onClick={() => setShowJoinDialog(true)}
                variant="outline"
                className="w-full h-14 btn-animated border-[#007AFF]/30 hover:border-[#007AFF] text-[#007AFF] flex items-center justify-center gap-3"
                disabled={loading}
                data-testid="join-by-code-btn"
              >
                <Hash className="h-5 w-5" />
                <span>Join with Code</span>
              </Button>
            </motion.div>

            {/* Quick Links */}
            <motion.div 
              className="flex gap-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
               <Button
                variant="ghost"
                onClick={() => navigate('/profile')}
                className="text-white/60 hover:text-white hover:bg-white/5 flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Profile
  </Button>
              

              <Button
                variant="ghost"
                onClick={() => setShowSearchDialog(true)}
                className="flex-1 text-white/60 hover:text-white hover:bg-white/5"
                data-testid="search-players-btn"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/stats')}
                className="flex-1 text-white/60 hover:text-white hover:bg-white/5"
                data-testid="stats-link-btn"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Stats
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/history')}
                className="flex-1 text-white/60 hover:text-white hover:bg-white/5"
                data-testid="history-link-btn"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* Join by Code Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="bg-[#111111] border-white/10">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Join Game with Code</DialogTitle>
            <DialogDescription className="text-white/60">
              Enter the 6-character game code shared by your friend
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              className="bg-[#0A0A0A] border-white/10 text-center text-2xl font-mono tracking-[0.5em] h-14"
              maxLength={6}
              data-testid="game-code-input"
            />
            <Button
              onClick={handleJoinByCode}
              className="w-full h-12 btn-animated bg-[#007AFF] text-white font-semibold hover:bg-[#007AFF]/90"
              disabled={loading || gameCode.length !== 6}
              data-testid="join-game-btn"
            >
              {loading ? <span className="spinner" /> : (
                <>
                  Join Game
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Players Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={(open) => {
        setShowSearchDialog(open);
        if (!open) {
          setSearchQuery('');
          setSearchResults([]);
          setSelectedPlayer(null);
          setPlayerGames([]);
        }
      }}>
        <DialogContent className="bg-[#111111] border-white/10 max-w-lg max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Search Players</DialogTitle>
            <DialogDescription className="text-white/60">
              Find players and watch their game replays
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedPlayer(null);
              }}
              placeholder="Search by username..."
              className="bg-[#0A0A0A] border-white/10 h-12 search-input"
              data-testid="player-search-input"
            />
            
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {searchLoading ? (
                <div className="flex justify-center py-8">
                  <span className="spinner" />
                </div>
              ) : selectedPlayer ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="font-semibold">{selectedPlayer.username}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPlayer(null);
                        setPlayerGames([]);
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      Back
                    </Button>
                  </div>
                  
                  <p className="text-xs uppercase tracking-wider text-white/40">
                    {playerGames.length} Completed Games
                  </p>
                  
                  {playerGames.length === 0 ? (
                    <p className="text-white/40 text-center py-4">No games found</p>
                  ) : (
                    playerGames.map((game) => (
                      <motion.div
                        key={game.id}
                        className="p-3 glass-panel rounded-lg cursor-pointer hover:border-white/30"
                        onClick={() => {
                          setShowSearchDialog(false);
                          navigate(`/replay/${game.id}`);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        data-testid={`search-game-${game.id}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm">
                              <span className="text-[#FF3B30]">{game.player_x_username}</span>
                              {' vs '}
                              <span className="text-[#007AFF]">{game.player_o_username}</span>
                            </p>
                            <p className="text-xs text-white/40">
                              {game.moves.length} moves • {game.state.winner ? `${game.state.winner} won` : 'Draw'}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-white/40" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <motion.div
                    key={result.id}
                    className="p-3 glass-panel rounded-lg cursor-pointer hover:border-white/30"
                    onClick={() => handleSelectPlayer(result)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`search-result-${result.id}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{result.username}</span>
                      <ArrowRight className="h-4 w-4 text-white/40" />
                    </div>
                  </motion.div>
                ))
              ) : searchQuery.length >= 2 ? (
                <p className="text-white/40 text-center py-4">No players found</p>
              ) : (
                <p className="text-white/40 text-center py-4">Type at least 2 characters to search</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
