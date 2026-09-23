import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import OrganizationPortalLayout from './components/organization/OrganizationPortalLayout';
import OrgProfileView from './components/organization/OrgProfileView';
import OrgAssessmentsView from './components/organization/OrgAssessmentsView';
import OrgAssessmentWizard from './components/organization/OrgAssessmentWizard';
import OrgContestsView from './components/organization/OrgContestsView';
import OrgContestWizard from './components/organization/OrgContestWizard';
import OrgParticipantsView from './components/organization/OrgParticipantsView';
import OrgResultsAnalyticsView from './components/organization/OrgResultsAnalyticsView';
import OrgCertificatesView from './components/organization/OrgCertificatesView';
import OrgDocumentsView from './components/organization/OrgDocumentsView';
import OrgNotificationsView from './components/organization/OrgNotificationsView';
import OrgSettingsView from './components/organization/OrgSettingsView';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('org-dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    window.location.href = '/';
  };

  // Mock fetchUserProfile for demonstration
  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUserProfile(); }, [token]);

  if (user?.role === 'organization') {
    const renderOrgContent = () => {
      switch (currentPage) {
        case 'org-profile': return <OrgProfileView token={token} />;
        case 'org-assessments': return <OrgAssessmentsView token={token} onNavigateToWizard={() => setCurrentPage('org-create-assessment')} />;
        case 'org-create-assessment': return <OrgAssessmentWizard token={token} onComplete={() => setCurrentPage('org-assessments')} />;
        case 'org-contests': return <OrgContestsView token={token} onNavigateToWizard={() => setCurrentPage('org-create-contest')} />;
        case 'org-create-contest': return <OrgContestWizard token={token} onComplete={() => setCurrentPage('org-contests')} />;
        case 'org-participants': return <OrgParticipantsView token={token} />;
        case 'org-analytics': return <OrgResultsAnalyticsView token={token} />;
        case 'org-certificates': return <OrgCertificatesView token={token} />;
        case 'org-documents': return <OrgDocumentsView token={token} />;
        case 'org-notifications': return <OrgNotificationsView token={token} />;
        case 'org-settings': return <OrgSettingsView token={token} />;
        default: return <div>Dashboard Overview</div>;
      }
    };

    return (
      <OrganizationPortalLayout 
        user={user} 
        token={token} 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        handleLogout={handleLogout}
      >
        {renderOrgContent()}
      </OrganizationPortalLayout>
    );
  }

  return (
    <div className="app-container">
      {currentPage === 'landing' ? <LandingPage /> : <div>Main App Content</div>}
    </div>
  );
}
