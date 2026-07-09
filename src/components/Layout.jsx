import React, { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, CalendarDays, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Ticket, UserCog, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const baseLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/users', label: 'Team Members', icon: UserCog, adminOnly: true },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/profile', label: 'Profile', icon: UserRound }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = useMemo(() => baseLinks.filter(link => !link.adminOnly || user?.role === 'admin'), [user?.role]);
  return (
    <div className="appShell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img src="/takora-logo.png" alt="Takora Mart" />
          <div><strong>Takora Mart</strong><span>Task Management</span></div>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><Icon size={18} /> {label}</NavLink>
          ))}
        </nav>
        <button className="logout" onClick={logout}><LogOut size={18} /> Logout</button>
      </aside>
      <main className="mainPanel">
        <header className="topbar">
          <button className="hamburger" onClick={() => setOpen(!open)}><Menu /></button>
          <div><h1>Takora Mart Work OS</h1><p>{user?.name} • {user?.role} • {user?.department}</p></div>
          <NotificationBell />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
