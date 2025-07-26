import { createElement } from "@minireact";
import type { PlayerConfig, GameSettings } from "@/types/games";

interface PlayerHeaderProps {
  player: PlayerConfig;
  gameSettings: GameSettings;
  getStyleString: (color: string) => string;
}

export default function PlayerHeader({
  player,
  gameSettings,
  getStyleString,
}: PlayerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">
          {gameSettings.gameMode === "2v2"
            ? `${player.id < 2 ? "Left" : "Right"} ${
                player.id % 2 === 0 ? "Top" : "Bottom"
              }`
            : player.id === 0
            ? "Left"
            : "Right"}
          {player.name ? `: ${player.name}` : ""}
        </h3>

        {gameSettings.matchType === "skirmish" && player.type === "player" ? (
          <svg
            className="w-10 h-10 rounded-full mr-3"
            version="1.1"
            viewBox="0 0 1066.7 1066.7"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m292.58 313.99c76.757-132.95 246.77-178.5 379.71-101.74 132.95 76.76 178.51 246.76 101.75 379.72-36.995 64.075-95.668 107.78-161.4 127.34l-349.65-201.87c-15.917-66.704-7.408-139.37 29.587-203.44"
              fill={player.color}
            />
            <path
              d="m346.21 678.25c-39.836-33.272-68.551-76.227-84.624-123.34l316.65 182.82c-47.244 9.3227-97.035 6.4733-144.35-9.8907l-87.996 152.42c-6.3187 10.949-20.324 14.697-31.271 8.3773l-47.587-27.473c-10.947-6.3227-14.697-20.32-8.3787-31.269l87.553-151.65"
              fill={player.color}
            />
          </svg>
        ) : (
          <img
            src={
              player.type === "player"
                ? `${import.meta.env.VITE_API_BASE}/users/avatar/${
                    player.avatar
                  }`
                : `/images/marvin.jpg`
            }
            alt={player.type === "player" ? player.name : `Marvin ${player.id + 1}`}
            className="w-10 h-10 rounded-full mr-3"
          />
        )}
      </div>
      <div
        className="w-5 h-5 rounded-full border-2 border-gray-800 shadow-sm"
        style={getStyleString(player.color)}
      />
    </div>
  );
}
