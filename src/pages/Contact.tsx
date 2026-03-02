import React from "react";
import { FaGithub, FaEnvelope, FaTelegram, FaLinkedin, FaFacebook } from "react-icons/fa";
import "../css/InfoPages.css";

const Contact: React.FC = () => {
  return (
    <div className="content-wrapper wide-table info-page">
      <h2>Contact</h2>
      <hr className="info-divider" />
      <p>
        Questions, suggestions, or issues — reach out via:
      </p>
      <ul className="info-contact-list">
        <li>
          <FaGithub className="info-icon" aria-hidden />
          <strong>GitHub:</strong>{" "}
          <a href="https://github.com/IMKolganov" target="_blank" rel="noopener noreferrer">
            IMKolganov
          </a>
        </li>
        <li>
          <FaEnvelope className="info-icon" aria-hidden />
          <strong>Mail:</strong>{" "}
          <a href="mailto:imkolganov@gmail.com">
            IMKolganov@gmail.com
          </a>
        </li>
        <li>
          <FaTelegram className="info-icon" aria-hidden />
          <strong>Telegram:</strong>{" "}
          <a href="https://t.me/KolganovIvan" target="_blank" rel="noopener noreferrer">
            @KolganovIvan
          </a>
        </li>
        <li>
          <FaLinkedin className="info-icon" aria-hidden />
          <strong>LinkedIn:</strong>{" "}
          <a href="https://www.linkedin.com/in/imkolganov" target="_blank" rel="noopener noreferrer">
            IMKolganov
          </a>
        </li>
        <li>
          <FaFacebook className="info-icon" aria-hidden />
          <strong>Facebook:</strong>{" "}
          <a href="https://www.facebook.com/IMKolganov" target="_blank" rel="noopener noreferrer">
            IMKolganov
          </a>
        </li>
      </ul>
      <p className="info-note">
        Feedback and contributions are welcome.
      </p>
    </div>
  );
};

export default Contact;
