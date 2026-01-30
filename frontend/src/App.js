import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import GamePage from "@/pages/GamePage";
import ReplayPage from "@/pages/ReplayPage";
import StatsPage from "@/pages/StatsPage";
import HistoryPage from "@/pages/HistoryPage";
import LobbyPage from "@/pages/LobbyPage";
import ProfilePage from "@/pages/ProfilePage";
import { PlayerProvider } from "@/context/PlayerContext";

function App() {
  return (
    <PlayerProvider>
      <div className="App min-h-screen bg-[#0A0A0A]">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/replay/:gameId" element={<ReplayPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </div>
    </PlayerProvider>
  );
}

export default App;
