// src/components/LoadingOverlay.tsx
import React from "react";

const overlayStyle: React.CSSProperties = {
  position: "absolute", // not fixed anymore
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10,

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  backgroundColor: "rgba(0, 0, 0, 0.35)",
  backdropFilter: "blur(2px)",
  color: "#fff",
  fontFamily: "Inter, sans-serif",
  letterSpacing: "0.5px",
};

const spinnerStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  border: "4px solid #161b22",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  marginBottom: 16,
};

const textStyle: React.CSSProperties = {
  fontSize: "1.2rem",
  animation: "pulse 1.6s ease-in-out infinite",
};

export const LoadingOverlay: React.FC = () => (
  <div style={overlayStyle}>
    <div style={spinnerStyle} />
    <span style={textStyle}>Loading…</span>

    <style>
      {`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%   { opacity: 0.4; transform: scale(0.98); text-shadow: 0 0 0px rgba(255,255,255,0.0); }
          50%  { opacity: 1;   transform: scale(1.02); text-shadow: 0 0 8px rgba(255,255,255,0.35); }
          100% { opacity: 0.4; transform: scale(0.98); text-shadow: 0 0 0px rgba(255,255,255,0.0); }
        }
      `}
    </style>
  </div>
);
