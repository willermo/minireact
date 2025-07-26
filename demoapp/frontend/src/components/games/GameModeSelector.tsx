import { createElement } from "@minireact";
import type { GameSettings } from "@/types/games";

interface GameModeSelectorProps {
  gameSettings: GameSettings;
  onGameModeChange: (gameMode: "1v1" | "2v2") => void;
}

export default function GameModeSelector({
  gameSettings,
  onGameModeChange,
}: GameModeSelectorProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-center font-medium mb-2">
        Game Mode
      </label>
      <div className="flex space-x-4">
        <label
          className={`inline-flex items-center px-3 py-1.5 rounded cursor-pointer ${
            gameSettings.gameMode === "1v1"
              ? "bg-blue-600 text-white"
              : "themed-bg"
          }`}
        >
          <input
            type="radio"
            name="game-mode"
            value="1v1"
            checked={gameSettings.gameMode === "1v1"}
            onInput={() => onGameModeChange("1v1")}
            className="hidden"
          />
          1 vs 1
        </label>
        <label
          className={`inline-flex items-center px-3 py-1.5 rounded cursor-pointer ${
            gameSettings.gameMode === "2v2"
              ? "bg-blue-600 text-white"
              : "themed-bg"
          }`}
        >
          <input
            type="radio"
            name="game-mode"
            value="2v2"
            checked={gameSettings.gameMode === "2v2"}
            onInput={() => onGameModeChange("2v2")}
            className="hidden"
          />
          2 vs 2
        </label>
      </div>
    </div>
  );
}
