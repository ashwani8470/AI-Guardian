import { createContext, useContext, useState } from "react";
import { api, setToken, clearToken, hasToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(hasToken());
  const [error, setError] = useState("");

  async function login(email, password) {
    setError("");
    try {
      // NOTE: adjust this payload shape to match your actual /auth/login
      // contract (JSON body vs OAuth2 form-data with username/password).
      const data = await api.login({ email, password });
      setToken(data.access_token || data.token);
      setIsAuthed(true);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function signup(email, password) {
    setError("");
    try {
      await api.signup({ email, password });
      return await login(email, password);
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  function logout() {
    clearToken();
    setIsAuthed(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthed, error, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
