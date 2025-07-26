import { createElement, Fragment, useNavigate } from "@minireact";
import type { PlayerConfig, GameMode } from "@/types/games";

interface WinnerNotificationProps {
  isTournament: boolean;
  winner: number | null;
  players: PlayerConfig[];
  gameMode: GameMode;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export default function WinnerNotification({
  isTournament,
  winner,
  players,
  gameMode,
  onPlayAgain,
  onBackToMenu,
}: WinnerNotificationProps) {
  const navigate = useNavigate();
  const getWinnerName = () => {
    if (winner === null) return "";
    if (gameMode === "2v2") {
      return `${winner < 2 ? "Left" : "Right"} Team`;
    }
    return players[winner]?.name || `Player ${winner + 1}`;
  };

  if (winner === null) {
    return (
      <div className="p-4 themed-card rounded-lg shadow-lg text-center">
        <h3 className="text-xl font-bold mb-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl">🤝</span>
            <div className="flex items-center space-x-2">
              {players
                .slice(0, gameMode === "2v2" ? 4 : 2)
                .map((player, index) => (
                  <span
                    key={index}
                    className="w-4 h-4 rounded-full inline-block"
                    style={`background-color: ${player.color};`}
                  />
                ))}
            </div>
            <h2 className="text-xl font-semibold">It's a draw!</h2>
          </div>
        </h3>
        <div className="flex gap-3 justify-center mt-2">
          {isTournament && (
            <button
              onClick={() => navigate(`/tournaments/`)}
              className="px-4 py-2 themed-bg hover:bg-gray-600 dark:hover:bg-gray-700 font-semibold rounded"
            >
              Back to Tournament
            </button>
          )}
          {!isTournament && (
            <>
              <button
                onClick={onPlayAgain}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
              >
                Play Again
              </button>
              <button
                onClick={onBackToMenu}
                className="px-4 py-2 themed-bg hover:bg-gray-600 dark:hover:bg-gray-700 font-semibold rounded"
              >
                Back to Menu
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 themed-card rounded-lg shadow-lg text-center">
      <h3 className="text-xl font-bold mb-2">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xl">🏆</span>
          <h2 className="text-xl font-semibold">
            <span className="inline-flex items-center">
              {players[winner]?.color && (
                <span
                  className="w-4 h-4 rounded-full mr-2 inline-block"
                  style={`background-color: ${players[winner]?.color};`}
                />
              )}
              {getWinnerName()} wins!
            </span>
          </h2>
        </div>
      </h3>
      <div className="flex gap-3 justify-center mt-2">
        {isTournament && (
          <button
            onClick={() => navigate(`/tournaments/`)}
            className="px-4 py-2 themed-bg hover:bg-gray-600 dark:hover:bg-gray-700 font-semibold rounded"
          >
            Back to Tournament
          </button>
        )}
        {!isTournament && (
          <>
            <button
              onClick={onPlayAgain}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
            >
              Play Again
            </button>
            <button
              onClick={onBackToMenu}
              className="px-4 py-2 themed-bg hover:bg-gray-600 dark:hover:bg-gray-700 font-semibold rounded"
            >
              Back to Menu
            </button>
          </>
        )}
      </div>
    </div>
  );
}
