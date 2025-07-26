import { createElement } from "@minireact";
import type { PublicUser } from "@/types/user";

interface UserListProps {
  users: PublicUser[];
  onSelectUser: (user: PublicUser) => void;
  onClose: () => void;
  error?: string;
}

export default function UserList({
  users,
  onSelectUser,
  onClose,
  error,
}: UserListProps) {
  return (
    <div>
      {error ? (
        <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          {error}
        </div>
      ) : users.length === 0 ? (
        <p className="themed-text-primary text-center my-4">No users found</p>
      ) : (
        <div className="grid gap-2">
          {users.map((user: PublicUser) => (
            <div
              key={user.id}
              onClick={() => onSelectUser(user)}
              className="flex items-center p-2 rounded-md themed-bg hover:themed-bg-secondary cursor-pointer transition duration-150"
            >
              <img
                src={`${import.meta.env.VITE_API_BASE}/users/avatar/${
                  user.avatarFilename
                }`}
                alt={user.displayName || user.username}
                className="w-12 h-12 rounded-full mr-3"
              />
              <span className="font-medium themed-text">
                {user.displayName ||
                  user.username ||
                  `${user.firstName} ${user.lastName}`}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium themed-text-secondary themed-bg rounded-md hover:themed-bg-secondary cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
