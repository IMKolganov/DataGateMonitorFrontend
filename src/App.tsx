import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { Header } from "./components/Header";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ServersWithDetails from "./pages/ServersWithDetails";
import ServerForm from "./pages/ServerForm";
import ServerDetails from "./pages/ServerDetails";
import Settings from "./pages/Settings";
import ApplicationSettings from "./pages/ApplicationSettings";
import GeneralTab from "./pages/GeneralServerDetails";
import CertificatesTab from "./pages/Certificates";
import WebConsole from "./pages/WebConsole";
import Login from "./pages/Login";
import { ToastContainer } from "react-toastify";
import GeneralSettings from "./pages/GeneralSettings";
import GeoLiteDbSettings from "./pages/GeoLiteDbSettings";
import "react-toastify/dist/ReactToastify.css";
import "./css/ToastifyDark.css";

import "./App.css";
import OvpnFileConfigForm from "./pages/OvpnFileConfigForm";

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
                    <Route path="/" element={<Navigate to="/servers" replace />} />

                    <Route path="/servers" element={<ServersWithDetails />}>
                      <Route path=":id" element={<ServerDetails />}>
                        <Route index element={<GeneralTab />} />
                        <Route path="certificates" element={<CertificatesTab />} />
                        <Route path="ovpn-file-config" element={<OvpnFileConfigForm />} />
                        <Route path="console" element={<WebConsole />} />
                      </Route>
                    </Route>

                    <Route path="/settings" element={<Settings />}>
                      <Route index element={<Navigate to="general" replace />} />
                      <Route path="general" element={<GeneralSettings />} />
                      <Route path="applications" element={<ApplicationSettings />} />
                      <Route path="geolitedb" element={<GeoLiteDbSettings />} />
                    </Route>


                    <Route path="/settings/applications" element={<ApplicationSettings />} />
                    <Route path="/servers/add" element={<ServerForm />} />
                    <Route path="/servers/edit/:serverId" element={<ServerForm />} />
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