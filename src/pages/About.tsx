import React from "react";

const About: React.FC = () => {
  return (
    <div>
      <h2>📡 About This Project</h2>
      <div style={{borderTop: "1px solid #d1d5da"}}></div>
      <p>
        Welcome to the <strong>OpenVPN Gate Monitor</strong>! 🎯 This project is designed to help administrators and users
        monitor VPN connections effectively by providing real-time data about connected clients, their
        locations, and service statuses.
      </p>
      <p>
        <strong>✨ Key Features:</strong>
      </p>
      <ul>
        <li>📊 Real-time monitoring of OpenVPN clients and connection details.</li>
        <li>📂 Historical data storage and visualization.</li>
        <li>⚡ Manual service control for immediate updates.</li>
      </ul>
      <p>
        This project was developed with passion and attention to detail by
        <a href="https://github.com/IMkolganov" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}> Ivan Kolganov</a>.
      </p>
      <p>
        <strong>📬 Contact the Developer:</strong>
      </p>
      <ul>
        <li>
          💻 GitHub: <a href="https://github.com/IMkolganov" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>IMkolganov</a>
        </li>
        <li>
          📲 Telegram: <a href="https://t.me/KolganovIvan" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>@KolganovIvan</a>
        </li>
      </ul>
      <p style={{ marginTop: "20px" }}>
        <strong>🔐 About OpenVPN:</strong>
      </p>
      <p>
        OpenVPN is a robust and highly configurable open-source VPN solution that enables secure point-to-point or site-to-site connections.
        It uses SSL/TLS security protocols, making it highly reliable for both individual users and enterprises.
      </p>
      <p>
        <strong>⬇️ Download OpenVPN for Your Platform:</strong>
      </p>
      <ul>
        <li>
          🪟 Windows: <a href="https://openvpn.net/client-connect-vpn-for-windows/" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>Download OpenVPN Client</a>
        </li>
        <li>
          🐧 Linux: <a href="https://community.openvpn.net/openvpn/wiki/OpenvpnSoftwareRepos" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>Install OpenVPN on Linux</a>
        </li>
        <li>
          🍏 macOS: <a href="https://tunnelblick.net/downloads.html" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>Download Tunnelblick (macOS OpenVPN Client)</a>
        </li>
        <li>
          📱 Android: <a href="https://play.google.com/store/apps/details?id=net.openvpn.openvpn" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>Download OpenVPN for Android</a>
        </li>
        <li>
          📱 iOS: <a href="https://apps.apple.com/us/app/openvpn-connect/id590379981" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>Download OpenVPN for iOS</a>
        </li>
        <li>
          🖥️ OpenVPN Server: <a href="https://openvpn.net/vpn-server/" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>Download OpenVPN Server</a>
        </li>
      </ul>
      <p style={{ marginTop: "20px" }}>
        <em>
          This project is open-source and welcomes contributions. Feel free to explore, fork, and
          submit pull requests to improve its functionality! 🚀
        </em>
      </p>
    </div>
  );
};

export default About;
