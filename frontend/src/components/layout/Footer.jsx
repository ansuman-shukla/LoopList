import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white dark:bg-gray-800 shadow-inner mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
              LoopList
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Build micro-habits with visual progress
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6 text-sm">
            <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
              Home
            </Link>
            <Link to="/leaderboard" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
              Leaderboard
            </Link>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
              Terms of Service
            </a>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          &copy; {currentYear} LoopList. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
