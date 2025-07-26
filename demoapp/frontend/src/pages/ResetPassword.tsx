import {
  createElement,
  useState,
  useEffect,
  useRef,
  useNavigate,
  useSearchParams,
  Link,
} from "@minireact";

type FormData = {
  password: string;
  confirmPassword: string;
  token: string;
};

type ValidationError = {
  field: keyof FormData | "general";
  message: string;
};

type InputEvent = Event & {
  target: HTMLInputElement;
};

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const formDataRef = useRef({
    password: "",
    confirmPassword: "",
  });

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:'",.<>/?`~]{8,}$/;

    if (!formDataRef.current.password) {
      newErrors.push({ field: "password", message: "Password is required" });
    } else if (!passwordRegex.test(formDataRef.current.password)) {
      newErrors.push({
        field: "general",
        message:
          "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    } else if (
      formDataRef.current.password !== formDataRef.current.confirmPassword
    ) {
      newErrors.push({
        field: "general",
        message: "Passwords do not match",
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: formDataRef.current.password,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to reset password");
      }

      setResetSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      setErrors([
        {
          field: "general",
          message:
            error instanceof Error
              ? error.message
              : "An error occurred while resetting your password",
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    formDataRef.current = {
      ...formDataRef.current,
      [name]: value,
    };
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
      passwordInput.focus();
    }
  }, [handleSubmit]);

  if (resetSuccess) {
    return (
      <div className="max-w-md mx-auto p-6 bg-green-50 rounded-lg">
        <h2 className="text-2xl font-bold text-green-800 mb-4">
          Password Reset Successful!
        </h2>
        <p className="text-green-700">
          Your password has been updated successfully. Redirecting to login...
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-6 bg-red-50 rounded-lg">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Invalid Request
        </h2>
        <p className="text-red-700">
          Password reset link is invalid or has expired.
        </p>
        <div className="mt-4">
          <Link
            to="/forgot-password"
            className="text-blue-600 hover:text-blue-500"
          >
            Request a new password reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen themed-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="themed-bg py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {resetSuccess && (
            <div className="mb-4 p-4 bg-green-50 rounded-md">
              <p className="text-sm text-green-700">
                Your password has been reset successfully. You can now{" "}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                  children="sign in"
                />
              </p>
            </div>
          )}

          {errors.some(e => e.field === "general") && (
            <div className="mb-4 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-700">
                {errors.find(e => e.field === "general")?.message}
              </p>
            </div>
          )}

          {!resetSuccess &&
            !errors.some(e => e.message === "Invalid or expired token") && (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required={true}
                      defaultValue={formDataRef.current.password}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.some(e => e.field === "password")
                          ? "border-red-300"
                          : "border-gray-300"
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                  </div>
                  {errors.some(e => e.field === "password") && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.find(e => e.field === "password")?.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required={true}
                      defaultValue={formDataRef.current.confirmPassword}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.some(e => e.field === "confirmPassword")
                          ? "border-red-300"
                          : "border-gray-300"
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                  </div>
                  {errors.some(e => e.field === "confirmPassword") && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.find(e => e.field === "confirmPassword")?.message}
                    </p>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !token}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            )}

          {!resetSuccess && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <Link
                    to="/login"
                    className="font-medium text-blue-600 hover:text-blue-500 mt-8"
                  >
                    Back to login
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
