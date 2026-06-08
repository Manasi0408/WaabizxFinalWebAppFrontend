import React from 'react';
import ThemeToggle from './ThemeToggle';
import { canUseHeaderTheme } from '../utils/themeAccess';

export default function HeaderThemeToggle({ showDivider = true }) {
  if (!canUseHeaderTheme()) return null;

  return (
    <>
      {showDivider ? (
        <span className="text-gray-300 hidden md:block shrink-0 dark:text-slate-600" aria-hidden>
          |
        </span>
      ) : null}
      <ThemeToggle />
    </>
  );
}
