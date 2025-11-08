import React from "react";

const Contact: React.FC = () => {
  return (
    <div className="content-wrapper wide-table">
      <h2>Contact</h2>
      <div style={{borderTop: "1px solid #d1d5da"}}></div>
      <p>
        Thank you for your interest in OpenVPN Gate Monitor! If you have any questions, suggestions,
        or need assistance, feel free to reach out via the following platforms:
      </p>
      <ul style={{ listStyleType: "none", padding: 0 }}>
        <li style={{ marginBottom: "10px" }}>
          <strong>GitHub:</strong> <a href="https://github.com/IMkolganov" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>IMkolganov</a>
        </li>
        <li style={{ marginBottom: "10px" }}>
          <strong>Mail:</strong> <a href="mailto:imkolganov@gmail.com" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}> imkolganov@gmail.com</a>
        </li>
        <li style={{ marginBottom: "10px" }}>
          <strong>Telegram:</strong> <a href="https://t.me/KolganovIvan" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>@KolganovIvan</a>
        </li>
      </ul>
      <p style={{ marginTop: "20px" }}>
        <em>
          We value your feedback and are always looking for ways to improve the project. Don't
          hesitate to reach out — we're here to help!
        </em>
      </p>
    </div>
  );
};

export default Contact;
