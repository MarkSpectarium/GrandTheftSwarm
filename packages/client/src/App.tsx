import { GameProvider } from './contexts/GameContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { GameContainer } from './components/GameContainer';

export function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <ThemeProvider>
          <GameContainer />
        </ThemeProvider>
      </GameProvider>
    </AuthProvider>
  );
}
