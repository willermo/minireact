import { createElement, useRef, useEffect } from "@minireact";
import type { PublicUser } from "@/types/user";

interface PasswordVerificationProps {
  user: PublicUser;
  verifying: boolean;
  error: string;
  onVerify: (password: string) => void;
  onBack: () => void;
}

export default function PasswordVerification({
  user,
  verifying,
  error,
  onVerify,
  onBack,
}: PasswordVerificationProps) {
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (passwordRef.current && passwordRef.current.value && !verifying) {
      onVerify(passwordRef.current.value);
    } else {
      console.log("Password is empty or verifying");
    }

    return false;
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && passwordRef.current?.value && !verifying) {
      onVerify(passwordRef.current.value);
    }
  };

  useEffect(() => {
    passwordRef.current = document.getElementById(
      "password-input"
    ) as HTMLInputElement;
    return () => {
      passwordRef.current = null;
    };
  }, [onVerify]);

  return (
    <div>
      <div className="flex items-center themed-bg themed-card rounded-md p-2 mb-4">
        <img
          src={`${import.meta.env.VITE_API_BASE}/users/avatar/${
            user.avatarFilename
          }`}
          alt={user.displayName || user.username}
          className="w-12 h-12 rounded-full mr-3"
          crossOrigin="anonymous"
        />
        <div>
          <p className="font-medium themed-text">
            {user.displayName ||
              user.username ||
              `${user.firstName} ${user.lastName}`}
          </p>
          <p className="text-sm themed-text-secondary">{user.email}</p>
        </div>
      </div>
      {error && (
        <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium themed-text mb-1">
            Password
          </label>
          <input
            ref={passwordRef}
            type="password"
            className="w-full px-3 py-2 themed-bg rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your password"
            style={{ backgroundColor: "var(--color-bg-secondary)" }}
            onKeyDown={handleKeyDown}
            id="password-input"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium themed-text-secondary themed-bg rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={verifying}
            className={`px-4 py-2 text-sm font-medium themed-text themed-bg rounded-md cursor-pointer ${
              verifying
                ? "themed-bg-secondary cursor-not-allowed"
                : "themed-bg-primary hover:themed-bg-secondary"
            }`}
            style={{
              backgroundColor: "var(--color-bg-accent)",
              color: "var(--color-text-primary)",
            }}
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      </form>
    </div>
  );
}
