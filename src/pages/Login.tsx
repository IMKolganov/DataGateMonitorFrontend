import { useState, useEffect } from "react";
import { fetchToken, setSecret, checkSystemStatus } from "../utils/api";
import { FaDoorOpen } from "react-icons/fa";
import "../css/Login.css";
import { appVersion } from '../version';

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
      } catch (err: any) {
        console.error("System status check error:", err);
  
        let detailedMessage = "Failed to check system status.";
        if (err.response) {
          detailedMessage += ` Server responded with status ${err.response.status}: ${err.response.statusText}`;
          if (err.response.data) {
            detailedMessage += ` - ${JSON.stringify(err.response.data)}`;
          }
        } else if (err.request) {
          detailedMessage += " No response received from server.";
        } else if (err.message) {
          detailedMessage += ` ${err.message}`;
        }
  
        if (err.config?.url) {
          const fullUrl = err.config.baseURL
            ? `${err.config.baseURL}${err.config.url}`
            : err.config.url;
  
          detailedMessage += `<br/>Try opening ${fullUrl} in your browser.`;
        }
  
        setError(detailedMessage);
      }
    };
  
    checkStatus();
  }, []);  

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    try {
      if (systemSet === false) {
        await setSecret(clientId, clientSecret);
        setSystemSet(true);
      }
  
      const token = await fetchToken(clientId, clientSecret);
      localStorage.setItem("token", token);
      window.location.href = "/";
    } catch (err: any) {
      console.error("Login error:", err);
  
      let detailedMessage = "Login failed.";
      if (err.response) {
        detailedMessage += ` Server responded with status ${err.response.status}: ${err.response.statusText}`;
        if (err.response.data) {
          detailedMessage += ` - ${JSON.stringify(err.response.data)}`;
        }
      } else if (err.request) {
        detailedMessage += " No response received from server.";
      } else if (err.message) {
        detailedMessage += ` ${err.message}`;
      }
  
      if (err.config?.url) {
        const fullUrl = err.config.baseURL
          ? `${err.config.baseURL}${err.config.url}`
          : err.config.url;
  
        detailedMessage += `<br/>Try opening ${fullUrl} in your browser.`;
      }
  
      setError(detailedMessage);
    } finally {
      setLoading(false);
    }
  };  

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login">
          <h2>Sign in</h2>
          {error && (
              <p
                className="error-message"
                dangerouslySetInnerHTML={{ __html: error }}
              ></p>
            )}

          <form onSubmit={handleLogin}>
            <div className="login-item">
              <h4>Login:</h4>
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="input input-login"
                placeholder="Login"
              />
            </div>

            <div className="login-item">
              <h4>Password:</h4>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="input input-login"
                placeholder="Password"
              />
            </div>

            <div className="login-item right">
              <button className="btn primary" type="submit" disabled={loading}>
                <FaDoorOpen className="icon" />
                {loading ? "Loading..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>

        <div className="register-container">
          <p>
            New to OpenVPN Gate Monitor?{" "}
            <a href="/register">Create an account</a>
          </p>
        </div>

        <div className="footer">
          <p>© 2024 OpenVPN Gate Monitor v. {appVersion}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
