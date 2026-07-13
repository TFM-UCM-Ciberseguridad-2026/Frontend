import React from 'react';
import { useInfrastructure } from './presentation/hooks/useInfrastructure';
import { LandingPage } from './presentation/pages/LandingPage';
import { DashboardPage } from './presentation/pages/DashboardPage';

function App() {
  const infra = useInfrastructure();

  if (infra.showDashboard) {
    return <DashboardPage {...infra} />;
  }

  return (
    <LandingPage
      setShowDashboard={infra.setShowDashboard}
      clicks={infra.clicks}
      setClicks={infra.setClicks}
    />
  );
}

export default App;
