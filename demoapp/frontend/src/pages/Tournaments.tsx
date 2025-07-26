import {
  createElement,
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useNavigate,
} from "../lib/minireact/minireact.ts";
import { getCsrfToken, apiFetch } from "../lib/api.ts";
import { fetchUsers } from "../lib/usersManager";
import { UserContext } from "../contexts/UserContext";
import type {
  EnrichedTournament,
  CreateTournamentRequest,
  JoinTournamentRequest,
  GameType,
  GameMode,
  TournamentStatus,
} from "../types/tournament";
import type { MatchState } from "../types/games";
import type { PublicUser } from "../types/user";

function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
        status
      )}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TournamentCard({
  tournament,
  onJoin,
  onStart,
  onView,
  currentUserId,
}: {
  tournament: EnrichedTournament;
  onJoin: (tournamentId: number) => void;
  onStart: (tournamentId: number) => void;
  onView: (tournamentId: number) => void;
  currentUserId?: number;
}) {
  const isCreator = currentUserId === tournament.createdBy;
  const canJoin = tournament.status === "pending";
  const canStart =
    tournament.status === "pending" &&
    isCreator &&
    tournament.participants.length >= 2;

  return (
    <div className="themed-bg rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-600">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold themed-text mb-2">
            {tournament.name}
          </h3>
          <div className="flex items-center space-x-4 text-sm themed-text-secondary">
            <span className="capitalize">
              {tournament.gameType.replace("_", " ")}
            </span>
            <span>{tournament.gameMode}</span>
            <TournamentStatusBadge status={tournament.status} />
          </div>
        </div>
        <div className="text-right text-sm themed-text-secondary">
          <div>
            Created: {new Date(tournament.createdAt).toLocaleDateString()}
          </div>
          {tournament.startedAt && (
            <div>
              Started: {new Date(tournament.startedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm themed-text-secondary mb-2">
          Participants ({tournament.participants.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {tournament.participants.map(participant => (
            <div
              key={participant.id}
              className="flex items-center space-x-2 themed-bg-contrast rounded-full px-3 py-1 text-sm"
            >
              {participant.user?.avatarFilename && (
                <img
                  src={`/api/users/avatar/${participant.user.avatarFilename}`}
                  alt={participant.user.displayName}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="themed-text-secondary">
                {participant.user?.displayName || `User ${participant.userId}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {tournament.ladder && tournament.ladder.length > 0 && (
        <div className="mb-4">
          <div className="text-sm themed-text-secondary mb-2">Leaderboard</div>
          <div className="space-y-1">
            {tournament.ladder.slice(0, 3).map((entry, index) => (
              <div
                key={entry.userId}
                className="flex justify-between items-center text-sm"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium themed-text">#{index + 1}</span>
                  <span className="themed-text-secondary">
                    {entry.displayName}
                  </span>
                </div>
                <div className="themed-text-secondary">
                  {entry.gamesWon} Won - {entry.gamesDraw} Drawn -{" "}
                  {entry.gamesLost} Lost ({entry.points}pts)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={() => onView(tournament.id)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          View Details
        </button>
        {canJoin && (
          <button
            onClick={() => onJoin(tournament.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Join Tournament
          </button>
        )}
        {canStart && (
          <button
            onClick={() => onStart(tournament.id)}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Start Tournament
          </button>
        )}
      </div>
    </div>
  );
}

function CreateTournamentModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTournamentRequest) => void;
}) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const handleSubmit = (e: any) => {
    e.preventDefault();
    setValidationError(null);
    const formData = new FormData(e.target);
    const name = (formData.get("name") as string)?.trim() || "";
    const gameType = ((formData.get("gameType") as string) ||
      "pong") as GameType;
    const gameMode = "1v1" as GameMode;

    if (!name) {
      setValidationError("Tournament name is required");
      const nameInput = e.target.querySelector('input[name="name"]');
      nameInput?.focus();
      return;
    }
    if (name.length < 3) {
      setValidationError("Tournament name must be at least 3 characters long");
      const nameInput = e.target.querySelector('input[name="name"]');
      nameInput?.focus();
      return;
    }

    if (name && gameType && gameMode) {
      onSubmit({ name, gameType, gameMode });
      e.target.reset();
      setValidationError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="themed-bg rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
        <h2 className="text-xl font-semibold themed-text mb-4">
          Create New Tournament
        </h2>

        {validationError && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium themed-text mb-2">
              Tournament Name
            </label>
            <input
              name="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 themed-bg themed-text"
              placeholder="Enter tournament name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium themed-text mb-2">
              Game Type
            </label>
            <select
              name="gameType"
              defaultValue="pong"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 themed-bg themed-text"
            >
              <option value="pong">Pong</option>
              <option value="tic_tac_toe">Tic Tac Toe</option>
              <option value="connect4">Connect 4</option>
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium themed-text mb-2">
              Game Mode
            </label>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 themed-text px-4 py-2 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Create Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TournamentDetailsModal({
  isOpen,
  onClose,
  tournament,
  onStartMatch,
}: {
  isOpen: boolean;
  onClose: () => void;
  tournament: EnrichedTournament | null;
  onStartMatch?: (matchId: number) => void;
}) {
  type MatchDetail = {
    matchId: number;
    gameState: MatchState;
    participants: {
      userId: number;
      isWinner: boolean;
      user: {
        displayName: string;
        avatar: string;
      };
    }[];
    isDraw: boolean;
    winners?: {
      userId: number;
      displayName: string;
      avatar: string;
    }[];
  };
  if (!isOpen || !tournament) return null;

  const [matchDetails, setMatchDetails] = useState<MatchDetail[]>([]);
  const [loadingMatchDetails, setLoadingMatchDetails] = useState(false);

  // Fetch match details when tournament changes
  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!tournament?.matches || tournament.matches.length === 0) {
        setMatchDetails([]);
        return;
      }

      setLoadingMatchDetails(true);
      try {
        // Single API call to get all match details for the tournament
        const response = await apiFetch(
          `/api/games/tournament-match-details/${tournament.id}`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            `Failed to fetch tournament match details:`,
            result.message
          );
          setMatchDetails([]);
          return;
        }

        // result.data is already an array of MatchDetail objects
        setMatchDetails(result.data || []);
      } catch (error) {
        console.error("Error fetching tournament match details:", error);
        setMatchDetails([]);
      } finally {
        setLoadingMatchDetails(false);
      }
    };

    if (isOpen && tournament) {
      fetchMatchDetails();
    }
  }, [isOpen, tournament]);

  function getWinnerDisplayname(matchId: number) {
    const matchDetail = matchDetails.find(detail => detail.matchId === matchId);
    return matchDetail?.winners?.[0].displayName || null;
  }

  return (
    <div className="fixed inset-0 themed-bg bg-opacity-50 flex items-center justify-center z-50">
      <div className="themed-bg rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold themed-text">
            Tournament Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium themed-text mb-3">
                Tournament Information
              </h3>
              <div className="themed-bg-contrast rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="themed-text-secondary">Name:</span>
                  <span className="font-medium themed-text">
                    {tournament.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="themed-text-secondary">Game:</span>
                  <span className="font-medium themed-text capitalize">
                    {tournament.gameType.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="themed-text-secondary">Mode:</span>
                  <span className="font-medium themed-text">
                    {tournament.gameMode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="themed-text-secondary">Status:</span>
                  <TournamentStatusBadge status={tournament.status} />
                </div>
                <div className="flex justify-between">
                  <span className="themed-text-secondary">Created:</span>
                  <span className="font-medium themed-text">
                    {new Date(tournament.createdAt).toLocaleDateString("it-IT")}
                  </span>
                </div>
                {tournament.startedAt && (
                  <div className="flex justify-between">
                    <span className="themed-text-secondary">Started:</span>
                    <span className="font-medium themed-text">
                      {new Date(tournament.startedAt).toLocaleDateString(
                        "it-IT"
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium themed-text mb-3">
                Participants ({tournament.participants.length})
              </h3>
              <div className="themed-bg-contrast rounded-lg p-4">
                <div className="grid grid-cols-1 gap-2">
                  {tournament.participants.map(participant => (
                    <div
                      key={participant.id}
                      className="flex items-center space-x-3 p-2 themed-bg rounded-md border border-gray-200 dark:border-gray-600"
                    >
                      {participant.user?.avatarFilename && (
                        <img
                          src={`/api/users/avatar/${participant.user.avatarFilename}`}
                          alt={participant.user.displayName}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="font-medium themed-text">
                        {participant.user?.displayName ||
                          `User ${participant.userId}`}
                      </span>
                      <span className="text-sm themed-text-secondary">
                        Joined{" "}
                        {new Date(participant.joinedAt).toLocaleDateString(
                          "it-IT"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {tournament.ladder && tournament.ladder.length > 0 && (
              <div>
                <h3 className="text-lg font-medium themed-text mb-3">Ladder</h3>
                <div className="themed-bg-contrast rounded-lg p-4">
                  <div className="space-y-2">
                    {tournament.ladder.map((entry, index) => (
                      <div
                        key={entry.userId}
                        className="flex items-center justify-between p-2 themed-bg rounded-md border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-lg themed-text">
                            #{index + 1}
                          </span>
                          <span className="font-medium themed-text">
                            {entry.displayName}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium themed-text">
                            {entry.points} pts
                          </div>
                          <div className="text-sm themed-text-secondary">
                            {entry.gamesWon} Won - {entry.gamesDraw} Drawn -{" "}
                            {entry.gamesLost} Lost
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tournament.matches && tournament.matches.length > 0 && (
              <div>
                <h3 className="text-lg font-medium themed-text mb-3">
                  Matches ({tournament.matches.length})
                </h3>
                <div className="themed-bg-contrast rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {tournament.matches.map(match => (
                      <div
                        key={match.id}
                        className="p-3 themed-bg rounded-md border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-medium themed-text">
                            Match #{match.id}
                          </div>
                          <div className="flex items-center justify-center">
                            {match.state === "created" &&
                              tournament.status === "active" && (
                                <button
                                  onClick={() => onStartMatch?.(match.id)}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                                >
                                  Start Match
                                </button>
                              )}
                            {match.state === "ended" &&
                              match.gameType === "pong" && (
                                <p className="text-lg font-bold">
                                  {JSON.parse(
                                    match.metadata as unknown as string
                                  ).result || ""}
                                </p>
                              )}
                            {match.state === "ended" &&
                              match.gameType !== "pong" &&
                              loadingMatchDetails && (
                                <p className="text-lg font-bold">Loading...</p>
                              )}
                            {match.state === "ended" &&
                              match.gameType !== "pong" &&
                              !loadingMatchDetails && (
                                <p className="text-lg font-bold">
                                  {getWinnerDisplayname(match.id)
                                    ? `${getWinnerDisplayname(match.id)} won`
                                    : "Draw"}
                                </p>
                              )}
                            {match.state === "started" && (
                              <p className="text-lg font-bold">
                                Match in progress
                              </p>
                            )}
                            {match.state == "aborted" && (
                              <p className="text-lg font-bold">Match aborted</p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm themed-text-secondary mt-1">
                          {match.participants
                            ?.map(p => {
                              const participant = p as any;
                              if (participant.user?.displayName) {
                                return participant.user.displayName;
                              }
                              const tournamentParticipant =
                                tournament.participants.find(
                                  tp => tp.userId === participant.userId
                                );
                              return (
                                tournamentParticipant?.user?.displayName ||
                                `User ${participant.userId}`
                              );
                            })
                            .join(" vs ")}
                        </div>
                        {match.endedAt && (
                          <div className="text-xs themed-text-secondary mt-1">
                            Completed:{" "}
                            {new Date(match.endedAt).toLocaleDateString(
                              "it-IT"
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinTournamentModal({
  isOpen,
  tournament,
  tournamentId,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  tournament: EnrichedTournament;
  tournamentId: number | null;
  onClose: () => void;
  onSubmit: (tournamentId: number, data: JoinTournamentRequest) => void;
}) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  useEffect(() => {
    if (isOpen && tournamentId) {
      loadUsers();
    }
  }, [isOpen, tournamentId]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const validUsers = await fetchUsers();
      setUsers(validUsers);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userId = parseInt((formData.get("userId") as string) || "0");
    const password = (formData.get("password") as string) || "";

    if (tournamentId && userId && password) {
      onSubmit(tournamentId, { userId, password });
      e.target.reset();
      onClose();
    } else {
    }
  };

  if (!isOpen || !tournamentId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="themed-bg rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
        <h2 className="text-xl font-semibold themed-text mb-4">
          Join Tournament
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium themed-text mb-2">
              Select User
            </label>
            <select
              name="userId"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 themed-bg themed-text"
              required
              disabled={loadingUsers}
            >
              <option value="">Select a user</option>
              {Array.isArray(users) &&
                users
                  .filter(
                    user =>
                      !tournament.participants.find(p => p.userId === user.id)
                  )
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
            </select>
            {loadingUsers && (
              <div className="text-sm themed-text-secondary mt-1">
                Loading users...
              </div>
            )}
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium themed-text mb-2">
              Password
            </label>
            <input
              name="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 themed-bg themed-text"
              placeholder="Enter user password"
              required
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 themed-text px-4 py-2 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Join Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tournaments() {
  const { user: currentUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<EnrichedTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | TournamentStatus>(
    "all"
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<
    number | null
  >(null);
  const isMounted = useRef(true);
  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/api/tournaments/");
      const result = await response.json();

      if (!response.ok) {
        if (isMounted.current) {
          setError(result.message || "Failed to fetch tournaments");
        }
        return;
      }

      const { data } = result;
      if (data && Array.isArray(data) && isMounted.current) {
        setTournaments(data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch tournaments"
        );
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleCreateTournament = async (data: CreateTournamentRequest) => {
    try {
      await apiFetch("/api/tournaments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      await fetchTournaments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create tournament"
      );
    }
  };

  const handleJoinTournament = async (
    tournamentId: number,
    data: JoinTournamentRequest
  ) => {
    try {
      await apiFetch(`/api/tournaments/${tournamentId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      await fetchTournaments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to join tournament"
      );
    }
  };

  const handleStartTournament = async (tournamentId: number) => {
    try {
      await apiFetch(`/api/tournaments/${tournamentId}/start`, {
        method: "POST",
      });
      await fetchTournaments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start tournament"
      );
    }
  };

  const handleStartMatch = async (matchId: number) => {
    try {
      await apiFetch(`/api/games/matches/${matchId}/start`, {
        method: "PATCH",
      });

      const tournament = tournaments.find(t =>
        t.matches?.some(m => m.id === matchId)
      );
      const match = tournament?.matches?.find(m => m.id === matchId);

      if (tournament && match) {
        let gamePage = "/pong";

        switch (tournament.gameType) {
          case "pong":
            gamePage = "/games/pong";
            break;
          case "tic_tac_toe":
            gamePage = "/games/tictactoe";
            break;
          case "connect4":
            gamePage = "/games/connectfour";
            break;
          default:
            gamePage = "/games/pong";
        }
        const params = new URLSearchParams({
          tournamentId: tournament.id.toString(),
          tournamentMatchId: matchId.toString(),
        });

        navigate(`${gamePage}?${params.toString()}`);
      } else {
        await fetchTournaments();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start match");
    }
  };

  const handleViewTournament = (tournamentId: number) => {
    setSelectedTournamentId(tournamentId);
    setShowDetailsModal(true);
  };

  const handleJoinClick = (tournamentId: number) => {
    setSelectedTournamentId(tournamentId);
    setShowJoinModal(true);
  };

  const filteredTournaments = tournaments.filter(
    tournament => filterStatus === "all" || tournament.status === filterStatus
  );

  useEffect(() => {
    if (!getCsrfToken()) {
      navigate("/");
      return;
    }
    const loadTournaments = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiFetch("/api/tournaments/");
        const result = await response.json();

        if (!response.ok) {
          setError(result.message || "Failed to fetch tournaments");
          return;
        }

        const { data } = result;
        if (data && Array.isArray(data)) {
          setTournaments(data);
        } else {
          console.error("Tournaments data structure unexpected:", data);
          setTournaments([]);
        }
      } catch (err) {
        console.error("[Tournaments] Error loading tournaments:", err);
        if (isMounted.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch tournaments"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadTournaments();
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen themed-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold themed-text">Tournaments</h1>
            <p className="themed-text-secondary mt-2">
              Join or create tournaments to compete with other players
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span>+</span>
            <span>Create Tournament</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right themed-text hover:opacity-80"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex space-x-1 mb-6 themed-bg-contrast p-1 rounded-lg">
          {(["all", "pending", "active", "completed"] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === status
                  ? "themed-bg-contrast text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-600"
                  : "themed-text-secondary hover:opacity-60"
              }`}
            >
              {status === "all"
                ? "All"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <div className="themed-text-secondary text-lg mb-4">
              {tournaments.length === 0
                ? "No tournaments found"
                : "No tournaments match the selected filter"}
            </div>
            {tournaments.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Your First Tournament
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map(tournament => (
              <TournamentCard
                tournament={tournament}
                onJoin={handleJoinClick}
                onStart={handleStartTournament}
                onView={handleViewTournament}
                currentUserId={currentUser?.id}
              />
            ))}
          </div>
        )}

        <CreateTournamentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTournament}
        />
        <JoinTournamentModal
          isOpen={showJoinModal}
          tournament={tournaments.find(t => t.id === selectedTournamentId)!}
          tournamentId={selectedTournamentId}
          onClose={() => {
            setShowJoinModal(false);
            setSelectedTournamentId(null);
          }}
          onSubmit={handleJoinTournament}
        />
        <TournamentDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTournamentId(null);
          }}
          tournament={
            tournaments.find(t => t.id === selectedTournamentId) || null
          }
          onStartMatch={handleStartMatch}
        />
      </div>
    </div>
  );
}
