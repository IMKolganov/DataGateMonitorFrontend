import React from "react";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="header">
      <div className="logo">🔥 OpenVPN Gate Monitor</div>
      <nav>
        <ul className="nav-links">
          <li><Link to="/servers">Servers</Link></li>
          {/* <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/history">History</Link></li> */}
          {/* <li><Link to="/certificates">Certificates</Link></li>           */}
          <li><Link to="/about">About</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
