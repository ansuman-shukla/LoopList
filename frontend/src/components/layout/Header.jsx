import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Check for user preference on component mount
  useEffect(() => {
    // Check if user has a saved preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';

    // Check for system preference if no saved preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set dark mode based on saved preference or system preference
    const shouldEnableDark = savedDarkMode || prefersDark;
    setDarkMode(shouldEnableDark);

    // Apply dark mode class to html element
    if (shouldEnableDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    // Save preference to localStorage
    localStorage.setItem('darkMode', newDarkMode.toString());

    // Apply or remove dark mode class
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm w-full">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            LoopList
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Home
            </Link>

            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                  Dashboard
                </Link>
                <Link to="/friends" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                  Friends
                </Link>
                <Link to="/leaderboard" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                  Leaderboard
                </Link>
              </>
            ) : (
              <Link to="/leaderboard" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                Leaderboard
              </Link>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {isAuthenticated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700 dark:text-gray-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/friends"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Friends
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Leaderboard
                  </Link>
                </>
              ) : (
                <Link
                  to="/leaderboard"
                  className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Leaderboard
                </Link>
              )}

              {/* Dark Mode Toggle - Mobile */}
              <button
                onClick={() => {
                  toggleDarkMode();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                aria-label="Toggle Dark Mode"
              >
                <span className="mr-2">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  Logout
                </Button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="outline" size="sm" className="w-full">Login</Button>
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button size="sm" className="w-full">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
