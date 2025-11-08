// comments in English only
import type { ReactNode } from "react";
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Header } from "./components/Header";
import Footer from "./components/Footer";
import { LoadingOverlay } from "./components/LoadingOverlay";
import "react-toastify/dist/ReactToastify.css";
import "./css/ToastifyDark.css";
import "./App.css";

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
const Login = lazy(() => import("./pages/Login"));
const GeneralSettings = lazy(() => import("./pages/GeneralSettings"));
const GeoLiteDbSettings = lazy(() => import("./pages/GeoLiteDbSettings"));
const TelegramBotSettings = lazy(() => import("./pages/TelegramBotSettings"));
const ServersOverview = lazy(() => import("./pages/ServersOverview"));
const OvpnFileConfigForm = lazy(() => import("./pages/OvpnFileConfigForm"));

const isAuthenticated = () => !!localStorage.getItem("token");

const PrivateRoute = ({ children }: { children: ReactNode }): React.ReactElement =>
  isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;

export const withSuspense = (node: React.ReactElement) => (
  <Suspense fallback={<LoadingOverlay />}>{node}</Suspense>
);

// Small helper to hide header/footer on login
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <>
      {/* Render header/footer everywhere except login */}
      {!isLogin && <Header />}

      <main className="main-content">{children}</main>

      {!isLogin && <Footer />}
    </>
  );
};

function App() {
  return (
    <div className="app-container dark-theme">
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={withSuspense(<Login />)} />

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
                      <Route path="geolitedb" element={withSuspense(<GeoLiteDbSettings />)} />
                      <Route path="telegrambot" element={withSuspense(<TelegramBotSettings />)} />
                    </Route>

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
