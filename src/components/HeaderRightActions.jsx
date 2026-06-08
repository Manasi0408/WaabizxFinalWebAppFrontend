import React from 'react';
import HeaderThemeToggle from './HeaderThemeToggle';

/**
 * Standard header right cluster: theme toggle + page actions (notifications, profile, etc.)
 */
export default function HeaderRightActions({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-3 md:gap-4 ${className}`.trim()}>
      <HeaderThemeToggle showDivider={false} />
      {children}
    </div>
  );
}
