import { NavLink } from 'react-router-dom';
import { hasManagerModuleAccess } from '../utils/managerAccess';

const linkClass = ({ isActive }) =>
  `flex flex-row md:flex-col items-center gap-2 md:gap-1 px-3 md:px-2 py-2.5 md:py-3 rounded-lg transition-all duration-300 ease-out will-change-transform group active:scale-[0.96] [&>svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-300 [&>svg]:ease-out group-hover:[&>svg]:scale-110 md:group-hover:[&>svg]:-rotate-6 ${
    isActive
      ? 'bg-sky-600 text-white font-medium shadow-md shadow-sky-900/40 md:scale-[1.02]'
      : 'text-sky-100/90 hover:bg-sky-800/90 hover:text-white md:hover:scale-[1.06] md:hover:shadow-lg'
  }`;

const items = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    to: '/campaigns',
    label: 'Campaigns',
    moduleKey: 'campaign',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    to: '/broadcast',
    label: 'Broadcast',
    moduleKey: 'broadcast',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
        />
      </svg>
    ),
  },
  {
    to: '/templates',
    label: 'Templates',
    moduleKey: 'template',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    moduleKey: 'analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    to: '/flows',
    label: 'Flows',
    moduleKey: 'flows',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h8M4 18h16M14 12l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    to: '/contacts',
    label: 'Contacts',
    moduleKey: 'contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    to: '/inbox',
    label: 'Inbox',
    moduleKey: 'inbox',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: 'Reports',
    moduleKey: 'reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    to: '/manage',
    label: 'Manage',
    moduleKey: 'manage',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/project-dashboard',
    label: 'My Projects',
    moduleKey: 'myProjects',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
];

/**
 * Icon-only main app nav — same order on every screen: Dashboard → … → Manage → Profile.
 * Parent aside should be `h-full flex flex-col overflow-hidden`; only this list scrolls when needed.
 * @param {{ navClassName?: string; listClassName?: string }} props
 */
export default function MainSidebarNav({ navClassName = '', listClassName = '', onNavigate }) {
  const navClasses = [
    'flex',
    'h-full',
    'min-h-0',
    'flex-col',
    'overflow-hidden',
    'p-2',
    'max-md:p-0',
    navClassName,
  ]
    .filter(Boolean)
    .join(' ');
  const listClasses = [
    'sidebar-nav-stagger',
    'min-h-0',
    'flex-1',
    'overflow-y-auto',
    'overflow-x-hidden',
    'scrollbar-sidebar-none',
    'max-md:grid',
    'max-md:grid-cols-3',
    'max-md:gap-2',
    'max-md:p-4',
    'max-md:flex-none',
    'md:space-y-1',
    listClassName,
  ]
    .filter(Boolean)
    .join(' ');
  const visibleItems = items.filter(({ moduleKey }) => hasManagerModuleAccess(moduleKey));
  return (
    <nav className={navClasses}>
      <ul className={listClasses}>
        {visibleItems.map(({ to, label, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={linkClass}
              title={label}
              onClick={() => onNavigate?.()}
            >
              {icon}
              <span className="text-xs md:text-[10px] leading-tight md:text-center md:mt-0.5 font-medium">
                {label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
