import { useParams } from "react-router-dom";

const Events: React.FC = ()=> {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();

  return (
    <div>
      <h2>Events {vpnServerId}</h2>
      <div className="header-containe">
      </div>
    </div>
  );
};

export default Events;
