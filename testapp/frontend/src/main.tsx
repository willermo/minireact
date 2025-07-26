import "./style.css";
import { routes } from "./routes";
import Layout from "./layout";
import {
  render,
  createElement,
  useState,
  useEffect,
  Router,
  useContext,
  NavigationContext,
  type NavigationContextType,
} from "@minireact";
import { UserContext } from "./contexts/UserContext";
import { apiFetch, getCsrfToken } from "./lib/api";
import {
  startSessionMonitoring,
  stopSessionMonitoring,
} from "./lib/sessionManager";
import { ThemeProvider } from "./contexts/ThemeContext";

const debug = false;

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    minireact: any; // For HMR
  }
}

// App content component that uses the navigation context
function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { currentPath, navigate } = useContext(
    NavigationContext
  ) as NavigationContextType;

  // Session expiry handler
  const handleSessionExpired = () => {
    setUser(null);
    if (!["/", "/login", "/register"].includes(currentPath)) {
      navigate("/login");
    }
  };

  useEffect(() => {
    let isActive = true;

    const checkAuth = async () => {
      const token = getCsrfToken();
      if (!token) {
        if (isActive) {
          setUser(null);
          setLoading(false);
          stopSessionMonitoring();
        }
        return;
      }

      try {
        setLoading(true);
        const response = await apiFetch("/api/users/me");

        if (!isActive) return;

        if (response.ok) {
          const result = await response.json();
          const { data } = result;
          setUser(data.user);
          if (data.user) {
            startSessionMonitoring(handleSessionExpired);
          } else {
            stopSessionMonitoring();
          }
        } else {
          setUser(null);
          stopSessionMonitoring();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        stopSessionMonitoring();
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isActive = false;
    };
  }, [currentPath]);

  // Get the current route component based on current path
  // Remove query parameters and trailing slashes
  const cleanedPath =
    currentPath === "/"
      ? "/"
      : currentPath.replace(/\?.*$/, "").replace(/\/+$/, "");
  if (debug) console.log("Cleaned path:", cleanedPath);
  const routeComponent = routes[cleanedPath] || routes["*"] || routes["/404"];
  if (debug)
    console.log(
      "[App] Current path:",
      currentPath,
      "Route component:",
      routeComponent.name
    );

  const pageContent = createElement(routeComponent, { key: currentPath });
  if (debug) console.log("[App] Page content created:", pageContent);

  return createElement(
    ThemeProvider,
    {},
    createElement(
      UserContext.Provider,
      { value: { user, setUser, loading } },
      createElement(Layout, { key: "layout" }, pageContent)
    )
  );
}

// Enhanced initialization
function init() {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }

  // Render with Router wrapper to provide NavigationContext
  render(createElement(Router, {}, createElement(AppContent, {})), root);

  // HMR enabled for minireact
  if (import.meta.hot) {
    window.minireact = { render, createElement, init }; // For HMR
    if (debug) console.log("[HMR] Minireact exposed for HMR");

    import.meta.hot.accept(() => {
      if (debug) console.log("[HMR] Hot reload triggered, re-initializing...");
      init();
    });
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", init);
