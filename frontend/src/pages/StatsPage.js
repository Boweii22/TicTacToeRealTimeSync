import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/context/PlayerContext';
import { getPlayerStats } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Target, Minus, TrendingUp, Zap } from 'lucide-react';
import ParticleBackground from '@/components/ui/ParticleBackground';

const StatsCard = ({ icon: Icon, label, value, color = 'white', delay = 0 }) => (
  <motion.div 
    className="stats-card"
    data-testid={`stat-${label.toLowerCase().replace(' ', '-')}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02, y: -4 }}
  >
    <div className="flex items-center gap-2 text-white/60">
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="text-xs uppercase tracking-wider font-semibold">{label}</span>
    </div>
    <motion.p 
      className="font-heading font-black text-4xl"
      style={{ color }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
    >
      {value}
    </motion.p>
  </motion.div>
);

const StatsPage = () => {
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!player) {
        navigate('/');
        return;
      }

      try {
        const statsData = await getPlayerStats(player.id);
        setStats(statsData);
      } catch (error) {
        toast.error('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [player, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid">
        <div className="spinner" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">No stats available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 relative overflow-hidden bg-grid" data-testid="stats-page">
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

        {/* Stats Content */}
        <div className="flex-1 max-w-2xl mx-auto w-full">
          {/* Player Info */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="inline-block mb-4"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="h-8 w-8 text-[#FFCC00]" />
            </motion.div>
            <h1 className="font-heading font-black text-4xl uppercase tracking-tight mb-2 title-glow">
              {stats.username}
            </h1>
            <p className="text-white/60 text-sm uppercase tracking-wider">Player Statistics</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatsCard
              icon={Target}
              label="Total Games"
              value={stats.total_games}
              delay={0.1}
            />
            <StatsCard
              icon={TrendingUp}
              label="Win Rate"
              value={`${stats.win_rate}%`}
              color="#34C759"
              delay={0.2}
            />
            <StatsCard
              icon={Trophy}
              label="Wins"
              value={stats.wins}
              color="#34C759"
              delay={0.3}
            />
            <StatsCard
              icon={Minus}
              label="Draws"
              value={stats.draws}
              color="#FFCC00"
              delay={0.4}
            />
          </div>

          {/* Losses */}
          <motion.div 
            className="stats-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 text-white/60">
              <span className="text-xs uppercase tracking-wider font-semibold">Losses</span>
            </div>
            <motion.p 
              className="font-heading font-black text-4xl text-[#FF3B30]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
            >
              {stats.losses}
            </motion.p>
          </motion.div>

          {/* Win/Loss Bar */}
          {stats.total_games > 0 && (
            <motion.div 
              className="mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-xs uppercase tracking-wider text-white/60 mb-2 font-semibold">
                Performance
              </p>
              <div className="h-6 rounded-full bg-[#111111] overflow-hidden flex relative">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#34C759] to-[#34C759]/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.wins / stats.total_games) * 100}%` }}
                  transition={{ duration: 1, delay: 0.8 }}
                />
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#FFCC00] to-[#FFCC00]/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.draws / stats.total_games) * 100}%` }}
                  transition={{ duration: 1, delay: 1 }}
                />
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#FF3B30] to-[#FF3B30]/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.losses / stats.total_games) * 100}%` }}
                  transition={{ duration: 1, delay: 1.2 }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#34C759]" /> Wins
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#FFCC00]" /> Draws
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#FF3B30]" /> Losses
                </span>
              </div>
            </motion.div>
          )}

          {/* No Games Message */}
          {stats.total_games === 0 && (
            <motion.div 
              className="text-center mt-8 p-6 glass-panel rounded-xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-white/60 mb-4">No games played yet</p>
              <Button
                onClick={() => navigate('/')}
                className="btn-animated bg-white text-black hover:bg-gray-100"
                data-testid="play-first-game-btn"
              >
                Play Your First Game
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
