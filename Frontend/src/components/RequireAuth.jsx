import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// The app area is open to logged-in users AND to sample-mode visitors
// (who are limited to a few preset example scans - see AccountOnly for the
// pages that need a real account).
export default function RequireAuth({ children }) {
  const { isAuthed, isGuest, sessionExpired } = useAuth();
  if (isAuthed || isGuest) return children;
  if (sessionExpired) return <Navigate to="/login" replace state={{ expired: true }} />;
  return <Navigate to="/" replace />;
}
