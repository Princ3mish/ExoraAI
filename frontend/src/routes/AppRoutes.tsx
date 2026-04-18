import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

import Login from '../pages/Login';
import Register from '../pages/Register';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardOverview from '../pages/dashboard/DashboardOverview';
import MeetingsList from '../pages/dashboard/MeetingsList';
import CreateMeeting from '../pages/dashboard/CreateMeeting';
import MeetingDetail from '../pages/dashboard/MeetingDetail';
import SettingsPage from '../pages/dashboard/SettingsPage';

export const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; 
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
      />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="meetings" element={<MeetingsList />} />
          <Route path="meetings/new" element={<CreateMeeting />} />
          <Route path="meetings/:id" element={<MeetingDetail />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};
