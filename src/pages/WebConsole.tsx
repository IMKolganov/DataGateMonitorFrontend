import { useEffect, useState, useRef } from "react";
import "../css/Console.css";
import { FaArrowRight, FaTrash, FaInfoCircle } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { getSignalRUrl } from "../utils/api";
import {
  HubConnectionBuilder,
  HubConnection,
  HttpTransportType,
  LogLevel
} from "@microsoft/signalr";
import { saveHistoryToDB, loadHistoryFromDB, clearHistoryDB } from "../utils/consoleStorage";

export function WebConsole() {
  const { id: vpnServerId } = useParams<{ id?: string }>();
  const [messages, setMessages] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const connectionRef = useRef<HubConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vpnServerId) return;

    (async () => {
      const history = await loadHistoryFromDB(vpnServerId);
      setMessages(history);
    })();
  }, [vpnServerId]);

  useEffect(() => {
    if (!vpnServerId) return;

    if (connectionRef.current && connectionRef.current.state !== "Disconnected") {
      console.info("SignalR already connected or connecting, skipping setup");
      return;
    }

    const setupSignalR = async () => {
      try {
        const url = await getSignalRUrl(vpnServerId);
        const connection = new HubConnectionBuilder()
          .withUrl(url, { transport: HttpTransportType.WebSockets })
          .configureLogging(LogLevel.Information)
          .withAutomaticReconnect()
          .build();

        connectionRef.current = connection;

        connection.off("ReceiveCommandResult");
        connection.off("ReceiveMessage");

        connection.on("ReceiveCommandResult", (data: string) => {
          setMessages(prev => {
            const updated = [...prev, data];
            saveHistoryToDB(vpnServerId, updated);
            return updated;
          });
        });

        connection.on("ReceiveMessage", (msg: string) => {
          setMessages(prev => {
            const updated = [...prev, msg];
            saveHistoryToDB(vpnServerId, updated);
            return updated;
          });
        });

        connection.onreconnected(async () => {
          setMessages(prev => [...prev, "✅ Reconnected to OpenVPN"]);
          const history = await loadHistoryFromDB(vpnServerId);
          setMessages(history);
        });

        connection.onreconnecting(error => {
          console.warn("Reconnecting:", error);
          setMessages(prev => [...prev, "⚠️ Reconnecting to OpenVPN..."]);
        });

        connection.onclose(error => {
          console.error("Connection closed:", error);
          setMessages(prev => [...prev, "❌ Connection closed."]);
        });

        await connection.start();
        console.info("SignalR connected, state:", connection.state);
        setMessages(prev => [...prev, "✅ Connected to OpenVPN"]);
      } catch (err: any) {
        console.error("SignalR connection error:", err);
        setMessages(prev => [...prev, `❌ Failed to connect to OpenVPN: ${err.message}`]);
      }
    };

    setupSignalR();

    return () => {
      connectionRef.current?.stop();
      connectionRef.current = null;
    };
  }, [vpnServerId]);

  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendCommand = async () => {
    if (command.trim() === "") return;

    setMessages(prev => {
      const updated = [...prev, `> ${command}`];
      saveHistoryToDB(vpnServerId!, updated);
      return updated;
    });

    const connection = connectionRef.current;
    if (!connection || connection.state !== "Connected") {
      setMessages(prev => [...prev, "❌ Cannot send command: not connected"]);
      setCommand("");
      return;
    }

    try {
      await connection.send("SendCommand", command);
      console.log("Connecting to server ID:", vpnServerId);
      console.log("Command sent:", command);
    } catch (error: any) {
      console.error("Failed to send command:", error);
      setMessages(prev => [...prev, `❌ Failed to send command: ${error.message}`]);
    }

    setCommand("");
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
