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
