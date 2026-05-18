import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';
import { AWS_CONFIG } from './config';

Amplify.configure(AWS_CONFIG);

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-black text-red-500">Something went wrong</h1>
        <p className="text-slate-400 text-sm">{error.message}</p>
        <button 
          onClick={resetErrorBoundary}
          className="px-6 py-3 bg-white text-slate-950 font-bold rounded-lg hover:bg-slate-200 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <App />
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { background: '#020617', color: '#fff', border: '1px solid #1e293b' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }} 
      />
    </ErrorBoundary>
  </StrictMode>,
);
