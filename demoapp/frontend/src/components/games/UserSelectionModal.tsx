import { createElement, useState, useEffect, useCallback } from "@minireact";
import type { PublicUser } from "@/types/user";
import UserList from "./UserList";
import PasswordVerification from "./PasswordVerification";
import type { PlayerConfig } from "@/types/games";

let isVerificationInProgress = false;

interface UserSelectionModalProps {
  isOpen: boolean;
  users: PublicUser[];
  roster: PlayerConfig[];
  loadingUsers: boolean;
  selectedPlayerId: number | null;
  updatePlayer: (playerId: number, updates: any) => void;
  onClose: () => void;
  fetchUsers: () => Promise<void>;
  verifyPassword: (userId: number, password: string) => Promise<boolean>;
}

export default function UserSelectionModal({
  isOpen,
  users,
  roster,
  loadingUsers,
  selectedPlayerId,
  updatePlayer,
  onClose,
  fetchUsers,
  verifyPassword,
}: UserSelectionModalProps) {
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setSelectedUser(null);
      setVerifying(false);
      setError("");
      isVerificationInProgress = false;
      fetchUsers().catch(console.error);
    }
  }, [isOpen]);

  const handleSelectUser = useCallback((user: PublicUser) => {
    setSelectedUser(user);
    setError("");
    const timeout = setTimeout(() => {
      const passwordInput = document.getElementById("password-input");
      if (passwordInput) {
        (passwordInput as HTMLInputElement).focus();
      }
    }, 50);
    return () => clearTimeout(timeout);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedUser(null);
    setError("");
  }, []);

  const handleVerify = useCallback(
    async (pwd: string) => {
      if (!selectedUser || !pwd) {
        setError("Please enter a password");
        return;
      }

      if (isVerificationInProgress) return;
      isVerificationInProgress = true;

      try {
        setVerifying(true);
        setError("");
        const isValid = await verifyPassword(selectedUser.id, pwd);
        if (isValid && selectedPlayerId !== null) {
          updatePlayer(selectedPlayerId, {
            name: selectedUser.username || selectedUser.displayName,
            type: "player",
            userId: selectedUser.id,
            avatar: selectedUser.avatarFilename,
          });
          onClose();
          setTimeout(() => {
            setSelectedUser(null);
            setVerifying(false);
            isVerificationInProgress = false;
          }, 0);
          return;
        } else {
          setError("Invalid password");
        }
      } catch (err: any) {
        setError(err.message || "Password verification failed");
      } finally {
        isVerificationInProgress = false;
        setVerifying(false);
      }
    },
    [selectedUser, selectedPlayerId, updatePlayer, onClose, verifyPassword]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 themed-bg themed-bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="themed-bg themed-card rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e: any) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium mb-4">
          {selectedUser ? "Verify Password" : "Select a Player"}
        </h3>

        {loadingUsers ? (
          <div className="flex justify-center my-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : selectedUser ? (
          <PasswordVerification
            user={selectedUser}
            verifying={verifying}
            error={error}
            onVerify={handleVerify}
            onBack={handleBack}
          />
        ) : (
          <UserList
            users={users.filter(user => {
              const isUserInRoster = roster.some(
                player => player.userId === user.id
              );
              const isDeletedUser = user.username.startsWith("deleted_user_");
              return !isUserInRoster && !isDeletedUser;
            })}
            onSelectUser={handleSelectUser}
            onClose={onClose}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
