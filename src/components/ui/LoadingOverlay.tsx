// src/components/LoadingOverlay.tsx
import React from "react";

/** Positions the dimmed layer inside this box (avoids covering the viewport). */
const hostStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  minHeight: 240,
  flex: "1 1 auto",
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
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
  fontFamily: "inherit",
  letterSpacing: "0.5px",
};

const spinnerStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  border: "4px solid var(--bg-content)",
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
  <div style={hostStyle} role="status" aria-live="polite" aria-busy="true">
    <div style={overlayStyle}>
      <div style={spinnerStyle} />
      <span style={textStyle}>Loading…</span>
    </div>

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
