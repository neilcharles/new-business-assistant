import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { User } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface HeaderProps {
    user: User | null;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

  return (
    <header className="bg-white dark:bg-slate-800/50 shadow-sm sticky top-0 z-10 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 md:px-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
            <SparklesIcon className="w-8 h-8 text-indigo-500" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            New Business Assistant
            </h1>
        </div>
        {user && (
            <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center space-x-2 focus:outline-none">
                    {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                        <UserCircleIcon className="w-8 h-8 text-slate-500" />
                    )}
                    <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">{user.name}</span>
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                        <button
                            onClick={() => {
                                onLogout();
                                setMenuOpen(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
    </header>
  );
};
