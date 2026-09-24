import { createContext, useContext, useState } from "react";
import {
  api,
  setToken,
  clearToken,
  hasToken,
  setStoredUser,
  getStoredUser,
  clearStoredUser,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(hasToken());
  const [user, setUser] = useState(getStoredUser());
  const [error, setError] = useState("");

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

  function logout() {
    clearToken();
    clearStoredUser();
    setUser(null);
    setIsAuthed(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthed, user, error, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
