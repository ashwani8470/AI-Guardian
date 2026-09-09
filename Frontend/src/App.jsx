import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AppLayout from "./pages/AppLayout";
import Overview from "./pages/Overview";
import History from "./pages/History";
import ScanText from "./pages/scans/ScanText";
import ScanUrl from "./pages/scans/ScanUrl";
import ScanEmail from "./pages/scans/ScanEmail";
import ScanQr from "./pages/scans/ScanQr";
import ScanScreenshot from "./pages/scans/ScanScreenshot";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Overview />} />
            <Route path="history" element={<History />} />
            <Route path="scan/text" element={<ScanText />} />
            <Route path="scan/url" element={<ScanUrl />} />
            <Route path="scan/email" element={<ScanEmail />} />
            <Route path="scan/qr" element={<ScanQr />} />
            <Route path="scan/screenshot" element={<ScanScreenshot />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
