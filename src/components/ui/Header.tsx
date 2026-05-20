// src/components/Header.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "../../css/Header.css";
import { FaBell, FaDoorClosed, FaSun, FaMoon } from "react-icons/fa";
import { logout } from "../../api/apirequest.ts";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { useNotificationsUnreadCount } from "../../pages/Notifications/useNotifications";
import { useTheme } from "../../contexts/useTheme";
import { UserAvatar } from "./UserAvatar";

export function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const user = getCurrentUser();
    const { theme, toggleTheme } = useTheme();
    const canViewNotifications = isAdmin(user);
    const { data: unreadCount = 0 } = useNotificationsUnreadCount({
        enabled: canViewNotifications,
    });

    return (
        <header className={`header${menuOpen ? " header--nav-open" : ""}`}>
            <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
                <div className="logo">
                    <img src="/favicon.png" alt="Logo" className="logo-icon" />
                    DataGate Monitor
                </div>
            </Link>

            <div
                className={`burger-menu ${menuOpen ? "active" : ""}`}
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <div></div><div></div><div></div>
            </div>

            <nav>
                <ul className={`nav-links ${menuOpen ? "active" : ""}`}>
                    <li><Link to="/servers" onClick={() => setMenuOpen(false)}>Servers</Link></li>


                    {isAdmin(user) && (
                        <li><Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link></li>
                    )}

                    <li><Link to="/about" onClick={() => setMenuOpen(false)}>About</Link></li>
                    <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link></li>

                    <li>
                        <button
                            type="button"
                            className="btn secondary theme-toggle"
                            onClick={() => { setMenuOpen(false); toggleTheme(); }}
                            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                            aria-label={theme === "dark" ? "Light theme" : "Dark theme"}
                        >
                            {theme === "dark" ? <FaSun className="icon" /> : <FaMoon className="icon" />}
                            {theme === "dark" ? "Light" : "Dark"}
                        </button>
                    </li>

                    <li className="separator">|</li>

                    {user && (
                        <li className="user-info">
                            <UserAvatar
                                src={user.avatarUrl}
                                name={user.displayName || user.email || "User"}
                                colorSeed={String(user.id)}
                                size={36}
                            />
                            <span className="user-name">
                                {user.displayName || user.email || "User"}
                            </span>
                        </li>
                    )}

                    {user && canViewNotifications && (
                        <li className="header-notifications">
                            <Link to="/notifications" onClick={() => setMenuOpen(false)} className="header-notifications-link" title="Notifications">
                                <FaBell className="icon" />
                                {unreadCount > 0 && (
                                    <span className="header-notifications-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                                )}
                            </Link>
                        </li>
                    )}

                    <li>
                        <button
                            type="button"
                            className="btn secondary"
                            onClick={() => {
                                setMenuOpen(false);
                                logout();
                            }}
                        >
                            <FaDoorClosed className="icon" /> Logout
                        </button>
                    </li>
                </ul>
            </nav>
        </header>
    );
}

export default Header;
