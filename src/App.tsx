import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Header } from "./components/Header";
import About from "./pages/About";
import Contact from "./pages/Contact";
import History from "./pages/History";
import Servers from "./pages/Servers";
import ServerForm from "./pages/ServerForm";
import ServerDetails from "./pages/ServerDetails";
import Certificates from "./pages/Certificates";
import ServerSettings from "./pages/ServerSettings";
import WebConsole from "./pages/WebConsole";
import Settings from "./pages/Settings";
import ApplicationSettings from "./pages/ApplicationSettings";

import "./App.css";

function App() {
  return (
    <div className="app-container dark-theme">
      <Router>
        <Header />
        <main className="main-content">
          
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/" element={<Servers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/applications" element={<ApplicationSettings />} />
            <Route path="/servers/add" element={<ServerForm />} />
            <Route path="/servers/edit/:serverId" element={<ServerForm />} />
            <Route path="/server-details/:id" element={<ServerDetails />} />
            <Route path="/server-details/:vpnServerId/settings" element={<ServerSettings />} />
            <Route path="/server-details/:vpnServerId/certificates" element={<Certificates />} />
            <Route path="/server-details/:vpnServerId/console" element={<WebConsole />} />
            <Route path="/history" element={<History />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;