import {
  createElement,
  useState,
  useEffect,
  useContext,
  useNavigate,
} from "@minireact";
import { apiFetch, getCsrfToken } from "../lib/api";
import TwoFASetupForm from "@components/TwoFASetupForm";
import { UserContext } from "../contexts/UserContext";

export default function ProfileSetup2FA() {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [twoFAData, setTwoFAData] = useState<{
    qrCode: string;
    secret: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!getCsrfToken()) {
        navigate("/");
        return;
      }
      setLoading(true);
      try {
        const response = await apiFetch("/api/users/me");

        if (response.status === 401) {
          navigate("/");
          return;
        }
        const result = await response.json();

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const { data } = result;
        setUser(data.user);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const response = await apiFetch("/api/auth/setup-2fa", {
          method: "POST",
        });
        if (!response.ok) throw new Error("Failed to setup 2FA");
        const result = await response.json();
        const data = result.data;
        setTwoFAData({ qrCode: data.qrCode, secret: data.secret });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div>Loading user...</div>;
  if (!user) return <div />;
  if (error) return <div>Error: {error}</div>;
  if (!twoFAData) return <div>Loading 2FA setup...</div>;

  return (
    <TwoFASetupForm
      qrCode={twoFAData.qrCode}
      secret={twoFAData.secret}
      email={user.email}
      onSuccess={() => {
        setUser({ ...user, twoFactorEnabled: true });
        navigate("/profile");
      }}
      onCancel={() => navigate("/profile")}
    />
  );
}
