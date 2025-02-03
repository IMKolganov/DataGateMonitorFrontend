import Cookies from "js-cookie";
import { FaSave } from "react-icons/fa";

type Props = {
  refreshInterval: number;
  setRefreshInterval: (value: number) => void;
  onSave: () => void;
};

export default function RefreshIntervalSetter({ refreshInterval, setRefreshInterval, onSave }: Props) {
  const handleSaveInterval = () => {
    Cookies.set("refreshInterval", String(refreshInterval), { expires: 365 });
    onSave();
  };

  return (
    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
      <label>
        Auto-refresh every (seconds):&nbsp;
        <input
          type="number"
          className="input-number"
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Math.max(5, Number(e.target.value)))}
          min="5"
        />
      </label>
      <button className="btn primary" onClick={handleSaveInterval}>
        <FaSave /> Set
      </button>
    </div>
  );
}
