import { useState, useEffect, useRef, useCallback } from "@minireact";
import type { PublicUser } from "../../types/user";
import { apiFetch } from "../api";

/**
 * Batches state updates to prevent multiple re-renders
 * @param callback - The function to execute in the next animation frame or microtask
 */
const batchUpdates = (callback: () => void) => {
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
};

/**
 * A function that gets called when the store state changes
 */
type Listener = () => void;

/**
 * Function to unsubscribe from store updates
 */
type Unsubscribe = () => void;

/**
 * Represents the shape of the application state
 */
interface IAppState {
  users: PublicUser[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * The initial state of the application
 */
const initialState: IAppState = {
  users: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

/**
 * A generic store class that manages application state with batched updates
 * @template T - The shape of the state object
 */
class Store<T> {
  private state: T;
  private listeners: Set<Listener> = new Set();
  private isNotifying = false;
  private pendingUpdates: Array<() => void> = [];

  constructor(initialState: T) {
    this.state = initialState;
  }

  /**
   * Gets the current state
   * @returns The current state
   */
  public getState(): T {
    return this.state;
  }

  /**
   * Updates the state with the result of the updater function
   * @param updater - A function that receives the previous state and returns the new state
   */
  public setState(updater: (prevState: T) => T): void {
    // Queue the update
    this.pendingUpdates.push(() => {
      const nextState = updater(this.state);
      if (this.state !== nextState) {
        this.state = nextState;
        this.notifyListeners();
      }
    });

    // Process updates in a batch
    if (!this.isNotifying) {
      batchUpdates(() => {
        this.isNotifying = true;
        try {
          while (this.pendingUpdates.length > 0) {
            const update = this.pendingUpdates.shift();
            update?.();
          }
        } finally {
          this.isNotifying = false;
        }
      });
    }
  }

  /**
   * Notifies all subscribed listeners about state changes
   */
  private notifyListeners(): void {
    // Make a copy of listeners to avoid issues if they're modified during iteration
    const listeners = Array.from(this.listeners);
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        console.error("Error in store listener:", error);
      }
    }
  }

  /**
   * Subscribes a listener function to state changes
   * @param listener - The function to call when state changes
   * @returns An unsubscribe function to remove the listener
   */
  public subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * The singleton store instance that holds the application state
 */
const storeInstance = new Store<IAppState>(initialState);

/**
 * Memoizes a selector function to prevent unnecessary recalculations
 * @template R - The return type of the selector
 * @param selector - The selector function to memoize
 * @returns A memoized version of the selector
 */
function memoizeSelector<R>(
  selector: (state: IAppState) => R
): (state: IAppState) => R {
  let lastArgs: any = null;
  let lastResult: R;

  return (state: IAppState) => {
    const args = JSON.stringify(state);
    if (lastArgs === args) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = selector(state);
    return lastResult;
  };
}

/**
 * A custom hook to select and subscribe to a portion of the store state
 * @template R - The type of the selected state
 * @param selector - A function that extracts the desired part of the state
 * @returns The selected state
 */
function useStoreSelector<R>(selector: (state: IAppState) => R): R {
  const [, forceRender] = useState({});
  const selectedStateRef = useRef<R | undefined>(undefined);
  const errorRef = useRef<Error | null>(null);
  const memoizedSelector = useCallback(memoizeSelector(selector), [selector]);

  // Get the current state
  const currentState = storeInstance.getState();

  // Compute the selected state
  try {
    const newSelectedState = memoizedSelector(currentState);

    // Only update if the value has actually changed
    if (
      selectedStateRef.current === undefined ||
      !isEqual(selectedStateRef.current, newSelectedState)
    ) {
      selectedStateRef.current = newSelectedState;
    }
  } catch (err) {
    if (errorRef.current === null || !isEqual(errorRef.current, err)) {
      errorRef.current = err as Error;
    }
    throw errorRef.current;
  }

  // Set up subscription
  useEffect(() => {
    let isMounted = true;

    const checkForUpdates = () => {
      if (!isMounted) return;

      try {
        const newSelectedState = memoizedSelector(storeInstance.getState());

        // Only update if the value has actually changed
        if (!isEqual(selectedStateRef.current, newSelectedState)) {
          selectedStateRef.current = newSelectedState;
          forceRender({}); // Force re-render with the new state
        }
      } catch (err) {
        console.error("Error in store subscription:", err);
      }
    };

    // Subscribe to store changes
    const unsubscribe = storeInstance.subscribe(checkForUpdates);

    // Cleanup function
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [memoizedSelector]);

  return selectedStateRef.current as R;
}

/**
 * Performs a deep equality check between two values
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if the values are deeply equal, false otherwise
 */
function isEqual(a: any, b: any): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    return a === b;
  }
}

/**
 * Object containing action creators for the store
 */
const storeActions = {
  /**
   * Fetches all users from the API and updates the store
   * @throws {Error} If the fetch request fails
   */
  async fetchUsers() {
    try {
      storeInstance.setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const response = await apiFetch("/api/users/getUsers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const result = await response.json();
      const { users } = result.data;
      storeInstance.setState(prev => ({
        ...prev,
        users,
        loading: false,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (error) {
      storeInstance.setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "An error occurred",
        loading: false,
      }));
    }
  },

  /**
   * Deletes a user by ID
   * @param userId - The ID of the user to delete
   * @throws {Error} If the delete request fails
   */
  async deleteUser(userId: number) {
    try {
      storeInstance.setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const response = await apiFetch(`/api/users/deleteUserById/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      // Remove the user from the state
      storeInstance.setState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.id !== userId),
        loading: false,
      }));
    } catch (error) {
      storeInstance.setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "An error occurred",
        loading: false,
      }));
      throw error;
    }
  },

  /**
   * Promotes a user to admin
   * @param userId - The ID of the user to promote
   * @throws {Error} If the promotion request fails
   */
  async promoteUser(userId: number) {
    try {
      storeInstance.setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const response = await apiFetch(`/api/users/${userId}/promote`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to promote user");
      }

      // Update the user in the state
      storeInstance.setState(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId ? { ...user, role: "admin" } : user
        ),
        loading: false,
      }));
    } catch (error) {
      storeInstance.setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "An error occurred",
        loading: false,
      }));
      throw error;
    }
  },

  /**
   * Demotes a user to user
   * @param userId - The ID of the user to demote
   * @throws {Error} If the demotion request fails
   */
  async demoteUser(userId: number) {
    try {
      storeInstance.setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const response = await apiFetch(`/api/users/${userId}/demote`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to demote user");
      }

      // Update the user in the state
      storeInstance.setState(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId ? { ...user, role: "user" } : user
        ),
        loading: false,
      }));
    } catch (error) {
      storeInstance.setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "An error occurred",
        loading: false,
      }));
      throw error;
    }
  },
};

export const userActions = {
  fetchUsers: storeActions.fetchUsers,
  deleteUser: storeActions.deleteUser,
  promoteUser: storeActions.promoteUser,
  demoteUser: storeActions.demoteUser,
};

// Create and export the public store interface
export const store = {
  getState: () => storeInstance.getState(),
  setState: (updater: (state: IAppState) => IAppState) =>
    storeInstance.setState(updater),
  subscribe: (listener: () => void) => storeInstance.subscribe(listener),
};

// Export the useSelector hook
export const useSelector = useStoreSelector;

// Export types
export type AppState = IAppState;

// Re-export UserDTO from shared types
export type { UserDTO } from "../../types/user";
