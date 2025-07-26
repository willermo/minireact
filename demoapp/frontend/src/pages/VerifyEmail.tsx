import {
  createElement,
  useEffect,
  useState,
  useSearchParams,
  useNavigate,
} from "@minireact";

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Verification failed");
        }

        setStatus("success");
        setMessage("Email verified successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to verify email. The link may have expired or is invalid."
        );
        console.error("Verification error:", error);
      }
    };

    verifyEmail();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center themed-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 themed-card rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold">
            {status === "verifying"
              ? "Verifying Email"
              : status === "success"
              ? "Success!"
              : "Verification Failed"}
          </h2>
          <p className="mt-2 text-sm themed-text-secondary">{message}</p>
          {status === "error" && (
            <button
              onClick={() => navigate("/login")}
              className="mt-4 text-sm text-white hover:text-white border border-indigo-600 rounded px-4 py-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700"
            >
              Go to login and ask for a new verification email from your profile
              page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
