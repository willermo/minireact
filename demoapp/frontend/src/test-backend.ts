// Simple script to test backend connectivity
export async function testBackend() {
  // Auth route test
  const authDiv = document.getElementById("authRoute-status");
  try {
    // If running in production, ensure the frontend is served over HTTPS and backend endpoints use HTTPS and WSS as required by project rules.
    const resp = await fetch("/api/auth/status");
    if (!resp.ok) throw new Error("HTTP error " + resp.status);
    const data = await resp.json();
    authDiv!.textContent = `Backend says: ${data.status}`;
  } catch (e) {
    authDiv!.textContent = "Backend unreachable or error: " + e;
  }

  // Users route test
  const usersDiv = document.getElementById("usersRoute-status");
  try {
    const resp = await fetch("/api/users/");
    if (!resp.ok) throw new Error("HTTP error " + resp.status);
    const data = await resp.json();
    usersDiv!.textContent = `Backend says: ${data.status}`;
  } catch (e) {
    usersDiv!.textContent = "Backend unreachable or error: " + e;
  }

  // Games route test
  const gamesDiv = document.getElementById("gamesRoute-status");
  try {
    const resp = await fetch("/api/games/");
    if (!resp.ok) throw new Error("HTTP error " + resp.status);
    const data = await resp.json();
    gamesDiv!.textContent = `Backend says: ${data.status}`;
  } catch (e) {
    gamesDiv!.textContent = "Backend unreachable or error: " + e;
  }

  // Tournaments route test
  const tournamentsDiv = document.getElementById("tournamentsRoute-status");
  try {
    const resp = await fetch("/api/tournaments/");
    if (!resp.ok) throw new Error("HTTP error " + resp.status);
    const data = await resp.json();
    tournamentsDiv!.textContent = `Backend says: ${data.status}`;
  } catch (e) {
    tournamentsDiv!.textContent = "Backend unreachable or error: " + e;
  }

  // Chat route test
  const chatDiv = document.getElementById("chatRoute-status");
  try {
    const resp = await fetch("/api/chat/");
    if (!resp.ok) throw new Error("HTTP error " + resp.status);
    const data = await resp.json();
    chatDiv!.textContent = `Backend says: ${data.status}`;
  } catch (e) {
    chatDiv!.textContent = "Backend unreachable or error: " + e;
  }
}

testBackend();
