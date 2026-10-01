import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PrefsProvider } from "./context/PrefsContext";
import RequireAuth from "./components/RequireAuth";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AppLayout from "./pages/AppLayout";
import Overview from "./pages/Overview";
import Account from "./pages/Account";
import History from "./pages/History";
import ScanText from "./pages/scans/ScanText";
import ScanUrl from "./pages/scans/ScanUrl";
import ScanEmail from "./pages/scans/ScanEmail";
import ScanQr from "./pages/scans/ScanQr";
import ScanScreenshot from "./pages/scans/ScanScreenshot";
import ScanBulk from "./pages/scans/ScanBulk";

export default function App() {
  return (
    <PrefsProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Overview />} />
            <Route path="account" element={<Account />} />
            <Route path="history" element={<History />} />
            <Route path="scan/text" element={<ScanText />} />
            <Route path="scan/url" element={<ScanUrl />} />
            <Route path="scan/email" element={<ScanEmail />} />
            <Route path="scan/qr" element={<ScanQr />} />
            <Route path="scan/screenshot" element={<ScanScreenshot />} />
            <Route path="scan/bulk" element={<ScanBulk />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </PrefsProvider>
  );
}
