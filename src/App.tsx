import type { ReactNode } from "react";
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { Header } from "./components/Header"; // small component; keep as direct import
import "react-toastify/dist/ReactToastify.css";
import "./css/ToastifyDark.css";
import "./App.css";

// Lazy pages (heavy or medium modules)
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

const PrivateRoute = ({ children }: { children: ReactNode }): React.ReactElement => {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <div className="app-container dark-theme">
      <Router>
        {/* Suspense controls code-split loading UI */}
        <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Header />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Navigate to="/servers" replace />} />

                      <Route path="/servers" element={<ServersWithDetails />}>
                        {/* Index overview */}
                        <Route index element={<ServersOverview />} />

                        {/* Global statistics by externalId */}
                        <Route path="statistics/:externalId" element={<ServersOverview />} />

                        {/* Per-server details */}
                        <Route path=":vpnServerId" element={<ServerDetails />}>
                          <Route index element={<GeneralTab />} />
                          <Route path="certificates" element={<CertificatesTab />} />
                          <Route path="ovpn-file-config" element={<OvpnFileConfigForm />} />
                          <Route path="console" element={<WebConsole />} />

                          {/* Server statistics with optional externalId */}
                          <Route path="statistics">
                            <Route index element={<ServersOverview />} />
                            <Route path=":externalId" element={<ServersOverview />} />
                          </Route>

                          <Route path="events" element={<Events />} />
                        </Route>
                      </Route>

                      <Route path="/settings" element={<Settings />}>
                        <Route index element={<Navigate to="general" replace />} />
                        <Route path="general" element={<GeneralSettings />} />
                        <Route path="applications" element={<ApplicationSettings />} />
                        <Route path="geolitedb" element={<GeoLiteDbSettings />} />
                        <Route path="telegrambot" element={<TelegramBotSettings />} />
                      </Route>

                      {/* legacy direct paths if needed */}
                      <Route path="/settings/applications" element={<ApplicationSettings />} />
                      <Route path="/servers/add" element={<ServerForm />} />
                      <Route path="/servers/edit/:serverId" element={<ServerForm />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </PrivateRoute>
              }
            />
          </Routes>
        </Suspense>
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