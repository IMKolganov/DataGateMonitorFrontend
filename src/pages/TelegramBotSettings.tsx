import { useState, useEffect } from "react";
import { FaSync } from "react-icons/fa";
import "../css/Settings.css";
import "../css/TelegramBotUsers.css";
import TelegramBotUsersTable from "../components/TelegramBotUsersTable";
import { getTelegramBotUsers } from "../utils/api";

interface TelegramBotUser {
  id: number;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  createDate: string;
  lastUpdate: string;
  isAdmin: boolean;
  isBlocked: boolean;
}

export function TelegramBotSettings() {
  const [users, setUsers] = useState<TelegramBotUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getTelegramBotUsers();
      if (!data?.telegramBotUsers || !Array.isArray(data.telegramBotUsers)) {
        throw new Error("Unexpected response format");
      }
      setUsers(data.telegramBotUsers);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to load Telegram bot users");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div>
      <h2>Telegram Bot Settings</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <p className="app-settings-description">
        View the list of users who interacted with your Telegram bot.
      </p>

      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={handleRefresh} disabled={refreshing}>
            {FaSync({ className: `icon ${refreshing ? "icon-spin" : ""}` })} Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          {errorMessage && (
            <div>
              <p className="error-message">❌ {errorMessage}</p>
            </div>
          )}

          <TelegramBotUsersTable users={users} refreshUsers={loadUsers} />
        </>
      )}

      <div className="app-warning">
        <h3>What is this Telegram bot?</h3>
        <p>
          This Telegram bot is designed to help <strong>end users (VPN clients)</strong> easily receive their OpenVPN
          configuration files via Telegram. Once connected and verified, the bot provides each user with their personal
          VPN config — no need to manually email files or use portals.
        </p>

        <h4>How does it work?</h4>
        <p>
          The bot interacts with this dashboard via a secured API. Upon startup, it authenticates using a
          <code>clientId</code> and <code>clientSecret</code>, which must be generated in the <strong>Application Settings</strong> tab.
          These credentials are sent to the dashboard’s <code>/api/Auth/token</code> endpoint to obtain a JWT token.
          That token is then used to securely communicate with the backend API.
        </p>

        <p>
          When a Telegram user sends a command like <code>/start</code>, the bot checks if the user is allowed and then
          fetches their VPN configuration file from the backend. The file is sent directly in the Telegram chat as an attachment.
        </p>

        <h4>How to run the bot</h4>
        <ol>
          <li>Clone the repository: <code>git clone https://github.com/IMKolganov/DataGateVPNBot</code></li>
          <li>Build and run the bot using Docker (example included below)</li>
          <li>
            Make sure you’ve:
            <ul>
              <li>Registered the application in the dashboard</li>
              <li>Generated and supplied a Telegram bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">BotFather</a></li>
            </ul>
          </li>
          <li>
            The bot will start listening on the specified port (default <code>8443</code>) and handle user requests automatically.
          </li>
        </ol>

        <h4>Docker Configuration Example</h4>
        <pre className="code-block">{`
telegrambot:
  build:
    context: ./telegrambot
    dockerfile: Dockerfile
    args:
      TARGETARCH: \${TARGETARCH}
      BUILD_CONFIGURATION: \${BUILD_CONFIGURATION}
  container_name: open-vpn-gate-monitor-telegrambot
  restart: always
  networks:
    - backend_network
    - tgbot_network
  environment:
    TELEGRAMBOT_PORT: 8443
    ASPNETCORE_URLS: http://0.0.0.0:8443
    TELEGRAMBOT_BOT_TOKEN: your-token
    DASHBOARDAPI_URL: http://backend:5581/api
    DASHBOARDAPI_CLIENTID: your-client-id
    DASHBOARDAPI_CLIENTSECRET: your-client-secret
    HOST_ADDRESS: localhost
    USE_CERTIFICATE: true
    AUTO_GENERATE_CERTIFICATE: true
    CERTIFICATE_PFX_PATH: /app/datagatetgbot.pfx
    CERTIFICATE_PEM_PATH: /app/datagatetgbot.pem
  ports:
    - "8443:8443"
  volumes:
    - ./telegrambot/datagatetgbot.pem:/app/datagatetgbot.pem:ro
    - ./telegrambot/datagatetgbot.pfx:/app/datagatetgbot.pfx:ro
        `}</pre>

        <h4>Source Code</h4>
        <p>
          👉 Full bot source code and instructions are available here:&nbsp;
          <a
            href="https://github.com/IMKolganov/DataGateVPNBot"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/IMKolganov/DataGateVPNBot
          </a>
        </p>
      </div>
    </div>
  );
}

export default TelegramBotSettings;
