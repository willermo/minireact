import { createElement } from "@minireact";
import type { GameSettings } from "@/types/games";

interface GameHeaderProps {
  gameSettings: GameSettings;
  onHandleAbortMatch: () => void;
}

export default function GameHeader({
  gameSettings,
  onHandleAbortMatch,
}: GameHeaderProps) {
  const isTournament = gameSettings.matchType === "tournament";
  
  return (
    <div className="w-full max-w-4xl px-4 mb-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {gameSettings.gameType.charAt(0).toUpperCase() +
            gameSettings.gameType.slice(1)}{" "}
          {gameSettings.gameMode}
        </h1>
        {!isTournament && (
          <button
            onClick={onHandleAbortMatch}
            className="px-4 py-2 themed-bg rounded-md text-sm font-medium hover:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Abort Match
          </button>
        )}
      </div>
      <div className="mt-2">
        <div className="text-center themed-text-secondary">
          First to {gameSettings.targetScore} points wins!
        </div>
      </div>
    </div>
  );
}
