import { GameProvider } from './contexts/GameContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CloudSyncProvider } from './contexts/CloudSyncContext';
import { GameContainer } from './components/GameContainer';

export function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <CloudSyncProvider>
          <ThemeProvider>
            <GameContainer />
          </ThemeProvider>
        </CloudSyncProvider>
      </GameProvider>
    </AuthProvider>
  );
}
