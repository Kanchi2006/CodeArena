import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Code, 
  Trophy, 
  Settings, 
  LogOut, 
  User, 
  ShieldAlert, 
  FileText, 
  Layers, 
  PieChart, 
  BarChart2, 
  Activity, 
  Calendar, 
  FolderOpen, 
  HelpCircle, 
  Filter, 
  Eye, 
  EyeOff, 
  Menu, 
  RotateCcw, 
  RefreshCw,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  AlertTriangle,
  X,
  Flame,
  BookOpen,
  Award,
  Terminal,
  Users,
  Building2 // For Organization related icons
} from 'lucide-react';

import { useTranslation } from '../../i18n/I18nContext';

const API_BASE = '/api';

// Helper to get verification status badge style
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
  setAssessmentSubView, 
  setSelectedAssessmentId,
  setAdminAssessmentSubView,
  setSelectedAdminAssessmentId,
  setEditingCourseId,
  setAdminCourseSubView,
  setProblemTab,
  setSubmissionsTab,
  setDifficultyFilter,
  setCategoryFilter,
  setSearchTerm,
  showOrgOnboardingModal,
  setShowOrgOnboardingModal,
  handleLogout,
  emailNotifications, setEmailNotifications,
  soundEffects, setSoundEffects,
  highContrastMode, setHighContrastMode,
  theme, setTheme
}) {
  const { t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const verificationStatus = getVerificationBadge(user?.org_status);

  // Dynamically set sidebar width based on collapsed state
  const sidebarWidth = isSidebarCollapsed ? '60px' : '260px';
  const mainContentMarginLeft = isSidebarCollapsed ? '60px' : '260px';

  // Handle navigation clicks
  const handleNavClick = (page, subView = null) => {
    setCurrentPage(page);
    if (subView) {
      if (page === 'assessments') setAssessmentSubView(subView);
      if (page === 'admin-assessments') setAdminAssessmentSubView(subView);
      if (page === 'admin-courses') setAdminCourseSubView(subView);
    }
    // Reset filters/search when navigating to a new main section
    if (page !== currentPage) {
      setProblemTab('all');
      setSubmissionsTab('all');
      setDifficultyFilter('All');
      setCategoryFilter('All');
      setSearchTerm('');
    }
    // Collapse sidebar on click if it's collapsed
    if (isSidebarCollapsed) setIsSidebarCollapsed(false);
  };

  // Fetch organization profile details for header display
  const [orgProfile, setOrgProfile] = useState(null);
  useEffect(() => {
    if (user && user.role === 'organization') {
      fetch(`${API_BASE}/organization/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch profile'))
      .then(data => {
        if (data && data.profile) {
          setOrgProfile(data.profile);
        }
      })
      .catch(err => console.error('Error fetching org profile:', err));
    }
  }, [user, token]);

  const orgName = orgProfile?.organization_name || user?.display_name || user?.username || 'Organization';
  const orgLogoUrl = orgProfile?.logo_url;
  const orgType = orgProfile?.organization_type || 'N/A';

  return (
    <div className="app-container">
      
      {/* ============================================================== */}
      {/* ORGANIZATION SIDEBAR LAYOUT                                    */}
      {/* ============================================================== */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ width: sidebarWidth }}>
        <div className="sidebar-logo" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)' }}>
          <Building2 size={26} color="var(--primary)" />
          <span className="logo-text" style={{ fontWeight: '700', fontSize: '1.1rem' }}>{isSidebarCollapsed ? 'Org' : 'Organization'}</span>
          <button 
            className="sidebar-collapse-toggle-inner"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Sidebar"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          
          {/* ORGANIZATION VIEW SIDEBAR LINKS */}
          <div 
            className={`nav-link ${currentPage === 'org-dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-dashboard')}
          >
            <LayoutDashboard className="nav-link-icon" />
            <span>{t('nav.dashboard', 'Dashboard')}</span>
          </div>

          <div 
            className={`nav-link ${currentPage === 'org-profile' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-profile')}
          >
            <User className="nav-link-icon" />
            <span>Organization Profile</span>
          </div>

          <div className="sidebar-group-header">
            <FileText size={12} style={{ marginRight: '6px' }} /> Assessments
          </div>
          <div 
            className={`nav-sub-link ${currentPage === 'assessments' && setAssessmentSubView === 'list' ? 'active' : ''}`}
            onClick={() => { handleNavClick('assessments', 'list'); setSelectedAssessmentId(null); }}
          >
            <span>• My Assessments</span>
          </div>
          <div 
            className={`nav-sub-link ${currentPage === 'assessments' && setAssessmentSubView === 'wizard' ? 'active' : ''}`}
            onClick={() => { handleNavClick('assessments', 'wizard'); setSelectedAdminAssessmentId(null); }}
          >
            <span>• Create Assessment</span>
          </div>

          <div className="sidebar-group-header">
            <Trophy size={12} style={{ marginRight: '6px' }} /> Contests
          </div>
          <div 
            className={`nav-sub-link ${currentPage === 'contests' ? 'active' : ''}`}
            onClick={() => handleNavClick('contests')}
          >
            <span>• My Contests</span>
          </div>
          <div 
            className={`nav-sub-link ${currentPage === 'create-contest' ? 'active' : ''}`}
            onClick={() => handleNavClick('create-contest')}
          >
            <span>• Create Contest</span>
          </div>

          <div 
            className={`nav-link ${currentPage === 'org-participants' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-participants')}
          >
            <Users className="nav-link-icon" />
            <span>Participants</span>
          </div>

          <div 
            className={`nav-link ${currentPage === 'org-analytics' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-analytics')}
          >
            <BarChart2 className="nav-link-icon" />
            <span>Results & Analytics</span>
          </div>

          <div 
            className={`nav-link ${currentPage === 'org-certificates' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-certificates')}
          >
            <Award className="nav-link-icon" color="#818cf8" />
            <span>Certificates</span>
          </div>

          <div 
            className={`nav-link ${currentPage === 'org-documents' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-documents')}
          >
            <FolderOpen className="nav-link-icon" />
            <span>Documents & Verification</span>
          </div>

          <div 
            className={`nav-link ${currentPage === 'org-notifications' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-notifications')}
          >
            <Mail className="nav-link-icon" />
            <span>Notifications</span>
          </div>

          <div 
            className={`nav-link ${currentPage === 'org-settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-settings')}
          >
            <Settings className="nav-link-icon" />
            <span>Settings</span>
          </div>

          <div 
            className={`nav-link ${currentPage === 'org-support' ? 'active' : ''}`}
            onClick={() => handleNavClick('org-support')}
          >
            <HelpCircle className="nav-link-icon" />
            <span>Help & Support</span>
          </div>

          {/* Logout Action */}
          <div className="nav-link logout-nav-link" onClick={handleLogout} style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <LogOut className="nav-link-icon" color="var(--danger)" />
            <span style={{ color: 'var(--danger)' }}>Logout</span>
          </div>
        </nav>

        {/* User Identity Panel */}
        <div className="sidebar-user-container" style={{ position: 'relative', marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
          <div className="sidebar-user" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} style={{ cursor: 'pointer' }}>
            <div className="avatar-circle">
              {(orgName).substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{orgName}</div>
              <div className="user-role">{orgType}</div>
            </div>
          </div>

          {isProfileDropdownOpen && (
            <div className="profile-dropdown-menu">
              <div 
                className="dropdown-item" 
                onClick={() => { handleNavClick('org-profile'); setIsProfileDropdownOpen(false); }}
              >
                <User size={16} /> My Organization Profile
              </div>
              <div style={{ height: '1px', background: 'var(--border-light)', margin: '4px 0' }}></div>
              <div 
                className="dropdown-item" 
                onClick={() => { handleLogout(); setIsProfileDropdownOpen(false); }}
                style={{ color: 'var(--danger)' }}
              >
                <LogOut size={16} /> Logout
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN LAYOUT PAGE ROUTER                                        */}
      {/* ============================================================== */}
      <main className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`} style={{ marginLeft: mainContentMarginLeft }}>
        <header className="app-top-navbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 16px', background: 'var(--bg-panel-solid)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isSidebarCollapsed && (
              <button 
                className="sidebar-toggle-btn-inline"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand Sidebar"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Menu size={20} />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {orgLogoUrl ? (
                <img src={orgLogoUrl} alt="Org Logo" style={{ width: '30px', height: '30px', borderRadius: '6px', objectFit: 'cover' }} />
              ) : (
                <Building2 size={24} color="var(--primary)" />
              )}
              <span style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-main)' }}>{orgName}</span>
              <span 
                className="status-pill" 
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.75rem', 
                  fontWeight: '700', 
                  background: verificationStatus.bg, 
                  color: verificationStatus.color,
                  border: `1px solid ${verificationStatus.color}`
                }}
              >
                {verificationStatus.text}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>({orgType})</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Placeholder for other header elements like notifications, search, etc. */}
          </div>
        </header>
        
        {/* Render Page Content Based on Current Page State */}
        <div className="main-content-wrapper">
          {/* Placeholder for actual page components */}
          {currentPage === 'org-dashboard' && <div>Organization Dashboard Content</div>}
          {currentPage === 'org-profile' && <div>Organization Profile Content</div>}
          {currentPage === 'assessments' && <div>Assessments Content (SubView: {setAssessmentSubView})</div>}
          {currentPage === 'create-assessment' && <div>Create Assessment Content</div>}
          {currentPage === 'contests' && <div>Contests Content</div>}
          {currentPage === 'create-contest' && <div>Create Contest Content</div>}
          {currentPage === 'org-participants' && <div>Participants Content</div>}
          {currentPage === 'org-analytics' && <div>Analytics Content</div>}
          {currentPage === 'org-certificates' && <div>Certificates Content</div>}
          {currentPage === 'org-documents' && <div>Documents & Verification Content</div>}
          {currentPage === 'org-notifications' && <div>Notifications Content</div>}
          {currentPage === 'org-settings' && <div>Settings Content</div>}
          {currentPage === 'org-support' && <div>Help & Support Content</div>}
          {/* Add more routes as needed */}
        </div>
      </main>
    </div>
  );
}
