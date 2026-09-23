import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Trophy, Settings, LogOut, User, FileText, BarChart2, 
  FolderOpen, HelpCircle, Menu, Mail, Award, Users, Building2, Plus
} from 'lucide-react';

export default function OrganizationPortalLayout({ 
  user, token, currentPage, setCurrentPage, handleLogout, children 
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleNavClick = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="app-container" style={{ display: 'flex' }}>
      <aside style={{ width: isSidebarCollapsed ? '60px' : '260px', borderRight: '1px solid var(--border-light)', height: '100vh' }}>
        <div style={{ padding: '16px' }}>
          <Building2 size={26} />
          {!isSidebarCollapsed && <span>Organization</span>}
        </div>
        <nav>
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
            <div key={item.id} onClick={() => handleNavClick(item.id)} style={{ padding: '10px', cursor: 'pointer' }}>
              <item.icon size={18} /> {!isSidebarCollapsed && item.label}
            </div>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '20px' }}>
        {children}
      </main>
    </div>
  );
}
