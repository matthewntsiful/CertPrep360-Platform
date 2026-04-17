import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Exam from './pages/Exam';
import ExamHub from './pages/ExamHub';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Sitemap from './pages/Sitemap';
import Status from './pages/Status';
import AdminOverview from './pages/AdminOverview';
import AdminContentManager from './pages/AdminContentManager';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminUserManager from './pages/AdminUserManager';
import SignUp from './pages/SignUp';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';
import { AuthProvider, useAuth } from './context/AuthContext';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/exam/:certId/:examId" 
                element={
                  <ProtectedRoute>
                    <Exam />
                  </ProtectedRoute>
                } 
              />
              <Route path="/certification/:certId" element={<ExamHub />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="/status" element={<Status />} />

              {/* Admin Routes */}
              <Route 
                path="/admin" 
                element={
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                }
              >
                <Route index element={<AdminOverview />} />
                <Route path="ai-generator" element={<div className="p-10 text-slate-500 font-mono text-xs uppercase tracking-widest text-center py-40">AI Content Factory<br/><span className="text-slate-800 text-[8px]">Phase 3 Deployment Required</span></div>} />
                <Route path="content" element={<AdminContentManager />} />
                <Route path="users" element={<AdminUserManager />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<div className="p-10 text-slate-500 font-mono text-xs uppercase tracking-widest text-center py-40">System Configuration<br/><span className="text-slate-800 text-[8px]">Coming Soon</span></div>} />
              </Route>
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
