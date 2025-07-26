import {
  createElement,
  useState,
  useEffect,
  useRef,
  Link,
  useNavigate,
} from "@minireact";

type FormData = {
  email: string;
};

type ValidationError = {
  field: keyof FormData | "general";
  message: string;
};

export default function ForgotPassword() {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const emailRef = useRef<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRef.current) {
      newErrors.push({ field: "email", message: "Email is required" });
    } else if (!emailRegex.test(emailRef.current)) {
      newErrors.push({
        field: "email",
        message: "Please enter a valid email address",
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const navigate = useNavigate();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailRef.current?.trim(),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to send reset email");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 5000);
    } catch (error) {
      setErrors([
        {
          field: "general",
          message:
            error instanceof Error
              ? error.message
              : "An error occurred while processing your request",
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    emailRef.current = target.value;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer1 = setTimeout(() => {
      if (!emailRef.current) {
        const emailInput = document.getElementById("email");
        if (emailInput) {
          emailInput.focus();
          const timer2 = setTimeout(() => emailInput.focus(), 10);
          return () => clearTimeout(timer2);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer1);
    };
  }, [handleSubmit]);

  if (submitSuccess) {
    return (
      <div className="min-h-screen themed-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-2xl font-bold text-green-800 text-center mb-4">
            Check Your Email
          </h2>
          <p className="text-green-700 text-center">
            If an account with that email exists, we've sent a password reset
            link to your email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen themed-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="themed-bg py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {submitSuccess && (
            <div className="mb-4 p-4 bg-green-50 rounded-md">
              <p className="text-sm text-green-700">
                If an account exists with that email, you will receive a
                password reset link shortly.
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
          {!submitSuccess && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required={true}
                    defaultValue={emailRef.current}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      errors.some(e => e.field === "email")
                        ? "border-red-300"
                        : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                </div>
                {errors.some(e => e.field === "email") && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.find(e => e.field === "email")?.message}
                  </p>
                )}
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? "Sending..." : "Send reset link"}
                </button>
              </div>
            </form>
          )}
          <div className="mt-6 text-center">
            <div className="w-full border-t border-gray-300 my-4" />
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
              children="Back to login"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
