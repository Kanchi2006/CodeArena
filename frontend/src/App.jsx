import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Code, 
  Trophy, 
  Settings, 
  LogOut, 
  User, 
  Lock, 
  Mail, 
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
  FileText,
  Layers,
  PieChart,
  BarChart2,
  Activity,
  ShieldAlert,
  Calendar,
  FolderOpen,
  HelpCircle,
  Filter,
  Eye,
  EyeOff,
  Menu,
  RotateCcw,
  RefreshCw,
  Building2 // For Organization related icons
} from 'lucide-react';

import LandingPage from './components/LandingPage';
import SplitPaneWorkspace from './components/SplitPaneWorkspace';
import AuthModal from './components/AuthModal';
import AchievementsDashboard from './components/AchievementsDashboard';
import AdminCertificatesView from './components/AdminCertificatesView';
import PublicCertificateView from './components/PublicCertificateView';
import CertificateBadge from './components/CertificateBadge';
import CertificateViewerModal from './components/CertificateViewerModal';
import AIChatbot from './components/AIChatbot';

// Organization Portal Layout
import OrganizationPortalLayout from './components/organization/OrganizationPortalLayout';

// Assessment System Components Imports
import UserAssessmentList from './components/assessments/UserAssessmentList';
import UserAssessmentDetails from './components/assessments/UserAssessmentDetails';
import UserAssessmentWorkspace from './components/assessments/UserAssessmentWorkspace';
import UserAssessmentResultPage from './components/assessments/UserAssessmentResultPage';
import UserAssessmentHistory from './components/assessments/UserAssessmentHistory';
import AdminAssessmentDashboard from './components/assessments/AdminAssessmentDashboard';
import AdminCreateAssessmentWizard from './components/assessments/AdminCreateAssessmentWizard';
import AdminAssessmentResultsView from './components/assessments/AdminAssessmentResultsView';
import AdminAssessmentCandidatesView from './components/assessments/AdminAssessmentCandidatesView';
import AdminAssessmentViolationsView from './components/assessments/AdminAssessmentViolationsView';
import OrganizationOnboardingModal from './components/assessments/OrganizationOnboardingModal';
import AdminOrganizationVerification from './components/assessments/AdminOrganizationVerification';

// Course System Components Imports
import UserCourseLibrary from './components/courses/UserCourseLibrary';
import UserCourseWorkspace from './components/courses/UserCourseWorkspace';
import AdminCourseDashboard from './components/courses/AdminCourseDashboard';
import AdminCourseWizard from './components/courses/AdminCourseWizard';

import OrganizationDashboard from './components/assessments/OrganizationDashboard';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from './i18n/I18nContext';

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

const getCategoryStyle = (catName) => {
  const norm = (catName || '').toLowerCase().trim();
  if (norm.includes('array')) {
    return {
      icon: '📊',
      bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.14) 0%, rgba(37, 99, 235, 0.22) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.45)',
      textColor: '#2563eb',
      badgeBg: 'rgba(59, 130, 246, 0.25)',
      badgeText: '#1d4ed8'
    };
  }
  if (norm.includes('string')) {
    return {
      icon: '🔤',
      bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(5, 150, 105, 0.22) 100%)',
      border: '1px solid rgba(16, 185, 129, 0.45)',
      textColor: '#059669',
      badgeBg: 'rgba(16, 185, 129, 0.25)',
      badgeText: '#047857'
    };
  }
  if (norm.includes('math')) {
    return {
      icon: '🧮',
      bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.22) 100%)',
      border: '1px solid rgba(245, 158, 11, 0.45)',
      textColor: '#d97706',
      badgeBg: 'rgba(245, 158, 11, 0.25)',
      badgeText: '#b45309'
    };
  }
  if (norm.includes('pointer') || norm.includes('2 ptr')) {
    return {
      icon: '🎯',
      bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.14) 0%, rgba(109, 40, 217, 0.22) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.45)',
      textColor: '#7c3aed',
      badgeBg: 'rgba(139, 92, 246, 0.25)',
      badgeText: '#6d28d9'
    };
  }
  if (norm.includes('window')) {
    return {
      icon: '🪟',
      bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.14) 0%, rgba(14, 116, 144, 0.22) 100%)',
      border: '1px solid rgba(6, 182, 212, 0.45)',
      textColor: '#0891b2',
      badgeBg: 'rgba(6, 182, 212, 0.25)',
      badgeText: '#0e7490'
    };
  }
  if (norm.includes('search') || norm.includes('binary')) {
    return {
      icon: '🔍',
      bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.14) 0%, rgba(190, 18, 60, 0.22) 100%)',
      border: '1px solid rgba(244, 63, 94, 0.45)',
      textColor: '#e11d48',
      badgeBg: 'rgba(244, 63, 94, 0.25)',
      badgeText: '#be123c'
    };
  }
  if (norm.includes('stack')) {
    return {
      icon: '📚',
      bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.14) 0%, rgba(126, 34, 206, 0.22) 100%)',
      border: '1px solid rgba(168, 85, 247, 0.45)',
      textColor: '#9333ea',
      badgeBg: 'rgba(168, 85, 247, 0.25)',
      badgeText: '#7e22ce'
    };
  }
  if (norm.includes('list')) {
    return {
      icon: '🔗',
      bg: 'linear-gradient(135deg, rgba(20, 184, 166, 0.14) 0%, rgba(13, 148, 136, 0.22) 100%)',
      border: '1px solid rgba(20, 184, 166, 0.45)',
      textColor: '#0d9488',
      badgeBg: 'rgba(20, 184, 166, 0.25)',
      badgeText: '#0f766e'
    };
  }
  if (norm.includes('dynamic') || norm.includes('dp')) {
    return {
      icon: '⚡',
      bg: 'linear-gradient(135deg, rgba(236, 72, 153, 0.14) 0%, rgba(190, 24, 93, 0.22) 100%)',
      border: '1px solid rgba(236, 72, 153, 0.45)',
      textColor: '#db2777',
      badgeBg: 'rgba(236, 72, 153, 0.25)',
      badgeText: '#be185d'
    };
  }
  if (norm.includes('tree') || norm.includes('graph')) {
    return {
      icon: '🌳',
      bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.14) 0%, rgba(21, 128, 61, 0.22) 100%)',
      border: '1px solid rgba(34, 197, 94, 0.45)',
      textColor: '#16a34a',
      badgeBg: 'rgba(34, 197, 94, 0.25)',
      badgeText: '#15803d'
    };
  }
  if (norm.includes('hash')) {
    return {
      icon: '🔑',
      bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(67, 56, 202, 0.22) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.45)',
      textColor: '#4f46e5',
      badgeBg: 'rgba(99, 102, 241, 0.25)',
      badgeText: '#4338ca'
    };
  }

  return {
    icon: '💻',
    bg: 'linear-gradient(135deg, rgba(124, 58, 237, 0.14) 0%, rgba(91, 33, 182, 0.22) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.45)',
    textColor: '#7c3aed',
    badgeBg: 'rgba(124, 58, 237, 0.25)',
    badgeText: '#5b21b6'
  };
};

export default function App() {
  const { t } = useTranslation();
  // Session & Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [unauthView, setUnauthView] = useState('landing'); // 'landing' or 'arena'
  const [portalRole, setPortalRole] = useState('user'); // 'user' or 'admin' login flow selector
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Public Verification State
  const [publicCertCode, setPublicCertCode] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/certificate/')) {
      return path.replace('/certificate/', '').trim();
    }
    return null;
  });

  // Achievement Unlocked Modal State
  const [unlockedCertNotice, setUnlockedCertNotice] = useState(null);

  // OAuth Redirect State (used when returning from GitHub OAuth callback)
  const [oauthProcessing, setOauthProcessing] = useState(false);
  
  // Auth Form State
  const [nameInput, setNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showOrgOnboardingModal, setShowOrgOnboardingModal] = useState(false);

  // App Routing State
  // For User: 'dashboard', 'problems', 'submissions', 'progress', 'leaderboard', 'profile', 'settings', 'landing'
  // For Admin: 'dashboard', 'user-management', 'problem-management', 'testcase-mgmt', 'submissions-mgmt', 'hints-editorials', 'leaderboard'
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [arenaProblem, setArenaProblem] = useState(null); // When inside Code Arena solving a problem

  // Assessment System Sub-routing State
  const [assessmentSubView, setAssessmentSubView] = useState('list'); // 'list', 'details', 'workspace', 'result', 'history'
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [adminAssessmentSubView, setAdminAssessmentSubView] = useState('dashboard'); // 'dashboard', 'wizard', 'results', 'candidates', 'violations'
  const [selectedAdminAssessmentId, setSelectedAdminAssessmentId] = useState(null);

  // Course System Sub-routing State
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [adminCourseSubView, setAdminCourseSubView] = useState('dashboard'); // 'dashboard', 'wizard'
  const [editingCourseId, setEditingCourseId] = useState(null);


  // Sub-navigation filter states
  const [userTab, setUserTab] = useState('all'); // 'all', 'active', 'blocked'
  const [problemTab, setProblemTab] = useState('all'); // 'all', 'add', 'categories', 'difficulty'
  const [submissionsTab, setSubmissionsTab] = useState('all'); // 'all', 'accepted', 'wrong', 'runtime'
  
  // Application Data States
  const [problems, setProblems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  
  // Admin Problem Form State
  const [newProblemTitle, setNewProblemTitle] = useState('');
  const [newProblemCategory, setNewProblemCategory] = useState('');
  const [newProblemDifficulty, setNewProblemDifficulty] = useState('Easy');
  const [newProblemDescription, setNewProblemDescription] = useState('');
  const [newProblemConstraints, setNewProblemConstraints] = useState('');
  const [newProblemInput, setNewProblemInput] = useState('');
  const [newProblemOutput, setNewProblemOutput] = useState('');
  const [newProblemSampleInput, setNewProblemSampleInput] = useState('');
  const [newProblemSampleOutput, setNewProblemSampleOutput] = useState('');
  const [newStarterJs, setNewStarterJs] = useState('');
  const [newStarterPython, setNewStarterPython] = useState('');
  const [newStarterCpp, setNewStarterCpp] = useState('');
  const [newStarterJava, setNewStarterJava] = useState('');
  const [newTestCasesJson, setNewTestCasesJson] = useState('[\n  {"input": "", "expected": ""}\n]');
  const [adminMessage, setAdminMessage] = useState('');

  // Code Arena Editor State
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [editorCode, setEditorCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('Console initialized. Write code and click "Run" to test.');
  const [executionResult, setExecutionResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ status: '', title: '', message: '' });

  // Filtering problems
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  // Profile Update Form States
  const [profileUsername, setProfileUsername] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileGithub, setProfileGithub] = useState('');
  const [profileSkills, setProfileSkills] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileCerts, setProfileCerts] = useState([]);
  const [selectedProfileCert, setSelectedProfileCert] = useState(null);

  // Settings & Theme Preferences States
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [emailNotifications, setEmailNotifications] = useState(localStorage.getItem('emailNotifications') === 'true');
  const [soundEffects, setSoundEffects] = useState(localStorage.getItem('soundEffects') === 'true');
  const [highContrastMode, setHighContrastMode] = useState(localStorage.getItem('highContrastMode') === 'true');

  // Synchronize profile inputs & fetch achievements certificates
  useEffect(() => {
    if (user) {
      setProfileUsername(user.username || '');
      setProfileDisplayName(user.display_name || user.username || '');
      setProfileEmail(user.email || '');
      setProfileBio(user.bio || '');
      setProfileGithub(user.github_profile || '');
      setProfileSkills(user.skills || '');
      setProfilePassword('');
    }
  }, [user]);

  useEffect(() => {
    if (user && (currentPage === 'profile' || currentPage === 'achievements')) {
      fetch('/api/user/achievements')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.certificates) {
            setProfileCerts(data.certificates);
          }
        })
        .catch(err => console.error('Error fetching profile certificates:', err));
    }
  }, [user, currentPage]);

  // Synchronize CSS Themes & System Preference Listener
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;

    const applyTheme = () => {
      if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
      } else if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('emailNotifications', emailNotifications);
  }, [emailNotifications]);

  useEffect(() => {
    localStorage.setItem('soundEffects', soundEffects);
  }, [soundEffects]);

  useEffect(() => {
    localStorage.setItem('highContrastMode', highContrastMode);
  }, [highContrastMode]);

  // --- COMPILER STARTER TEMPLATES MAP (CLEAN SIGNATURES ONLY) ---
  const codeTemplates = {
    'Two Sum': {
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Write your code here\n}`,
      python: `from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your code here\n        pass`,
      cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        return {};\n    }\n};`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        return new int[]{};\n    }\n}`
    },
    'Reverse String': {
      javascript: `function reverseString(s) {\n    // Write your code here\n}`,
      python: `class Solution:\n    def reverseString(self, s: List[str]) -> None:\n        # Write your code here\n        pass`,
      cpp: `class Solution {\npublic:\n    void reverseString(vector<char>& s) {\n        // Write your code here\n    }\n};`,
      java: `class Solution {\n    public void reverseString(char[] s) {\n        // Write your code here\n    }\n}`
    },
    'default': {
      javascript: `function solve() {\n    // Write your solution code here\n}`,
      python: `def solve():\n    # Write your solution code here\n    pass`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution code here\n    return 0;\n}`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution code here\n    }\n}`
    }
  };

  // --- AUTO FETCH EFFECTS ---

  // Extract OAuth token/error from URL query params (e.g., after GitHub OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('oauth_token');
    const oauthError = params.get('oauth_error');
    const oauthProvider = params.get('oauth_provider');

    if (oauthToken) {
      // Clean the URL before doing anything visible
      window.history.replaceState({}, '', window.location.pathname);
      setOauthProcessing(true);

      // Store token and fetch user profile
      localStorage.setItem('token', oauthToken);
      setToken(oauthToken);
      // fetchUserProfile will be triggered by the token useEffect below
      setOauthProcessing(false);
    } else if (oauthError) {
      // Show error in auth modal
      window.history.replaceState({}, '', window.location.pathname);
      setAuthError(decodeURIComponent(oauthError));
      setShowAuthModal(true);
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
      fetchSubmissions();
      fetchLeaderboard(); // Fetch leaderboard on login too
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('codearena_user');
      setUser(null);
      setUserStats(null);
      setAdminStats(null);
    }
  }, [token]);

  // Persist user object to localStorage so AIChatbot can detect admin role
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('codearena_user', JSON.stringify({
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          role: user.role
        }));
      } catch (e) {}
    } else {
      try { localStorage.removeItem('codearena_user'); } catch (e) {}
    }
  }, [user]);

  // Handle URL pathname routing on mount or token/user change
  useEffect(() => {
    const path = window.location.pathname;
    if (token && user) {
      if (user.role === 'admin') {
        if (path !== '/admin/dashboard') {
          window.history.pushState({}, '', '/admin/dashboard');
        }
        setCurrentPage('dashboard');
      } else if (user.role === 'organization') {
        if (user.org_status === 'VERIFIED') {
          if (path !== '/organization/dashboard') {
            window.history.pushState({}, '', '/organization/dashboard');
          }
          setCurrentPage('org-dashboard');
        } else {
          if (path !== '/organization/verification') {
            window.history.pushState({}, '', '/organization/verification');
          }
          setCurrentPage('org-verification');
        }
      } else {
        if (path !== '/user/dashboard') {
          window.history.pushState({}, '', '/user/dashboard');
        }
        setCurrentPage('dashboard');
      }
    } else {
      if (path !== '/') {
        window.history.pushState({}, '', '/');
      }
      setCurrentPage('landing'); // Default to landing if no token
    }
  }, [token, user]);


  useEffect(() => {
    fetchProblems();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAdminStats();
      fetchUsersList();
      const interval = setInterval(() => {
        fetchAdminStats();
      }, 8000);
      return () => clearInterval(interval);
    } else if (user) {
      fetchUserStats();
      fetchSubmissions();
      fetchLeaderboard();
    }
  }, [user, currentPage]);

  // Synchronize code templates on problem or language change
  useEffect(() => {
    if (arenaProblem) {
      let dbTemplates = null;
      if (arenaProblem.starter_code) {
        try {
          dbTemplates = typeof arenaProblem.starter_code === 'string'
            ? JSON.parse(arenaProblem.starter_code)
            : arenaProblem.starter_code;
        } catch (e) {
          console.error('Error parsing starter_code:', e);
        }
      }
      const templates = dbTemplates || codeTemplates[arenaProblem.title] || codeTemplates['default'];
      setEditorCode(templates[selectedLanguage] || templates['javascript']);
      setConsoleOutput(`Editor reset for "${arenaProblem.title}" in ${selectedLanguage.toUpperCase()}. Write code and click "Run" to test.`);
    }
  }, [arenaProblem, selectedLanguage]);

  // Helpers
  const selectProblemForArena = (problem) => {
    setArenaProblem(problem);
    setCurrentPage('arena');
  };

  // Generate GitHub-Style Contribution Heatmap Calendar (52 Weeks x 7 Days)
  const renderHeatmap = () => {
    const isLightMode = theme === 'light';
    const levelColors = isLightMode
      ? ['#F1EEFA', '#E5DFFF', '#CFC4FF', '#A994FF', '#6C4DFF']
      : ['rgba(255, 255, 255, 0.05)', '#0e4429', '#006d32', '#26a641', '#39d353'];

    const map = {};
    if (userStats?.heatmap) {
      userStats.heatmap.forEach(h => {
        map[h.date] = h.count;
      });
    }

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - (52 * 7));
    // Align startDate back to Sunday so day 0 of col 0 is Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const columns = 53;
    const cells = [];
    const monthHeaders = [];
    let lastMonth = -1;

    for (let colIdx = 0; colIdx < columns; colIdx++) {
      let monthAddedForCol = false;
      for (let rowIdx = 0; rowIdx < 7; rowIdx++) {
        const dayIdx = colIdx * 7 + rowIdx;
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + dayIdx);

        if (cellDate > today) break;

        const key = cellDate.toISOString().split('T')[0];
        const count = map[key] || 0;

        const currentMonth = cellDate.getMonth();
        if (currentMonth !== lastMonth && cellDate.getDate() <= 7 && !monthAddedForCol) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthHeaders.push({ colIdx, name: monthNames[currentMonth] });
          lastMonth = currentMonth;
          monthAddedForCol = true;
        }

        let level = 0;
        if (count >= 10) level = 4;
        else if (count >= 6) level = 3;
        else if (count >= 3) level = 2;
        else if (count >= 1) level = 1;

        cells.push(
          <div 
            key={key