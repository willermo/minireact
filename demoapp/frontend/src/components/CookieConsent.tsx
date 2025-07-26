import { createElement, useState, useEffect, Link } from "@minireact";

interface CookieConsentProps {
  onConsentChange?: (hasConsent: boolean) => void;
}

export default function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("consent");
    if (consent === null || consent === "false") {
      setShowBanner(true);
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("consent", "true");
    localStorage.setItem("consent-date", new Date().toISOString());
    setIsVisible(false);
    setTimeout(() => {
      setShowBanner(false);
      onConsentChange?.(true);
    }, 300);
  };

  if (!showBanner) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Cookie Notice
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                This website uses only essential cookies required for
                authentication, security (CSRF protection), and session
                management. We also store your theme preference locally.
                <br />
                <strong>
                  We do not use any marketing, tracking, or analytics cookies.
                </strong>{" "}
                By continuing to use our service, you consent to our use of
                these essential cookies.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Link
                  to="/privacy-policy"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Privacy Policy
                </Link>
                <span className="text-gray-400">•</span>
                <Link
                  to="/cookie-policy"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Cookie Policy
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
              <button
                onClick={handleAccept}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
