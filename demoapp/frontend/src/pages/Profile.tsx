import {
  createElement,
  useState,
  useEffect,
  useNavigate,
  useContext,
  Fragment,
  useRef,
} from "@minireact";
import { apiFetch, getCsrfToken } from "../lib/api";
import { UserContext } from "../contexts/UserContext";
import MatchSummary from "@components/games/MatchesTable";
import type { EnrichedMatch } from "../types/matches";

type InputEvent = Event & {
  target: HTMLInputElement;
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState<string | null>(null);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [matchHistory, setMatchHistory] = useState<EnrichedMatch[]>([]);

  const changePasswordDataRef = useRef({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const changeDisplayNameDataRef = useRef({
    displayName: "",
  });

  const fetchUserData = async () => {
    try {
      if (!getCsrfToken()) {
        navigate("/");
        return;
      }
      const response = await apiFetch("/api/users/me");

      if (response.status === 401) {
        navigate("/");
        return;
      }
      const result = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const { data } = result;
      setUser(data.user);

      if (data.user.id) {
        const matchResponse = await apiFetch(
          `/api/games/matches/user/${data.user.id}`
        );
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          setMatchHistory(matchData.data);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const response = await apiFetch("/api/auth/resend-verification", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ email: user?.email }),
      });
      if (response.ok) {
        setSuccessMessage(
          "Verification email sent successfully. Check your email"
        );
      } else {
        throw new Error("Failed to verify email");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    }
  };

  const handleAvatarChange = async (
    e: Event & { target: HTMLInputElement }
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.match("image/(jpeg|jpg|png|gif|webp)")) {
      alert("Only JPEG, PNG, GIF, and WebP images are allowed");
      return;
    }

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be less than 2MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiFetch(`/api/users/uploadNewAvatar`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        await fetchUserData();
      } else {
        throw new Error(result.error || "Failed to process avatar");
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert(error instanceof Error ? error.message : "Failed to upload avatar");
    }
  };

  const handleUpdateDisplayName = async (e: Event) => {
    e.preventDefault();

    const { displayName } = changeDisplayNameDataRef.current;

    if (!displayName.trim() || !user) return;

    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await apiFetch(`/api/users/updateDisplayName`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName }),
      });

      const result = await response.json();
      const data = result.data;

      if (response.ok) {
        const updatedUser = { ...user, displayName: data.user.displayName };
        setUser(updatedUser);
        setSuccessMessage("Display name updated successfully!");
        setIsEditingDisplayName(false);
      } else {
        throw new Error(result.message || "Failed to update display name");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  });

  const handlePasswordChange = (e: InputEvent) => {
    const { name, value } = e.target;

    changePasswordDataRef.current = {
      ...changePasswordDataRef.current,
      [name]: value,
    };
  };

  const handleDisplayNameChange = (e: InputEvent) => {
    const { name, value } = e.target;

    changeDisplayNameDataRef.current = {
      ...changeDisplayNameDataRef.current,
      [name]: value,
    };
  };

  const handleUpdatePassword = async (e: SubmitEvent) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } =
      changePasswordDataRef.current;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await apiFetch(`/api/users/updatePassword`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Password updated successfully!");
        setIsEditingPassword(false);
      } else {
        setIsEditingPassword(false);
        throw new Error(data.message || "Failed to update password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelDisplayNameEdit = () => {
    setIsEditingDisplayName(false);
    setError(null);
  };

  const cancelPasswordEdit = () => {
    setIsEditingPassword(false);
    setError(null);
  };

  useEffect(() => {
    if (isEditingPassword) {
      const timer = setTimeout(() => {
        const passwordInput = document.getElementById("currentPassword");
        if (passwordInput) passwordInput.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isEditingPassword]);

  useEffect(() => {
    if (isEditingDisplayName) {
      const timer = setTimeout(() => {
        const displayNameInput = document.getElementById("displayName");
        if (displayNameInput) displayNameInput.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isEditingDisplayName]);

  useEffect(() => {
    fetchUserData();
  }, []);

  if (loading) return <div className="text-center p-4">Loading profile...</div>;
  if (!user) return <div className="p-4">No user data available.</div>;

  return (
    <>
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded max-w-md w-full z-50">
          <div className="flex justify-between items-center">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-700 hover:text-green-900"
              aria-label="Close success message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md w-full z-50">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <section
        id="profile"
        className="max-w-md mx-auto p-6 themed-bg shadow rounded"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Your Profile</h1>
        <div className="flex flex-col space-y-4">
          <div className="relative w-32 h-32 mb-4 self-center">
            <img
              src={`/api/users/avatar/${user.avatarFilename}`}
              alt={`Avatar of ${user.displayName}`}
              className="w-32 h-32 rounded-full mx-auto mb-4"
              crossOrigin="anonymous"
            />
            <label className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer hover:themed-bg">
              <input
                type="file"
                accept="image/jpeg, image/png, image/gif, image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </label>
          </div>
          <p className="text-sm text-gray-500 self-center mb-4">
            Click the icon to change your avatar
          </p>
          <p>
            <strong>Username:</strong> {user.username}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
            <span>
              {user.isVerified ? (
                <span className="text-green-500 ml-2 border rounded px-2">
                  Email Verified
                </span>
              ) : (
                <span className="ml-2  text-red-500 px-2">
                  Email is not verified
                  <button
                    onClick={handleVerifyEmail}
                    className="ml-2 border rounded px-2 cursor-pointer bg-blue-500 text-white"
                  >
                    Verify
                  </button>
                </span>
              )}
            </span>
          </p>
          <p>
            <strong>Name:</strong> {user.firstName} {user.lastName}
          </p>
          <p>
            <strong>Role:</strong> {user.role}
          </p>
          <p>
            <strong>Auth Provider:</strong> {user.authProvider}
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <strong>Display Name:</strong>
              {!isEditingDisplayName ? (
                <div className="flex items-center">
                  <span>{user.displayName}</span>
                  <button
                    onClick={(e: Event) => {
                      e.preventDefault();
                      setIsEditingDisplayName(true);
                    }}
                    className="ml-2 text-sm cursor-pointer text-blue-600 hover:text-blue-800"
                  >
                    (edit)
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleUpdateDisplayName}
                  className="flex-1 ml-4"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      name="displayName"
                      type="text"
                      defaultValue={
                        changeDisplayNameDataRef.current.displayName
                      }
                      onChange={handleDisplayNameChange}
                      className="flex-1 px-3 py-1 border rounded"
                      required
                      minLength={1}
                      maxLength={50}
                      id="displayName"
                    />
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-3 py-1 themed-bg rounded disabled:opacity-50"
                    >
                      {isUpdating ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelDisplayNameEdit}
                      className="px-3 py-1 themed-bg rounded"
                      disabled={isUpdating}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        id="customizations"
        className="my-6 themed-bg shadow rounded p-6"
      >
        <h2 className="text-lg font-semibold mb-4 text-center">
          Account Settings
        </h2>

        <div className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">Change Password</h3>
            {!isEditingPassword ? (
              <>
                <p className="text-sm text-gray-500 mb-2">
                  Click the button below to change your password
                </p>
                <button
                  onClick={(e: Event) => {
                    e.preventDefault();
                    setIsEditingPassword(true);
                  }}
                  className="px-4 py-2 rounded border cursor-pointer"
                >
                  Change Password
                </button>
              </>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current Password
                  </label>
                  <input
                    name="currentPassword"
                    type="password"
                    defaultValue={changePasswordDataRef.current.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border rounded"
                    required
                    id="currentPassword"
                    tabIndex={1}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        document.getElementById("newPassword")?.focus();
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <input
                    name="newPassword"
                    type="password"
                    defaultValue={changePasswordDataRef.current.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border rounded"
                    required
                    minLength={8}
                    id="newPassword"
                    tabIndex={2}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        document.getElementById("confirmPassword")?.focus();
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirm New Password
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    defaultValue={changePasswordDataRef.current.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border rounded"
                    required
                    minLength={8}
                    id="confirmPassword"
                    tabIndex={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 border rounded disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    tabIndex={4}
                  >
                    {isUpdating ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelPasswordEdit}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {user.authProvider === "google" && (
            <div className="border-b pb-4">
              <h3 className="font-medium mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mb-3">
                Two-factor authentication is not available for Google accounts{" "}
                <br />
                Set it up on your Google account.
              </p>
            </div>
          )}
          {user.authProvider === "local" && (
            <div className="border-b pb-4">
              <h3 className="font-medium mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mb-3">
                {user.twoFactorEnabled
                  ? "Two-factor authentication is enabled."
                  : "Add an extra layer of security to your account."}
              </p>
              <button
                key="toggle-2fa"
                onClick={async () => {
                  if (user.twoFactorEnabled) {
                    const res = await apiFetch("/api/auth/disable-2fa", {
                      method: "POST",
                    });
                    if (res.ok) setUser({ ...user, twoFactorEnabled: false });
                  } else {
                    navigate("/profile/2fa");
                  }
                }}
                className={`px-4 py-2 rounded ${
                  user.twoFactorEnabled
                    ? "bg-red-600 hover:bg-red-700"
                    : "themed-bg"
                }`}
              >
                {user.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
              </button>
            </div>
          )}

          <div className="border-b pb-4">
            <h3 className="font-medium mb-2 text-red-600">Delete Account</h3>
            <p className="text-sm text-gray-600 mb-3">
              Permanently delete your account and anonymize your personal data.
              <strong> This action cannot be undone.</strong> Your match history will be preserved
              but associated with an anonymous user.
            </p>
            <details className="mb-3">
              <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                What happens when I delete my account?
              </summary>
              <div className="mt-2 text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <ul className="list-disc list-inside space-y-1">
                  <li>Your personal information (name, email, username) will be anonymized</li>
                  <li>Your match history and game statistics will be preserved</li>
                  <li>You will be logged out immediately</li>
                  <li>Your account cannot be recovered after deletion</li>
                  <li>This complies with GDPR "Right to Erasure" requirements</li>
                </ul>
              </div>
            </details>
            <button
              onClick={async () => {
                const confirmed = confirm(
                  "Are you absolutely sure you want to delete your account?\n\n" +
                  "This will:\n" +
                  "• Anonymize all your personal data\n" +
                  "• Log you out immediately\n" +
                  "• Cannot be undone\n\n" +
                  "Type 'DELETE' to confirm this action."
                );
                
                if (!confirmed) return;
                
                const confirmText = prompt(
                  "Please type 'DELETE' (in capital letters) to confirm account deletion:"
                );
                
                if (confirmText !== "DELETE") {
                  alert("Account deletion cancelled. You must type 'DELETE' exactly.");
                  return;
                }
                
                try {
                  setIsUpdating(true);
                  const response = await apiFetch("/api/users/me", {
                    method: "DELETE",
                  });
                  
                  if (response.ok) {
                    alert("Account successfully deleted. You will now be logged out.");
                    setUser(null);
                    navigate("/");
                  } else {
                    const result = await response.json();
                    throw new Error(result.message || "Failed to delete account");
                  }
                } catch (error) {
                  console.error("Error deleting account:", error);
                  alert(
                    error instanceof Error 
                      ? error.message 
                      : "An error occurred while deleting your account"
                  );
                } finally {
                  setIsUpdating(false);
                }
              }}
              disabled={isUpdating}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Deleting Account..." : "Delete My Account"}
            </button>
          </div>
        </div>
      </section>

      <section
        id="matchHistory"
        className="w-full max-w-7xl mx-auto px-4 mt-12"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
          Last matches
        </h2>
        <div className="flex flex-col gap-4">
          <MatchSummary matchHistory={matchHistory} />
        </div>
      </section>
    </>
  );
}
