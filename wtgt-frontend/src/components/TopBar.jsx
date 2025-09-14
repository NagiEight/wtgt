import IconSwitch from './IconSwitch';
import { Link } from 'react-router-dom';

const Topbar = ({ theme, setTheme }) => {
    const isDark = document.documentElement.classList.contains('dark');
    return (
        <header className={`w-full h-16 ${isDark ? 'bg-zinc-600 text-white' : 'bg-white text-gray-800'} shadow-sm fixed top-0 left-0 z-50`}>
            <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 h-full">
                    <div className="flex space-x-1 text-2xl font-extrabold tracking-wide">
                        <span className="text-cyan-400">W</span>
                        <span className="text-pink-500">T</span>
                        <span className="text-yellow-400">G</span>
                        <span className={`${isDark ? 'bg-zinc-600 text-white' : 'bg-white text-gray-800'}`}>T</span>
                    </div>
                </div>

                <div className="flex items-center h-full space-x-4">
                    <nav className="flex h-full">
                        {/* nav buttons */}
                    </nav>
                    <IconSwitch theme={theme} setTheme={setTheme} />
                </div>
            </div>
        </header>
    );
};

export default Topbar;
