import {
  createElement,
  useState,
  useCallback,
  useEffect,
  useContext,
  useSearchParams,
  Fragment,
  useNavigate,
  useRef,
} from "@minireact";
import PongCanvas from "../components/PongCanvas";
import { UserContext } from "../contexts/UserContext";
import { ThemeContext } from "../contexts/ThemeContext";
import { apiFetch, getCsrfToken } from "../lib/api";
import { useSelector, userActions } from "@/lib/store";
import type { PublicUser } from "../types/user";
import type { Difficulty, PlayerConfig, GameSettings } from "../types/games";
import type { EnrichedMatch } from "../types/matches";
import type { EnrichedTournament } from "../types/tournament";
import {
  DEFAULT_COLORS,
  pong1v1SkirmishDefault,
  pong2v2SkirmishDefault,
  pong1v1RankedDefault,
  pong2v2RankedDefault,
} from "../types/games";

import {
  abortMatch,
  endMatch,
  startMatch,
  createAndStartMatch,
} from "../lib/matchManager";

import GameSettingsSection from "@components/games/GameSettingsSection";
import UserSelectionModal from "@components/games/UserSelectionModal";
import WinnerNotification from "@components/games/WinnerNotification";
import GameHeader from "@components/games/GameHeader";
import DisplayUsers from "@components/games/DisplayUsers";
export default function PongGame() {
  const users: PublicUser[] = useSelector(state => state.users) || [];
  const { user, setUser } = useContext(UserContext);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const tournamentId = useRef(searchParams.get("tournamentId") || null);
  const tournamentMatchId = useRef(
    searchParams.get("tournamentMatchId") || null
  );
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    ...pong1v1SkirmishDefault,
    tournamentId: tournamentId.current ? parseInt(tournamentId.current) : null,
  });
  const { isDark } = useContext(ThemeContext);
  const [started, setStarted] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [rosterComplete, setRosterComplete] = useState(false);
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
          match => match.id === parseInt(tournamentMatchId.current!)
        );
        const players: PlayerConfig[] = currentMatch!.participants.map(
          (participant: any, index: number) => {
            return {
              id: index,
              type: participant.user?.display_name.startsWith("Deleted User ")
                ? "ai"
                : "player",
              color: index % 2 === 0 ? DEFAULT_COLORS[0] : DEFAULT_COLORS[1],
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
          match => match.id === parseInt(tournamentMatchId.current!)
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
        console.log("Validating tournament...");
        confirm("Validating tournament...");
        await isValidTournamentId();
        console.log("Tournament is valid");
        alert("Tournament is valid");
        await isValidTournamentMatchId();
        console.log("Tournament match is valid");
        alert("Tournament match is valid");
        await fetchAndSetTournamentData();
        setMatchId(parseInt(tournamentMatchId.current!));
        await startMatch(parseInt(tournamentMatchId.current!));
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
      alert("Tournament ID: " + tournamentId);
      validateAndSetupTournament();
    } else {
      alert("No tournament ID");
      setGameSettings(prev => {
        if (gameSettings.matchType === "skirmish") {
          if (gameSettings.gameMode === "1v1") {
            return {
              ...prev,
              players: pong1v1SkirmishDefault.players,
            };
          } else if (gameSettings.gameMode === "2v2") {
            return {
              ...prev,
              players: pong2v2SkirmishDefault.players,
            };
          }
        } else if (gameSettings.matchType === "ranked") {
          if (gameSettings.gameMode === "1v1") {
            return {
              ...prev,
              players: pong1v1RankedDefault.players,
            };
          } else if (gameSettings.gameMode === "2v2") {
            return {
              ...prev,
              players: pong2v2RankedDefault.players,
            };
          }
        }
        return prev;
      });
    }
  }, [gameSettings.gameMode, gameSettings.matchType]);

  useEffect(() => {
    if (gameSettings.matchType === "ranked") {
      const checkRosterComplete = () => {
        const allPlayersHaveNames = gameSettings.players.every(
          player =>
            player.name &&
            typeof player.name === "string" &&
            player.name.trim() !== ""
        );
        setRosterComplete(allPlayersHaveNames);
      };
      checkRosterComplete();
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

  const resetMenu = () => {
    setGameSettings({
      gameType: "pong",
      matchType: "skirmish",
      tournamentId: null,
      gameMode: "1v1",
      players: [
        {
          id: 0,
          type: "player",
          color: DEFAULT_COLORS[0],
          difficulty: "Medium",
          avatar: "default-avatar.png",
        },
        {
          id: 1,
          type: "ai",
          color: DEFAULT_COLORS[1],
          difficulty: "Medium",
          avatar: "default-avatar.png",
        },
      ],
      targetScore: 5,
    });
  };

  const difficultyToValue = (difficulty: Difficulty): number => {
    switch (difficulty) {
      case "Beginner":
        return 0;
      case "Easy":
        return 1;
      case "Medium":
        return 2;
      case "Hard":
        return 3;
      case "Expert":
        return 4;
      default:
        return 2;
    }
  };

  const difficultyToAiLevel = (difficulty: Difficulty): number => {
    return difficultyToValue(difficulty) + 1;
  };

  const handleStartMatch = async () => {
    if (gameSettings.matchType === "ranked") {
      setMatchId(await createAndStartMatch(gameSettings, user!.id));
    }
    setStarted(true);
    setWinner(null);
    setGameKey(k => k + 1);
  };

  const handleRestartMatch = useCallback(async () => {
    if (gameSettings.matchType === "ranked") {
      setMatchId(await createAndStartMatch(gameSettings, user!.id));
    }
    setWinner(null);
    setGameKey(k => k + 1);
  }, []);

  const handleAbortMatch = async () => {
    if (gameSettings.matchType === "ranked") {
      await abortMatch(matchId!);
    }
    setMatchId(null);
    setStarted(false);
  };

  const handleEndMatch = async (winnerIdx: number, score: string) => {
    setWinner(winnerIdx);
    const updatedMetadata = {
      result: score,
    };
    if (
      gameSettings.matchType === "ranked" ||
      gameSettings.matchType === "tournament"
    ) {
      await endMatch(gameSettings, matchId!, winnerIdx, updatedMetadata);
    }
    setMatchId(null);
  };

  if (!started) {
    return (
      <div
        className="min-h-screen themed-bg py-8 px-4"
        style={
          isDark
            ? "background-size: cover; background-position: center; background-repeat: no-repeat; background-image: linear-gradient(rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.9)), url('/images/pong-bg.jpg');"
            : "background-size: cover; background-position: center; background-repeat: no-repeat; background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/images/pong-bg.jpg');"
        }
      >
        <GameSettingsSection
          gameSettings={gameSettings}
          setGameSettings={setGameSettings}
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
          ? "background-size: cover; background-position: center; background-repeat: no-repeat; background-image: linear-gradient(rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.9)), url('/images/pong-bg.jpg');"
          : "background-size: cover; background-position: center; background-repeat: no-repeat; background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/images/pong-bg.jpg');"
      }
    >
      {winner === null ? (
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

      <div key={`pong-${gameKey}`} className="relative">
        <PongCanvas
          targetScore={gameSettings.targetScore}
          onWinner={handleEndMatch}
          aiLevel={
            gameSettings.players
              .filter(p => p.type === "ai")
              .map(p => difficultyToAiLevel(p.difficulty))[0] || 1
          }
          playerColors={gameSettings.players.map(p => p.color)}
          players={gameSettings.players}
          gameMode={gameSettings.gameMode}
          gameActive={winner === null}
        />
      </div>
    </div>
  );
}
