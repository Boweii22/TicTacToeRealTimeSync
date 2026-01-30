import { Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const ReplayControls = ({
  currentMove,
  totalMoves,
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onStepBack,
  onStepForward,
  onGoToStart,
  onGoToEnd,
  onSeek,
  onSpeedChange
}) => {
  const speeds = [0.5, 1, 1.5, 2];

  return (
    <div className="glass-panel rounded-xl p-4 space-y-4" data-testid="replay-controls">
      {/* Timeline */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-white/60 font-mono">
          <span>Move {currentMove}</span>
          <span>of {totalMoves}</span>
        </div>
        <Slider
          value={[currentMove]}
          min={0}
          max={totalMoves}
          step={1}
          onValueChange={(value) => onSeek(value[0])}
          className="w-full"
          data-testid="replay-timeline"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onGoToStart}
          disabled={currentMove === 0}
          className="text-white/60 hover:text-white hover:bg-white/10"
          data-testid="replay-go-start"
        >
          <ChevronFirst className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onStepBack}
          disabled={currentMove === 0}
          className="text-white/60 hover:text-white hover:bg-white/10"
          data-testid="replay-step-back"
        >
          <SkipBack className="h-5 w-5" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={isPlaying ? onPause : onPlay}
          className="h-12 w-12 rounded-full border-white/20 hover:border-white/60 hover:bg-white/10"
          data-testid="replay-play-pause"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onStepForward}
          disabled={currentMove === totalMoves}
          className="text-white/60 hover:text-white hover:bg-white/10"
          data-testid="replay-step-forward"
        >
          <SkipForward className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onGoToEnd}
          disabled={currentMove === totalMoves}
          className="text-white/60 hover:text-white hover:bg-white/10"
          data-testid="replay-go-end"
        >
          <ChevronLast className="h-5 w-5" />
        </Button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-white/40 uppercase tracking-wider">Speed</span>
        {speeds.map((speed) => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            className={cn(
              "px-2 py-1 rounded text-xs font-mono transition-colors",
              playbackSpeed === speed 
                ? "bg-white text-black" 
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            data-testid={`replay-speed-${speed}`}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReplayControls;
