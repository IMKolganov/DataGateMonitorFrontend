import React from "react";
import { FaGithub, FaWindows, FaApple, FaAndroid, FaLinux, FaServer, FaTelegram, FaLinkedin, FaFacebook } from "react-icons/fa";
import "../css/InfoPages.css";

const GITHUB_DATAGATE_ANDROID = "https://github.com/IMKolganov/DataGateAndroid";
const GITHUB_DATAGATE_MAC = "https://github.com/IMKolganov/DataGateMac";
const GITHUB_DATAGATE_WIN = "https://github.com/IMKolganov/DataGateWin";

const About: React.FC = () => {
  return (
    <div className="content-wrapper wide-table info-page">
      <h2>About</h2>
      <hr className="info-divider" />
      <p>
        <strong>DataGate Monitor</strong> — web dashboard for monitoring OpenVPN servers: real-time client data,
        connection details, and service status.
      </p>
      <p>
        <strong>Features:</strong>
      </p>
      <ul>
        <li>Real-time monitoring of OpenVPN clients and connection details.</li>
        <li>Historical data storage and visualization.</li>
        <li>Manual service control and on-demand refresh.</li>
      </ul>
      <p className="info-list-item">
        <FaGithub className="info-icon" aria-hidden />
        Author:{" "}
        <a href="https://github.com/IMKolganov" target="_blank" rel="noopener noreferrer">
          Ivan Kolganov
        </a>
      </p>

      <section className="info-section">
        <p>
          <strong>WSS (WebSocket Secure)</strong>
        </p>
        <div className="info-wss-block">
          <p>
            To connect via WSS, use the <strong>DataGate</strong> client. Source and build instructions:
          </p>
          <ul>
            <li className="info-list-item">
              <FaAndroid className="info-icon" aria-hidden />
              <strong>Android:</strong>{" "}
              <a href={GITHUB_DATAGATE_ANDROID} target="_blank" rel="noopener noreferrer">
                DataGateAndroid
              </a>
            </li>
            <li className="info-list-item">
              <FaApple className="info-icon" aria-hidden />
              <strong>macOS:</strong>{" "}
              <a href={GITHUB_DATAGATE_MAC} target="_blank" rel="noopener noreferrer">
                DataGateMac
              </a>
            </li>
            <li className="info-list-item">
              <FaWindows className="info-icon" aria-hidden />
              <strong>Windows:</strong>{" "}
              <a href={GITHUB_DATAGATE_WIN} target="_blank" rel="noopener noreferrer">
                DataGateWin
              </a>
            </li>
          </ul>
          <p className="info-wss-footer">
            See each repository for setup and build instructions.
          </p>
        </div>
      </section>

      <section className="info-section">
        <p>
          <strong>Contact</strong>
        </p>
        <ul>
          <li className="info-list-item">
            <FaGithub className="info-icon" aria-hidden />
            GitHub:{" "}
            <a href="https://github.com/IMKolganov" target="_blank" rel="noopener noreferrer">
              IMKolganov
            </a>
          </li>
          <li className="info-list-item">
            <FaTelegram className="info-icon" aria-hidden />
            Telegram:{" "}
            <a href="https://t.me/KolganovIvan" target="_blank" rel="noopener noreferrer">
              @KolganovIvan
            </a>
          </li>
          <li className="info-list-item">
            <FaLinkedin className="info-icon" aria-hidden />
            LinkedIn:{" "}
            <a href="https://www.linkedin.com/in/imkolganov" target="_blank" rel="noopener noreferrer">
              IMKolganov
            </a>
          </li>
          <li className="info-list-item">
            <FaFacebook className="info-icon" aria-hidden />
            Facebook:{" "}
            <a href="https://www.facebook.com/IMKolganov" target="_blank" rel="noopener noreferrer">
              IMKolganov
            </a>
          </li>
        </ul>
      </section>

      <section className="info-section">
        <p>
          <strong>OpenVPN</strong>
        </p>
        <p>
          OpenVPN is an open-source VPN implementing SSL/TLS for point-to-point and site-to-site tunnels.
        </p>
        <p>
          <strong>Official clients and server:</strong>
        </p>
        <ul>
          <li className="info-list-item">
            <FaWindows className="info-icon" aria-hidden />
            Windows:{" "}
            <a href="https://openvpn.net/client-connect-vpn-for-windows/" target="_blank" rel="noopener noreferrer">
              OpenVPN Client
            </a>
          </li>
          <li className="info-list-item">
            <FaLinux className="info-icon" aria-hidden />
            Linux:{" "}
            <a href="https://community.openvpn.net/openvpn/wiki/OpenvpnSoftwareRepos" target="_blank" rel="noopener noreferrer">
              OpenVPN repos
            </a>
          </li>
          <li className="info-list-item">
            <FaApple className="info-icon" aria-hidden />
            macOS:{" "}
            <a href="https://tunnelblick.net/downloads.html" target="_blank" rel="noopener noreferrer">
              Tunnelblick
            </a>
          </li>
          <li className="info-list-item">
            <FaAndroid className="info-icon" aria-hidden />
            Android:{" "}
            <a href="https://play.google.com/store/apps/details?id=net.openvpn.openvpn" target="_blank" rel="noopener noreferrer">
              OpenVPN for Android
            </a>
          </li>
          <li className="info-list-item">
            <FaApple className="info-icon" aria-hidden />
            iOS:{" "}
            <a href="https://apps.apple.com/us/app/openvpn-connect/id590379981" target="_blank" rel="noopener noreferrer">
              OpenVPN Connect
            </a>
          </li>
          <li className="info-list-item">
            <FaServer className="info-icon" aria-hidden />
            Server:{" "}
            <a href="https://openvpn.net/vpn-server/" target="_blank" rel="noopener noreferrer">
              OpenVPN Server
            </a>
          </li>
        </ul>
      </section>

      <p className="info-note">
        Open-source. Contributions welcome (issues, pull requests).
      </p>
    </div>
  );
};

export default About;
