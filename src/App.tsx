import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { Header } from "./components/Header";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Servers from "./pages/Servers";
import ServerForm from "./pages/ServerForm";
import ServerDetails from "./pages/ServerDetails";
import Certificates from "./pages/Certificates";
import ServerSettings from "./pages/ServerSettings";
import WebConsole from "./pages/WebConsole";
import Settings from "./pages/Settings";
import ApplicationSettings from "./pages/ApplicationSettings";
import OvpnFileConfigForm from "./pages/OvpnFileConfigForm";
import Login from "./pages/Login";
import { ToastContainer } from "react-toastify";
import GeneralSettings from "./pages/GeneralSettings";
import GeoLiteDbSettings from "./pages/GeoLiteDbSettings";
import "react-toastify/dist/ReactToastify.css";
import "./css/ToastifyDark.css";

import "./App.css";
import SignalRTestPage from "./pages/SignalRTestPage";

const isAuthenticated = () => !!localStorage.getItem("token");

const PrivateRoute = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <div className="app-container dark-theme">
      <Router>
        <Routes>
          
          <Route path="/login" element={
              <Login />
            } />

          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Header />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Servers />} />
                    <Route path="/servers" element={<Servers />} />


                    <Route path="/settings" element={<Settings />}>
                      <Route index element={<Navigate to="general" replace />} />
                      <Route path="general" element={<GeneralSettings />} />
                      <Route path="applications" element={<ApplicationSettings />} />
                      <Route path="geolitedb" element={<GeoLiteDbSettings />} />
                      <Route path="signalr-test-page" element={<SignalRTestPage />} />
                    </Route>


                    <Route path="/settings/applications" element={<ApplicationSettings />} />
                    <Route path="/servers/add" element={<ServerForm />} />
                    <Route path="/servers/edit/:serverId" element={<ServerForm />} />
                    <Route path="/server-details/:id" element={<ServerDetails />} />
                    <Route path="/server-details/:vpnServerId/settings" element={<ServerSettings />} />
                    <Route path="/server-details/:vpnServerId/certificates" element={<Certificates />} />
                    <Route path="/server-details/:vpnServerId/console" element={<WebConsole />} />
                    <Route path="/server-details/ovpn-file-config/add" element={<OvpnFileConfigForm />} />
                    <Route path="/server-details/ovpn-file-config/:vpnServerId" element={<OvpnFileConfigForm />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                  </Routes>
                </main>
              </PrivateRoute>
            }
          />
        </Routes>
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