import type { VNode } from "@minireact";

// Import pages
import Home from "@pages/Home.tsx";
import Tests from "@pages/Tests.tsx";
import AdminSettings from "@pages/AdminSettings";
import Register from "@pages/Register.tsx";
import Login from "@pages/Login.tsx";
import ResetPassword from "@pages/ResetPassword";
import ForgotPassword from "@pages/ForgotPassword";
import Userdata from "@pages/Userdata";
import Profile from "@pages/Profile";
import ProfileSetup2FA from "@pages/ProfileSetup2FA.tsx";
import NotFound from "@pages/404";
import VerifyEmail from "@pages/VerifyEmail";
import PrivacyPolicy from "@pages/PrivacyPolicy.tsx";
import CookiePolicy from "@pages/CookiePolicy.tsx";

// Add new pages below
// import Users from "./pages/Users.tsx";

// Type for route components
type RouteComponent = () => VNode | null;

// Define routes with type safety
export const routes: Record<string, RouteComponent> = {
  "/": Home,
  "/tests": Tests,
  "/admin-settings": AdminSettings,
  "/register": Register,
  "/login": Login,
  "/reset-password": ResetPassword,
  "/forgot-password": ForgotPassword,
  "/users": Userdata,
  "/profile": Profile,
  "/profile/2fa": ProfileSetup2FA,
  "/verify-email": VerifyEmail,
  "/privacy-policy": PrivacyPolicy,
  "/cookie-policy": CookiePolicy,
  "404": NotFound,
  "*": NotFound,
};
