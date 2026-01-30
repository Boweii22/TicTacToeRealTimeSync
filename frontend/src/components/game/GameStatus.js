import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Trophy, Clock, Zap } from "lucide-react";

const GameStatus = ({ 
  status, 
  currentTurn, 
  winner, 
  isDraw,
  playerXUsername,
  playerOUsername,
  currentPlayerId,
  playerXId
}) => {
  const isPlayerX = currentPlayerId === playerXId;
  const isMyTurn = (currentTurn === 'X' && isPlayerX) || (currentTurn === 'O' && !isPlayerX);

  if (status === 'completed') {
    if (isDraw) {
      return (
        <motion.div 
          className="winner-banner winner-draw flex items-center justify-center gap-3"
          data-testid="game-result-draw"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Clock className="h-6 w-6" />
          It's a Draw!
        </motion.div>
      );
    }
    
    const winnerName = winner === 'X' ? playerXUsername : playerOUsername;
    return (
      <motion.div 
        className={cn(
          "winner-banner flex items-center justify-center gap-3",
          winner === 'X' ? 'winner-x' : 'winner-o'
        )}
        data-testid="game-result-winner"
        initial={{ scale: 0, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Trophy className="h-6 w-6" />
        </motion.div>
        {winnerName} Wins!
      </motion.div>
    );
  }

  if (status === 'waiting') {
    return (
      <motion.div 
        className="text-center py-4 px-6 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
        data-testid="game-status-waiting"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-yellow-400 font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Clock className="h-4 w-4" />
          </motion.span>
          Waiting for opponent
          <span className="loading-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={currentTurn}
        className={cn(
          "text-center py-4 px-6 rounded-xl relative overflow-hidden",
          currentTurn === 'X' ? 'bg-[#FF3B30]/10 border border-[#FF3B30]/30' : 'bg-[#007AFF]/10 border border-[#007AFF]/30'
        )}
        data-testid="game-status-turn"
        initial={{ opacity: 0, x: currentTurn === 'X' ? -50 : 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: currentTurn === 'X' ? 50 : -50 }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated background pulse */}
        <motion.div
          className={cn(
            "absolute inset-0",
            currentTurn === 'X' ? 'bg-[#FF3B30]/5' : 'bg-[#007AFF]/5'
          )}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        <p className={cn(
          "font-semibold uppercase tracking-wider text-sm relative z-10 flex items-center justify-center gap-2",
          currentTurn === 'X' ? 'text-[#FF3B30]' : 'text-[#007AFF]'
        )}>
          {isMyTurn && (
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Zap className="h-4 w-4" />
            </motion.span>
          )}
          {isMyTurn ? "Your Turn" : `${currentTurn === 'X' ? playerXUsername : playerOUsername}'s Turn`}
          <span className={cn(
            "ml-2 font-heading font-black text-xl",
            currentTurn === 'X' ? 'neon-text-x' : 'neon-text-o'
          )}>
            {currentTurn}
          </span>
        </p>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameStatus;
