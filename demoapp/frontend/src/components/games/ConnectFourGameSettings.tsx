import { createElement, useContext } from "@minireact";
import { UserContext } from "@/contexts/UserContext";
import type { GameSettings, PlayerConfig } from "@/types/games";
import ConnectFourPlayerCount from "./ConnectFourPlayerCount";
import MatchTypeSelector from "./MatchTypeSelector";
import PlayerSettings from "./PlayerSettings";
import ActionButtons from "./ActionButtons";

type ConnectFourGameSettingsProps = {
  gameSettings: GameSettings;
  setGameSettings: (
    settings: GameSettings | ((prev: GameSettings) => GameSettings)
  ) => void;
  updatePlayer: (playerId: number, updates: Partial<PlayerConfig>) => void;
  openUserSelection: (playerId: number) => void;
  resetMenu: () => void;
  handleStartMatch: () => void;
  rosterComplete: boolean;
  createPlayersArray: (count: number, matchType: "skirmish" | "ranked" | "tournament") => PlayerConfig[];
};

export default function ConnectFourGameSettings({
  gameSettings,
  setGameSettings,
  updatePlayer,
  openUserSelection,
  resetMenu,
  handleStartMatch,
  rosterComplete,
  createPlayersArray,
}: ConnectFourGameSettingsProps) {
  const { user } = useContext(UserContext);

  return (
    <div className="max-w-fit min-w-[70%] mx-auto themed-card shadow-md overflow-hidden p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Connect Four Game Settings
      </h1>

      <div className="space-y-6">
        <div className="flex justify-evenly">
          <ConnectFourPlayerCount
            numPlayers={gameSettings.numPlayers || 2}
            onPlayerCountChange={count => {
              setGameSettings(prev => ({
                ...prev,
                numPlayers: count,
                gameMode: count === 2 ? "1v1" : "manyvsmany",
                players: createPlayersArray(count, prev.matchType),
              }));
            }}
          />
          {user && (
            <MatchTypeSelector
              gameSettings={gameSettings}
              onMatchTypeChange={matchType => {
                setGameSettings(prev => ({
                  ...prev,
                  matchType,
                  players: createPlayersArray(prev.numPlayers || 2, matchType),
                }));
              }}
            />
          )}
        </div>

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
