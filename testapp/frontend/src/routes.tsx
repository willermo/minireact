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
import Test1 from "@pages/Test1.tsx";
import Test2 from "@pages/Test2.tsx";
import Test3 from "@pages/Test3.tsx";
import ProtectedTests from "@pages/ProtectedTests.tsx";

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
  "/tests/1": Test1,
  "/tests/2": Test2,
  "/tests/3": Test3,
  "/protected-tests": ProtectedTests,
  "404": NotFound,
  "*": NotFound,
};
