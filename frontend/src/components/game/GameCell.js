import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const GameCell = ({ 
  value, 
  index, 
  isWinning = false, 
  isHighlighted = false,
  onClick, 
  disabled = false,
  size = "default"
}) => {
  const sizeClasses = {
    default: "text-5xl md:text-6xl",
    small: "text-3xl",
    large: "text-6xl md:text-7xl"
  };

  return (
    <button
      data-testid={`cell-${index}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Cell ${index + 1}${value ? `, ${value}` : ', empty'}`}
      className={cn(
        "aspect-square flex items-center justify-center",
        "font-heading font-black tracking-tight",
        "bg-[#111111] transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-white/30",
        "relative overflow-hidden",
        sizeClasses[size],
        !disabled && !value && "hover:bg-white/5 cursor-pointer hover:scale-105 active:scale-95",
        disabled && "cursor-default",
        isWinning && value === 'X' && "winning-cell-x",
        isWinning && value === 'O' && "winning-cell-o",
        isHighlighted && "ring-2 ring-white/50"
      )}
    >
      {value && (
        <motion.span 
          className={cn(
            value === 'X' ? 'cell-x' : 'cell-o'
          )}
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            duration: 0.5 
          }}
        >
          {value}
        </motion.span>
      )}
    </button>
  );
};

export default GameCell;
