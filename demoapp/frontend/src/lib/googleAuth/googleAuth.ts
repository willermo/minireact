declare global {
  interface Window {
    gapi?: {
      auth2?: {
        getAuthInstance: () => {
          signOut: () => Promise<void>;
          // Add other methods if needed
        };
      };
    };
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: string;
            login_uri?: string;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            options: {
              type: string;
              theme: string;
              size: string;
              text: string;
              shape: string;
              width: number;
              logo_alignment: string;
            }
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleAuthConfig {
  clientId: string;
  onSuccess: (idToken: string) => Promise<void>;
  onFailure: (error: Error) => void;
}

export async function initializeGoogleAuth(
  config: GoogleAuthConfig
): Promise<boolean> {
  try {
    if (window.google?.accounts?.id) {
      return true;
    }
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (!window.google?.accounts?.id) {
          reject(new Error("Google API loaded but not available"));
          return;
        }
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load Google API"));
      document.head.appendChild(script);
    });

    const google = window.google;
    if (!google?.accounts?.id) {
      throw new Error("Google API not properly initialized");
    }

    google.accounts.id.initialize({
      client_id: config.clientId,
      ux_mode: "popup",
      login_uri: window.location.origin,
      callback: async (response: { credential: string }) => {
        try {
          await config.onSuccess(response.credential);
        } catch (error) {
          config.onFailure(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      },
    });

    return true;
  } catch (error) {
    config.onFailure(error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export function renderGoogleButton(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  if (!window.google?.accounts?.id) {
    console.error("Google API not initialized");
    return;
  }

  container.innerHTML = "";

  const buttonDiv = document.createElement("div");
  container.appendChild(buttonDiv);

  try {
    window.google.accounts.id.renderButton(buttonDiv, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: container.offsetWidth,
      logo_alignment: "left",
    });
  } catch (error) {
    console.error("Error rendering Google button:", error);
  }
}
