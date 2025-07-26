import { createElement, useContext } from "@minireact";
import { UserContext } from "@/contexts/UserContext";
import type { GameSettings, PlayerConfig } from "@/types/games";
import GameModeSelector from "@components/games/GameModeSelector";
import MatchTypeSelector from "@components/games/MatchTypeSelector";
import TargetScoreSlider from "@components/games/TargetScoreSlider";
import PlayerSettings from "@components/games/PlayerSettings";
import ActionButtons from "@components/games/ActionButtons";

type GameSettingsProps = {
  gameSettings: GameSettings;
  setGameSettings: (
    settings: GameSettings | ((prev: GameSettings) => GameSettings)
  ) => void;
  updatePlayer: (playerId: number, updates: Partial<PlayerConfig>) => void;
  openUserSelection: (playerId: number) => void;
  resetMenu: () => void;
  handleStartMatch: () => void;
  rosterComplete: boolean;
};

export default function GameSettingsSection({
  gameSettings,
  setGameSettings,
  updatePlayer,
  openUserSelection,
  resetMenu,
  handleStartMatch,
  rosterComplete,
}: GameSettingsProps) {
  const { user } = useContext(UserContext);
  return (
    <div className="max-w-fit min-w-[70%] mx-auto themed-card shadow-md overflow-hidden p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {gameSettings.gameType.charAt(0).toUpperCase() +
          gameSettings.gameType.slice(1)}{" "}
        Game Settings
      </h1>

      <div className="space-y-6">
        <div className="flex justify-evenly">
          {gameSettings.gameType !== "tic_tac_toe" && (
            <GameModeSelector
              gameSettings={gameSettings}
              onGameModeChange={gameMode => {
                setGameSettings(prev => ({
                  ...prev,
                  gameMode,
                }));
              }}
            />
          )}
          {user && (
            <MatchTypeSelector
              gameSettings={gameSettings}
              onMatchTypeChange={matchType => {
                setGameSettings(prev => ({
                  ...prev,
                  matchType,
                }));
              }}
            />
          )}
        </div>

        {gameSettings.gameType !== "tic_tac_toe" && (
          <TargetScoreSlider
            gameSettings={gameSettings}
            onTargetScoreChange={value => {
              setGameSettings(prev => ({
                ...prev,
                targetScore: value,
              }));
            }}
          />
        )}

        <PlayerSettings
          gameSettings={gameSettings}
          onUpdatePlayer={updatePlayer}
          onOpenUserSelection={openUserSelection}
        />

        <ActionButtons
          onReset={resetMenu}
          onStart={handleStartMatch}
          matchType={gameSettings.matchType}
          rosterComplete={rosterComplete}
        />
      </div>
    </div>
  );
}
