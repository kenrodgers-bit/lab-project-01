import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, ShieldCheck } from 'lucide-react';
import { useAppState } from '../context/AppContext';
import { toast } from 'react-toastify';
import { backgroundOptions } from '../lib/backgrounds';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { currentUser, lowStockItems, logout, backgroundTheme, setBackgroundTheme } = useAppState();
  const previousLowStockCount = useRef(lowStockItems.length);

  const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'Inventory', href: '/inventory' },
    { name: 'Requests', href: '/requests' },
    { name: 'Reports', href: '/reports' },
    ...(currentUser?.role === 'admin' ? [{ name: 'Admin', href: '/admin' }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      previousLowStockCount.current = lowStockItems.length;
      return;
    }
    if (lowStockItems.length > previousLowStockCount.current) {
      toast.warn(`Low-stock alert: ${lowStockItems.length} item(s) need replenishment.`);
    }
    previousLowStockCount.current = lowStockItems.length;
  }, [currentUser?.role, lowStockItems.length]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/logo.svg" alt="Lab Inventory System" className="h-10 w-auto" />
            </Link>
          </div>

          <nav className="hidden md:flex space-x-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <select
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
              value={backgroundTheme}
              onChange={(event) => setBackgroundTheme(event.target.value as typeof backgroundTheme)}
              aria-label="Background theme"
            >
              {backgroundOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              {currentUser?.role === 'admin' ? (
                <ShieldCheck className="h-4 w-4 text-blue-700" />
              ) : (
                <User className="h-4 w-4 text-gray-500" />
              )}
              <span>{currentUser?.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                {currentUser?.role}
              </span>
            </div>
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pb-3">
            <div className="px-2 pt-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-3 py-2 rounded-full text-base font-medium ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="mt-3 border-t border-gray-200 pt-3 px-3">
              <label className="block text-xs text-slate-500 mb-1" htmlFor="mobile-background-theme">
                Background
              </label>
              <select
                id="mobile-background-theme"
                className="mb-3 w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                value={backgroundTheme}
                onChange={(event) => setBackgroundTheme(event.target.value as typeof backgroundTheme)}
              >
                {backgroundOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-700 mb-3">
                {currentUser?.name} ({currentUser?.role})
              </p>
              <button
                type="button"
                className="block w-full text-left px-3 py-2 rounded-full text-gray-600 hover:bg-gray-50"
                onClick={logout}
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
