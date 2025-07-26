import type { UserDTO } from "./user";

export interface UserData extends UserDTO {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export interface AppState {
  users: UserData[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}
