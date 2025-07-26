# Authentication & CSRF Protection Guide

## Overview of Login/Authentication Flow

1. **User submits** credentials via `/api/auth/login` (no CSRF check because user isn’t yet authenticated).
2. **Backend**:
   - Verifies email/password.
   - Generates a JWT (`authToken`).
   - Sets two cookies:
     - **HttpOnly** `authToken` (cannot be read by JS, sent automatically on every request).
     - **Readable** `csrfToken` (random hex string, sent to JS so it can echo it back).
   - Sends JSON `{ success, message, user }` (no token field).
3. **Browser**:
   - Stores cookies for the API domain.
   - Redirects to `/` or next page.
4. **Subsequent API calls**:
   - Use `src/lib/api.ts` → `apiFetch()` wraps `fetch` with `credentials: 'include'` and `X-CSRF-Token` header.
   - Server hook (`preHandler`) compares `csrfToken` cookie vs `x-csrf-token` header on all state-changing verbs (POST/PUT/PATCH/DELETE) except `/api/auth`.

---

## Cookie Implementation Details

### Backend (Fastify)

```ts
// in app.ts
fastify.register(require("@fastify/cookie"));

// in auth controller after jwtSign:
reply.setCookie("authToken", token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
  maxAge: rememberMe ? 604800 : 86400,
});
// generate csrf token:
const csrfToken = crypto.randomBytes(16).toString("hex");
reply.setCookie("csrfToken", csrfToken, {
  httpOnly: false,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
  maxAge: same as authToken,
});
```

### Frontend (minireact)

- **Login.tsx**: use `fetch('/api/auth/login', { credentials: 'include', ... })`.
- **src/lib/api.ts**:

```ts
export function getCsrfToken(): string | null {
  /* reads `csrfToken` cookie */
}
export async function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers);
  const csrf = getCsrfToken();
  if (csrf) headers.set("x-csrf-token", csrf);
  return fetch(input, { ...init, credentials: "include", headers });
}
```

---

## Use Cases

- **`authToken` cookie**: proves the user’s identity (JWT). Always sent by browser—no JS access.
- **`csrfToken` cookie**: protects against CSRF by forcing JS to read this token and send it in a custom header.

---

## Using `src/lib/api.ts`

1. **Import**:
   ```ts
   import { apiFetch } from "../lib/api";
   ```
2. **Call**:
   ```ts
   apiFetch("/api/users/me")
     .then(res => res.json())
     .then(data => setUser(data.user))
     .catch(console.error);
   ```
3. **apiFetch** ensures:
   - Cookie credentials included
   - CSRF header set

---

## Component State vs. Global Store

### 1. Local State (`useState`) + `setUser`

- **Pros**: very simple; no extra infra. State is scoped to component/page.
- **Cons**: if you navigate away or refresh, state resets—must re-fetch or lift to root.
- **Minireact**: `useState` works normally, but Router’s navigation resets hooks on route change (unless at root level).

### 2. Global Store (`src/lib/store/index.ts`)

- **Pros**: single source of truth; persists across pages without prop drilling or context.
- **Cons**: more boilerplate; every store update notifies all subscribers, triggering full re-renders (no diffing).
- **Minireact**: your custom store will force each subscribed component to re-render; lacking virtual DOM diff, this may be less efficient.

**Recommendation**: For simplicity and performance, prefer a **top-level Context** over the generic global store. Wrap your `<Router>` in a `UserContext.Provider` using `useState` at the root:

```tsx
// contexts/UserContext.ts
import { createContext } from "@minireact";
export const UserContext = createContext<{ user: any; setUser: any }>({
  user: null,
  setUser: () => {},
});
```

```tsx
// App.tsx
import { createElement, useState, useEffect, useContext } from "@minireact";
import { Router } from "./lib/minireact";
import { apiFetch } from "./lib/api";
import { UserContext } from "./contexts/UserContext";

export default function App() {
  const [user, setUser] = useState(null);
  // Rehydrate on mount
  useEffect(() => {
    apiFetch("/api/users/me")
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Router>{/* ...your routes/components... */}</Router>
    </UserContext.Provider>
  );
}
```

---

## Rehydration on Page Reload

After a full page refresh, component state is lost. To **rehydrate**:

1. In your root (e.g. `App.tsx`), call `apiFetch('/api/users/me')` in a `useEffect`.
2. On success, store the returned `user` via `setUser` (context or local state).
3. Now downstream components read from `UserContext` (or state) and know who’s logged in.

```ts
useEffect(() => {
  apiFetch("/api/users/me")
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(data => setUser(data.user))
    .catch(() => setUser(null));
}, []);
```

This ensures your app works seamlessly across page loads without manual refreshes of user data.
