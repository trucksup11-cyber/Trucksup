import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-5">
      <h2 className="text-2xl font-bold mb-6">🚛 Trucks-up</h2>

      <nav className="flex flex-col gap-4">
        <Link to="/admin" className="hover:text-blue-400">
          Dashboard
        </Link>
        <Link to="/admin/trucks" className="hover:text-blue-400">
          Trucks
        </Link>
        <Link to="/loads" className="hover:text-blue-400">
          Loads
        </Link>
          <Link to="/map" className="hover:text-blue-400">
            Map
            </Link>
            <Link to="/driver" className="hover:text-blue-400">
             Driver Dashboard
            </Link>
      </nav>
    </div>
  );
}