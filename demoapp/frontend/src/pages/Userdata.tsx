import { createElement, useState, useEffect } from "@minireact";
import { apiFetch } from "../lib/api";

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export default function Userdata() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiFetch("/api/users/getUsers");

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch users");
        }

        const { data } = result;
        setUsers(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="userdata-container">
      <h1>Users List</h1>
      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <h3>{user.username}</h3>
            <p>{user.email}</p>
            <small>
              Member since: {new Date(user.created_at).toLocaleDateString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
