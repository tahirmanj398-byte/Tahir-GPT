import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chat from './pages/Chat';
import GPTs from './pages/GPTs';
import WebsiteGen from './pages/WebsiteGen';
import Profile from './pages/Profile';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ForgotPassword from './pages/ForgotPassword';
import { useAuthStore } from './store/authStore';
import { localDb } from './utils/localDb';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const { token } = useAuthStore();

  useEffect(() => {
    // Self-check backend health and optimize storage
    const init = async () => {
      try {
        localDb.optimizeStorage();
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    init();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!token ? <Signup /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          
          <Route path="/" element={token ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Chat />} />
            <Route path="chat/:id" element={<Chat />} />
            <Route path="gpts" element={<GPTs />} />
            <Route path="website" element={<WebsiteGen />} />
            <Route path="profile" element={<Profile />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
