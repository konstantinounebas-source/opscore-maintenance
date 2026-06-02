import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { base44 } from '@/api/base44Client';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard.jsx';
import Assets from '@/pages/Assets';
import AssetDetail from '@/pages/AssetDetail';
import Childs from '@/pages/Childs';
import Incidents from '@/pages/Incidents';
import IncidentDetail from '@/pages/IncidentDetail';
import IncidentForm from '@/pages/IncidentForm';
import WorkOrders from '@/pages/WorkOrders';
import ChildDetail from '@/pages/ChildDetail';
import Configuration from '@/pages/Configuration';
import Planning from '@/pages/Planning';
import PlanningWorkbench from '@/pages/PlanningWorkbench';
import Analytics from '@/pages/Analytics';
import Crews from '@/pages/Crews';
import SLAConfig from '@/pages/SLAConfig';
import BusStopLogs from '@/pages/BusStopLogs';
import StationLogSettings from '@/pages/StationLogSettings';
import PlanningWorkbenchSettings from '@/pages/PlanningWorkbenchSettings';
import FieldWorkerForm from '@/pages/FieldWorkerForm';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // FieldWorkerForm is a public page — no auth required
  if (window.location.pathname === '/FieldWorkerForm') {
    return (
      <Routes>
        <Route path="/FieldWorkerForm" element={<FieldWorkerForm />} />
      </Routes>
    );
  }

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
    }
    if (authError.type === 'auth_required') {
      // Redirect to login, then come back to the current URL
      base44.auth.redirectToLogin(window.location.href);
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      );
    }
    // Other errors: show a friendly message
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow border border-slate-200 p-8 text-center">
          <p className="text-lg font-semibold text-slate-800 mb-2">Unable to load application</p>
          <p className="text-sm text-slate-500 mb-6">{authError.message || 'An unexpected error occurred. Please try refreshing the page.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
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
        <Route path="/Planning" element={<PlanningWorkbench />} />
        <Route path="/PlanningLegacy" element={<Planning />} />
        <Route path="/Analytics" element={<Analytics />} />
        <Route path="/Crews" element={<Crews />} />
        <Route path="/SLAConfig" element={<SLAConfig />} />
        <Route path="/Configuration" element={<Configuration />} />
        <Route path="/BusStopLogs" element={<BusStopLogs />} />
        <Route path="/StationLogSettings" element={<StationLogSettings />} />
        <Route path="/PlanningWorkbenchSettings" element={<PlanningWorkbenchSettings />} />
      </Route>
      <Route path="/FieldWorkerForm" element={<FieldWorkerForm />} />
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