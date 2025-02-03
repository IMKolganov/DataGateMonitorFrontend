import React from "react";
import "./Buttons.css";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

export function Buttons() {
  return (
    <div className="button-group">
      <button className="btn primary">
        <FaPlus className="icon" /> Add Server
      </button>
      <button className="btn secondary">
        <FaEdit className="icon" /> Edit Server
      </button>
      <button className="btn danger">
        <FaTrash className="icon" /> Remove Server
      </button>
    </div>
  );
}

export default Buttons;
