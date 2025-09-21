import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Bars3Icon,
    MagnifyingGlassIcon,
    ArrowUpTrayIcon,
    BellIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';
import NotificationCard from './NotificationCard';

document.documentElement.setAttribute('data-theme', 'light');

const Topbar = () => {
    const [openMenu, setOpenMenu] = useState(null);
    const [isDark, setIsDark] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    const toggleMenu = (menu) => {
        setOpenMenu(openMenu === menu ? null : menu);
    };

    const handleAppearanceToggle = () => {
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        setIsDark(!isDark);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const notifications = [
        {
            avt: '/avatars/user1.png',
            content: 'New episode of *Jujutsu Kaisen* is live!',
            timestamp: '2 hours ago'
        },
        {
            avt: '/avatars/user2.png',
            content: 'Nagi joined your stream.',
            timestamp: 'Yesterday'
        },
        {
            avt: '/avatars/user3.png',
            content: 'Upload complete.',
            timestamp: 'Just now'
        }
    ];

    return (
        <header className="w-full bg-[var(--color-cyan-100)] text-[var(--color-black-500)] shadow-md h-16 relative z-50">
            <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

                {/* Left: Hamburger + Logo */}
                <div className="flex items-center space-x-4 relative">
                    <button onClick={() => toggleMenu('hamburger')} className="p-2 hover:bg-[var(--color-cyan-300)] rounded-md">
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                    <Link to="/" className="text-2xl font-bold font-[var(--font-display)] flex space-x-1 items-center">
                        <span className="text-[var(--color-cyan-500)]">W</span>
                        <span className="text-[var(--color-magenta-500)]">T</span>
                        <span className="text-[var(--color-yellow-500)]">G</span>
                        <span className="text-[var(--color-black-500)]">T</span>
                    </Link>

                    {openMenu === 'hamburger' && (
                        <div ref={menuRef} className="absolute top-14 left-0 bg-white shadow-lg rounded-md w-40 py-2">
                            <Link to="/host" className="block px-4 py-2 hover:bg-[var(--color-cyan-200)]">Host</Link>
                            <Link to="/join" className="block px-4 py-2 hover:bg-[var(--color-cyan-200)]">Join</Link>
                            <Link to="/library" className="block px-4 py-2 hover:bg-[var(--color-cyan-200)]">Library</Link>
                        </div>
                    )}
                </div>

                {/* Center: Search Bar */}
                <div className="flex-1 mx-6">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full px-4 py-2 rounded-md bg-white text-black shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-500)]"
                    />
                </div>

                {/* Right: Icons */}
                <div className="flex items-center space-x-4 relative">
                    {/* Upload */}
                    <div className="relative">
                        <button onClick={() => toggleMenu('upload')} className="p-2 hover:bg-[var(--color-cyan-300)] rounded-md">
                            <ArrowUpTrayIcon className="h-6 w-6" />
                        </button>
                        {openMenu === 'upload' && (
                            <div ref={menuRef} className="absolute top-14 right-0 bg-white shadow-lg rounded-md w-40 py-2">
                                <button onClick={() => navigate('/stream')} className="block w-full text-left px-4 py-2 hover:bg-[var(--color-cyan-200)]">Stream</button>
                                <button onClick={() => navigate('/upload')} className="block w-full text-left px-4 py-2 hover:bg-[var(--color-cyan-200)]">Upload</button>
                            </div>
                        )}
                    </div>

                    {/* Notification */}
                    <div className="relative">
                        <button onClick={() => toggleMenu('notification')} className="p-2 hover:bg-[var(--color-cyan-300)] rounded-md">
                            <BellIcon className="h-6 w-6" />
                        </button>
                        {openMenu === 'notification' && (
                            <div ref={menuRef} className="absolute top-14 right-0 bg-white shadow-lg rounded-md w-72 py-2">
                                {notifications.map((note, idx) => (
                                    <NotificationCard key={idx} {...note} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Profile */}
                    <div className="relative">
                        <button onClick={() => toggleMenu('profile')} className="p-2 hover:bg-[var(--color-cyan-300)] rounded-full">
                            <UserCircleIcon className="h-6 w-6" />
                        </button>
                        {openMenu === 'profile' && (
                            <div ref={menuRef} className="absolute top-14 right-0 bg-white shadow-lg rounded-md w-56 py-2">
                                <Link to="/register" className="block px-4 py-2 hover:bg-[var(--color-cyan-200)]">Register</Link>
                                <div className="flex items-center justify-between px-4 py-2 hover:bg-[var(--color-cyan-200)]">
                                    <span>Appearance</span>
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isDark}
                                            onChange={handleAppearanceToggle}
                                            className="sr-only"
                                        />
                                        <div className="w-10 h-5 bg-gray-300 rounded-full p-1 flex items-center">
                                            <div
                                                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${isDark ? 'translate-x-5' : ''
                                                    }`}
                                            />
                                        </div>
                                    </label>
                                </div>
                                <div className="px-4 py-2 hover:bg-[var(--color-cyan-200)]">
                                    <span>Language</span>
                                    <div className="mt-2 ml-2 space-y-1">
                                        <button className="block text-left w-full hover:text-[var(--color-cyan-500)]">English</button>
                                        <button className="block text-left w-full hover:text-[var(--color-cyan-500)]">Japanese</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
