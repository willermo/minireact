import {
  createElement,
  useState,
  useNavigate,
  useContext,
  useEffect,
  useRef,
  Link,
  Fragment,
} from "@minireact";
import {
  initializeGoogleAuth,
  renderGoogleButton,
} from "../lib/googleAuth/googleAuth";
import { UserContext } from "../contexts/UserContext";
import TwoFactorForm from "../components/TwoFactorForm";
import { apiFetch, getCsrfToken } from "../lib/api";
import type { PublicUser } from "../types/user";

type FormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type ValidationError = {
  field: keyof FormData | "general";
  message: string;
};

type FormField = {
  name: keyof FormData;
  label: string;
  placeholder?: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
};

type InputEvent = Event & {
  target: HTMLInputElement;
};

const GOOGLE_BUTTON_CONTAINER_ID = "google-signin-button";
const EMAIL_FIELD_ID = "email";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const formDataRef = useRef({
    email: "",
    password: "",
    rememberMe: false,
  });

  const googlePasswordFormDataRef = useRef({
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [googlePasswordError, setGooglePasswordError] = useState<string | null>(
    null
  );

  const googleInitialized = useRef(false);
  const focusInitialized = useRef(false);

  const formFields: FormField[] = [
    {
      name: "email",
      type: "email",
      label: "Email address",
      placeholder: "Email address",
      autoComplete: "email",
      required: true,
    },
    {
      name: "password",
      type: "password",
      label: "Password",
      placeholder: "Password",
      autoComplete: "current-password",
      required: true,
    },
    {
      name: "rememberMe",
      type: "checkbox",
      label: "Remember me",
      required: false,
    },
  ];

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const { email, password } = formDataRef.current;

    if (!email) {
      newErrors.push({
        field: "email",
        message: "Email is required",
      });
    }

    if (!password) {
      newErrors.push({
        field: "password",
        message: "Password is required",
      });
    }

    if (email && !emailRegex.test(email)) {
      newErrors.push({
        field: "email",
        message: "Please enter a valid email address",
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleChange = (e: InputEvent) => {
    const { name, value, type, checked } = e.target;

    formDataRef.current = {
      ...formDataRef.current,
      [name]: type === "checkbox" ? checked : value,
    };

    if (errors.some(error => error.field === name)) {
      setErrors(prev => prev.filter(error => error.field !== name));
    }
  };

  const handleGooglePasswordChange = (e: InputEvent) => {
    const { name, value } = e.target;
    googlePasswordFormDataRef.current = {
      ...googlePasswordFormDataRef.current,
      [name]: value,
    };
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const { email, password, rememberMe } = formDataRef.current;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }
      const data = result.data;

      if (data.requiresTwoFactor) {
        setRequires2FA(true);
        setLoginEmail(email);
        setIsSubmitting(false);
        return;
      }

      setUser(data.user);

      navigate("/");
    } catch (error) {
      setErrors(prev => [
        ...prev,
        {
          field: "general",
          message:
            error instanceof Error
              ? error.message
              : "An error occurred during login",
        },
      ]);

      setTimeout(() => {
        const container = document.getElementById(GOOGLE_BUTTON_CONTAINER_ID);
        if (container && !container.hasChildNodes()) {
          try {
            renderGoogleButton(GOOGLE_BUTTON_CONTAINER_ID);
          } catch (err) {
            console.error("Error re-rendering Google button after error:", err);
          }
        }
      }, 100);
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (idToken: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auth/google-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: idToken }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Google authentication failed");
      }
      const data = result.data;
      if (data.user) {
        setUser(data.user);
      }

      if (data.requirePasswordSetup) {
        setShowPasswordSetup(true);
        return;
      }

      if (data.user) {
        setUser(data.user);
        navigate("/");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Google auth error:", error);
      setErrors(prev => [
        ...prev,
        {
          field: "general",
          message: error?.message || "Google authentication failed",
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSetupForGoogleUser = async (e: Event) => {
    e.preventDefault();
    const { newPassword, confirmPassword } = googlePasswordFormDataRef.current;
    if (!newPassword) {
      setGooglePasswordError("New password is required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setGooglePasswordError("New passwords do not match");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:'",.<>/?`~]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      setGooglePasswordError(
        "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
      return;
    }

    setGooglePasswordError(null);

    try {
      const response = await apiFetch(`/api/users/setPasswordForGoogleUser`, {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to set password");
      }

      const userResponse = await apiFetch(`/api/users/me`);
      const result = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(result.message || "Failed to fetch profile");
      }

      const { userData } = result;
      setUser(userData);
      setShowPasswordSetup(false);
      navigate("/");
    } catch (err) {
      setGooglePasswordError(
        err instanceof Error ? err.message : "An error occurred"
      );
    }
  };

  useEffect(() => {
    if (googleInitialized.current) return;
    googleInitialized.current = true;

    const timer = setTimeout(async () => {
      let container = document.getElementById(GOOGLE_BUTTON_CONTAINER_ID);

      if (!container) {
        container = document.createElement("div");
        container.id = GOOGLE_BUTTON_CONTAINER_ID;
        container.style.width = "100%";
        container.style.height = "40px";
        container.style.marginTop = "20px";

        const formWrapper = document.querySelector(".themed-card");
        if (formWrapper) {
          const accountSection = document.querySelector(".mt-6");
          if (accountSection) {
            formWrapper.insertBefore(container, accountSection);
          } else {
            formWrapper.appendChild(container);
          }
        }
      }

      try {
        const initialized = await initializeGoogleAuth({
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          onSuccess: handleGoogleSignIn,
          onFailure: error => {
            console.error("Google Auth Error:", error);
            setErrors(prev => [
              ...prev,
              {
                field: "general",
                message:
                  "Failed to initialize Google Sign-In. Please try again.",
              },
            ]);
          },
        });

        if (initialized) {
          try {
            renderGoogleButton(GOOGLE_BUTTON_CONTAINER_ID);
          } catch (err) {
            console.error("Error rendering Google button:", err);
          }
        }
      } catch (error) {
        console.error("Error initializing Google Auth:", error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (focusInitialized.current) return;
    focusInitialized.current = true;

    const timer = setTimeout(() => {
      if (!showPasswordSetup) {
        const emailInput = document.getElementById(EMAIL_FIELD_ID);
        if (emailInput) emailInput.focus();
      } else {
        const passwordInput = document.getElementById("newPassword");
        if (passwordInput) passwordInput.focus();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      focusInitialized.current = false;
    };
  }, [setShowPasswordSetup]);

  if (requires2FA) {
    return (
      <TwoFactorForm
        email={loginEmail}
        onSuccess={() => {
          setUser({} as PublicUser);
          navigate("/");
        }}
        onCancel={() => setRequires2FA(false)}
      />
    );
  }

  useEffect(() => {
    if (getCsrfToken()) {
      navigate("/");
    }
  }, []);

  return (
    <>
      {showPasswordSetup && (
        <div className="fixed inset-0 themed-bg bg-opacity-50 flex items-center justify-center z-50">
          {googlePasswordError && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md w-full z-51">
              <div className="flex justify-between items-center">
                <span>{googlePasswordError}</span>
                <button
                  onClick={() => setGooglePasswordError(null)}
                  className="text-red-700 hover:text-red-900"
                  aria-label="Close error message"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <div className="themed-bg p-6 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Set Your Password</h2>
            <p className="mb-4">
              Although Google authentication is passwordless, a password is
              required to check against db to provide access to some specially
              enforced restricted access areas.
            </p>
            <p className="mb-4">
              Please set a password to continue. It must be at least 8
              characters long and include at least one uppercase letter, one
              lowercase letter, one number, and one special character.
            </p>
            <p>
              If you prefer to skip this step, you can always set a new password
              later using the <em>Forgot Password</em> feature in login page.
            </p>

            <form onSubmit={handlePasswordSetupForGoogleUser}>
              <div className="mb-4">
                <label htmlFor="newPassword" className="block my-2 font-medium">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  defaultValue={googlePasswordFormDataRef.current.newPassword}
                  onChange={handleGooglePasswordChange}
                  className="w-full p-2 border rounded"
                  required
                  minLength={8}
                  tabIndex={1}
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById("confirmPassword")?.focus();
                    }
                  }}
                />
                <label
                  htmlFor="confirmPassword"
                  className="block my-2 font-medium"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  defaultValue={
                    googlePasswordFormDataRef.current.confirmPassword
                  }
                  onChange={handleGooglePasswordChange}
                  className="w-full p-2 border rounded"
                  required
                  minLength={8}
                  tabIndex={2}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordSetup(false);
                    setGooglePasswordError(null);
                    navigate("/");
                  }}
                  className="px-4 py-2 themed-bg rounded"
                  tabIndex={4}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded border cursor-pointer"
                  tabIndex={3}
                >
                  Set Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="min-h-screen themed-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="themed-card py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {errors.some(e => e.field === "general") && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {errors.find(e => e.field === "general")?.message}
                </p>
              </div>
            )}

            <form
              className="space-y-6"
              onSubmit={(e: Event) => {
                e.preventDefault();
                handleSubmit(e);
              }}
            >
              {formFields.map(field => (
                <div key={field.name}>
                  {field.name !== "rememberMe" && (
                    <label
                      htmlFor={field.name}
                      className="block text-sm font-medium text-gray-700"
                    >
                      {field.label}
                    </label>
                  )}
                  <div className="mt-1">
                    {field.name === "rememberMe" ? (
                      <div className="flex items-center">
                        <input
                          id={field.name}
                          name={field.name}
                          type={field.type}
                          checked={formDataRef.current.rememberMe}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={field.name}
                          className="ml-2 block text-sm"
                        >
                          {field.label}
                        </label>
                      </div>
                    ) : (
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        autoComplete={field.autoComplete}
                        required={field.required}
                        defaultValue={formDataRef.current[field.name] as string}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    )}
                  </div>
                  {errors.some(e => e.field === field.name) && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.find(e => e.field === field.name)?.message}
                    </p>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>
            <div className="divider my-4 text-center themed-text-secondary">
              - or -
            </div>
            <div id={GOOGLE_BUTTON_CONTAINER_ID}></div>
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 themed-bg themed-text-secondary">
                    Don't have an account?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium themed-text-primary themed-bg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
