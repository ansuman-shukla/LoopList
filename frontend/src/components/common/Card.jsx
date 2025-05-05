import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className={`card bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
