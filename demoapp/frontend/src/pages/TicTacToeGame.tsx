import {
  createElement,
  useState,
  useCallback,
  useEffect,
  useContext,
  useSearchParams,
  useNavigate,
  Fragment,
} from "@minireact";
import { UserContext } from "../contexts/UserContext";
import { ThemeContext } from "../contexts/ThemeContext";
import TicTacToeCanvas, { type Mode } from "../components/TicTacToeCanvas";
import { type Winner } from "../components/TicTacToeAiMC";
import { apiFetch, getCsrfToken } from "../lib/api";
import { useSelector, userActions } from "@/lib/store";
import type { PublicUser } from "../types/user";
import type { GameSettings, PlayerConfig, Difficulty } from "../types/games";
import type { EnrichedMatch } from "../types/matches";
import type { EnrichedTournament } from "../types/tournament";
import {
  DEFAULT_COLORS,
  ticTacToeSkirmishDefault,
  ticTacToeRankedDefault,
} from "../types/games";

import {
  startMatch,
  abortMatch,
  endMatch,
  createAndStartMatch,
} from "../lib/matchManager";

import UserSelectionModal from "@components/games/UserSelectionModal";
import WinnerNotification from "@components/games/WinnerNotification";
import GameHeader from "@components/games/GameHeader";
import GameSettingsSection from "@components/games/GameSettingsSection";
import DisplayUsers from "@components/games/DisplayUsers";

interface TicTacToePlayerConfig extends PlayerConfig {
  symbol: "X" | "O";
}

interface TicTacToeGameSettings extends Omit<GameSettings, "players"> {
  players: TicTacToePlayerConfig[];
  mode?: Mode;
}

export default function TicTacToeGame() {
  const users: PublicUser[] = useSelector(state => state.users) || [];
  const { user, setUser } = useContext(UserContext);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournamentId") || null;
  const tournamentMatchId = searchParams.get("tournamentMatchId") || null;
  const [gameSettings, setGameSettings] = useState<TicTacToeGameSettings>({
    ...ticTacToeSkirmishDefault,
    tournamentId: tournamentId ? parseInt(tournamentId) : null,
    players: ticTacToeSkirmishDefault.players.map(player => ({
      ...player,
      symbol: (player.id === 0 ? "X" : "O") as "X" | "O",
    })),
    mode: "ai",
  });
  const { isDark } = useContext(ThemeContext);
  const [started, setStarted] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [rosterComplete, setRosterComplete] = useState(true);
  const [matchId, setMatchId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiFetch("/api/users/me");
        const result = await response.json();

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const { data } = result;
        setUser(data.user);
      } catch (error) {
        throw error;
      }
    };
    if (!user && getCsrfToken()) {
      fetchUserData();
    }
  }, []);

  // Set default player settings when match type changes
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
        const players: TicTacToePlayerConfig[] = currentMatch!.participants.map(
          (participant: any, index: number) => {
            return {
              id: index,
              type: participant.user?.display_name.startsWith("Deleted User ")
                ? "ai"
                : "player",
              color: index % 2 === 0 ? DEFAULT_COLORS[0] : DEFAULT_COLORS[1],
              symbol: (index === 0 ? "X" : "O") as "X" | "O",
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
          targetScore: tournament.metadata?.targetScore || 5,
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
      setGameSettings(prev => {
        if (gameSettings.matchType === "skirmish") {
          return {
            ...prev,
            ...ticTacToeSkirmishDefault,
            players: ticTacToeSkirmishDefault.players.map(player => ({
              ...player,
              symbol: (player.id === 0 ? "X" : "O") as "X" | "O",
            })),

            mode: "ai",
          };
        } else if (gameSettings.matchType === "ranked") {
          return {
            ...prev,
            ...ticTacToeRankedDefault,
            players: ticTacToeRankedDefault.players.map(player => ({
              ...player,
              symbol: (player.id === 0 ? "X" : "O") as "X" | "O",
            })),
            mode: "local",
          };
        }
        return prev;
      });
    }
  }, [gameSettings.matchType, tournamentId]);

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

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      await userActions.fetchUsers();
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setTimeout(() => setLoadingUsers(false), 100);
    }
  }, [userActions]);

  const openUserSelection = useCallback(
    (playerId: number) => {
      setSelectedPlayerId(playerId);
      setShowUserSelection(true);
      setLoadingUsers(true);
      fetchUsers();
    },
    [fetchUsers, setSelectedPlayerId, setShowUserSelection, setLoadingUsers]
  );

  const closeUserSelection = useCallback(() => {
    setShowUserSelection(false);
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
      } catch (err: any) {
        console.error("Password verification error:", err);
        throw err;
      }
    },
    []
  );

  const updatePlayer = (
    playerId: number,
    updates: Partial<TicTacToePlayerConfig>
  ) => {
    setGameSettings(prev => ({
      ...prev,
      players: prev.players.map(player =>
        player.id === playerId ? { ...player, ...updates } : player
      ),
    }));
  };

  const resetMenu = () => {
    setGameSettings({
      ...ticTacToeSkirmishDefault,
      players: ticTacToeSkirmishDefault.players.map(player => ({
        ...player,
        symbol: (player.id === 0 ? "X" : "O") as "X" | "O",
      })),
      mode: "ai",
    });
  };

  const difficultyToLevel = (difficulty: Difficulty): number => {
    switch (difficulty) {
      case "Beginner":
        return 1;
      case "Easy":
        return 2;
      case "Medium":
        return 3;
      case "Hard":
        return 4;
      case "Expert":
        return 5;
      default:
        return 3;
    }
  };

  const handleStartMatch = async () => {
    if (gameSettings.matchType === "ranked") {
      setMatchId(await createAndStartMatch(gameSettings, user!.id));
    }
    setStarted(true);
    setWinner(null);
    setGameEnded(false);
    setGameKey(k => k + 1);
  };

  const handleRestartMatch = useCallback(async () => {
    if (gameSettings.matchType === "ranked") {
      setMatchId(await createAndStartMatch(gameSettings, user!.id));
    }
    setWinner(null);
    setGameEnded(false);
    setGameKey(k => k + 1);
  }, []);

  const handleAbortMatch = async () => {
    if (gameSettings.matchType === "ranked") {
      await abortMatch(matchId!);
    }
    setMatchId(null);
    setStarted(false);
  };

  const handleEndMatch = async (winnerIdx: number) => {
    const updatedMetadata = {
      result: winnerIdx === -1 ? "Draw" : `Winner declared`,
      winnerSymbol: winnerIdx === 0 ? "X" : winnerIdx === 1 ? "O" : null,
    };

    if (
      gameSettings.matchType === "ranked" ||
      gameSettings.matchType === "tournament"
    ) {
      await endMatch(gameSettings, matchId!, winnerIdx, updatedMetadata);
    }
    setMatchId(null);
  };

  const handleGameEnd = useCallback(
    (result: Winner) => {
      let winnerIdx: number | null = null;
      if (result === "X") winnerIdx = 0;
      else if (result === "O") winnerIdx = 1;
      else if (result === "draw") winnerIdx = null;

      setWinner(winnerIdx);
      setGameEnded(true);

      if (
        (gameSettings.matchType === "ranked" ||
          gameSettings.matchType === "tournament") &&
        matchId
      ) {
        let endMatchWinnerIdx = -1;
        if (result === "X") endMatchWinnerIdx = 0;
        else if (result === "O") endMatchWinnerIdx = 1;

        handleEndMatch(endMatchWinnerIdx);
      }
    },
    [gameSettings.matchType, matchId]
  );

  if (!started) {
    return (
      <div
        className="min-h-screen themed-bg py-8 px-4"
        style={
          isDark
            ? "background-size: cover; background-position: center; background-repeat: no-repeat; background-image: linear-gradient(rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.9)), url('/images/tictactoe-bg.jpg');"
            : "background-size: cover; background-position: center; background-repeat: no-repeat; background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/images/tictactoe-bg.jpg');"
        }
      >
        <GameSettingsSection
          gameSettings={gameSettings as GameSettings}
          setGameSettings={setGameSettings as any}
          updatePlayer={updatePlayer}
          openUserSelection={openUserSelection}
          resetMenu={resetMenu}
          handleStartMatch={handleStartMatch}
          rosterComplete={rosterComplete}
        />

        {showUserSelection && (
          <UserSelectionModal
            isOpen={showUserSelection}
            roster={gameSettings.players}
            users={users}
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
      className="flex flex-col items-center min-h-screen py-8 themed-bg"
      style={
        isDark
          ? "background-size: cover; background-position: center; background-repeat: no-repeat; background-image: linear-gradient(rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.9)), url('/images/tictactoe-bg.jpg');"
          : "background-size: cover; background-position: center; background-repeat: no-repeat; background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/images/tictactoe-bg.jpg');"
      }
    >
      {!gameEnded ? (
        <>
          <GameHeader
            gameSettings={gameSettings}
            onHandleAbortMatch={handleAbortMatch}
          />
          <DisplayUsers gameSettings={gameSettings} />
        </>
      ) : (
        <WinnerNotification
          isTournament={gameSettings.matchType === "tournament"}
          winner={winner}
          players={gameSettings.players}
          gameMode={gameSettings.gameMode}
          onPlayAgain={handleRestartMatch}
          onBackToMenu={() => setStarted(false)}
        />
      )}

      <div className="w-full h-4"></div>

      <div className="relative mb-6">
        <TicTacToeCanvas
          mode={gameSettings.mode || "ai"}
          aiLevel={difficultyToLevel(gameSettings.players[1].difficulty)}
          resetKey={gameKey}
          onGameEnd={handleGameEnd}
          playerColors={[
            gameSettings.players[0].color,
            gameSettings.players[1].color,
          ]}
          players={gameSettings.players}
        />
      </div>
    </div>
  );
}
