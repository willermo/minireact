import {
  createElement,
  useState,
  useCallback,
  useEffect,
  useContext,
  useSearchParams,
  useNavigate,
} from "@minireact";
import ConnectFourCanvas from "../components/ConnectFourCanvas";
import { UserContext } from "../contexts/UserContext";
import { ThemeContext } from "../contexts/ThemeContext";
import { apiFetch } from "../lib/api";
import { useSelector, userActions } from "@/lib/store";
import type { PublicUser } from "../types/user";
import type { PlayerConfig, GameSettings } from "../types/games";
import { getAiMove } from "../components/ConnectFourAi";
import type { EnrichedMatch } from "../types/matches";
import type { EnrichedTournament } from "../types/tournament";
import {
  DEFAULT_COLORS,
  connectFourSkirmishDefault,
  connectFourRankedDefault,
  createConnectFourSettings,
} from "../types/games";
import {
  abortMatch,
  endMatch,
  createAndStartMatch,
  startMatch,
} from "../lib/matchManager";
import ConnectFourGameSettings from "@components/games/ConnectFourGameSettings";
import UserSelectionModal from "@components/games/UserSelectionModal";
import WinnerNotification from "@components/games/WinnerNotification";
import GameHeader from "@components/games/GameHeader";
import DisplayUsers from "@components/games/DisplayUsers";

const ROWS = 6;

export default function ConnectFourGame() {
  const users: PublicUser[] = useSelector(state => state.users) || [];
  const { user } = useContext(UserContext);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournamentId");
  const tournamentMatchId = searchParams.get("tournamentMatchId");
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    ...connectFourSkirmishDefault,
    tournamentId: tournamentId ? parseInt(tournamentId) : null,
  });
  const { isDark } = useContext(ThemeContext);
  const [started, setStarted] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [rosterComplete, setRosterComplete] = useState(false);
  const [matchId, setMatchId] = useState<number | null>(null);
  const COLS = 7 + Math.max(0, (gameSettings.numPlayers || 2) - 2);
  const [board, setBoard] = useState<(number | null)[][]>(
    Array(ROWS)
      .fill(0)
      .map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [isDraw, setIsDraw] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
    const fetchAndSetTournamentData = async () => {
      try {
        const response = await apiFetch(`/api/tournaments/${tournamentId}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error("Failed to fetch tournament data");
        }
        const tournament = result.data as EnrichedTournament;
        const currentMatch = tournament.matches?.find(
          match => match.id === parseInt(tournamentMatchId!)
        );
        const players: PlayerConfig[] = currentMatch!.participants.map(
          (participant: any, index: number) => {
            return {
              id: index,
              type: participant.user?.display_name.startsWith("Deleted User ")
                ? "ai"
                : "player",
              color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
              difficulty: "Expert",
              avatar: participant.user?.avatar_filename || "default-avatar.png",
              name: participant.user?.display_name || "Unknown",
              userId: participant.userId,
            };
          }
        );
        setGameSettings(prev => ({
          ...prev,
          matchType: "tournament",
          tournamentId: tournament.id,
          gameMode: tournament.gameMode,
          players,
          numPlayers: players.length,
        }));
      } catch (error) {
        throw error;
      }
    };

    const isValidTournamentId = async () => {
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error("This tournament does not exist.");
        }
        const tournament = result.data as EnrichedTournament;
        return tournament;
      } catch (error) {
        throw error;
      }
    };

    const isValidTournamentMatchId = async () => {
      try {
        const response = await fetch(`/api/games/tournament-matches`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error("Failed to fetch matches");
        }
        const matches: EnrichedMatch[] = result.data;
        const match = matches.find(
          match => match.id === parseInt(tournamentMatchId!)
        );
        if (!match) {
          throw new Error("This match does not exist.");
        }
        if (match?.state !== "created") {
          throw new Error("This match has already been played.");
        }
      } catch (error) {
        throw error;
      }
    };

    const validateAndSetupTournament = async () => {
      try {
        await isValidTournamentId();
        await isValidTournamentMatchId();
        await fetchAndSetTournamentData();
        setMatchId(parseInt(tournamentMatchId!));
        await startMatch(parseInt(tournamentMatchId!));
        setRosterComplete(true);
        setStarted(true);
        setWinner(null);
        setGameKey(k => k + 1);
      } catch (error) {
        console.error("Error setting up tournament:", error);
        alert(
          (error instanceof Error ? error.message : "Unknown error") +
            "\n\nYou'll be redirected to the home page."
        );
        navigate("/");
        return;
      }
    };
    if (tournamentId) {
      validateAndSetupTournament();
    } else {
      const hasUserSelections = gameSettings.players.some(
        player =>
          (player.name &&
            player.name.trim() !== "" &&
            !player.name.startsWith("Player") &&
            !player.name.startsWith("AI")) ||
          (player.userId !== undefined && player.userId !== null)
      );
      if (!hasUserSelections) {
        if (gameSettings.matchType === "skirmish") {
          setGameSettings(prev => ({ ...prev, ...connectFourSkirmishDefault }));
        } else if (gameSettings.matchType === "ranked") {
          setGameSettings(prev => ({ ...prev, ...connectFourRankedDefault }));
        }
      } else {
        if (gameSettings.matchType === "ranked") {
          setGameSettings(prev => ({
            ...prev,
            players: prev.players.map(player => ({
              ...player,
              type: "player" as const,
            })),
          }));
        }
      }
    }
  }, [tournamentId, tournamentMatchId]);

  useEffect(() => {
    if (tournamentId) return;
    const currentNumPlayers = gameSettings.numPlayers || 2;
    if (gameSettings.players.length !== currentNumPlayers) {
      const newSettings = createConnectFourSettings(
        currentNumPlayers,
        gameSettings.matchType
      );
      setGameSettings(prev => ({
        ...prev,
        players: newSettings.players,
        gameMode: newSettings.gameMode,
      }));
    }
  }, [gameSettings.numPlayers, gameSettings.matchType, tournamentId]);

  useEffect(() => {
    if (gameSettings.matchType === "ranked") {
      const checkRosterComplete = () => {
        const allPlayersHaveNames = gameSettings.players.every(
          player =>
            player.userId !== undefined &&
            player.userId !== null &&
            player.name &&
            typeof player.name === "string" &&
            player.name.trim() !== ""
        );
        setRosterComplete(allPlayersHaveNames);
      };
      checkRosterComplete();
    } else {
      setRosterComplete(true);
    }
  }, [setGameSettings]);

  useEffect(() => {
    setBoard(
      Array(ROWS)
        .fill(0)
        .map(() => Array(COLS).fill(null))
    );
  }, [COLS]);

  const fetchUsers = useCallback(async () => {
    try {
      await userActions.fetchUsers();
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, []);

  const openUserSelection = useCallback(
    (playerId: number) => {
      setSelectedPlayerId(playerId);
      setShowUserSelection(true);
      setLoadingUsers(true);
      fetchUsers().finally(() => setLoadingUsers(false));
    },
    [fetchUsers]
  );

  const closeUserSelection = useCallback(() => {
    setShowUserSelection(false);
    setSelectedPlayerId(null);
  }, []);

  const verifyPassword = useCallback(
    async (userId: number, password: string): Promise<boolean> => {
      try {
        const response = await apiFetch("/api/auth/verify-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Password verification failed");
        }

        const { data } = await response.json();
        return data.valid;
      } catch (error) {
        console.error("Password verification error:", error);
        throw error;
      }
    },
    []
  );

  const updatePlayer = useCallback(
    (playerId: number, updates: Partial<PlayerConfig>) => {
      setGameSettings(prev => ({
        ...prev,
        players: prev.players.map(player =>
          player.id === playerId ? { ...player, ...updates } : player
        ),
      }));
    },
    []
  );

  const createPlayersArray = useCallback(
    (count: number, matchType: "skirmish" | "ranked" | "tournament") => {
      const players: PlayerConfig[] = [];

      for (let i = 0; i < count; i++) {
        players.push({
          id: i,
          type: matchType === "skirmish" && i > 0 ? "ai" : "player",
          color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
          difficulty: "Medium",
          avatar: "default-avatar.png",
          name:
            matchType === "skirmish"
              ? i === 0
                ? "Player 1"
                : `Marvin ${i + 1}`
              : matchType === "tournament"
              ? `Player ${i + 1}`
              : "",
          userId: matchType === "ranked" ? undefined : undefined,
        });
      }

      return players;
    },
    []
  );

  const checkWin = useCallback(
    (
      board: (number | null)[][],
      row: number,
      col: number,
      player: number
    ): boolean => {
      const directions = [
        { dr: 0, dc: 1 },
        { dr: 1, dc: 0 },
        { dr: 1, dc: 1 },
        { dr: 1, dc: -1 },
      ];
      for (let { dr, dc } of directions) {
        let count = 1;
        for (let d = -1; d <= 1; d += 2) {
          let r = row + d * dr;
          let c = col + d * dc;
          while (
            r >= 0 &&
            r < ROWS &&
            c >= 0 &&
            c < COLS &&
            board[r][c] === player
          ) {
            count++;
            r += d * dr;
            c += d * dc;
          }
        }
        if (count >= 4) return true;
      }
      return false;
    },
    []
  );

  const isBoardFull = useCallback((board: (number | null)[][]) => {
    return board.every(row => row.every(cell => cell !== null));
  }, []);

  const makeMove = useCallback(
    (col: number, playerIdx: number) => {
      const newBoard = board.map(row => [...row]);
      let row = -1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (newBoard[r][col] === null) {
          newBoard[r][col] = playerIdx;
          row = r;
          break;
        }
      }
      if (row === -1) return false;
      setBoard(newBoard);
      if (checkWin(newBoard, row, col, playerIdx)) {
        setWinner(playerIdx);
        return true;
      }
      if (isBoardFull(newBoard)) {
        setIsDraw(true);
        return true;
      }
      setCurrentPlayer((playerIdx + 1) % (gameSettings.numPlayers || 2));
      return true;
    },
    [board, gameSettings.numPlayers, checkWin, isBoardFull]
  );

  useEffect(() => {
    if (!started || winner !== null || isDraw) return;
    const currentPlayerConfig = gameSettings.players[currentPlayer];
    if (currentPlayerConfig && currentPlayerConfig.type === "ai") {
      const move = getAiMove(board, currentPlayer, gameSettings.players);
      if (move !== null) {
        setTimeout(() => makeMove(move, currentPlayer), 500);
      }
    }
  }, [
    board,
    currentPlayer,
    gameSettings.players,
    makeMove,
    isDraw,
    started,
    winner,
  ]);

  const resetGame = useCallback(() => {
    setBoard(
      Array(ROWS)
        .fill(0)
        .map(() => Array(COLS).fill(null))
    );
    setCurrentPlayer(0);
    setWinner(null);
    setIsDraw(false);
    setMatchEnded(false);
  }, [COLS]);

  const resetMenu = useCallback(() => {
    setGameSettings(connectFourSkirmishDefault);
    setMatchId(null);
    sessionStorage.removeItem("connectfour-match-id");
  }, []);

  const handleStartMatch = useCallback(async () => {
    if (gameSettings.matchType === "ranked" && !rosterComplete) return;
    const usedColors = gameSettings.players.map(p => p.color);
    if (new Set(usedColors).size !== gameSettings.players.length) {
      alert("Each player must have a unique color");
      return;
    }
    try {
      if (gameSettings.matchType === "ranked") {
        const matchId = await createAndStartMatch(gameSettings, user?.id || 0);
        setMatchId(matchId);
      }
      setStarted(true);
      resetGame();
    } catch (error) {
      console.error("Error starting match:", error);
    }
  }, [gameSettings, rosterComplete, resetGame, user]);

  const handleRestartMatch = useCallback(async () => {
    if (gameSettings.matchType === "ranked") {
      setMatchId(await createAndStartMatch(gameSettings, user!.id));
    }
    resetGame();
    setWinner(null);
    setGameKey(k => k + 1);
  }, [gameSettings, user, resetGame]);

  const handleAbortMatch = useCallback(async () => {
    try {
      if (matchId && gameSettings.matchType === "ranked") {
        await abortMatch(matchId);
      }
      setStarted(false);
      setMatchId(null);
      sessionStorage.removeItem("connectfour-match-id");
    } catch (error) {
      console.error("Error aborting match:", error);
    }
  }, [matchId, gameSettings.matchType]);

  const handleWinner = useCallback(
    async (winnerIdx: number) => {
      if (matchEnded) {
        return;
      }
      setWinner(winnerIdx);
      setMatchEnded(true);
      if (
        matchId &&
        (gameSettings.matchType === "ranked" ||
          gameSettings.matchType === "tournament")
      ) {
        try {
          await endMatch(gameSettings, matchId, winnerIdx, {});
        } catch (error) {
          console.error("Error ending match:", error);
        }
      }
    },
    [matchId, gameSettings, matchEnded]
  );

  const handleDraw = useCallback(async () => {
    if (matchEnded) {
      return;
    }
    setMatchEnded(true);

    if (
      matchId &&
      (gameSettings.matchType === "ranked" ||
        gameSettings.matchType === "tournament")
    ) {
      try {
        await endMatch(gameSettings, matchId, -1, {
          gameType: "connect4",
          players: gameSettings.players,
          result: "draw",
        });
      } catch (error) {
        console.error("Error ending draw match:", error);
      }
    }
  }, [matchId, gameSettings, matchEnded]);

  useEffect(() => {
    if (winner !== null && !isDraw) {
      handleWinner(winner);
    }
  }, [winner, isDraw, handleWinner]);

  useEffect(() => {
    if (isDraw && winner === null) {
      handleDraw();
    }
  }, [isDraw, winner, handleDraw]);

  useEffect(() => {
    if (matchId) {
      sessionStorage.setItem("connectfour-match-id", matchId.toString());
    } else {
      sessionStorage.removeItem("connectfour-match-id");
    }
  }, [matchId]);

  useEffect(() => {
    const saved = sessionStorage.getItem("connectfour-match-id");
    if (saved && !matchId) {
      const restoredId = parseInt(saved);
      setMatchId(restoredId);
    }
  }, []);

  if (!started) {
    return (
      <div
        className="min-h-screen themed-bg py-8 px-4"
        style={
          isDark
            ? "background-image: linear-gradient(rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.9)), url('/images/connectfour-bg.jpg');"
            : "background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/images/connectfour-bg.jpg');"
        }
      >
        <ConnectFourGameSettings
          gameSettings={gameSettings}
          setGameSettings={setGameSettings}
          updatePlayer={updatePlayer}
          openUserSelection={openUserSelection}
          resetMenu={resetMenu}
          handleStartMatch={handleStartMatch}
          rosterComplete={rosterComplete}
          createPlayersArray={createPlayersArray}
        />

        {showUserSelection && (
          <UserSelectionModal
            isOpen={showUserSelection}
            users={users}
            roster={gameSettings.players}
            loadingUsers={loadingUsers}
            selectedPlayerId={selectedPlayerId}
            updatePlayer={updatePlayer}
            onClose={closeUserSelection}
            fetchUsers={fetchUsers}
            verifyPassword={verifyPassword}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen themed-bg py-8 px-4"
      style={
        isDark
          ? "background-image: linear-gradient(rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.9)), url('/images/connectfour-bg.jpg');"
          : "background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/images/connectfour-bg.jpg');"
      }
    >
      <div className="flex flex-col items-center">
        <GameHeader
          gameSettings={gameSettings}
          onHandleAbortMatch={handleAbortMatch}
        />

        <DisplayUsers gameSettings={gameSettings} />

        <div className="w-full h-4"></div>

        <div className="mb-6">
          <ConnectFourCanvas
            demoMode={false}
            canvasId="connect-four-game-canvas"
            canvasWidth={700}
            canvasHeight={600}
            players={gameSettings.players}
            onWinner={handleWinner}
            onDraw={handleDraw}
            gameKey={gameKey}
            onMove={makeMove}
            currentPlayer={currentPlayer}
            board={board}
            gameActive={winner === null && !isDraw}
          />
        </div>

        {(winner !== null || isDraw) && (
          <WinnerNotification
            isTournament={gameSettings.matchType === "tournament"}
            winner={isDraw ? null : winner}
            players={gameSettings.players}
            gameMode={gameSettings.gameMode}
            onPlayAgain={handleRestartMatch}
            onBackToMenu={() => setStarted(false)}
          />
        )}
      </div>
    </div>
  );
}
