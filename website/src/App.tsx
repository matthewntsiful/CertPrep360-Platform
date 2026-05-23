import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';

// --- Lazy-loaded Pages ---
const Home = lazy(() => import('./pages/Home'));
const Exam = lazy(() => import('./pages/Exam'));
const DynamicQuizPage = lazy(() => import('./pages/DynamicQuiz'));
const ExamHub = lazy(() => import('./pages/ExamHub'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Sitemap = lazy(() => import('./pages/Sitemap'));
const Status = lazy(() => import('./pages/Status'));
const AdminOverview = lazy(() => import('./pages/AdminOverview'));
const AdminContentManager = lazy(() => import('./pages/AdminContentManager'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminUserManager = lazy(() => import('./pages/AdminUserManager'));
const AdminAIFactory = lazy(() => import('./pages/AdminAIFactory'));
const SignUp = lazy(() => import('./pages/SignUp'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const SampleQuestions = lazy(() => import('./pages/SampleQuestions'));
const CommunityForum = lazy(() => import('./pages/CommunityForum'));
const ContactSupport = lazy(() => import('./pages/ContactSupport'));
const History = lazy(() => import('./pages/History'));
const ResultReview = lazy(() => import('./pages/ResultReview'));


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

// Root layout that provides Layout + ScrollToTop within the data router context
const RootLayout: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Layout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          </div>
        }>
          <Outlet />
        </Suspense>
      </Layout>
    </>
  );
};

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <SignUp /> },
      {
        path: "/dashboard",
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
      },
      {
        path: "/history",
        element: <ProtectedRoute><History /></ProtectedRoute>,
      },
      {
        path: "/results/:attemptId",
        element: <ProtectedRoute><ResultReview /></ProtectedRoute>,
      },
      {
        path: "/exam/:certId/:examId",
        element: <ProtectedRoute><Exam /></ProtectedRoute>,
      },
      {
        path: "/quiz/dynamic/:domain?",
        element: <ProtectedRoute><DynamicQuizPage /></ProtectedRoute>,
      },
      { path: "/certification/:certId", element: <ExamHub /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/terms", element: <Terms /> },
      { path: "/sitemap", element: <Sitemap /> },
      { path: "/status", element: <Status /> },
      { path: "/knowledge-base", element: <KnowledgeBase /> },
      { path: "/sample-questions", element: <SampleQuestions /> },
      { path: "/community", element: <CommunityForum /> },
      { path: "/support", element: <ContactSupport /> },
      {
        path: "/admin",
        element: <AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>,
        children: [
          { index: true, element: <AdminOverview /> },
          { path: "ai-generator", element: <AdminAIFactory /> },
          { path: "content", element: <AdminContentManager /> },
          { path: "users", element: <AdminUserManager /> },
          { path: "analytics", element: <AdminAnalytics /> },
          { path: "settings", element: <div className="p-10 text-slate-500 font-mono text-xs uppercase tracking-widest text-center py-40">System Configuration<br/><span className="text-slate-800 text-[8px]">Coming Soon</span></div> },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
