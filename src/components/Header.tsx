import React, { useState } from "react";
import { Link } from "react-router-dom";
import { logout } from "../utils/api"; // Импортируем функцию выхода

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <Link to="/" className="logo">
        <div className="logo">
          <img src="/favicon.png" alt="Logo" className="logo-icon" />
          OpenVPN Gate Monitor
        </div>
      </Link>

      {/* Бургер-меню */}
      <div
        className={`burger-menu ${menuOpen ? "active" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <div></div>
        <div></div>
        <div></div>
      </div>

      {/* Навигация */}
      <nav>
        <ul className={`nav-links ${menuOpen ? "active" : ""}`}>
          <li><Link to="/servers" onClick={() => setMenuOpen(false)}>Servers</Link></li>
          <li><Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link></li>
          <li><Link to="/about" onClick={() => setMenuOpen(false)}>About</Link></li>
          <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link></li>
          <li><button className="logout-btn" onClick={logout}>Logout</button></li> 
        </ul>
      </nav>
    </header>
  );
}

export default Header;
