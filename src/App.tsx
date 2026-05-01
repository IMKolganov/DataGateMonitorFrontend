// comments in English only
import type { ReactNode } from "react";
import React, { lazy, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Header } from "./components/ui/Header.tsx";
import Footer from "./components/ui/Footer.tsx";
import "react-toastify/dist/ReactToastify.css";
import "./css/ToastifyDark.css";
import "./App.css";

import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./utils/const.ts";
import { getCurrentUser, isAdmin } from "./utils/auth/authSelectors.ts";
import { withSuspense } from "./utils/withSuspense.tsx";

// Lazy pages
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const ServersWithDetails = lazy(() => import("./pages/ServersWithDetails"));
const ServerForm = lazy(() => import("./pages/ServerForm"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ServerDetails = lazy(() => import("./pages/ServerDetails"));
const Settings = lazy(() => import("./pages/Settings"));
const ApplicationSettings = lazy(() => import("./pages/ApplicationSettings"));
const GeneralTab = lazy(() => import("./pages/GeneralServerDetails"));
const CertificatesTab = lazy(() => import("./pages/Certificates"));
const WebConsole = lazy(() => import("./pages/WebConsole"));
const Events = lazy(() => import("./pages/Events"));
const GeneralSettings = lazy(() => import("./pages/GeneralSettings"));
const GeoLiteDbSettings = lazy(() => import("./pages/GeoLiteDbSettings"));
const NotificationVpnProfileSettings = lazy(() => import("./pages/NotificationVpnProfileSettings"));
const AndroidCrashReportsSettings = lazy(() => import("./pages/AndroidCrashReportsSettings"));
const WindowsCrashReportsSettings = lazy(() => import("./pages/WindowsCrashReportsSettings"));
const TelegramBotSettings = lazy(() => import("./pages/TelegramBotSettings"));
const UsersSettings = lazy(() => import("./pages/UsersSettings/UsersSettings"));
const UserQuotasPage = lazy(() => import("./pages/UsersSettings/UserQuotasPage"));
const UserDetailPage = lazy(() => import("./pages/UsersSettings/UserDetailPage"));
const EmailBroadcastSettings = lazy(() => import("./pages/EmailBroadcastSettings"));
const AdminPasswordRecoverySettings = lazy(() => import("./pages/AdminPasswordRecoverySettings"));
const QuotaPlansSettings = lazy(() => import("./pages/QuotaPlansSettings/QuotaPlansSettings"));
const NotificationsPage = lazy(() => import("./pages/Notifications/NotificationsPage"));
const ServersOverview = lazy(() => import("./pages/ServersOverview"));
const OvpnFileConfigForm = lazy(() => import("./pages/OvpnFileConfigForm"));
const XrayLoginPage = lazy(() => import("./pages/xray/XrayLoginPage.tsx"));
const XrayPortalPage = lazy(() => import("./pages/xray/XrayPortalPage.tsx"));
const XrayRegisterPage = lazy(() => import("./pages/xray/XrayRegisterPage.tsx"));

const isAuthenticated = () => !!localStorage.getItem(ACCESS_TOKEN_KEY);

const PrivateRoute = ({ children }: { children: ReactNode }): React.ReactElement =>
  isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;

const XrayPrivateRoute = ({ children }: { children: ReactNode }): React.ReactElement =>
  isAuthenticated() ? <>{children}</> : <Navigate to="/xray/login" replace />;

// Small helper to hide header/footer on login
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/xray/login" ||
    location.pathname === "/xray/register" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/xray" ||
    location.pathname.startsWith("/xray/");

  return (
    <>
      {/* Render header/footer everywhere except login */}
      {!isAuthPage && <Header />}

      <main className="main-content">{children}</main>

      {!isAuthPage && <Footer />}
    </>
  );
};

function App() {
  // Restore JWT expiry timer after full page load so idle refresh runs even if the tab was closed overnight.
  // If the access JWT is already expired, scheduleAutoLogout triggers refresh immediately (same as after 401).
  useEffect(() => {
    const access = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!access || !refresh) return;
    void import("./utils/auth/authSession").then(({ scheduleAutoLogout }) => {
      scheduleAutoLogout(access);
    });
  }, []);

  return (
    <div className="app-container">
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={withSuspense(<LoginPage />)} />
            <Route path="/xray/login" element={withSuspense(<XrayLoginPage />)} />
            <Route path="/xray/register" element={withSuspense(<XrayRegisterPage />)} />
            <Route path="/register" element={withSuspense(<RegisterPage />)} />
            <Route path="/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
            <Route path="/reset-password" element={withSuspense(<ResetPasswordPage />)} />
            <Route
              path="/xray"
              element={
                <XrayPrivateRoute>
                  {withSuspense(<XrayPortalPage />)}
                </XrayPrivateRoute>
              }
            />
            <Route
              path="/xray/*"
              element={
                <XrayPrivateRoute>
                  {withSuspense(<XrayPortalPage />)}
                </XrayPrivateRoute>
              }
            />

            <Route
              path="/*"
              element={
                <PrivateRoute>
                  {/* Route content below loads lazily in small chunks */}
                  <Routes>
                    <Route path="/" element={<Navigate to="/servers" replace />} />

                    <Route path="/servers" element={withSuspense(<ServersWithDetails />)}>
                      <Route index element={withSuspense(<ServersOverview />)} />
                      <Route path="statistics/:externalId" element={withSuspense(<ServersOverview />)} />

                      <Route path=":vpnServerId" element={withSuspense(<ServerDetails />)}>
                        <Route index element={withSuspense(<GeneralTab />)} />
                        <Route path="certificates" element={withSuspense(<CertificatesTab />)} />
                        <Route path="ovpn-file-config" element={withSuspense(<OvpnFileConfigForm />)} />
                        <Route path="console" element={withSuspense(<WebConsole />)} />

                        <Route path="statistics">
                          <Route index element={withSuspense(<ServersOverview />)} />
                          <Route path=":externalId" element={withSuspense(<ServersOverview />)} />
                        </Route>

                        <Route path="events" element={withSuspense(<Events />)} />
                      </Route>
                    </Route>

                    <Route path="/settings" element={withSuspense(<Settings />)}>
                      <Route index element={<Navigate to="general" replace />} />
                      <Route path="general" element={withSuspense(<GeneralSettings />)} />
                      <Route path="applications" element={withSuspense(<ApplicationSettings />)} />
                      <Route path="quotas" element={withSuspense(<QuotaPlansSettings />)} />
                      <Route path="geolitedb" element={withSuspense(<GeoLiteDbSettings />)} />
                      <Route path="vpn-notifications" element={withSuspense(<NotificationVpnProfileSettings />)} />
                      <Route path="telegrambot" element={withSuspense(<TelegramBotSettings />)} />
                      <Route path="users/quotas" element={withSuspense(<UserQuotasPage />)} />
                      <Route path="users" element={withSuspense(<UsersSettings />)} />
                      <Route path="users/:userId" element={withSuspense(<UserDetailPage />)} />
                      <Route path="email-broadcast" element={withSuspense(<EmailBroadcastSettings />)} />
                      <Route
                        path="android-crashes"
                        element={
                          isAdmin(getCurrentUser()) ? (
                            withSuspense(<AndroidCrashReportsSettings />)
                          ) : (
                            <Navigate to="/settings/general" replace />
                          )
                        }
                      />
                      <Route
                        path="windows-crashes"
                        element={
                          isAdmin(getCurrentUser()) ? (
                            withSuspense(<WindowsCrashReportsSettings />)
                          ) : (
                            <Navigate to="/settings/general" replace />
                          )
                        }
                      />
                      <Route
                        path="admin-password"
                        element={
                          isAdmin(getCurrentUser()) ? (
                            withSuspense(<AdminPasswordRecoverySettings />)
                          ) : (
                            <Navigate to="/settings/general" replace />
                          )
                        }
                      />
                    </Route>

                    <Route path="/notifications" element={withSuspense(<NotificationsPage />)} />

                    {/* legacy direct paths */}
                    <Route path="/settings/applications" element={withSuspense(<ApplicationSettings />)} />
                    <Route path="/servers/add" element={withSuspense(<ServerForm />)} />
                    <Route path="/servers/edit/:serverId" element={withSuspense(<ServerForm />)} />
                    <Route path="/about" element={withSuspense(<About />)} />
                    <Route path="/contact" element={withSuspense(<Contact />)} />

                    <Route path="*" element={withSuspense(<NotFound />)} />
                  </Routes>
                </PrivateRoute>
              }
            />
          </Routes>
        </Layout>
      </Router>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}

export default App;
