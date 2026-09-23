import React from 'react';
import { 
  LayoutDashboard, Trophy, Settings, LogOut, User, FileText, BarChart2, 
  FolderOpen, HelpCircle, Menu, Mail, Award, Users, Building2, Plus
} from 'lucide-react';

export default function OrganizationPortalLayout({ 
  user, currentPage, setCurrentPage, handleLogout, children 
}) {
  const handleNavClick = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Building2 size={24} />
          <span>Organization</span>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'org-dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'org-profile', label: 'Profile', icon: User },
            { id: 'org-assessments', label: 'Assessments', icon: FileText },
            { id: 'org-contests', label: 'Contests', icon: Trophy },
            { id: 'org-participants', label: 'Participants', icon: Users },
            { id: 'org-analytics', label: 'Analytics', icon: BarChart2 },
            { id: 'org-certificates', label: 'Certificates', icon: Award },
            { id: 'org-documents', label: 'Documents', icon: FolderOpen },
            { id: 'org-notifications', label: 'Notifications', icon: Mail },
            { id: 'org-settings', label: 'Settings', icon: Settings }
          ].map(item => (
            <div key={item.id} className={`nav-link ${currentPage === item.id ? 'active' : ''}`} onClick={() => handleNavClick(item.id)}>
              <item.icon className="nav-link-icon" />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="nav-link logout-nav-link" onClick={handleLogout}>
            <LogOut className="nav-link-icon" />
            <span>Logout</span>
          </div>
        </nav>
      </aside>
      <main className="main-content">
        <header className="app-top-navbar">
          <div className="navbar-brand">Organization Portal</div>
        </header>
        <div className="main-content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}
