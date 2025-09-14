import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { toggleTheme } from '../utils/themeManager';

function IconSwitch({ theme, setTheme }) {
    const handleToggle = () => {
        const next = toggleTheme();
        setTheme(next);
    };

    return (
        <button
            onClick={handleToggle}
            className={`w-16 h-8 flex items-center justify-between px-1 rounded-full relative transition-colors duration-300
        ${theme === 'dark' ? 'bg-gray-800' : 'bg-yellow-300'}`}
            aria-label="Toggle Dark Mode"
        >
            <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-300 z-10" />
            <SunIcon className="h-5 w-5 text-yellow-500 z-10" />
            <span
                className={`absolute top-0 left-0 h-8 w-8 rounded-full shadow-md transform transition-transform duration-300
          ${theme === 'dark' ? 'translate-x-8 bg-gray-900' : 'translate-x-0 bg-white'}`}
            />
        </button>
    );
}

export default IconSwitch;
