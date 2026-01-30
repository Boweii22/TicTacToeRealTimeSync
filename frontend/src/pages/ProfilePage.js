import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { updateUsername } from '../lib/api';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import ParticleBackground from '../components/ui/ParticleBackground';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { player, setPlayer } = usePlayer();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (player) {
      setUsername(player.username || '');
    } else {
      navigate('/');
    }
  }, [player, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    try {
      await updateUsername(player.id, username.trim());
      setPlayer({ ...player, username: username.trim() });
      toast.success('Username updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update username');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 relative overflow-hidden bg-grid" data-testid="profile-page">
      <ParticleBackground />

      <div className="relative z-10 max-w-xl mx-auto w-full">
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

        <motion.div
          className="glass-panel rounded-2xl p-6 md:p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-center mb-3">
              <User className="h-8 w-8 text-[#007AFF]" />
            </div>
            <h1 className="font-heading font-black text-3xl uppercase tracking-tight title-glow">
              Profile
            </h1>
            <p className="text-white/60 text-sm uppercase tracking-wider mt-2">
              Update your username
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs uppercase tracking-wider text-white/60 font-semibold">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#0A0A0A] border-white/10 focus:border-white/40 text-white h-12"
                placeholder="Enter new username"
                maxLength={20}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 btn-animated bg-gradient-to-r from-[#007AFF] to-[#7C3AED] text-white font-semibold"
              disabled={isLoading || !username.trim() || username.trim() === player?.username}
              data-testid="update-username-btn"
            >
              {isLoading ? 'Updating...' : 'Update Username'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}