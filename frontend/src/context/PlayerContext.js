import { createContext, useContext, useState, useEffect } from 'react';

const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load player from localStorage on mount
    const savedPlayer = localStorage.getItem('ttt_player');
    if (savedPlayer) {
      try {
        setPlayer(JSON.parse(savedPlayer));
      } catch (e) {
        localStorage.removeItem('ttt_player');
      }
    }
    setLoading(false);
  }, []);

  const savePlayer = (playerData) => {
    setPlayer(playerData);
    localStorage.setItem('ttt_player', JSON.stringify(playerData));
  };

  const clearPlayer = () => {
    setPlayer(null);
    localStorage.removeItem('ttt_player');
  };

  return (
    <PlayerContext.Provider value={{ player, setPlayer: savePlayer, clearPlayer, loading }}>
      {children}
    </PlayerContext.Provider>
  );
};
