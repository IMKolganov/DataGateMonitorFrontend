import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Header } from "./components/Header";
import About from "./pages/About";
import Contact from "./pages/Contact";
import History from "./pages/History";
import Certificates from "./pages/Certificates";

import "./App.css";

function App() {
  return (
    <div className="app-container dark-theme">
      <Router>
        <Header />
        <main className="main-content">
          <div className="content-wrapper wide-table">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
          </div>
        </main>
      </Router>
    </div>
  );
}

export default App;
