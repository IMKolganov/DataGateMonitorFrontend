import { useParams } from "react-router-dom";

const Statistics: React.FC = ()=> {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();

  return (
    <div>
      <h2>Statistics {vpnServerId}</h2>
      <div className="header-containe">
      </div>
    </div>
  );
};

export default Statistics;
