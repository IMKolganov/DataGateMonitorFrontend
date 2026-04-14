// src/pages/WebConsole.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import "../css/Console.css";
import { FaArrowRight, FaTrash, FaInfoCircle, FaList, FaTerminal } from "react-icons/fa";
import { useParams } from "react-router-dom";
import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
  HubConnectionState,
} from "@microsoft/signalr";
import {
  saveHistoryToDB,
  loadHistoryFromDB,
  clearHistoryDB,
  saveCommandHistory,
  loadCommandHistory,
} from "../utils/consoleStorage";
import { getSignalRUrl, getAccessTokenOrLogout } from "../utils/signalr-url";
import { getSignalRPreferredTransport } from "../utils/signalrTransport.ts";
import { ACCESS_TOKEN_REFRESHED_EVENT } from "../utils/auth/accessTokenEvents.ts";
import { highlightOvpMgmtLine } from "../utils/ovpMgmtHighlight";
import { OVP_MGMT_COMMANDS } from "../utils/ovpMgmtCommands";
import { errorMessage } from "../utils/errorMessage";

export function WebConsole() {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const [messages, setMessages] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [showCmdList, setShowCmdList] = useState(false);
  const [selectedCmdIdx, setSelectedCmdIdx] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const cmdListRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<HubConnection | null>(null);
  /** Scroll this element only — never use scrollIntoView on inner nodes (it scrolls the whole page). */
  const consoleOutputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hubSessionKey, setHubSessionKey] = useState(0);

  useEffect(() => {
    const bump = () => setHubSessionKey((k) => k + 1);
    window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, bump);
    return () => window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, bump);
  }, []);

  useEffect(() => {
    if (!vpnServerId) return;
    (async () => {
      const [history, cmds] = await Promise.all([
        loadHistoryFromDB(vpnServerId),
        loadCommandHistory(vpnServerId),
      ]);
      setMessages(history);
      setCommandHistory(cmds);
    })();
  }, [vpnServerId]);

  useEffect(() => {
    if (!vpnServerId) return;

    const setupSignalR = async () => {
      try {
        if (connectionRef.current) {
          await connectionRef.current.stop().catch(() => {});
          connectionRef.current = null;
        }

        const url = getSignalRUrl(vpnServerId);
        const connection = new HubConnectionBuilder()
          .withUrl(url, {
            transport: getSignalRPreferredTransport(),
            accessTokenFactory: () => getAccessTokenOrLogout(),
          })
          .configureLogging(LogLevel.Information)
          .withAutomaticReconnect()
          .build();

        connectionRef.current = connection;

        // Ensure no duplicate handlers
        connection.off("ReceiveCommandResult");
        connection.off("ReceiveMessage");

        connection.on("ReceiveCommandResult", (data: string) => {
          setMessages((prev) => {
            const updated = [...prev, data];
            saveHistoryToDB(vpnServerId, updated);
            return updated;
          });
        });

        connection.on("ReceiveMessage", (msg: string) => {
          setMessages((prev) => {
            const updated = [...prev, msg];
            saveHistoryToDB(vpnServerId, updated);
            return updated;
          });
        });

        // Reconnect lifecycle (no unused params to satisfy TS)
        connection.onreconnected(async () => {
          setMessages((prev) => [...prev, "✅ Console ready. Connection to OpenVPN server re-established."]);
          const history = await loadHistoryFromDB(vpnServerId);
          setMessages(history);
        });

        connection.onreconnecting(() => {
          setMessages((prev) => [...prev, "⚠️ Reconnecting to OpenVPN server..."]);
        });

        connection.onclose(() => {
          setMessages((prev) => [...prev, "❌ Connection to OpenVPN server closed."]);
        });

        await connection.start();
        setMessages((prev) => [...prev, "✅ Console ready. Connection to OpenVPN server established."]);
      } catch (err: unknown) {
        setMessages((prev) => [...prev, `❌ Failed to connect to OpenVPN server: ${errorMessage(err)}`]);
      }
    };

    setupSignalR();

    return () => {
      connectionRef.current?.stop();
      connectionRef.current = null;
    };
  }, [vpnServerId, hubSessionKey]);

  useEffect(() => {
    if (messages.length === 0) return;
    const el = consoleOutputRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const addToCommandHistory = useCallback(
    (cmd: string) => {
      if (!vpnServerId || !cmd.trim()) return;
      setCommandHistory((prev) => {
        const trimmed = cmd.trim();
        const filtered = prev.filter((c) => c !== trimmed);
        const next = [trimmed, ...filtered];
        saveCommandHistory(vpnServerId, next);
        return next;
      });
      historyIndexRef.current = -1;
    },
    [vpnServerId],
  );

  const sendCommand = async () => {
    if (command.trim() === "") return;
    const cmdToSend = command;

    setMessages((prev) => {
      const updated = [...prev, `> ${cmdToSend}`];
      saveHistoryToDB(vpnServerId!, updated);
      return updated;
    });

    addToCommandHistory(cmdToSend);
    setCommand("");
    historyIndexRef.current = -1;

    const connection = connectionRef.current;
    if (!connection || connection.state !== HubConnectionState.Connected) {
      setMessages((prev) => [...prev, "❌ Cannot send command: no connection to OpenVPN server."]);
      return;
    }

    try {
      await connection.send("SendCommand", cmdToSend);
    } catch (error: unknown) {
      setMessages((prev) => [...prev, `❌ Failed to send command to OpenVPN: ${errorMessage(error)}`]);
    }
  };

  const filteredCommands = OVP_MGMT_COMMANDS.filter((c) =>
    command.trim()
      ? c.name.toLowerCase().includes(command.trim().toLowerCase())
      : true,
  );

  const applyCommand = (cmd: string) => {
    setCommand(cmd);
    setShowCmdList(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCmdList) {
      if (e.key === "Escape") {
        setShowCmdList(false);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCmdIdx((i) => Math.min(i + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCmdIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && filteredCommands[selectedCmdIdx]) {
        e.preventDefault();
        applyCommand(filteredCommands[selectedCmdIdx].name);
        return;
      }
    }
    if (e.key === "Enter") {
      sendCommand();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      if (historyIndexRef.current < commandHistory.length - 1) {
        historyIndexRef.current++;
        setCommand(commandHistory[historyIndexRef.current] ?? "");
      } else if (historyIndexRef.current === -1) {
        historyIndexRef.current = 0;
        setCommand(commandHistory[0] ?? "");
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndexRef.current === -1) return;
      if (historyIndexRef.current === 0) {
        historyIndexRef.current = -1;
        setCommand("");
        return;
      }
      historyIndexRef.current--;
      setCommand(commandHistory[historyIndexRef.current] ?? "");
      return;
    }
    historyIndexRef.current = -1;
  };

  useEffect(() => {
    if (showCmdList) setSelectedCmdIdx(0);
  }, [showCmdList, command]);

  useEffect(() => {
    if (!showCmdList) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(e.target as Node)
      ) {
        setShowCmdList(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showCmdList]);

  const clearConsole = async () => {
    if (!vpnServerId) return;
    setMessages([]);
    setCommandHistory([]);
    historyIndexRef.current = -1;
    await clearHistoryDB(vpnServerId);
  };

  return (
    <div className="web-console-page">
      <h2 className="console-page-title console-page-title--with-icon">
        <FaTerminal className="icon" aria-hidden />
        <span>Web Console</span>
      </h2>
      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn danger" onClick={clearConsole}>
            <FaTrash className="icon" /> Clear Console
          </button>
        </div>
      </div>

      <div className="console-container">
        <div ref={consoleOutputRef} className="console-output">
          {messages.map((msg, index) => {
            const isCommand = msg.startsWith("> ");
            const isSuccess = msg.startsWith("✅");
            const isWarning = msg.startsWith("⚠️");
            const isError = msg.startsWith("❌");
            const statusClass = isSuccess
              ? "console-msg-success"
              : isWarning
                ? "console-msg-warning"
                : isError
                  ? "console-msg-error"
                  : "";
            return (
              <div
                key={index}
                className={`console-message ${isCommand ? "console-command" : ""} ${statusClass}`}
              >
                {highlightOvpMgmtLine(msg)}
              </div>
            );
          })}
        </div>
        <div ref={inputWrapperRef} className="console-input-wrapper">
          <div className="console-input">
            <span className="console-prompt">$</span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=" Enter command (↑↓ history)"
              className="console-input-field"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className={`btn secondary console-cmd-btn ${showCmdList ? "active" : ""}`}
              onClick={() => setShowCmdList((v) => !v)}
              title="Commands"
            >
              <FaList className="icon" />
            </button>
            <button className="btn primary console-send-btn" onClick={sendCommand}>
              <FaArrowRight className="icon" />
            </button>
          </div>
          {showCmdList && (
            <div
              ref={cmdListRef}
              className="console-cmd-list"
              role="listbox"
            >
              {filteredCommands.length === 0 ? (
                <div className="console-cmd-list-empty">No commands match</div>
              ) : (
                filteredCommands.slice(0, 20).map((c, i) => (
                  <div
                    key={c.name}
                    role="option"
                    aria-selected={i === selectedCmdIdx}
                    className={`console-cmd-item ${i === selectedCmdIdx ? "selected" : ""}`}
                    onMouseEnter={() => setSelectedCmdIdx(i)}
                    onClick={() => applyCommand(c.name)}
                  >
                    <span className="console-cmd-name">{c.name}</span>
                    {c.hint && (
                      <span className="console-cmd-hint">{c.hint}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="console-info">
        <h3>
          <FaInfoCircle className="icon" /> Important Information
        </h3>
        <p>
          This web console provides access to the <strong>OpenVPN Management Interface</strong>. Be careful when
          executing commands, as incorrect usage can affect VPN operations.
        </p>
        <p>For a full list of supported OpenVPN commands, please refer to the official documentation:</p>
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
        <p>
          <strong>Warning:</strong> Modifying server configurations via this interface requires proper knowledge of
          OpenVPN internals.
        </p>
      </div>
    </div>
  );
}

export default WebConsole;