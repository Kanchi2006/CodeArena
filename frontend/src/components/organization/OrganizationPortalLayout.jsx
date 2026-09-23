import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Trophy, 
  Settings, 
  LogOut, 
  User, 
  FileText, 
  BarChart2, 
  FolderOpen, 
  HelpCircle, 
  Menu, 
  Mail, 
  Award,
  Users,
  Building2
} from 'lucide-react';

import { useTranslation } from '../../i18n/I18nContext';

const API_BASE = '/api';

const getVerificationBadge = (status) => {
  switch (status) {
    case 'VERIFIED':
      return { text: 'Verified', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.15)' };
    case 'PENDING':
    case 'UNDER_REVIEW':
      return { text: 'Pending', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.15)' };
    case 'REJECTED':
      return { text: 'Rejected', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.15)' };
    default:
      return { text: 'Not Registered', color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)' };
  }
};

export default function OrganizationPortalLayout({ 
  user, 
  token, 
  currentPage, 
  setCurrentPage, 
  handleLogout
}) {
  const { t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const verificationStatus = getVerificationBadge(user?.org_status);

  const sidebarWidth = isSidebarCollapsed ? '60px' : '260px';
  const mainContentMarginLeft = isSidebarCollapsed ? '60px' : '260px';

  const handleNavClick = (page) => {
    setCurrentPage(page);
    if (isSidebarCollapsed) setIsSidebarCollapsed(false);
  };

  const [orgProfile, setOrgProfile] = useState(null);
  useEffect(() => {
    if (user && user.role === 'organization') {
      fetch(`${API_BASE}/organization/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { if (data?.profile) setOrgProfile(data.profile); })
      .catch(err => console.error('Error fetching org profile:', err));
    }
  }, [user, token]);

  const orgName = orgProfile?.organization_name || user?.display_name || 'Organization';
  const orgType = orgProfile?.organization_type || 'N/A';

  return (
    <div className="app-container">
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ width: sidebarWidth }}>
        <div className="sidebar-logo" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)' }}>
          <Building2 size={26} color="var(--primary)" />
          <span className="logo-text" style={{ fontWeight: '700', fontSize: '1.1rem' }}>{isSidebarCollapsed ? '' : 'Organization'}</span>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
            <Menu size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {[
            { id: 'org-dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'org-profile', label: 'Organization Profile', icon: User },
            { id: 'org-assessments', label: 'My Assessments', icon: FileText },
            { id: 'org-create-assessment', label: 'Create Assessment', icon: Plus },
            { id: 'org-contests', label: 'My Contests', icon: Trophy },
            { id: 'org-create-contest', label: 'Create Contest', icon: Plus },
            { id: 'org-participants', label: 'Participants', icon: Users },
            { id: 'org-analytics', label: 'Results & Analytics', icon: BarChart2 },
            { id: 'org-certificates', label: 'Certificates', icon: Award },
            { id: 'org-documents', label: 'Documents & Verification', icon: FolderOpen },
            { id: 'org-notifications', label: 'Notifications', icon: Mail },
            { id: 'org-settings', label: 'Settings', icon: Settings },
            { id: 'org-support', label: 'Help & Support', icon: HelpCircle }
          ].map(item => (
            <div key={item.id} className={`nav-link ${currentPage === item.id ? 'active' : ''}`} onClick={() => handleNavClick(item.id)}>
              <item.icon className="nav-link-icon" />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="nav-link logout-nav-link" onClick={handleLogout} style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <LogOut className="nav-link-icon" color="var(--danger)" />
            <span style={{ color: 'var(--danger)' }}>Logout</span>
          </div>
        </nav>
      </aside>

      <main className="main-content" style={{ marginLeft: mainContentMarginLeft }}>
        <header className="app-top-navbar" style={{ padding: '10px 16px', background: 'var(--bg-panel-solid)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '700' }}>{orgName}</span>
            <span style={{ padding: '4px 10px', fontSize: '0.75rem', background: verificationStatus.bg, color: verificationStatus.color, border: `1px solid ${verificationStatus.color}` }}>
              {verificationStatus.text}
            </span>
          </div>
        </header>
        <div className="main-content-wrapper" style={{ padding: '20px' }}>
          <h1>{currentPage.replace('org-', '').toUpperCase()}</h1>
        </div>
      </main>
    </div>
  );
}
