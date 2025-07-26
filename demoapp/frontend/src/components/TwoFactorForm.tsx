import { createElement, useState, useEffect, useRef } from "@minireact";

type TwoFactorFormProps = {
  email: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
};

export default function TwoFactorForm({
  email,
  onSuccess,
  onCancel,
}: TwoFactorFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeVerificationRef = useRef<string | null>(null);

  const handleChange = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    codeVerificationRef.current = target.value;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!codeVerificationRef.current) {
      setError("Verification code is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: codeVerificationRef.current, email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Verification failed");
      }
      const data = result.data;

      onSuccess(data.user);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during verification"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer1 = setTimeout(() => {
      if (!codeVerificationRef.current) {
        const codeInput = document.getElementById("code");
        if (codeInput) {
          codeInput.focus();
          const timer2 = setTimeout(() => codeInput.focus(), 10);
          return () => clearTimeout(timer2);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer1);
    };
  }, [handleSubmit]);

  return (
    <div className="rounded-md shadow-sm -space-y-px">
      <div className="themed-card p-8 rounded shadow-md w-96 mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Two-Factor Authentication
        </h2>
        <p className="mb-4 themed-text-secondary text-sm">
          Enter the verification code from your authenticator app
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700"
            >
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              defaultValue={codeVerificationRef.current}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter 6-digit code"
              maxLength={6}
              minLength={6}
            />
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="text-blue-600 hover:text-blue-500"
            >
              Back to Login
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
