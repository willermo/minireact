import { createElement, useEffect, useState, useCallback } from "@minireact";
import {
  fetchUsers,
  promoteUser,
  demoteUser,
  deleteUser,
} from "@/lib/usersManager";
import { Icon } from "@/components/ui/Icon";
import type { PublicUser } from "@/types/user";

export default function DbUsersTable() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);

  useEffect(() => {
    setIsLoading(true);
    fetchUsers().then(users => {
      setIsLoading(false);
      setUsers(users);
    });
  }, []);

  const handlePromote = useCallback(async (userId: number) => {
    setError(null);
    try {
      await promoteUser(userId);
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
    } catch (err) {
      console.error("Failed to promote user:", err);
      setError("Failed to promote user. Please try again.");
    }
  }, []);

  const handleDemote = useCallback(async (userId: number) => {
    setError(null);
    try {
      await demoteUser(userId);
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
    } catch (err) {
      console.error("Failed to demote user:", err);
      setError("Failed to demote user. Please try again.");
    }
  }, []);

  const handleDelete = useCallback(async (userId: number, username: string) => {
    setError(null);
    if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
      try {
        await deleteUser(userId);
        const updatedUsers = await fetchUsers();
        setUsers(updatedUsers);
      } catch (err) {
        console.error("Failed to delete user:", err);
        setError(
          err instanceof Error
            ? err.message || "Failed to delete user. Please try again."
            : "Failed to delete user. Please try again."
        );
      }
    }
  }, []);

  const thCssClasses =
    "px-6 py-3 text-left text-xs font-medium themed-text-secondary uppercase tracking-wider";
  const tdCssClasses =
    "px-6 py-4 whitespace-nowrap text-sm themed-text-secondary";

  return (
    <div className="border themed-bg themed-border rounded-lg p-4 themed-card">
      <h2 className="text-xl text-center font-semibold mb-4 dark:text-white">
        Database Users
      </h2>
      <div className="overflow-x-auto">
        {isLoading && <div>Loading users...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!users || (users.length === 0 && <div>No users found</div>)}
        {users && users.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="themed-bg">
              <tr>
                <th className={thCssClasses}>ID</th>
                <th className={thCssClasses}>Username</th>
                <th className={thCssClasses}>Email</th>
                <th className={thCssClasses}>First Name</th>
                <th className={thCssClasses}>Last Name</th>
                <th className={thCssClasses}>Role</th>
                <th className={thCssClasses}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className={tdCssClasses}>{user.id}</td>
                  <td className={tdCssClasses}>{user.username}</td>
                  <td className={tdCssClasses}>{user.email}</td>
                  <td className={tdCssClasses}>{user.firstName}</td>
                  <td className={tdCssClasses}>{user.lastName}</td>
                  <td className={tdCssClasses}>{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <button
                      onClick={() => handlePromote(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Icon
                        name="circle-arrow-up"
                        size={20}
                        color="currentColor"
                        className="cursor-pointer themed-text-secondary hover:text-blue-500 hover:stroke-blue-500"
                      />
                    </button>
                    <button
                      onClick={() => handleDemote(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Icon
                        name="circle-arrow-down"
                        size={20}
                        color="currentColor"
                        className="cursor-pointer themed-text-secondary hover:text-red-500 hover:stroke-red-500"
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Icon
                        name="trash-2"
                        size={20}
                        color="currentColor"
                        className="cursor-pointer themed-text-secondary hover:text-red-500 hover:stroke-red-500"
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
