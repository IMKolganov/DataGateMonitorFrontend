import React from "react";

const Contact: React.FC = () => {
  return (
    <div>
      <h2>Contact</h2>
      <p>
        Thank you for your interest in OpenVPN Gate Monitor! If you have any questions, suggestions,
        or need assistance, feel free to reach out via the following platforms:
      </p>
      <ul style={{ listStyleType: "none", padding: 0 }}>
        <li style={{ marginBottom: "10px" }}>
          <strong>GitHub:</strong> <a href="https://github.com/ΙΜKolganov" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>ΙΜKolganov</a>
        </li>
        <li style={{ marginBottom: "10px" }}>
          <strong>Telegram:</strong> <a href="https://t.me/KolganovIvan" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>@KolganovIvan</a>
        </li>
      </ul>
      <p style={{ marginTop: "20px" }}>
        <em>
          We value your feedback and are always looking for ways to improve the project. Don’t
          hesitate to reach out — we’re here to help!
        </em>
      </p>
    </div>
  );
};

export default Contact;
