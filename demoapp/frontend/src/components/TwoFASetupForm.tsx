import { createElement, useState, useEffect, useRef } from "@minireact";

interface TwoFASetupFormProps {
  qrCode: string;
  secret: string;
  email: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

export default function TwoFASetupForm({
  qrCode,
  secret,
  email,
  onSuccess,
  onCancel,
}: TwoFASetupFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeVerificationRef = useRef<string | null>(null);

  const handleChange = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    codeVerificationRef.current = target.value;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!codeVerificationRef.current) {
      setError("Verification code is required");
      return;
    }
    const trimmedCode = codeVerificationRef.current.trim();
    if (!trimmedCode) {
      setError("Verification code is required");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/enable-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: trimmedCode,
          email: email.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Verification failed");
      }
      const data = {
        success: response.ok,
        message: response.ok
          ? "Two-factor authentication enabled successfully"
          : "Verification failed",
      };
      onSuccess(data);
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
      <div className="themed-card p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Set Up Two-Factor Authentication
        </h2>

        <div className="mb-6 text-center">
          <p className="mb-4 themed-text-secondary text-sm">
            Scan the QR code with your authenticator app
          </p>
          <div className="flex justify-center mb-4">
            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
          </div>
          <p className="text-xs themed-text-secondary mb-2">
            Or enter this secret manually:
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-center font-mono text-sm mb-4">
            {secret}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Enter the 6-digit code from your app
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
              placeholder="123456"
              maxLength={6}
              minLength={6}
            />
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              Cancel Registration
            </button>
            <button
              type="submit"
              className={`w-full ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Verify and Enable 2FA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
