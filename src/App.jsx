import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Assets from '@/pages/Assets';
import AssetDetail from '@/pages/AssetDetail';
import Childs from '@/pages/Childs';
import Incidents from '@/pages/Incidents';
import IncidentDetail from '@/pages/IncidentDetail';
import IncidentForm from '@/pages/IncidentForm';
import WorkOrders from '@/pages/WorkOrders';
import ChildDetail from '@/pages/ChildDetail';
import Configuration from '@/pages/Configuration';
import Assistant from '@/pages/Assistant';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Assets" element={<Assets />} />
        <Route path="/AssetDetail" element={<AssetDetail />} />
        <Route path="/Childs" element={<Childs />} />
        <Route path="/ChildDetail" element={<ChildDetail />} />
        <Route path="/Incidents" element={<Incidents />} />
        <Route path="/IncidentDetail" element={<IncidentDetail />} />
        <Route path="/IncidentForm" element={<IncidentForm />} />
        <Route path="/WorkOrders" element={<WorkOrders />} />
        <Route path="/Configuration" element={<Configuration />} />
        <Route path="/Assistant" element={<Assistant />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App