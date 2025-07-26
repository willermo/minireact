import { createElement, useState, useEffect } from "@minireact";

interface APIData {
  key: string;
  status: string;
}

export default function RoutesStatus() {
  const [apiStatus, setApiStatus] = useState<APIData[]>([
    { key: "auth", status: "" },
    { key: "users", status: "" },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAPIStatus = async () => {
      setIsLoading(true);
      setError("");

      const endpoints = [
        { key: "auth", path: "/api/auth/status" },
        { key: "users", path: "/api/users/status" },
      ];

      const results = await Promise.allSettled(
        endpoints.map(async ({ key, path }) => {
          try {
            const response = await fetch(path);
            if (!response.ok) {
              throw new Error(`${response.status}`);
            }
            const data: { status: string } = await response.json();
            return { key, status: data.status };
          } catch (err) {
            console.error(`Failed to fetch ${path}:`, err);
            return { key, status: `${err}` };
          }
        })
      );
      const newValues = results
        .filter(result => result.status === "fulfilled")
        .map(result => result.value);
      setApiStatus(newValues);
      setIsLoading(false);
    };

    fetchAPIStatus();
  }, []);

  return (
    <div className="themed-bg themed-border rounded-lg p-4">
      <h2 className="text-xl text-center font-semibold mb-4 dark:text-white">
        Backend API Routes Status
      </h2>
      <div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="themed-bg">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium themed-text-secondary uppercase tracking-wider">
                API ROUTE
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium themed-text-secondary uppercase tracking-wider">
                STATUS
              </th>
            </tr>
          </thead>
          <tbody className="themed-bg divide-y divide-gray-200">
            {apiStatus.map(item => (
              <tr key={item.key}>
                <td className="px-6 py-4 whitespace-nowrap text-sm themed-text-secondary">
                  /api/{item.key}/status
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isLoading ? (
                    <span className="themed-text-secondary">Loading...</span>
                  ) : error ? (
                    <span className=" text-red-700">Error: {error}</span>
                  ) : (
                    <span className="text-green-700">
                      {item.status || "Unknown"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
