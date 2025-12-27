/**
 * Main Entry Point
 *
 * Bootstraps the game when the DOM is ready.
 */

import { Game, createGame } from "./Game";

// Extend Window interface for global access
declare global {
  interface Window {
    gameInstance: Game | null;
    GrandTheftSwarm: {
      createGame: typeof createGame;
      getGame: () => Game | null;
    };
  }
}

/**
 * Hide the loading screen with a fade transition
 */
function hideLoading(): void {
  const loading = document.getElementById("loading");
  if (loading) {
    loading.style.opacity = "0";
    loading.style.transition = "opacity 0.3s ease";
    setTimeout(() => loading.remove(), 300);
  }
}

/**
 * Initialize the game when DOM is ready
 */
function initializeGame(): void {
  // Hide loading screen
  hideLoading();

  // Create the game container if it doesn't exist
  let rootElement = document.getElementById("game-root");

  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = "game-root";
    document.body.appendChild(rootElement);
  }

  // Create and start the game
  const game = createGame({
    rootElement,
    autoStart: true,
  });

  // Expose to window for debugging and UI access
  window.gameInstance = game;
  window.GrandTheftSwarm = {
    createGame,
    getGame: () => window.gameInstance,
  };

  console.log("Grand Theft Swarm: Game initialized");
  console.log("Access game instance via window.gameInstance or window.GrandTheftSwarm.getGame()");
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeGame);
} else {
  initializeGame();
}
