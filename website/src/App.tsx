import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Exam from './pages/Exam';
import DynamicQuizPage from './pages/DynamicQuiz';
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
import AdminAIFactory from './pages/AdminAIFactory';
import SignUp from './pages/SignUp';
import KnowledgeBase from './pages/KnowledgeBase';
import SampleQuestions from './pages/SampleQuestions';
import CommunityForum from './pages/CommunityForum';
import ContactSupport from './pages/ContactSupport';
import History from './pages/History';
import ResultReview from './pages/ResultReview';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';
import { AuthProvider, useAuth } from './context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // Data stays fresh for 5 minutes — no refetch on tab switch
      gcTime: 10 * 60 * 1000,        // Keep unused data in cache for 10 minutes
      retry: 1,                       // Only retry once on failure (Lambda cold start)
      refetchOnWindowFocus: false,    // Don't hammer the API when user switches tabs
    },
  },
});

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
                path="/history" 
                element={
                  <ProtectedRoute>
                    <History />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/results/:attemptId" 
                element={
                  <ProtectedRoute>
                    <ResultReview />
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
              <Route 
                path="/quiz/dynamic/:domain" 
                element={
                  <ProtectedRoute>
                    <DynamicQuizPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/certification/:certId" element={<ExamHub />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="/status" element={<Status />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/sample-questions" element={<SampleQuestions />} />
              <Route path="/community" element={<CommunityForum />} />
              <Route path="/support" element={<ContactSupport />} />

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
                <Route path="ai-generator" element={<AdminAIFactory />} />
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
