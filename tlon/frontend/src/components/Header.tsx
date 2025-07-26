import {
  Fragment,
  createElement,
  useContext,
  useState,
  useRef,
  useEffect,
  Link,
  useNavigate,
} from "@minireact";
import { UserContext } from "../contexts/UserContext";
import { ThemeToggle } from "./ui/ThemeToggleButton";
import { apiFetch, getCsrfToken } from "../lib/api";

export default function Header({ className = "" }) {
  const { user, setUser } = useContext(UserContext);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [cachedAvatarData, setCachedAvatarData] = useState<string | null>(
    sessionStorage.getItem("cachedAvatarData") || null
  );

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const handleLogout = async () => {
    try {
      const currentAuthProvider = user?.authProvider;

      const response = await apiFetch("/api/auth/logout", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Logout failed");
      }

      if (currentAuthProvider === "google" && window.google?.accounts?.id) {
        try {
          const auth2 = window.gapi?.auth2?.getAuthInstance();
          if (auth2) {
            await auth2.signOut();
          }
          window.google.accounts.id.disableAutoSelect();
        } catch (googleError) {
          console.error("Google sign out error:", googleError);
        }
      }

      setUser(null);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      if (!getCsrfToken()) return;

      try {
        const response = await apiFetch("/api/users/isAdmin");
        if (response.ok) {
          const result = await response.json();
          const { data } = result;
          setIsAdmin(data.isAdmin);
        } else {
          throw new Error("Failed to check admin status");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, []);

  useEffect(() => {
    const csrfToken = getCsrfToken();
    if (csrfToken && !user) {
      setIsLoadingUser(true);
      const fetchUserData = async () => {
        try {
          const response = await apiFetch("/api/users/me");
          if (response.ok) {
            const result = await response.json();
            const { data } = result;
            setUser(data.user);
            if (data.user?.avatarFilename) {
              const avatarUrl = `/api/users/avatar/${data.user.avatarFilename}`;
              fetch(avatarUrl)
                .then(response => response.blob())
                .then(blob => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64data = reader.result as string;
                    sessionStorage.setItem("cachedAvatarData", base64data);
                    setCachedAvatarData(base64data);
                  };
                  reader.readAsDataURL(blob);
                })
                .catch(error => console.error("Error caching avatar:", error));
            }
          }
        } catch (error) {
          console.error("Header - Error fetching user data:", error);
        } finally {
          setIsLoadingUser(false);
        }
      };

      fetchUserData();
    }
  }, [user, setUser]);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <header
      className={`themed-bg py-4 px-8 shadow-md transition-colors ${className}`}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          <Link to="/" children="Home">
            Tlön
          </Link>
        </h1>
        <nav className="flex items-center space-x-4">
          <Link to="/tests" children="Tests">
            Tests
          </Link>
          {isAdmin && (
            <Link to="/admin-settings" children="AdminSettings">
              Admin Settings
            </Link>
          )}
          <ThemeToggle />
          {!user && !isLoadingUser && !getCsrfToken() && (
            <>
              <Link
                to="/register"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md"
                children="Sign up"
              >
                Sign up
              </Link>
              <Link
                to="/login"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md"
                children="Sign in"
              >
                Sign in
              </Link>
            </>
          )}
          {(user || (isLoadingUser && getCsrfToken())) && (
            <div className="relative" ref={dropdownRef}>
              <button
                ref={buttonRef}
                id="user-menu-button"
                onClick={toggleDropdown}
                className="rounded-full border inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                aria-controls="user-menu"
              >
                {user ? (
                  <img
                    src={`/api/users/avatar/${user.avatarFilename}`}
                    alt={`Avatar of ${user.displayName}`}
                    className="size-12 rounded-full"
                  />
                ) : cachedAvatarData ? (
                  <img
                    src={cachedAvatarData}
                    alt="Avatar"
                    className="size-12 rounded-full"
                  />
                ) : (
                  <div className="size-12 rounded-full bg-gray-300 animate-pulse"></div>
                )}
              </button>
              {isDropdownOpen && (
                <div
                  id="user-menu"
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 themed-card ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                    }}
                    children="View Profile"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 hover:text-red-700 dark:hover:bg-gray-700"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
