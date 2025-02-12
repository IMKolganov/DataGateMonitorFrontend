import ServerList from "../components/ServerList";

export function Servers() {
  return (
    <div className="content-wrapper wide-table">
      <h2>VPN Servers:</h2>
      <ServerList />
    </div>
  );
}

export default Servers;
