import React, { useEffect, useState, useRef } from "react";
import "../css/Console.css";
import {
  FaArrowRight,
  FaArrowLeft,
  FaTrash,
  FaInfoCircle
} from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { getWebSocketUrl } from "../utils/api";
import { saveHistoryToDB, loadHistoryFromDB, clearHistoryDB } from "../utils/consoleStorage";

export function WebConsole() {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const [messages, setMessages] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isConnected = useRef(false);

  useEffect(() => {
    if (!vpnServerId) return;
    
    (async () => {
      const history = await loadHistoryFromDB(vpnServerId);
      setMessages(history);
    })();
  }, [vpnServerId]);

  useEffect(() => {
    if (!vpnServerId) return;

    const connectWebSocket = async () => {
      try {
        const WS_URL = await getWebSocketUrl(vpnServerId);
        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
          if (!isConnected.current) {
            setMessages((prev) => [...prev, "✅ Connected to OpenVPN Telnet"]);
            isConnected.current = true;
          }
        };

        ws.current.onmessage = (event) => {
          setMessages((prev) => {
            const updatedMessages = [...prev, event.data];

            saveHistoryToDB(vpnServerId, updatedMessages);
            return updatedMessages;
          });
        };

        ws.current.onclose = () => {
          if (isConnected.current) {
            setMessages((prev) => [...prev, "❌ Connection closed. Reconnecting..."]);
            isConnected.current = false;
            setTimeout(connectWebSocket, 5000);
          }
        };
      } catch (error) {
        console.error("WebSocket connection failed:", error);
      }
    };

    ws.current?.close();
    connectWebSocket();

    return () => {
      ws.current?.close();
      ws.current = null;
    };
  }, [vpnServerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendCommand = () => {
    if (ws.current && command.trim() !== "") {
      ws.current.send(command);
      setMessages((prev) => {
        const updatedMessages = [...prev, `> ${command}`];

        saveHistoryToDB(vpnServerId!, updatedMessages);
        return updatedMessages;
      });
      setCommand("");
    }
  };

  const clearConsole = async () => {
    if (!vpnServerId) return;
    setMessages([]);
    await clearHistoryDB(vpnServerId);
  };

  return (
    <div>
      <h2>Web console:</h2>
      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn danger" onClick={clearConsole}>
            {FaTrash({ className: "icon" })} Clear Console
          </button>
        </div>
        <div className="right-buttons">

        </div>
      </div>

      <div className="console-container">
        <div className="console-output">
          {messages.map((msg, index) => (
            <div key={index} className="console-message">{msg}</div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="console-input">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendCommand()}
            placeholder="Enter command..."
            className="input"
          />
          <button className="btn primary" onClick={sendCommand}>
            Send {FaArrowRight({ className: "icon" })}
          </button>
        </div>
      </div>

      <div className="console-info">
        <h3>{FaInfoCircle({ className: "icon" })} Important Information</h3>
        <p>
          This web console provides access to the <strong>OpenVPN Management Interface</strong>.
          Be careful when executing commands, as incorrect usage can affect VPN operations.
        </p>
        <p>
          For a full list of supported OpenVPN commands, please refer to the official documentation:
        </p>
        <ul>
          <li>
            <a
              href="https://openvpn.net/community-resources/management-interface/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#58a6ff" }}
            >
              OpenVPN Management Interface Guide
            </a>
          </li>
        </ul>
        <p><strong>Warning:</strong> Modifying server configurations via this interface requires proper knowledge of OpenVPN internals.</p>
      </div>
    </div>
  );
}

export default WebConsole;