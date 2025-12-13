// src/components/Footer.tsx
import React from "react";
import { appVersion } from "../../version.ts";
import "../../css/Footer.css";

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} OpenVPN Gate Monitor v.{appVersion}</p>
    </footer>
  );
};

export default Footer;
