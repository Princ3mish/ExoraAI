import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import OnboardingPage from './pages/OnboardingPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public landing page — always visible, no auth required */}
          <Route path="/" element={<Landing />} />

          {/* Auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — require auth */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>

          {/* Catch-all → landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

