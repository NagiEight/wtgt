import { FaPlay, FaSearch, FaBell, FaUserCircle } from "react-icons/fa";

export default function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white shadow-md">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <FaPlay className="text-white text-xl" />
        <span className="text-xl font-bold">WTGT</span>
      </div>

      {/* Search Bar */}
      <div className="flex-1 mx-4 max-w-xl">
        <div className="flex items-center bg-gray-800 rounded-full overflow-hidden">
          <input
            type="text"
            placeholder="Search"
            className="flex-1 px-4 py-2 bg-transparent text-white focus:outline-none"
          />
          <button className="px-4 py-2 bg-gray-800 border-white border-l-1 hover:bg-gray-900 rounded-full cursor-pointer">
            <FaSearch />
          </button>
        </div>
      </div>

      {/* Icons */}
      <div className="flex items-center gap-4">
        <FaBell className="text-xl cursor-pointer hover:text-gray-400" />
        <FaUserCircle className="text-2xl cursor-pointer hover:text-gray-400" />
      </div>
    </header>
  );
}
