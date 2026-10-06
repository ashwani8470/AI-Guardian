import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  api,
  setToken,
  clearToken,
  hasToken,
  setStoredUser,
  getStoredUser,
  clearStoredUser,
  SESSION_EXPIRED_EVENT,
} from "../api/client";

const AuthContext = createContext(null);

const DEFAULT_GUEST_LIMIT = 3;

function readFlag(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function readInt(key, fallback) {
  try {
    const n = parseInt(localStorage.getItem(key), 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the value just won't persist */
  }
}

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(hasToken());
  const [user, setUser] = useState(getStoredUser());
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  // ---- Sample (guest) mode: use the app without an account, a few times ----
  const [isGuest, setIsGuest] = useState(() => !hasToken() && readFlag("ag_guest"));
  const [guestUsed, setGuestUsed] = useState(() => readInt("ag_guest_used", 0));
  const [guestLimit, setGuestLimit] = useState(() => readInt("ag_guest_limit", DEFAULT_GUEST_LIMIT));
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const guestLocked = isGuest && guestUsed >= guestLimit;

  const setGuestUsage = useCallback((used, limit) => {
    setGuestUsed(used);
    setGuestLimit(limit);
    writeStore("ag_guest_used", String(used));
    writeStore("ag_guest_limit", String(limit));
  }, []);

  const startGuest = useCallback(() => {
    writeStore("ag_guest", "1");
    setIsGuest(true);
  }, []);

  const endGuest = useCallback(() => {
    writeStore("ag_guest", "0");
    setIsGuest(false);
    setLimitModalOpen(false);
  }, []);

  // The server is the source of truth for the count (so it can't be reset by
  // clearing localStorage), so sync with it whenever guest mode is entered.
  useEffect(() => {
    if (!isGuest) return undefined;
    let cancelled = false;
    api
      .demoStatus()
      .then((s) => {
        if (!cancelled) setGuestUsage(s.tries_used, s.tries_limit);
      })
      .catch(() => {
        /* offline/backend down: keep the locally cached count */
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest, setGuestUsage]);

  // One free scan: only the preset examples can be scanned, and only until the limit.
  const guestScan = useCallback(
    async (modality, exampleId) => {
      if (guestUsed >= guestLimit) {
        setLimitModalOpen(true);
        throw new Error("You've used all your free sample scans. Please log in or create an account.");
      }
      try {
        const data = await api.demoScan(modality, exampleId);
        setGuestUsage(data.tries_used, data.tries_limit);
        return data;
      } catch (e) {
        if (e.status === 403) {
          setGuestUsage(guestLimit, guestLimit);
          setLimitModalOpen(true);
        }
        throw e;
      }
    },
    [guestUsed, guestLimit, setGuestUsage]
  );

  const logout = useCallback(() => {
    clearToken();
    clearStoredUser();
    setUser(null);
    setIsAuthed(false);
  }, []);

  // client.js fires this when the server says the login token is no longer valid.
  useEffect(() => {
    function onExpired() {
      setSessionExpired(true);
      logout();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

  async function login(email, password, name) {
    setError("");
    try {
      // NOTE: adjust this payload shape to match your actual /auth/login
      // contract (JSON body vs OAuth2 form-data with username/password).
      const data = await api.login({ email, password });
      setToken(data.access_token || data.token);
      // Prefer whatever the backend returns for the user profile; fall back
      // to what was just typed into the form (name is only known on signup).
      const profile = data.user || { name: name || user?.name || "", email };
      setStoredUser(profile);
      setUser(profile);
      setIsAuthed(true);
      setSessionExpired(false);
      endGuest(); // a real account replaces sample mode
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function signup(name, email, password) {
    setError("");
    try {
      await api.signup({ name, email, password });
      return await login(email, password, name);
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  function updateUser(profile) {
    setStoredUser(profile);
    setUser(profile);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthed,
        user,
        error,
        sessionExpired,
        login,
        signup,
        logout,
        updateUser,
        isGuest,
        guestUsed,
        guestLimit,
        guestLocked,
        limitModalOpen,
        openLimitModal: () => setLimitModalOpen(true),
        startGuest,
        endGuest,
        guestScan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
