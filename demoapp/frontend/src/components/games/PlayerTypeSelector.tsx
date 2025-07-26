import { createElement } from "@minireact";
import type { PlayerType } from "@/types/games";

interface PlayerTypeSelectorProps {
  playerType: PlayerType;
  playerId: number;
  onTypeChange: (type: PlayerType, name: string) => void;
  className?: string;
}

export default function PlayerTypeSelector({
  playerType,
  playerId,
  onTypeChange,
  className = "",
}: PlayerTypeSelectorProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">Type</label>
      <div className="flex space-x-4 justify-center">
        <label
          className={`inline-flex items-center px-3 py-1.5 rounded cursor-pointer ${
            playerType === "player" ? "bg-blue-600 text-white" : "themed-bg"
          }`}
        >
          <input
            type="radio"
            name={`player-type-${playerId}`}
            value="player"
            checked={playerType === "player"}
            onInput={() => onTypeChange("player", `Player ${playerId + 1}`)}
            className="hidden"
          />
          Player
        </label>
        <label
          className={`inline-flex items-center px-3 py-1.5 rounded cursor-pointer ${
            playerType === "ai" ? "bg-blue-600 text-white" : "themed-bg"
          }`}
        >
          <input
            type="radio"
            name={`player-type-${playerId}`}
            value="ai"
            checked={playerType === "ai"}
            onInput={() => onTypeChange("ai", `Marvin ${playerId + 1}`)}
            className="hidden"
          />
          AI
        </label>
      </div>
    </div>
  );
}
