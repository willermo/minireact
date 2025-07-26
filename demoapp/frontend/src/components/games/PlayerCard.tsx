import { createElement, Fragment } from "@minireact";
import type { PlayerConfig, GameSettings, PlayerType } from "@/types/games";
import PlayerHeader from "./PlayerHeader";
import DifficultySelector from "./DifficultySelector";
import PaddleColorPicker from "./PaddleColorPicker";
import PlayerTypeSelector from "./PlayerTypeSelector";

interface PlayerCardProps {
  key: number;
  player: PlayerConfig;
  gameSettings: GameSettings;
  onUpdatePlayer: (playerId: number, updates: Partial<PlayerConfig>) => void;
  onOpenUserSelection: (playerId: number) => void;
}

export default function PlayerCard({
  player,
  gameSettings,
  onUpdatePlayer,
  onOpenUserSelection,
}: PlayerCardProps) {

  const getStyleString = (color: string) => {
    return `background-color: ${color};`;
  };
  return (
    <div className="p-4 themed-card rounded-lg border border-gray-600">
      {gameSettings.matchType === "ranked" && player.userId === undefined && (
        <div className="grid place-items-center h-full">
          <button
            type="button"
            onClick={() => onOpenUserSelection(player.id)}
            className="px-3 py-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 cursor-pointer"
          >
            Select Player
          </button>
        </div>
      )}
      {(gameSettings.matchType === "skirmish" || player.userId) && (
        <>
          <PlayerHeader
            player={player}
            gameSettings={gameSettings}
            getStyleString={getStyleString}
          />

          <div className="mt-3 grid grid-cols-1 gap-3">
            {gameSettings.matchType === "skirmish" && (
              <PlayerTypeSelector
                playerType={player.type}
                playerId={player.id}
                onTypeChange={(type: PlayerType, name: string) =>
                  onUpdatePlayer(player.id, { type, name })
                }
              />
            )}

            {player.type === "ai" && (
              <DifficultySelector
                difficulty={player.difficulty}
                onDifficultyChange={newDifficulty =>
                  onUpdatePlayer(player.id, { difficulty: newDifficulty })
                }
              />
            )}
            <PaddleColorPicker
              color={player.color}
              onColorChange={newColor =>
                onUpdatePlayer(player.id, { color: newColor })
              }
              label="Paddle Color"
              className="mt-3"
            />
          </div>
        </>
      )}
    </div>
  );
}
