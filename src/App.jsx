import React from 'react';
import { useInfrastructure } from './presentation/hooks/useInfrastructure';
import { LandingPage } from './presentation/pages/LandingPage';
import { DashboardPage } from './presentation/pages/DashboardPage';
import { ToastProvider } from './presentation/context/ToastContext';
import { ToastContainer } from './presentation/components/Toast/ToastContainer';

function AppContent() {
  const infra = useInfrastructure();

  if (infra.showDashboard) {
    return <DashboardPage {...infra} />;
  }

  return (
    <LandingPage
      setShowDashboard={infra.setShowDashboard}
      clicks={infra.clicks}
      setClicks={infra.setClicks}
      createProject={infra.createProject}
      fetchInfrastructure={infra.fetchInfrastructure}
    />
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
      <ToastContainer />
    </ToastProvider>
  );
}

export default App;

