import React from "react";
import { useNavigate, NavLink, Outlet, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../css/ServerDetails.css";

export function ServerDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <div className="content-wrapper wide-table">
      <h2>Server Details</h2>

      <div className="header-container">
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={() => navigate("/")}>
              {FaArrowLeft({ className: "icon" })} Back
            </button>
          </div>
        </div>
      </div>

      <div className="tabs">
        <NavLink
          to={`/server-details/${id}`}
          end
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          General
        </NavLink>
        <NavLink
          to={`/server-details/${id}/certificates`}
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          Manage Certificates
        </NavLink>
        <NavLink
          to={`/server-details/${id}/console`}
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          Web console
        </NavLink>
      </div>

      <div className="tab-content">
        <Outlet />
      </div>
    </div>
  );
}

export default ServerDetails;
