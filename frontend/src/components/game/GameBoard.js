import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import GameCell from "./GameCell";

const GameBoard = ({ 
  board, 
  winningLine, 
  onCellClick, 
  disabled = false,
  highlightedMove = null,
  size = "default"
}) => {
  const sizeClasses = {
    default: "w-80 h-80 md:w-96 md:h-96",
    small: "w-48 h-48",
    large: "w-96 h-96 md:w-[28rem] md:h-[28rem]"
  };

  return (
    <motion.div 
      className={cn(
        "mx-auto relative",
        sizeClasses[size]
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      data-testid="game-board"
    >
      {/* Animated border glow */}
      <motion.div
        className="absolute -inset-1 bg-gradient-to-r from-[#FF3B30] via-[#007AFF] to-[#FF3B30] rounded-xl opacity-30 blur-sm pointer-events-none"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ backgroundSize: "200% 200%", zIndex: 0 }}
      />
      
      {/* Game grid */}
      <div className="game-grid relative z-10 h-full w-full">
        {board.map((cell, index) => (
          <GameCell
            key={index}
            value={cell}
            index={index}
            isWinning={winningLine?.includes(index)}
            isHighlighted={highlightedMove === index}
            onClick={() => onCellClick(index)}
            disabled={disabled || cell !== null}
            size={size}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default GameBoard;
