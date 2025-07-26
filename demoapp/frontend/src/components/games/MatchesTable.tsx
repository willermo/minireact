import { createElement } from "@minireact";
import type { MatchType } from "@/types/games";
import type { EnrichedMatch } from "@/types/matches";
import { Icon } from "@/components/ui/Icon";

export default function MatchSummary({
  matchHistory,
}: {
  matchHistory: EnrichedMatch[];
}) {
  const safeMatchHistory = Array.isArray(matchHistory) ? matchHistory : [];

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType.toLowerCase()) {
      case "pong":
        return "circle-dot";
      case "tic_tac_toe":
        return "hash";
      case "connect4":
        return "grid";
      default:
        return "gamepad-2";
    }
  };

  const formatGameTypeName = (gameType: string) => {
    switch (gameType.toLowerCase()) {
      case "pong":
        return "Pong";
      case "tic_tac_toe":
        return "tic_tac_toe";
      case "connect4":
        return "Connect 4";
      default:
        return gameType;
    }
  };

  const getMatchTypeIcon = (matchType: Omit<MatchType, "skirmish">) => {
    switch (matchType.toLowerCase()) {
      case "ranked":
        return "trophy";
      case "tournament":
        return "medal";
      default:
        return "swords";
    }
  };

  const getGameModeIcon = (gameMode: string) => {
    if (gameMode.includes("1v1")) return "users";
    if (gameMode.includes("2v2")) return "users-2";
    if (gameMode.toLowerCase().includes("many")) return "users-round";
    return "user";
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-gradient-to-r from-purple-600 to-blue-500 text-white">
            <th className="py-4 px-4 text-left">Game</th>
            <th className="py-4 px-4 text-left">Type</th>
            <th className="py-4 px-4 text-left">Mode</th>
            <th className="py-4 px-4 text-left">Score</th>
            <th className="py-4 px-4 text-left">Players</th>
          </tr>
        </thead>
        <tbody>
          {safeMatchHistory.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="py-6 px-4 text-center themed-text-secondary"
              >
                No match history available
              </td>
            </tr>
          ) : (
            safeMatchHistory.map(matchDetails => {
              const parsedMetadata =
                typeof matchDetails.metadata === "string"
                  ? JSON.parse(matchDetails.metadata)
                  : matchDetails.metadata || {};
              const { result } = parsedMetadata;
              const isAborted = matchDetails.state === "aborted";
              const isPongGame = matchDetails.gameType === "pong";
              const hasWinner = matchDetails.participants.some(
                participant => participant.isWinner
              );

              const winnerFromMetadata = parsedMetadata.winner;

              return (
                <tr
                  key={matchDetails.id}
                  className={`border-b transition-colors themed-table-row ${
                    isAborted ? "opacity-60 grayscale hover:opacity-80" : ""
                  }`}
                  style={{
                    borderColor: "var(--color-border)",
                  }}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 w-8 h-8 rounded-lg flex items-center justify-center">
                        <Icon
                          name={getGameTypeIcon(matchDetails.gameType)}
                          color="white"
                          size={18}
                        />
                      </div>
                      <span className="font-medium">
                        {formatGameTypeName(matchDetails.gameType)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-gradient-to-r from-pink-500 to-orange-400 w-8 h-8 rounded-lg flex items-center justify-center">
                        <Icon
                          name={getMatchTypeIcon(matchDetails.matchType)}
                          color="white"
                          size={18}
                        />
                      </div>
                      <span>{matchDetails.matchType}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-gradient-to-r from-emerald-500 to-lime-400 w-8 h-8 rounded-lg flex items-center justify-center">
                        <Icon
                          name={getGameModeIcon(matchDetails.gameMode)}
                          color="white"
                          size={18}
                        />
                      </div>
                      <span>{matchDetails.gameMode}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {isAborted ? (
                      <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
                        <Icon name="alert-circle" size={16} />
                        Aborted
                      </span>
                    ) : isPongGame ? (
                      <span className="font-medium text-xl md:text-2xl">
                        {result || "Score is missing"}
                      </span>
                    ) : (
                      <span className="font-medium text-xl md:text-2xl">
                        {hasWinner ||
                        (winnerFromMetadata !== undefined &&
                          winnerFromMetadata !== -1)
                          ? "Winner declared"
                          : "Draw"}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-2">
                      {Array.isArray(matchDetails.participants) ? (
                        matchDetails.participants.map((participant, index) => {
                          const user = participant.user;

                          if (!user) {
                            return (
                              <div
                                key={`${matchDetails.id}-${participant.userId}`}
                                className="text-gray-500 flex items-center"
                              >
                                <Icon
                                  name="user-x"
                                  size={16}
                                  className="mr-1"
                                />
                                User {participant.userId} (not found)
                              </div>
                            );
                          }

                          const isWinnerByMetadata =
                            winnerFromMetadata !== undefined &&
                            winnerFromMetadata === index;
                          const isWinnerByFlag = participant.isWinner;
                          const isThisWinner =
                            isWinnerByMetadata || isWinnerByFlag;

                          return (
                            <div
                              className={`flex items-center my-1 ${
                                isThisWinner
                                  ? "bg-gradient-to-r from-amber-200 to-yellow-100 p-2 rounded-lg shadow-sm dark:from-amber-900 dark:to-yellow-800 dark:text-white"
                                  : ""
                              }`}
                              key={`${matchDetails.id}-${participant.userId}`}
                            >
                              <img
                                src={`/api/users/avatar/${user.avatar}`}
                                alt={user.displayName}
                                className={`w-10 h-10 rounded-full mr-3 ${
                                  isThisWinner
                                    ? "ring-2 ring-amber-400 ring-offset-2 dark:ring-amber-500 dark:ring-offset-gray-800"
                                    : ""
                                }`}
                              />
                              <div className="flex flex-col">
                                <span
                                  className={`${
                                    isThisWinner
                                      ? "font-bold text-amber-800 dark:text-amber-400"
                                      : ""
                                  }`}
                                >
                                  {user.displayName}
                                </span>
                                {isThisWinner ? (
                                  <span className="flex items-center text-amber-600 dark:text-amber-400 text-sm">
                                    <Icon
                                      name="crown"
                                      size={14}
                                      className="mr-1"
                                    />
                                    Winner
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-gray-500">
                          No participants data
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
