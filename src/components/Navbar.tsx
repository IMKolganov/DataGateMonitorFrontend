import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 text-white">
      <ul className="flex space-x-4">
        <li><Link to="/">Dashboard</Link></li>
      </ul>
    </nav>
  );
}

export default Navbar;
