import React, { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import "../css/Console.css";
import { FaArrowRight, FaArrowLeft, FaTrash, FaInfoCircle } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { getWebSocketUrl } from "../utils/api";
// import { Input } from "@/components/ui/input";

export function WebConsole() {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const [messages, setMessages] = useState<string[]>(() => {
    const savedMessages = Cookies.get("consoleMessages");
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const [command, setCommand] = useState("");
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isConnected = useRef(false);

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
          setMessages((prev) => [...prev, event.data]);
        };

        ws.current.onclose = () => {
          if (isConnected.current) {
            setMessages((prev) => [...prev, "❌ Connection closed"]);
            isConnected.current = false;
          }
        };
      } catch (error) {
        console.error("WebSocket connection failed:", error);
      }
    };

    connectWebSocket();

    return () => {
      ws.current?.close();
      ws.current = null;
    };
  }, [vpnServerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    Cookies.set("consoleMessages", JSON.stringify(messages.slice(-100)), { expires: 7 });
  }, [messages]);

  const sendCommand = () => {
    if (ws.current && command.trim() !== "") {
      ws.current.send(command);
      setMessages((prev) => [...prev, `> ${command}`]);
      setCommand("");
    }
  };

  const clearConsole = () => {
    setMessages([]);
    Cookies.remove("consoleMessages");
  };

  return (
    <div className="content-wrapper wide-table">
      <h2>Web console:</h2>
      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={() => navigate("/")}>
            <FaArrowLeft className="icon" /> Back
          </button>
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
            Send <FaArrowRight />
          </button>
          <button className="btn danger" onClick={clearConsole}>
            <FaTrash />
          </button>
        </div>
      </div>

      {/* 🛑 Disclaimer & Documentation */}
      <div className="console-info">
        <h3><FaInfoCircle /> Important Information</h3>
        <p>
          This web console provides access to the <strong>OpenVPN Management Interface</strong>.
          Be careful when executing commands, as incorrect usage can affect VPN operations.
        </p>
        <p>
          For a full list of supported OpenVPN commands, please refer to the official documentation:
          <ul>
            <li>
              <a href="https://openvpn.net/community-resources/management-interface/" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>
                OpenVPN Management Interface Guide
              </a>
            </li>
            <li>
              <a href="https://openvpn.net/community-resources/reference-manual-for-openvpn-2-4/" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>
                OpenVPN 2.4 Reference Manual
              </a>
            </li>
          </ul>
        </p>
        <p><strong>Warning:</strong> Modifying server configurations via this interface requires proper knowledge of OpenVPN internals.</p>
      </div>
    </div>
  );
}

export default WebConsole;
