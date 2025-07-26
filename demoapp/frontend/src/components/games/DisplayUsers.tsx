import { createElement, Fragment } from "@minireact";
import type { GameSettings } from "../../types/games";

interface DisplayUsersProps {
  gameSettings: GameSettings;
}

export default function DisplayUsers({ gameSettings }: DisplayUsersProps) {
  const { players, gameMode } = gameSettings;

  // Create teams for layout
  const getTeams = () => {
    if (gameMode === "2v2") {
      return [
        players.slice(0, 2), // Team 1
        players.slice(2, 4)  // Team 2
      ];
    } else if (players.length > 2) {
      // For Connect Four many vs many - each player is their own "team"
      return players.map(player => [player]);
    } else {
      // For other modes, treat as individual players or split evenly
      const half = Math.ceil(players.length / 2);
      return [
        players.slice(0, half),
        players.slice(half)
      ];
    }
  };

  const teams = getTeams();
  const hasMultipleTeams = teams.length > 1 && teams[1] && teams[1].length > 0;
  const isManyVsMany = players.length > 2 && gameMode !== "2v2";

  return (
    <div className="w-full max-w-4xl mx-auto mb-4">
      <div className="themed-bg-contrast rounded-xl p-4 shadow-lg border border-opacity-10 border-gray-400">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {isManyVsMany ? (
            // Many vs Many layout (Connect Four with >2 players)
            teams.map((team, teamIndex) => (
              <div key={teamIndex} className="flex items-center gap-4">
                {/* Player */}
                <div className="flex flex-col items-center">
                  {/* Avatar with color glow */}
                  <div className="relative mb-2">
                    <div
                      className="absolute inset-0 rounded-full blur-sm opacity-40"
                      style={`background-color: ${team[0].color}; transform: scale(1.1);`}
                    ></div>
                    <img
                      src={`${import.meta.env.VITE_API_BASE}/users/avatar/${team[0].avatar}`}
                      alt={`${team[0].name || 'Player'} avatar`}
                      className="relative w-12 h-12 rounded-full object-cover border-2 shadow-lg"
                      style={`border-color: ${team[0].color}; box-shadow: 0 0 0 2px ${team[0].color}40;`}
                    />
                    {/* Small color dot */}
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow-sm"
                      style={`background-color: ${team[0].color}; border-color: ${team[0].color};`}
                    ></div>
                  </div>
                  
                  {/* Player name */}
                  <div className="text-center min-h-[2rem] flex flex-col justify-center">
                    <p 
                      className="text-xs font-semibold truncate max-w-[4rem]"
                      style={`color: ${team[0].color};`}
                    >
                      {team[0].name || `P${teamIndex + 1}`}
                    </p>
                    {team[0].type === "ai" && (
                      <span className="text-[10px] opacity-75 themed-text">
                        {team[0].difficulty}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* VS indicator between players (except after last player) */}
                {teamIndex < teams.length - 1 && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gradient-to-r from-red-500 to-blue-500 text-white text-lg font-bold px-4 py-2 rounded-full shadow-md">
                      VS
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            // Regular 1v1 or 2v2 layout
            <>
              {/* Team 1 */}
              <div className="flex items-center gap-3">
                {teams[0].map((player, index) => {
                  return (
                    <div
                      key={player.id}
                      className="flex flex-col items-center"
                    >
                      {/* Avatar with color glow */}
                      <div className="relative mb-2">
                        <div
                          className="absolute inset-0 rounded-full blur-sm opacity-40"
                          style={`background-color: ${player.color}; transform: scale(1.1);`}
                        ></div>
                        <img
                          src={`${import.meta.env.VITE_API_BASE}/users/avatar/${player.avatar}`}
                          alt={`${player.name || 'Player'} avatar`}
                          className="relative w-12 h-12 rounded-full object-cover border-2 shadow-lg"
                          style={`border-color: ${player.color}; box-shadow: 0 0 0 2px ${player.color}40;`}
                        />
                        {/* Small color dot */}
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow-sm"
                          style={`background-color: ${player.color}; border-color: ${player.color};`}
                        ></div>
                      </div>
                      
                      {/* Player name */}
                      <div className="text-center min-h-[2rem] flex flex-col justify-center">
                        <p 
                          className="text-xs font-semibold truncate max-w-[4rem]"
                          style={`color: ${player.color};`}
                        >
                          {player.name || `P${index + 1}`}
                        </p>
                        {player.type === "ai" && (
                          <span className="text-[10px] opacity-75 themed-text">
                            {player.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VS indicator */}
              {hasMultipleTeams && (
                <div className="flex flex-col items-center justify-center px-2">
                  <div className="bg-gradient-to-r from-red-500 to-blue-500 text-white text-lg font-bold px-4 py-2 rounded-full shadow-md">
                    VS
                  </div>
                  {gameMode === "2v2" && (
                    <span className="text-[10px] themed-text opacity-75 mt-1">
                      2v2
                    </span>
                  )}
                </div>
              )}

              {/* Team 2 */}
              {hasMultipleTeams && (
                <div className="flex items-center gap-3">
                  {teams[1].map((player, index) => {
                    return (
                      <div
                        key={player.id}
                        className="flex flex-col items-center"
                      >
                        {/* Avatar with color glow */}
                        <div className="relative mb-2">
                          <div
                            className="absolute inset-0 rounded-full blur-sm opacity-40"
                            style={`background-color: ${player.color}; transform: scale(1.1);`}
                          ></div>
                          <img
                            src={`${import.meta.env.VITE_API_BASE}/users/avatar/${player.avatar}`}
                            alt={`${player.name || 'Player'} avatar`}
                            className="relative w-12 h-12 rounded-full object-cover border-2 shadow-lg"
                            style={`border-color: ${player.color}; box-shadow: 0 0 0 2px ${player.color}40;`}
                          />
                          {/* Small color dot */}
                          <div
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow-sm"
                            style={`background-color: ${player.color}; border-color: ${player.color};`}
                          ></div>
                        </div>
                        
                        {/* Player name */}
                        <div className="text-center min-h-[2rem] flex flex-col justify-center">
                          <p 
                            className="text-xs font-semibold truncate max-w-[4rem]"
                            style={`color: ${player.color};`}
                          >
                            {player.name || `P${teams[0].length + index + 1}`}
                          </p>
                          {player.type === "ai" && (
                            <span className="text-[10px] opacity-75 themed-text">
                              {player.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Game mode indicator - more compact */}
        <div className="mt-3 text-center">
          <span className="inline-block px-2 py-1 rounded-md bg-opacity-20 bg-gray-500 text-xs font-medium themed-text">
            {gameMode?.toUpperCase()} • {gameSettings.matchType?.charAt(0).toUpperCase() + gameSettings.matchType?.slice(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
