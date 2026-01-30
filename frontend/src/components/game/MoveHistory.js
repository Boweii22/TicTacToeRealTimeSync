import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const MoveHistory = ({ moves, currentMoveIndex, onMoveClick }) => {
  const positionToCoord = (pos) => {
    const row = Math.floor(pos / 3) + 1;
    const col = (pos % 3) + 1;
    return `(${row},${col})`;
  };

  return (
    <div className="glass-panel rounded-xl p-4" data-testid="move-history">
      <h3 className="font-heading font-bold uppercase tracking-wider text-xs text-white/60 mb-3">
        Move History
      </h3>
      
      <ScrollArea className="h-64">
        <div className="space-y-1">
          <button
            onClick={() => onMoveClick(0)}
            className={cn(
              "move-item w-full text-left",
              currentMoveIndex === 0 && "active"
            )}
            data-testid="move-item-0"
          >
            <span className="font-mono text-white/40 text-sm w-8">0.</span>
            <span className="text-white/60 text-sm">Start</span>
          </button>
          
          {moves.map((move, index) => (
            <button
              key={index}
              onClick={() => onMoveClick(index + 1)}
              className={cn(
                "move-item w-full text-left",
                currentMoveIndex === index + 1 && "active"
              )}
              data-testid={`move-item-${index + 1}`}
            >
              <span className="font-mono text-white/40 text-sm w-8">
                {index + 1}.
              </span>
              <span 
                className={cn(
                  "font-heading font-bold w-6",
                  move.symbol === 'X' ? 'text-[#FF3B30]' : 'text-[#007AFF]'
                )}
              >
                {move.symbol}
              </span>
              <span className="text-white/60 text-sm font-mono">
                {positionToCoord(move.position)}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MoveHistory;
