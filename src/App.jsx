import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tasks from './pages/Tasks.jsx';
import Tickets from './pages/Tickets.jsx';
import Users from './pages/Users.jsx';
import Reports from './pages/Reports.jsx';
import CalendarView from './pages/CalendarView.jsx';
import Documents from './pages/Documents.jsx';
import Profile from './pages/Profile.jsx';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader">Loading Takora Mart...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/" element={<Private><Layout /></Private>}>
      <Route index element={<Dashboard />} />
      <Route path="tasks" element={<Tasks />} />
      <Route path="calendar" element={<CalendarView />} />
      <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
      <Route path="tickets" element={<Tickets />} />
      <Route path="reports" element={<Reports />} />
      <Route path="documents" element={<Documents />} />
      <Route path="profile" element={<Profile />} />
    </Route>
  </Routes>;
}
