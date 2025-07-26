import { createElement } from "@minireact";
import type { GameSettings, PlayerConfig } from "@/types/games";
import PlayerCard from "./PlayerCard";

interface PlayerSettingsProps {
  gameSettings: GameSettings;
  onUpdatePlayer: (playerId: number, updates: Partial<PlayerConfig>) => void;
  onOpenUserSelection: (playerId: number) => void;
}

export default function PlayerSettings({
  gameSettings,
  onUpdatePlayer,
  onOpenUserSelection,
}: PlayerSettingsProps) {
  const is2v2 = gameSettings.gameMode === "2v2";
  const isManyVsMany = gameSettings.gameMode === "manyvsmany";
  const numPlayers = gameSettings.numPlayers || 2;

  if (isManyVsMany && numPlayers > 2) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-center">Player Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameSettings.players.slice(0, numPlayers).map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              gameSettings={gameSettings}
              onUpdatePlayer={onUpdatePlayer}
              onOpenUserSelection={onOpenUserSelection}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-center">Player Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Team */}
        <div className="space-y-4">
          {gameSettings.players
            .filter(player => (is2v2 ? player.id < 2 : player.id === 0))
            .map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                gameSettings={gameSettings}
                onUpdatePlayer={onUpdatePlayer}
                onOpenUserSelection={onOpenUserSelection}
              />
            ))}
        </div>

        {/* Right Team */}
        <div className="space-y-4">
          {gameSettings.players
            .filter(player => (is2v2 ? player.id >= 2 : player.id === 1))
            .map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                gameSettings={gameSettings}
                onUpdatePlayer={onUpdatePlayer}
                onOpenUserSelection={onOpenUserSelection}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
