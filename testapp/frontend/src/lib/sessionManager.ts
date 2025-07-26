import { apiFetch } from "./api";

const TOKEN_CHECK_INTERVAL = 60 * 1000;
const REFRESH_BUFFER = 5 * 60 * 1000;

let refreshInProgress: Promise<Response> | null = null;
let refreshTimerId: number | null = null;

const requestQueue: Array<{
  resolve: (value: Response) => void;
  reject: (reason?: any) => void;
  url: string;
  options: RequestInit;
}> = [];

function processQueue(error?: Error) {
  const queue = [...requestQueue];
  requestQueue.length = 0;

  if (error) {
    queue.forEach(({ reject }) => reject(error));
    return;
  }
  queue.forEach(({ resolve, reject, url, options }) => {
    apiFetch(url, options).then(resolve).catch(reject);
  });
}

async function refreshAccessToken(tokens: string[]): Promise<Response> {
  console.log("Starting token refresh...");
  if (refreshInProgress) {
    console.log(
      "Token refresh already in progress, returning existing promise"
    );
    return refreshInProgress;
  }

  const refreshPromise = (async () => {
    try {
      console.log("Sending refresh token request...");
      const response = await apiFetch("/api/auth/refresh-token", {
        method: "POST",
        body: JSON.stringify({ tokens }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Refresh token response status:", response.status);

      if (response.ok) {
        console.log("Refresh successful, processing response...");
        const result = await response.json();
        const { refreshTokenExpiresIn, authTokenExpiresIn } = result.data;
        const refreshTokenNextRefreshTime =
          Date.now() +
          Math.floor(refreshTokenExpiresIn * 1000) -
          REFRESH_BUFFER;
        const authTokenNextRefreshTime =
          Date.now() + Math.floor(authTokenExpiresIn * 1000) - REFRESH_BUFFER;
        const nextRefresh = {
          tokenToRefresh:
            refreshTokenNextRefreshTime < authTokenNextRefreshTime
              ? "refresh"
              : "auth",
          time: Math.min(refreshTokenNextRefreshTime, authTokenNextRefreshTime),
        };
        console.log(
          "Next refresh scheduled for:",
          nextRefresh.time,
          ", Token to refresh: ",
          nextRefresh.tokenToRefresh
        );

        processQueue();
        return response;
      }

      const errorText = await response.text();
      console.error(
        "Token refresh failed with status:",
        response.status,
        "Response:",
        errorText
      );
      if (response.status === 401) {
        console.log("Refresh token invalid, clearing session");
        stopSessionMonitoring();
      }

      throw new Error(`Failed to refresh token (status ${response.status})`);
    } catch (error) {
      console.error("Error in refreshAccessToken:", error);
      processQueue(error as Error);
      throw error;
    } finally {
      console.log("Token refresh process completed");
      refreshInProgress = null;
    }
  })();

  refreshInProgress = refreshPromise;
  return refreshPromise;
}

export function startSessionMonitoring(
  onSessionExpired: () => void = () => {}
) {
  console.log("Starting session monitoring");
  if (refreshTimerId) {
    console.log("Clearing existing session monitoring");
    stopSessionMonitoring();
  }

  const initialDelay = 1000;
  console.log(`Scheduling initial check in ${initialDelay}ms`);

  const initialCheck = setTimeout(() => {
    console.log("Running initial session check");
    checkSession(onSessionExpired)
      .catch(error => {
        console.error("Error in initial session check:", error);
      })
      .finally(() => {
        console.log("Setting up regular session checks");
        refreshTimerId = window.setInterval(() => {
          console.log("Running periodic session check");
          checkSession(onSessionExpired).catch(error => {
            console.error("Error in periodic session check:", error);
          });
        }, TOKEN_CHECK_INTERVAL);
      });
  }, initialDelay);

  refreshTimerId = initialCheck as unknown as number;
  console.log("Session monitoring started successfully");
}

async function checkSession(onSessionExpired: () => void) {
  try {
    const response = await apiFetch("/api/auth/validate-session");

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message);
    }

    const { valid, refreshTokenExpiresAt, authTokenExpiresAt } = result.data;

    if (!valid) {
      onSessionExpired();
      return false;
    }

    const timeUntilAuthTokenExpiry =
      new Date(authTokenExpiresAt).getTime() - Date.now();
    const timeUntilRefreshTokenExpiry =
      new Date(refreshTokenExpiresAt).getTime() - Date.now();
    console.log(
      `Session valid for ${Math.round(timeUntilAuthTokenExpiry / 1000)}s`
    );
    console.log(
      `Refresh token valid for ${Math.round(
        timeUntilRefreshTokenExpiry / 1000
      )}s`
    );

    const expiringTokens: string[] = [];
    if (timeUntilAuthTokenExpiry < REFRESH_BUFFER) expiringTokens.push("auth");
    if (timeUntilRefreshTokenExpiry < REFRESH_BUFFER)
      expiringTokens.push("refresh");
    console.log(`Expiring tokens: ${expiringTokens.join(", ")}`);

    if (expiringTokens.length > 0) {
      console.log("Refreshing tokens...");
      await refreshAccessToken(expiringTokens);
    }

    return true;
  } catch (error) {
    console.error("Session check failed:", error);
    onSessionExpired();
    return false;
  }
}

export function stopSessionMonitoring() {
  console.log("Stopping session monitoring");
  if (refreshTimerId) {
    console.log("Clearing interval with ID:", refreshTimerId);
    clearInterval(refreshTimerId);
    refreshTimerId = null;
  }
  refreshInProgress = null;
  requestQueue.length = 0;
  console.log("Session monitoring stopped");
}
