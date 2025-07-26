import { createContext } from "@minireact";
import type { PublicUser } from "../types/user";

export interface UserContextType {
  user: PublicUser | null;
  setUser: (user: PublicUser | null) => void;
  requirePasswordSetup: boolean;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  requirePasswordSetup: false,
});
