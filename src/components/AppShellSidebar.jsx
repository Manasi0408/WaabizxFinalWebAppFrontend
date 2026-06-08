/**
 * Desktop: fixed left icon rail (always visible md+).
 * Mobile: full-width panel slides open top → bottom below the header.
 */
export default function AppShellSidebar({ open, onClose, children }) {
  return (
    <>
      {/* Desktop — left sidebar */}
      <aside className="hidden md:flex md:w-20 h-full shrink-0 flex-col overflow-hidden bg-sky-950 text-white border-r border-sky-900">
        {children}
      </aside>

      {/* Mobile — backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile — drops down from below header */}
      <aside
        className={`fixed left-0 right-0 z-50 md:hidden top-14 max-h-[min(75vh,calc(100vh-3.5rem))] overflow-y-auto bg-sky-950 text-white border-b border-sky-800 shadow-2xl shadow-sky-950/50 transition-all duration-300 ease-out ${
          open
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {children}
      </aside>
    </>
  );
}
