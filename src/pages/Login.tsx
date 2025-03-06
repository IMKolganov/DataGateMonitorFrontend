import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchToken, setSecret, checkSystemStatus } from "../utils/api";
import { FaDoorOpen } from "react-icons/fa";
import "../css/Login.css";

const Login = () => {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemSet, setSystemSet] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isSystemSet = await checkSystemStatus();
        setSystemSet(isSystemSet);
      } catch {
        setError("Failed to check system status.");
      }
    };

    checkStatus();
  }, []);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      if (systemSet === false) {
        await setSecret(clientId, clientSecret);
        setSystemSet(true);
      }

      let token = await fetchToken(clientId, clientSecret);
      localStorage.setItem("token", token);
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">


        <div className="login">
          <h2>Sign in</h2>

          <div className="login-item">
            <h4>Client ID:</h4>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input input-login"
              placeholder="Client ID"
            />
          </div>

          <div className="login-item">
            <h4>Client Secret:</h4>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="input input-login"
              placeholder="Client Secret"
            />
          </div>

          <div className="login-item right">
            <button className="btn primary" onClick={handleLogin} disabled={loading}>
              <FaDoorOpen className="icon" />
              {loading ? "Loading..." : "Sign in"}
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="register-container">
          <p>New to OpenVPN Gate Monitor? <a href="/register">Create an account</a></p>
        </div>

        <div className="footer">
          <p>© 2024 OpenVPN Gate Monitor</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
