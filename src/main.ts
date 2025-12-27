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
 * Initialize the game when DOM is ready
 */
function initializeGame(): void {
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
