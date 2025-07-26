// Type declarations for the store module
declare module "@/lib/store" {
  // Define the UserDTO interface inline to avoid module resolution issues
  interface UserDTO {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    updated_at: string;
  }

  // Define the AppState interface
  interface AppState {
    users: UserDTO[];
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
  }

  // Export the store instance
  export const store: {
    getState(): AppState;
    setState(updater: (prevState: AppState) => AppState): void;
    subscribe(listener: () => void): () => void;
  };
  
  // Export user actions
  export const userActions: {
    fetchUsers(): Promise<void>;
    deleteUser(userId: number): Promise<void>;
  };
  
  // Export the useSelector hook
  export function useSelector<T>(
    selector: (state: AppState) => T,
    equalityFn?: (a: T, b: T) => boolean
  ): T;

  // Export types
  export type { AppState, UserDTO };
}
