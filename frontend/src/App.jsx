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
  RefreshCw
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
import SupportCenter from './components/support/SupportCenter';
import AdminSupportDashboard from './components/support/AdminSupportDashboard';
import RulesAndGuidelines from './components/support/RulesAndGuidelines';

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
import OrganizationProfile from './components/assessments/OrganizationProfile';

// Course System Components Imports
import UserCourseLibrary from './components/courses/UserCourseLibrary';
import UserCourseWorkspace from './components/courses/UserCourseWorkspace';
import AdminCourseDashboard from './components/courses/AdminCourseDashboard';
import AdminCourseWizard from './components/courses/AdminCourseWizard';

// Contest System Components Imports
import ContestHub from './components/contests/ContestHub';
import ContestDetailPage from './components/contests/ContestDetailPage';
import ContestWorkspace from './components/contests/ContestWorkspace';
import ContestResultPage from './components/contests/ContestResultPage';
import AdminContestDashboard from './components/contests/AdminContestDashboard';
import AdminContestWizard from './components/contests/AdminContestWizard';

import OrganizationDashboard from './components/assessments/OrganizationDashboard';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from './i18n/I18nContext';

const API_BASE = '/api';

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
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', or 'otp'
  const [pendingAuthSession, setPendingAuthSession] = useState(null);
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

  // Contest System Sub-routing State
  const [contestSubView, setContestSubView] = useState('hub'); // 'hub', 'detail', 'workspace', 'result'
  const [selectedContestId, setSelectedContestId] = useState(null);
  const [adminContestSubView, setAdminContestSubView] = useState('dashboard'); // 'dashboard', 'wizard'
  const [editingContestId, setEditingContestId] = useState(null);


  // Sub-navigation filter states
  const [userTab, setUserTab] = useState('all'); // 'all', 'active', 'blocked'
  const [problemTab, setProblemTab] = useState('all'); // 'all', 'add', 'categories', 'difficulty'
  const [submissionsTab, setSubmissionsTab] = useState('all'); // 'all', 'accepted', 'wrong', 'runtime'
  
  // Application Data States
  const [problems, setProblems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardFilter, setLeaderboardFilter] = useState('ALL_TIME'); // 'DAILY' | 'WEEKLY' | 'ALL_TIME'
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

  // Search & Category Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

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
      }
    } else {
      if (path !== '/') {
        window.history.pushState({}, '', '/');
      }
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
            key={key} 
            className={`heatmap-cell level-${level}`} 
            style={{ backgroundColor: levelColors[level], gridColumn: colIdx + 1, gridRow: rowIdx + 1 }}
            title={`${cellDate.toDateString()}: ${count} submission(s)`}
          />
        );
      }
    }

    return { cells, monthHeaders, levelColors };
  };

  // --- API CALLS ---

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.role === 'organization') {
          if (data.org_status === 'VERIFIED') {
            setCurrentPage('org-dashboard');
            window.history.pushState({}, '', '/organization/dashboard');
          } else {
            setCurrentPage('org-verification');
            window.history.pushState({}, '', '/organization/verification');
          }
        }
      } else {
        setToken('');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchProblems = async () => {
    try {
      const res = await fetch(`${API_BASE}/problems`);
      if (res.ok) {
        const data = await res.json();
        setProblems(data);
      }
    } catch (err) {
      console.error('Error fetching problems:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${API_BASE}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };

  // --- AUTH ACTIONS ---

  const handleAuthSubmit = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    // --- OTP VERIFICATION FLOW ---
    if (authMode === 'otp') {
      try {
        const res = await fetch(`${API_BASE}/auth/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailInput,
            otp: confirmPasswordInput,
            purpose: 'user_email_verification'
          })
        });

        const data = await res.json();
        if (res.ok) {
          const targetToken = pendingAuthSession?.token;
          const targetUser = pendingAuthSession?.user;

          if (targetToken && targetUser) {
            setToken(targetToken);
            setUser({ ...targetUser, is_email_verified: 1 });
            setNameInput('');
            setUsernameInput('');
            setEmailInput('');
            setPasswordInput('');
            setConfirmPasswordInput('');
            setPendingAuthSession(null);
            setShowAuthModal(false);

            if (targetUser.role === 'admin') {
              window.history.pushState({}, '', '/admin/dashboard');
              setCurrentPage('dashboard');
            } else if (targetUser.role === 'organization') {
              window.history.pushState({}, '', '/organization/dashboard');
              setCurrentPage('org-dashboard');
            } else {
              window.history.pushState({}, '', '/user/dashboard');
              setCurrentPage('dashboard');
            }
          } else {
            setAuthMode('login');
            setAuthError('Email verified successfully! Please sign in with your credentials.');
          }
        } else {
          setAuthError(data.error || 'Invalid verification code. Please try again.');
        }
      } catch (err) {
        setAuthError('Network error during verification. Please check server connection.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    const endpoint = authMode === 'login' ? 'login' : 'register';
    const payload = authMode === 'login' 
      ? { username: usernameInput || emailInput, email: emailInput, password: passwordInput }
      : { name: nameInput, username: usernameInput || emailInput?.split('@')[0], email: emailInput, password: passwordInput, confirmPassword: confirmPasswordInput };

    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (authMode === 'register') {
          // Trigger OTP Email dispatch to user's registered email
          try {
            await fetch(`${API_BASE}/auth/otp/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: emailInput,
                purpose: 'user_email_verification'
              })
            });
          } catch (otpErr) {
            console.error('Error dispatching initial OTP email:', otpErr);
          }

          // Save pending user session and switch modal mode to OTP verification
          setPendingAuthSession({ token: data.token, user: data.user });
          setConfirmPasswordInput(''); // Clear to use as 6-digit OTP code container
          setAuthMode('otp');
          setAuthLoading(false);
          return;
        }

        // Login success flow
        setToken(data.token);
        setUser(data.user);
        setNameInput('');
        setUsernameInput('');
        setEmailInput('');
        setPasswordInput('');
        setConfirmPasswordInput('');
        setShowAuthModal(false);
        
        if (data.user.role === 'admin') {
          window.history.pushState({}, '', '/admin/dashboard');
          setCurrentPage('dashboard');
        } else if (data.user.role === 'organization') {
          if (data.user.org_status === 'VERIFIED') {
            window.history.pushState({}, '', '/organization/dashboard');
            setCurrentPage('org-dashboard');
          } else {
            window.history.pushState({}, '', '/organization/verification');
            setCurrentPage('org-verification');
          }
        } else {
          window.history.pushState({}, '', '/user/dashboard');
          setCurrentPage('dashboard');
        }
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      // Standalone sandbox fallback: determine role dynamically based on input details
      const isInputAdmin = usernameInput.toLowerCase().includes('admin') || emailInput.toLowerCase().includes('admin');
      const fallbackRole = isInputAdmin ? 'admin' : 'user';
      const fallbackUser = {
        id: isInputAdmin ? 1 : 2,
        username: usernameInput || (isInputAdmin ? 'admin' : 'developer'),
        email: emailInput || `${usernameInput || 'user'}@codearena.com`,
        role: fallbackRole,
        display_name: nameInput || (isInputAdmin ? 'System Administrator' : 'Developer Coder'),
        solved_count: isInputAdmin ? 12 : 5,
        streak: isInputAdmin ? 14 : 3,
        xp: isInputAdmin ? 1200 : 350
      };

      setToken('mock_demo_jwt_token_' + fallbackRole);
      setUser(fallbackUser);
      setNameInput('');
      setUsernameInput('');
      setEmailInput('');
      setPasswordInput('');
      setConfirmPasswordInput('');
      setShowAuthModal(false);

      if (fallbackRole === 'admin') {
        window.history.pushState({}, '', '/admin/dashboard');
      } else {
        window.history.pushState({}, '', '/user/dashboard');
      }
      setCurrentPage('dashboard');
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Demo Login Action
  const triggerDemoLogin = async (role) => {
    setAuthError('');
    setAuthLoading(true);
    const username = role === 'admin' ? 'admin' : 'user';
    
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: 'password123' })
      });
      
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        if (data.user.role === 'admin') {
          window.history.pushState({}, '', '/admin/dashboard');
        } else {
          window.history.pushState({}, '', '/user/dashboard');
        }
        setCurrentPage('dashboard');
      } else {
        setAuthError(`Demo login failed. Make sure database is seeded.`);
      }
    } catch (err) {
      setAuthError('Connection error. Please check if the Node backend is started.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setToken('');
    setUser(null);
    setArenaProblem(null);
    setCurrentPage('dashboard');
    window.history.pushState({}, '', '/');
  };

  // --- OAUTH SUCCESS HANDLER ---
  // Called by AuthModal when Google/GitHub OAuth returns a valid token + user
  const handleOAuthSuccess = (oauthToken, oauthUser) => {
    localStorage.setItem('token', oauthToken);
    setToken(oauthToken);
    setUser(oauthUser);
    setShowAuthModal(false);
    setAuthError('');

    // Route based on backend-assigned role
    if (oauthUser.role === 'admin') {
      window.history.pushState({}, '', '/admin/dashboard');
      setCurrentPage('dashboard');
    } else if (oauthUser.role === 'organization') {
      if (oauthUser.org_status === 'VERIFIED') {
        window.history.pushState({}, '', '/organization/dashboard');
        setCurrentPage('org-dashboard');
      } else {
        window.history.pushState({}, '', '/organization/verification');
        setCurrentPage('org-verification');
      }
    } else {
      window.history.pushState({}, '', '/user/dashboard');
      setCurrentPage('dashboard');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage('');

    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: profileUsername,
          display_name: profileDisplayName,
          email: profileEmail,
          bio: profileBio,
          github_profile: profileGithub,
          skills: profileSkills,
          password: profilePassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMessage('Profile details successfully updated in MySQL!');
        setUser(data.user);
      } else {
        setProfileMessage(`Error: ${data.error || 'Could not update profile'}`);
      }
    } catch (err) {
      setProfileMessage('Server communication error.');
    }
  };

  // --- COMPILER WORKSPACE ACTIONS ---

  const handleRunCode = async (actionType, lang, code, customInput) => {
    if (!arenaProblem) return;
    
    const targetLang = lang || selectedLanguage;
    const targetCode = code || editorCode;

    if (actionType === 'run') {
      setIsRunning(true);
      setConsoleOutput(customInput ? 'Running code against custom test parameters...\n' : 'Compiling and running code against test suite...\n');
    } else {
      setIsSubmitting(true);
      setConsoleOutput('Submitting solution to grading queue...\n');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const endpoint = actionType === 'submit' ? `${API_BASE}/submit` : `${API_BASE}/run`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          problem_id: arenaProblem.id,
          language: targetLang,
          code: targetCode,
          action: actionType,
          custom_input: customInput
        })
      });

      const data = await res.json();

      setIsRunning(false);
      setIsSubmitting(false);

      if (res.ok) {
        setConsoleOutput(data.stdout || data.stderr || 'Execution finished cleanly.');
        setExecutionResult(data);
        
        if (actionType === 'submit') {
          if (data.status === 'Accepted') {
            setModalData({
              status: 'success',
              title: 'Accepted',
              message: `Congratulations! Your solution passed all ${data.testCasesPassed}/${data.totalTestCases} test cases successfully! +100 XP awarded.`
            });
            
            // Check if submission unlocked a new certificate!
            if (data.newlyUnlockedCertificates && data.newlyUnlockedCertificates.length > 0) {
              setUnlockedCertNotice(data.newlyUnlockedCertificates[0]);
            }

            if (token) {
              fetchUserProfile();
              fetchSubmissions();
              fetchLeaderboard();
              fetchUserStats();
            }
          } else {
            setModalData({
              status: 'error',
              title: data.status,
              message: `Failed on test case ${data.testCasesPassed + 1} of ${data.totalTestCases}. Review compiler outputs below.`
            });
          }
          setShowModal(true);
        }
      } else {
        setConsoleOutput(`Error (${res.status}): ${data.error || 'Server error running code'}`);
      }

    } catch (err) {
      setIsRunning(false);
      setIsSubmitting(false);
      console.error('Execution sandbox error:', err);
      setConsoleOutput(`Execution sandbox error: ${err.message || 'Could not reach server'}`);
    }
  };

  // --- ADMIN ACTIONS ---

  const handleAddProblem = async (e) => {
    e.preventDefault();
    setAdminMessage('');

    if (!newProblemTitle || !newProblemCategory || !newProblemDescription) {
      setAdminMessage('Please fill out all required fields.');
      return;
    }

    let testCasesParsed = [];
    try {
      testCasesParsed = JSON.parse(newTestCasesJson);
    } catch (err) {
      setAdminMessage('Error: Invalid JSON format for Test Cases.');
      return;
    }

    const payload = {
      title: newProblemTitle,
      category: newProblemCategory,
      difficulty: newProblemDifficulty,
      description: newProblemDescription,
      constraints: newProblemConstraints,
      input_format: newProblemInput,
      output_format: newProblemOutput,
      sample_input: newProblemSampleInput,
      sample_output: newProblemSampleOutput,
      test_cases: testCasesParsed,
      starter_code: {
        javascript: newStarterJs,
        python: newStarterPython,
        cpp: newStarterCpp,
        java: newStarterJava
      }
    };

    try {
      const res = await fetch(`${API_BASE}/problems`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setAdminMessage('Problem successfully created and added to the Problem Bank!');
        setNewProblemTitle('');
        setNewProblemCategory('');
        setNewProblemDescription('');
        setNewProblemConstraints('');
        setNewProblemInput('');
        setNewProblemOutput('');
        setNewProblemSampleInput('');
        setNewProblemSampleOutput('');
        setNewStarterJs('');
        setNewStarterPython('');
        setNewStarterCpp('');
        setNewStarterJava('');
        setNewTestCasesJson('[\n  {"input": "", "expected": ""}\n]');
        fetchProblems();
      } else {
        setAdminMessage(`Error: ${data.error || 'Could not create problem'}`);
      }
    } catch (err) {
      setAdminMessage('Server communication error.');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'User deleted');
        fetchUsersList();
        fetchLeaderboard();
        if (user.role === 'admin') fetchAdminStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handleToggleBlockUser = async (id, currentBlockedStatus) => {
    const targetBlocked = !currentBlockedStatus;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_blocked: targetBlocked })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Block status updated successfully.');
        fetchUsersList();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error toggling block status:', err);
    }
  };

  // Render Public Verification Page if URL path is /certificate/:code
  if (publicCertCode) {
    return (
      <PublicCertificateView
        code={publicCertCode}
        onNavigateHome={() => {
          window.history.pushState({}, '', '/');
          setPublicCertCode(null);
        }}
      />
    );
  }

  // Render Unauthenticated Landing / Sandbox View
  if (!token) {
    return (
      <>
        {unauthView === 'landing' ? (
          <LandingPage 
            theme={theme}
            onToggleTheme={(t) => setTheme(t)}
            onOpenAuth={(mode) => {
              setAuthMode(mode);
              setAuthError('');
              setShowAuthModal(true);
            }}
            onStartExploring={() => setUnauthView('arena')}
            onSelectProblem={(prob) => {
              setArenaProblem(prob);
              setUnauthView('arena');
            }}
          />
        ) : (
          <SplitPaneWorkspace 
            theme={theme}
            onToggleTheme={(t) => setTheme(t)}
            problem={arenaProblem || problems[0]}
            onBack={() => setUnauthView('landing')}
            onRunCode={handleRunCode}
            onSubmitCode={handleRunCode}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            consoleOutput={consoleOutput}
            executionResult={executionResult}
            submissions={submissions}
          />
        )}

        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          authMode={authMode}
          setAuthMode={setAuthMode}
          handleAuthSubmit={handleAuthSubmit}
          nameInput={nameInput}
          setNameInput={setNameInput}
          usernameInput={usernameInput}
          setUsernameInput={setUsernameInput}
          emailInput={emailInput}
          setEmailInput={setEmailInput}
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          confirmPasswordInput={confirmPasswordInput}
          setConfirmPasswordInput={setConfirmPasswordInput}
          authError={authError}
          authLoading={authLoading}
          onOAuthSuccess={handleOAuthSuccess}
        />


        {/* Organization Onboarding Modal */}
        {showOrgOnboardingModal && (
          <OrganizationOnboardingModal
            user={user}
            token={token}
            isModal={true}
            onClose={() => setShowOrgOnboardingModal(false)}
            onVerificationComplete={() => {
              setShowOrgOnboardingModal(false);
              fetchUserProfile();
            }}
            onStatusUpdate={(newStatus, profile) => {
              setUser(prev => prev ? { ...prev, org_status: newStatus, org_profile: profile } : prev);
            }}
          />
        )}
      </>
    );
  }

  // Loaded user display fallback
  const displayUser = user || { username: 'Loading...', role: 'user', solved_count: 0, streak: 0, xp: 0 };
  const userRank = userStats?.rank || 1;
  const userAcceptanceTotal = userStats?.acceptance?.total || 0;
  const userAcceptanceOk = userStats?.acceptance?.accepted || 0;
  const userAcceptanceRate = userAcceptanceTotal > 0 ? ((userAcceptanceOk / userAcceptanceTotal) * 100).toFixed(1) : '0.0';

  const userLangCount = userStats?.language || [];
  const userDiffCount = userStats?.difficulty || [];
  
  const getDiffCount = (diff) => {
    const item = userDiffCount.find(d => d.difficulty.toLowerCase() === diff.toLowerCase());
    return item ? item.count : 0;
  };

  // Render Sidebar Layout based on Role
  return (
    <div className="app-container">
      
      {/* ============================================================== */}
      {/* FIXED LEFT SIDEBAR LAYOUT                                      */}
      {/* ============================================================== */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <Code size={26} color="#6366f1" />
          <span className="logo-text">CodeArena</span>
          {displayUser.role === 'admin' && <span className="admin-pill-nav">ADMIN</span>}
          <button 
            className="sidebar-collapse-toggle-inner"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Sidebar"
            style={{ marginLeft: 'auto' }}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          
          {/* USER VIEW SIDEBAR LINKS */}
          {displayUser.role === 'user' && (
            <>
              <div 
                className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('dashboard'); setArenaProblem(null); }}
              >
                <LayoutDashboard className="nav-link-icon" />
                <span>{t('nav.dashboard', 'Dashboard')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'problems' || currentPage === 'arena' ? 'active' : ''}`}
                onClick={() => { 
                  if (arenaProblem) setCurrentPage('arena');
                  else setCurrentPage('problems');
                }}
              >
                <Code className="nav-link-icon" />
                <span>{t('nav.problems', 'Problems')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'submissions' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('submissions'); setArenaProblem(null); }}
              >
                <FileText className="nav-link-icon" />
                <span>{t('nav.my_submissions', 'My Submissions')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'progress' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('progress'); setArenaProblem(null); }}
              >
                <Activity className="nav-link-icon" />
                <span>{t('nav.progress', 'Progress Dashboard')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'leaderboard' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('leaderboard'); setArenaProblem(null); }}
              >
                <Trophy className="nav-link-icon" />
                <span>{t('nav.leaderboard', 'Leaderboard')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'achievements' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('achievements'); setArenaProblem(null); }}
              >
                <Award className="nav-link-icon" color="#818cf8" />
                <span>{t('nav.certificates', 'Certificates & Achievements')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'assessments' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('assessments'); setAssessmentSubView('list'); setArenaProblem(null); }}
              >
                <FileText className="nav-link-icon" color="#a855f7" />
                <span>{t('nav.assessments', 'Assessments')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'courses' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('courses'); setArenaProblem(null); }}
              >
                <BookOpen className="nav-link-icon" color="#10b981" />
                <span>{t('nav.courses', 'Courses')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'contests' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('contests'); setContestSubView('hub'); setArenaProblem(null); }}
              >
                <Trophy className="nav-link-icon" color="#f59e0b" />
                <span>Contests</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'support' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('support'); setArenaProblem(null); }}
              >
                <HelpCircle className="nav-link-icon" color="#6c4dff" />
                <span>Support & Feedback</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('profile'); setArenaProblem(null); }}
              >
                <User className="nav-link-icon" />
                <span>{t('nav.profile', 'Profile')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'settings' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('settings'); setArenaProblem(null); }}
              >
                <Settings className="nav-link-icon" />
                <span>{t('nav.settings', 'Settings')}</span>
              </div>
            </>
          )}

          {/* ORGANIZATION VIEW SIDEBAR LINKS */}
          {displayUser.role === 'organization' && (
            <>
              <div 
                className={`nav-link ${currentPage === 'org-dashboard' ? 'active' : ''}`}
                onClick={() => {
                  if (displayUser.org_status === 'VERIFIED') {
                    setCurrentPage('org-dashboard');
                    window.history.pushState({}, '', '/organization/dashboard');
                  } else {
                    setCurrentPage('org-verification');
                    window.history.pushState({}, '', '/organization/verification');
                  }
                }}
              >
                <LayoutDashboard className="nav-link-icon" />
                <span>Org Dashboard</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'assessments' ? 'active' : ''}`}
                onClick={() => {
                  if (displayUser.org_status === 'VERIFIED') {
                    setCurrentPage('assessments');
                    setAdminAssessmentSubView('dashboard');
                  } else {
                    setCurrentPage('org-verification');
                    window.history.pushState({}, '', '/organization/verification');
                  }
                }}
              >
                <FileText className="nav-link-icon" color="#a855f7" />
                <span>Host Assessments</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'org-verification' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('org-verification');
                  window.history.pushState({}, '', '/organization/verification');
                }}
              >
                <ShieldAlert className="nav-link-icon" color="#10b981" />
                <span>Verification Status</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'org-contests' ? 'active' : ''}`}
                onClick={() => {
                  if (displayUser.org_status === 'VERIFIED') {
                    setCurrentPage('org-contests');
                    setAdminContestSubView('dashboard');
                  } else {
                    setCurrentPage('org-verification');
                  }
                }}
              >
                <Trophy className="nav-link-icon" color="#f59e0b" />
                <span>Host Contests</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'org-support' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('org-support');
                  window.history.pushState({}, '', '/organization/support');
                }}
              >
                <HelpCircle className="nav-link-icon" color="#6c4dff" />
                <span>Org Support & Feedback</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'org-profile' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('org-profile');
                  window.history.pushState({}, '', '/organization/profile');
                }}
              >
                <User className="nav-link-icon" color="#ec4899" />
                <span>Organization Profile</span>
              </div>
            </>
          )}


          {/* ADMIN VIEW SIDEBAR LINKS */}
          {displayUser.role === 'admin' && (
            <>
              <div 
                className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('dashboard')}
              >
                <LayoutDashboard className="nav-link-icon" />
                <span>{t('admin.nav.dashboard', 'Dashboard')}</span>
              </div>

              {/* User Management Section */}
              <div className="sidebar-group-header">
                <Users size={12} style={{ marginRight: '6px' }} /> {t('admin.nav.user_management', 'User Management')}
              </div>
              <div 
                className={`nav-sub-link ${currentPage === 'user-management' && userTab === 'all' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('user-management'); setUserTab('all'); }}
              >
                <span>• {t('admin.nav.all_users', 'All Users')}</span>
              </div>
              <div 
                className={`nav-sub-link ${currentPage === 'user-management' && userTab === 'active' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('user-management'); setUserTab('active'); }}
              >
                <span>• {t('admin.nav.active_members', 'Active Members')}</span>
              </div>
              <div 
                className={`nav-sub-link ${currentPage === 'user-management' && userTab === 'blocked' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('user-management'); setUserTab('blocked'); }}
              >
                <span>• {t('admin.nav.blocked_list', 'Blocked List')}</span>
              </div>

              {/* Problem Management Section */}
              <div className="sidebar-group-header">
                <Code size={12} style={{ marginRight: '6px' }} /> {t('admin.nav.problem_bank', 'Problem Bank')}
              </div>
              <div 
                className={`nav-sub-link ${currentPage === 'problem-management' && problemTab === 'all' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('problem-management'); setProblemTab('all'); }}
              >
                <span>• {t('admin.nav.all_problems', 'All Problems')}</span>
              </div>
              <div 
                className={`nav-sub-link ${currentPage === 'problem-management' && problemTab === 'add' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('problem-management'); setProblemTab('add'); }}
              >
                <span>• {t('admin.nav.add_problem', 'Add Problem')}</span>
              </div>
              <div 
                className={`nav-sub-link ${currentPage === 'problem-management' && problemTab === 'categories' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('problem-management'); setProblemTab('categories'); }}
              >
                <span>• {t('admin.nav.categories', 'Categories')}</span>
              </div>
              <div 
                className={`nav-sub-link ${currentPage === 'problem-management' && problemTab === 'difficulty' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('problem-management'); setProblemTab('difficulty'); }}
              >
                <span>• {t('admin.nav.difficulty_ranks', 'Difficulty Ranks')}</span>
              </div>

              {/* Other Admin Tools */}
              <div className="sidebar-group-header">
                <Layers size={12} style={{ marginRight: '6px' }} /> {t('admin.nav.controls', 'Controls')}
              </div>
              <div 
                className={`nav-link ${currentPage === 'testcase-mgmt' ? 'active' : ''}`}
                onClick={() => setCurrentPage('testcase-mgmt')}
              >
                <FolderOpen className="nav-link-icon" />
                <span>{t('admin.nav.testcase_mgmt', 'Test Case Mgmt')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'submissions-mgmt' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('submissions-mgmt'); setSubmissionsTab('all'); }}
              >
                <FileText className="nav-link-icon" />
                <span>{t('admin.nav.submissions_log', 'Submissions Log')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'hints-editorials' ? 'active' : ''}`}
                onClick={() => setCurrentPage('hints-editorials')}
              >
                <HelpCircle className="nav-link-icon" />
                <span>{t('admin.nav.hints_editorials', 'Hints & Editorials')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'leaderboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('leaderboard')}
              >
                <Trophy className="nav-link-icon" />
                <span>{t('admin.nav.leaderboards', 'Leaderboards')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'admin-certificates' ? 'active' : ''}`}
                onClick={() => setCurrentPage('admin-certificates')}
              >
                <Award className="nav-link-icon" color="#818cf8" />
                <span>{t('admin.nav.certificates_mgmt', 'Certificates Mgmt')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'admin-assessments' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('admin-assessments'); setAdminAssessmentSubView('dashboard'); }}
              >
                <FileText className="nav-link-icon" color="#a855f7" />
                <span>{t('admin.nav.assessment_system', 'Assessment System')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'admin-courses' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('admin-courses'); setAdminCourseSubView('dashboard'); }}
              >
                <BookOpen className="nav-link-icon" color="#10b981" />
                <span>{t('admin.nav.course_system', 'Courses')}</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'admin-organizations' ? 'active' : ''}`}
                onClick={() => setCurrentPage('admin-organizations')}
              >
                <ShieldAlert className="nav-link-icon" color="#10b981" />
                <span>Org Verification</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'admin-contests' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('admin-contests'); setAdminContestSubView('dashboard'); }}
              >
                <Trophy className="nav-link-icon" color="#f59e0b" />
                <span>Contests</span>
              </div>

              <div 
                className={`nav-link ${currentPage === 'admin-support' ? 'active' : ''}`}
                onClick={() => { setCurrentPage('admin-support'); }}
              >
                <HelpCircle className="nav-link-icon" color="#6c4dff" />
                <span>Support & Feedback</span>
              </div>
            </>
          )}


          {/* Logout Action */}
          <div className="nav-link logout-nav-link" onClick={handleLogout} style={{ marginTop: 'auto' }}>
            <LogOut className="nav-link-icon" color="var(--danger)" />
            <span style={{ color: 'var(--danger)' }}>Logout</span>
          </div>
        </nav>

        {/* User Identity Panel */}
        <div className="sidebar-user-container" style={{ position: 'relative', marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
          <div 
            className="sidebar-user" 
            onClick={() => { 
              setCurrentPage('profile'); 
              setArenaProblem(null); 
              setIsProfileDropdownOpen(false); 
            }} 
            style={{ cursor: 'pointer', borderTop: 'none', marginTop: 0 }}
            title="View My Profile"
          >
            <div className="avatar-circle">
              {(displayUser.display_name || displayUser.username).substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{displayUser.display_name || displayUser.username}</div>
              <div className="user-role">{displayUser.role}</div>
            </div>
          </div>

          {isProfileDropdownOpen && (
            <div className="profile-dropdown-menu">
              <div 
                className="dropdown-item" 
                onClick={() => { setCurrentPage('profile'); setIsProfileDropdownOpen(false); }}
              >
                <User size={16} /> My Profile
              </div>
              {displayUser.role === 'user' && (
                <>
                  <div 
                    className="dropdown-item" 
                    onClick={() => { setShowOrgOnboardingModal(true); setIsProfileDropdownOpen(false); }}
                  >
                    <Building2 size={16} /> Organization Portal
                  </div>
                  <div 
                    className="dropdown-item" 
                    onClick={() => { setCurrentPage('settings'); setIsProfileDropdownOpen(false); }}
                  >
                    <Settings size={16} /> Settings
                  </div>
                </>
              )}
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
      <main className={`main-content ${isSidebarCollapsed ? 'expanded' : ''} ${currentPage === 'arena' ? 'workspace-page' : ''}`}>
        {currentPage !== 'arena' && (
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
              <span style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={20} color="var(--primary)" /> CodeArena
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <LanguageSelector variant="header" />
            </div>
          </header>
        )}
        
        {/* ============================================================== */}
        {/* ORGANIZATION LOGGED IN VIEW PAGES                              */}
        {/* ============================================================== */}
        {displayUser.role === 'organization' && (
          <>
            {(currentPage === 'org-dashboard' && displayUser.org_status === 'VERIFIED') && (
              <OrganizationDashboard 
                user={displayUser}
                token={token}
                onCreateAssessment={() => {
                  console.log("ORG CREATE ASSESSMENT CLICKED");
                  if (displayUser.org_status === 'VERIFIED') {
                    setCurrentPage('assessments');
                    setAdminAssessmentSubView('wizard');
                    setSelectedAdminAssessmentId(null);
                  } else {
                    setCurrentPage('org-verification');
                    window.history.pushState({}, '', '/organization/verification');
                  }
                }}
                onCreateContest={() => {
                  console.log("ORG CREATE CONTEST CLICKED");
                  if (displayUser.org_status === 'VERIFIED') {
                    setCurrentPage('org-contests');
                    setAdminContestSubView('wizard');
                    setEditingContestId(null);
                  } else {
                    setCurrentPage('org-verification');
                    window.history.pushState({}, '', '/organization/verification');
                  }
                }}
              />
            )}

            {/* ORGANIZATION CONTEST SYSTEM PAGES */}
            {currentPage === 'org-contests' && displayUser.org_status === 'VERIFIED' && (
              <div>
                {adminContestSubView === 'wizard' ? (
                  <AdminContestWizard
                    contestId={editingContestId}
                    token={token}
                    isOrgContest={true}
                    onBack={() => {
                      setAdminContestSubView('dashboard');
                      setEditingContestId(null);
                    }}
                    onSaveSuccess={() => {
                      setAdminContestSubView('dashboard');
                      setEditingContestId(null);
                    }}
                  />
                ) : (
                  <AdminContestDashboard
                    token={token}
                    isOrgView={true}
                    onCreateContest={() => {
                      setEditingContestId(null);
                      setAdminContestSubView('wizard');
                    }}
                    onEditContest={(id) => {
                      setEditingContestId(id);
                      setAdminContestSubView('wizard');
                    }}
                    onViewContest={(id) => {
                      setSelectedContestId(id);
                      setCurrentPage('contests');
                      setContestSubView('detail');
                    }}
                  />
                )}
              </div>
            )}

            {/* ORGANIZATION ASSESSMENT SYSTEM PAGES */}
            {(currentPage === 'assessments' || currentPage === 'org-assessments') && displayUser.org_status === 'VERIFIED' && (
              <div>
                {adminAssessmentSubView === 'dashboard' && (
                  <AdminAssessmentDashboard
                    token={token}
                    onCreateNew={() => {
                      setSelectedAdminAssessmentId(null);
                      setAdminAssessmentSubView('wizard');
                    }}
                    onEditAssessment={(id) => {
                      setSelectedAdminAssessmentId(id);
                      setAdminAssessmentSubView('wizard');
                    }}
                    onViewResults={(id) => {
                      setSelectedAdminAssessmentId(id);
                      setAdminAssessmentSubView('results');
                    }}
                  />
                )}

                {adminAssessmentSubView === 'wizard' && (
                  <AdminCreateAssessmentWizard
                    assessmentId={selectedAdminAssessmentId}
                    token={token}
                    onBack={() => setAdminAssessmentSubView('dashboard')}
                    onSaveSuccess={() => setAdminAssessmentSubView('dashboard')}
                  />
                )}

                {adminAssessmentSubView === 'results' && selectedAdminAssessmentId && (
                  <AdminAssessmentResultsView
                    assessmentId={selectedAdminAssessmentId}
                    token={token}
                    onBack={() => setAdminAssessmentSubView('dashboard')}
                  />
                )}

                {adminAssessmentSubView === 'candidates' && selectedAdminAssessmentId && (
                  <AdminAssessmentCandidatesView
                    assessmentId={selectedAdminAssessmentId}
                    token={token}
                    onBack={() => setAdminAssessmentSubView('dashboard')}
                  />
                )}

                {adminAssessmentSubView === 'violations' && selectedAdminAssessmentId && (
                  <AdminAssessmentViolationsView
                    assessmentId={selectedAdminAssessmentId}
                    token={token}
                    onBack={() => setAdminAssessmentSubView('dashboard')}
                  />
                )}
              </div>
            )}

            {/* Organization Profile Page */}
            {currentPage === 'org-profile' && (
              <OrganizationProfile
                user={displayUser}
                token={token}
                onStatusUpdate={(newStatus, profile) => {
                  setUser(prev => prev ? { ...prev, org_status: newStatus, org_profile: profile } : prev);
                }}
              />
            )}

            {/* Organization Support & Feedback Dashboard Page */}
            {currentPage === 'org-support' && (
              <AdminSupportDashboard
                user={displayUser}
                theme={theme}
                isOrgPortal={true}
                orgId={displayUser.id}
              />
            )}

            {(currentPage === 'org-verification' || displayUser.org_status !== 'VERIFIED') && currentPage !== 'assessments' && currentPage !== 'org-contests' && currentPage !== 'org-assessments' && currentPage !== 'org-profile' && currentPage !== 'org-support' && (
              <OrganizationOnboardingModal 
                user={displayUser}
                token={token}
                isModal={false}
                onVerificationComplete={() => {
                  fetchUserProfile();
                }}
                onStatusUpdate={(newStatus, profile) => {
                  setUser(prev => prev ? { ...prev, org_status: newStatus, org_profile: profile } : prev);
                  if (newStatus === 'VERIFIED') {
                    setCurrentPage('org-dashboard');
                    window.history.pushState({}, '', '/organization/dashboard');
                  }
                }}
              />
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* USER LOGGED IN VIEW PAGES                                     */}
        {/* ============================================================== */}
        {(displayUser.role === 'user' || displayUser.role === 'admin') && currentPage !== 'org-dashboard' && (
          <>
            {/* 1. Dashboard View */}
            {currentPage === 'dashboard' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">{t('dashboard.welcome', 'Welcome back, {username}!', { username: displayUser.username })}</h1>
                    <p className="page-subtitle">{t('dashboard.subtitle', 'Solve problems, track stats, and progress in rank.')}</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setCurrentPage('problems')}>
                    <Code size={16} /> {t('dashboard.start_solving', 'Start Solving')}
                  </button>
                </div>

                {/* Dashboard Metrics grid */}
                <div className="stats-grid">
                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container solved">
                      <CheckCircle size={28} />
                    </div>
                    <div>
                      <div className="stat-value">{displayUser.solved_count}</div>
                      <div className="stat-label">{t('dashboard.solved_count', 'Problems Solved')}</div>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container streak">
                      <Flame size={28} />
                    </div>
                    <div>
                      <div className="stat-value">{displayUser.streak} {t('dashboard.days', 'Days')}</div>
                      <div className="stat-label">{t('dashboard.streak', 'Coding Streak')}</div>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container xp">
                      <Trophy size={28} />
                    </div>
                    <div>
                      <div className="stat-value">#{userRank}</div>
                      <div className="stat-label">{t('dashboard.current_rank', 'Current Rank')}</div>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container status">
                      <Award size={28} style={{ color: 'var(--accent-pink)' }} />
                    </div>
                    <div>
                      <div className="stat-value">{userAcceptanceRate}%</div>
                      <div className="stat-label">{t('dashboard.acceptance_rate', 'Acceptance Rate')}</div>
                    </div>
                  </div>
                </div>

                {/* Dashboard layout sections */}
                <div className="dashboard-grid">
                  
                  {/* Left Column: Heatmap, Recent list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* Coding Heatmap Calendar (GitHub 52-Week Grid Style) */}
                    <div className="glass-panel">
                      {(() => {
                        const { cells, monthHeaders, levelColors } = renderHeatmap();
                        return (
                          <>
                            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                              <Calendar size={18} color="#6366f1" /> {t('dashboard.heatmap_title', 'Coding Heatmap Calendar')}
                            </h3>

                            {/* Month Headers Bar */}
                            <div style={{ position: 'relative', height: '18px', marginLeft: '32px', marginBottom: '6px', overflowX: 'hidden' }}>
                              {monthHeaders.map((m, idx) => (
                                <div key={idx} style={{ position: 'absolute', left: `${m.colIdx * 14}px`, fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {m.name}
                                </div>
                              ))}
                            </div>

                            <div className="heatmap-grid-container">
                              <div className="heatmap-labels">
                                <span>Mon</span>
                                <span>Wed</span>
                                <span>Fri</span>
                              </div>
                              <div className="heatmap-grid">
                                {cells}
                              </div>
                            </div>

                            {/* GitHub-style Legend */}
                            <div className="heatmap-legend" style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>Less</span>
                              {levelColors.map((col, idx) => (
                                <div 
                                  key={idx} 
                                  style={{ width: '11px', height: '11px', backgroundColor: col, borderRadius: '2px', border: '1px solid var(--border-light)' }} 
                                />
                              ))}
                              <span>More</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Recent submissions table */}
                    <div className="glass-panel">
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Terminal size={18} color="#6366f1" /> {t('dashboard.recent_submissions', 'Recent Submissions')}
                      </h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="problems-table" style={{ fontSize: '0.9rem' }}>
                          <thead>
                            <tr>
                              <th>{t('dashboard.table.problem', 'Problem')}</th>
                              <th>{t('dashboard.table.language', 'Language')}</th>
                              <th>{t('dashboard.table.submitted_at', 'Submitted At')}</th>
                              <th>{t('dashboard.table.status', 'Status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {submissions.slice(0, 5).map((sub) => (
                              <tr key={sub.id} className="problem-row">
                                <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{sub.problem_title}</td>
                                <td>{sub.language.toUpperCase()}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{new Date(sub.submitted_at).toLocaleDateString()}</td>
                                <td>
                                  <span className={`status-text ${sub.status === 'Accepted' ? 'accepted' : 'wrong'}`}>
                                    {t(`status.${sub.status.toLowerCase().replace(/\s+/g, '_')}`, sub.status)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {submissions.length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                  {t('dashboard.no_submissions', 'No code submissions yet. Check out the problem list to solve!')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Solved by difficulty, Language usage */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* Solved by Difficulty Card */}
                    <div className="glass-panel">
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <Award size={18} color="#6c4dff" /> {t('dashboard.solved_by_difficulty', 'Solved by Difficulty')}
                      </h3>
                      
                      <div className="difficulty-stat-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--success)', fontWeight: '600' }}>{t('dashboard.easy', 'Easy')}</span>
                          <span style={{ fontWeight: '700' }}>{getDiffCount('Easy')} {t('dashboard.solved', 'Solved')}</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar fill-easy" style={{ width: `${Math.min(100, (getDiffCount('Easy') / 10) * 100)}%` }} />
                        </div>
                      </div>

                      <div className="difficulty-stat-box" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--warning)', fontWeight: '600' }}>{t('dashboard.medium', 'Medium')}</span>
                          <span style={{ fontWeight: '700' }}>{getDiffCount('Medium')} {t('dashboard.solved', 'Solved')}</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar fill-medium" style={{ width: `${Math.min(100, (getDiffCount('Medium') / 10) * 100)}%` }} />
                        </div>
                      </div>

                      <div className="difficulty-stat-box" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{t('dashboard.hard', 'Hard')}</span>
                          <span style={{ fontWeight: '700' }}>{getDiffCount('Hard')} {t('dashboard.solved', 'Solved')}</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar fill-hard" style={{ width: `${Math.min(100, (getDiffCount('Hard') / 10) * 100)}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Language Usage Card */}
                    <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <Code size={18} color="#6c4dff" /> {t('dashboard.language_usage', 'Language Usage')}
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {userLangCount.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '10px 0' }}>
                            {t('dashboard.no_language_data', 'No code recorded yet.')}
                          </div>
                        ) : (
                          userLangCount.map((l) => {
                            const sum = userLangCount.reduce((acc, current) => acc + current.count, 0);
                            const percent = sum > 0 ? ((l.count / sum) * 100).toFixed(0) : '0';
                            return (
                              <div key={l.language}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                                  <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{l.language}</span>
                                  <span>{percent}% ({l.count} times)</span>
                                </div>
                                <div className="progress-bar-container" style={{ height: '6px' }}>
                                  <div className="progress-bar" style={{ width: `${percent}%`, backgroundColor: 'var(--primary)' }} />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 2. Problems Bank List View */}
            {currentPage === 'problems' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">{t('problems.title', 'Challenges Bank')}</h1>
                    <p className="page-subtitle">{t('problems.subtitle', 'Select a coding problem to enter the live Monaco editor sandbox.')}</p>
                  </div>
                </div>

                <div className="glass-panel">
                  <div className="problems-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div className="problems-filter-bar" style={{ margin: 0 }}>
                        {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                          <button 
                            key={diff}
                            className={`filter-pill ${difficultyFilter === diff ? 'active' : ''}`}
                            onClick={() => setDifficultyFilter(diff)}
                          >
                            {diff === 'All' ? t('problems.all', 'All') : t(`dashboard.${diff.toLowerCase()}`, diff)}
                          </button>
                        ))}
                      </div>

                      <select 
                        className="lang-select" 
                        style={{ padding: '8px 16px', borderRadius: '9999px', fontSize: '0.85rem', background: 'var(--bg-input)', border: '1px solid var(--border-light)', color: 'var(--text-main)' }}
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="All">{t('problems.all_categories', 'All Categories')}</option>
                        <option value="Arrays">Arrays</option>
                        <option value="Strings">Strings</option>
                        <option value="Math">Math</option>
                        <option value="Two Pointers">Two Pointers</option>
                        <option value="Sliding Window">Sliding Window</option>
                        <option value="Binary Search">Binary Search</option>
                        <option value="Stacks">Stacks</option>
                        <option value="Linked Lists">Linked Lists</option>
                        <option value="Dynamic Programming">Dynamic Programming</option>
                        <option value="Trees">Trees</option>
                        <option value="Hashing">Hashing</option>
                        <option value="Matrix">Matrix</option>
                      </select>
                    </div>

                    <div style={{ position: 'relative', width: '300px' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '10px 16px', borderRadius: '9999px', fontSize: '0.85rem' }}
                        placeholder={t('problems.search_placeholder', 'Search challenges by title...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="problems-table">
                      <thead>
                        <tr>
                          <th>{t('problems.table.status', 'Status')}</th>
                          <th>{t('problems.table.title', 'Problem Title')}</th>
                          <th>{t('problems.table.category', 'Category')}</th>
                          <th>{t('problems.table.difficulty', 'Difficulty')}</th>
                          <th>{t('problems.table.action', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {problems
                          .filter(p => difficultyFilter === 'All' || p.difficulty === difficultyFilter)
                          .filter(p => categoryFilter === 'All' || p.category.toLowerCase() === categoryFilter.toLowerCase())
                          .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((p) => {
                            const isSolved = submissions.some(sub => sub.problem_id === p.id && sub.status === 'Accepted');
                            return (
                              <tr className="problem-row" key={p.id} onClick={() => selectProblemForArena(p)}>
                                <td style={{ width: '60px' }}>
                                  {isSolved ? (
                                    <CheckCircle size={20} color="var(--success)" />
                                  ) : (
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px dashed var(--border-light)' }}></div>
                                  )}
                                </td>
                                <td className="problem-title-cell">{p.title}</td>
                                <td style={{ fontSize: '0.85rem' }}>
                                  {(() => {
                                    const cStyle = getCategoryStyle(p.category);
                                    return (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '3px 9px',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: '600',
                                        background: cStyle.badgeBg,
                                        color: cStyle.badgeText,
                                        border: cStyle.border
                                      }}>
                                        <span>{cStyle.icon}</span>
                                        <span>{p.category}</span>
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td>
                                  <span className={`difficulty-badge ${p.difficulty.toLowerCase()}`}>{t(`dashboard.${p.difficulty.toLowerCase()}`, p.difficulty)}</span>
                                </td>
                                <td style={{ width: '120px' }}>
                                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                    {t('problems.solve', 'Solve')}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Monaco-style Editor Code Arena Workspace */}
            {currentPage === 'arena' && (
              <SplitPaneWorkspace 
                theme={theme}
                onToggleTheme={(t) => setTheme(t)}
                problem={arenaProblem || problems[0]}
                onBack={() => setCurrentPage('problems')}
                onRunCode={handleRunCode}
                onSubmitCode={handleRunCode}
                isRunning={isRunning}
                isSubmitting={isSubmitting}
                consoleOutput={consoleOutput}
                executionResult={executionResult}
                submissions={submissions}
              />
            )}

            {/* 4. My Submissions Log View */}
            {currentPage === 'submissions' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">My Coding Submissions</h1>
                    <p className="page-subtitle">A comprehensive chronological record of your submissions.</p>
                  </div>
                </div>

                <div className="glass-panel">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="problems-table">
                      <thead>
                        <tr>
                          <th>Submission ID</th>
                          <th>Problem Title</th>
                          <th>Difficulty</th>
                          <th>Language</th>
                          <th>Submitted At</th>
                          <th>Execution Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((sub) => (
                          <tr key={sub.id} className="problem-row">
                            <td style={{ fontWeight: '600' }}>#{sub.id}</td>
                            <td className="problem-title-cell">{sub.problem_title}</td>
                            <td>
                              <span className={`difficulty-badge ${sub.difficulty.toLowerCase()}`}>{sub.difficulty}</span>
                            </td>
                            <td>{sub.language.toUpperCase()}</td>
                            <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                            <td>
                              <span className={`status-text ${sub.status === 'Accepted' ? 'accepted' : 'wrong'}`}>
                                {sub.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {submissions.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                              You have not submitted any solutions yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Progress Dashboard View */}
            {currentPage === 'progress' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">My Progress Report</h1>
                    <p className="page-subtitle">In-depth summary analytics of your solved challenges.</p>
                  </div>
                </div>

                <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="glass-panel">
                    <h3 className="section-title" style={{ marginBottom: '20px' }}>Skill Progression Graph</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                          <span>XP Score achieved</span>
                          <strong>{displayUser.xp} / 5000 XP</strong>
                        </div>
                        <div className="progress-bar-container" style={{ height: '12px' }}>
                          <div className="progress-bar" style={{ width: `${Math.min(100, (displayUser.xp / 5000) * 100)}%`, background: 'linear-gradient(90deg, var(--primary), var(--accent-purple))' }} />
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '12px' }}>Submissions Stats Summary</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Submitted</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>{userAcceptanceTotal}</div>
                          </div>
                          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accepted Code</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>{userAcceptanceOk}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel">
                    <h3 className="section-title" style={{ marginBottom: '20px' }}>Achievements Checklist</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        <Award size={20} color={displayUser.solved_count >= 1 ? 'var(--warning)' : 'var(--text-dark)'} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>First Blood</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solve at least 1 coding problem successfully.</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        <Flame size={20} color={displayUser.streak >= 3 ? 'var(--danger)' : 'var(--text-dark)'} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Consistent Coder</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Maintain a coding streak of 3 or more days.</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        <Trophy size={20} color={displayUser.xp >= 300 ? '#ffd700' : 'var(--text-dark)'} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Master Solver</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accumulate 300+ XP skill points.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Leaderboard Global View */}
            {currentPage === 'leaderboard' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Global Leaderboard</h1>
                    <p className="page-subtitle">Rank list calculated dynamically from users solved status and points.</p>
                  </div>
                </div>

                <div className="glass-panel">
                  <div className="leaderboard-list">
                    {leaderboard.filter(item => item.role !== 'admin').map((item, idx) => (
                      <div className={`leaderboard-item ${idx < 3 ? 'top-three' : ''}`} key={item.id}>
                        <div className="rank-number">#{idx + 1}</div>
                        <div className="rank-user-profile">
                          <div className="avatar-circle">
                            {item.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="rank-username">{item.username}</span>
                          </div>
                        </div>
                        <div className="rank-stats">
                          <div className="rank-stat-item">
                            <span className="rank-stat-val">{item.solved_count}</span>
                            <span className="rank-stat-lbl">{t('leaderboard.solved', 'Solved')}</span>
                          </div>
                          <div className="rank-stat-item">
                            <span className="rank-stat-val">{item.streak} {t('dashboard.days', 'Days')}</span>
                            <span className="rank-stat-lbl">{t('leaderboard.streak', 'Streak')}</span>
                          </div>
                          <div className="rank-stat-item">
                            <span className="rank-stat-val" style={{ color: 'var(--primary)' }}>{item.xp} XP</span>
                            <span className="rank-stat-lbl">{t('leaderboard.points', 'Points')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6b. Certificates & Achievements Dashboard View */}
            {currentPage === 'achievements' && (
              <AchievementsDashboard
                user={displayUser}
                onUpdateUser={(updated) => setUser(updated)}
                onNavigate={(page) => setCurrentPage(page)}
              />
            )}

            {/* 7. Profile View */}
            {currentPage === 'profile' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle">View and update your personal developer statistics and details.</p>
                  </div>
                </div>

                <div className="admin-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                  {/* Left: Editable Details */}
                  <div className="glass-panel">
                    <h3 className="section-title" style={{ marginBottom: '20px' }}>Edit Account Profile</h3>
                    {profileMessage && (
                      <div style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        fontSize: '0.85rem', 
                        marginBottom: '16px', 
                        background: profileMessage.startsWith('Error') ? 'var(--danger-glow)' : 'var(--success-glow)',
                        color: profileMessage.startsWith('Error') ? 'var(--danger)' : 'var(--success)',
                        border: profileMessage.startsWith('Error') ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)'
                      }}>
                        {profileMessage}
                      </div>
                    )}
                    <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label className="form-label">Username *</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={profileUsername}
                            onChange={(e) => setProfileUsername(e.target.value)}
                            required 
                          />
                        </div>
                        <div>
                          <label className="form-label">Display Name</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={profileDisplayName}
                            onChange={(e) => setProfileDisplayName(e.target.value)}
                            placeholder="e.g. John Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Email Address *</label>
                        <input 
                          type="email" 
                          className="form-input" 
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          required
                          placeholder="name@example.com"
                        />
                      </div>
                      <div>
                        <label className="form-label">Password (Leave blank to keep current)</label>
                        <input 
                          type="password" 
                          className="form-input" 
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          placeholder="••••••••" 
                        />
                      </div>
                      <div>
                        <label className="form-label">Bio (Tell us about yourself)</label>
                        <textarea 
                          className="form-input" 
                          rows="3" 
                          value={profileBio}
                          onChange={(e) => setProfileBio(e.target.value)}
                          placeholder="e.g. Passionate software engineer specialising in full stack web apps."
                        />
                      </div>
                      <div>
                        <label className="form-label">GitHub Link</label>
                        <input 
                          type="url" 
                          className="form-input" 
                          value={profileGithub}
                          onChange={(e) => setProfileGithub(e.target.value)}
                          placeholder="e.g. https://github.com/your-username" 
                        />
                      </div>
                      <div>
                        <label className="form-label">Skills (Comma-separated)</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={profileSkills}
                          onChange={(e) => setProfileSkills(e.target.value)}
                          placeholder="e.g. React, Node.js, Python, SQL" 
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                        Save Profile Details
                      </button>
                    </form>
                  </div>

                  {/* Right: Info Preview Card */}
                  <div className="glass-panel" style={{ height: 'fit-content' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                      <div className="avatar-circle" style={{ width: '70px', height: '70px', fontSize: '1.75rem' }}>
                        {(displayUser.display_name || displayUser.username).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{displayUser.display_name || displayUser.username}</h3>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>@{displayUser.username} • Platform {displayUser.role} member</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Compact Achievements Section */}
                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ACHIEVEMENTS
                          </span>
                          <button
                            onClick={() => setCurrentPage('achievements')}
                            style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            View All →
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          {[5, 30, 50, 100, 120, 150, 200].map((m) => {
                            const cert = profileCerts.find(c => Number(c.milestone) === m);
                            const isEarned = Boolean(cert);
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => cert && setSelectedProfileCert(cert)}
                                disabled={!isEarned}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  border: isEarned ? '1px solid rgba(108, 77, 255, 0.4)' : '1px solid var(--border-light)',
                                  background: isEarned ? 'rgba(108, 77, 255, 0.12)' : 'var(--bg-input)',
                                  color: isEarned ? 'var(--primary)' : 'var(--text-muted)',
                                  cursor: isEarned ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease'
                                }}
                                title={isEarned ? `Click to view ${m} Problems Solved Certificate` : `Solve ${m} accepted problems to unlock`}
                              >
                                <span>{isEarned ? '🏅' : '🔒'}</span>
                                <span>{m}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bio Summary</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {displayUser.bio || 'No bio written yet. Fill it in using the edit form.'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GitHub URL</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>
                          {displayUser.github_profile ? (
                            <a href={displayUser.github_profile} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                              {displayUser.github_profile}
                            </a>
                          ) : (
                            'No github linked.'
                          )}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Skills & Expertise</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>
                          {displayUser.skills || 'None declared yet.'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Submissions Made</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>{userAcceptanceTotal} submissions</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. Settings View */}
            {currentPage === 'settings' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Customize preferences and workspace interface theme colors.</p>
                  </div>
                </div>

                <div className="glass-panel" style={{ maxWidth: '600px' }}>
                  <h3 className="section-title" style={{ marginBottom: '20px' }}>Workspace Style Theme</h3>
                  
                  {/* Theme Switcher Toggle */}
                  <div className="role-selector-container" style={{ margin: '0 0 24px 0' }}>
                    {['dark', 'light', 'system'].map((t) => (
                      <button 
                        key={t}
                        type="button" 
                        className={`role-tab ${theme === t ? 'active' : ''}`}
                        onClick={() => setTheme(t)}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {t === 'system' ? 'System Default' : `${t} Mode`}
                      </button>
                    ))}
                  </div>

                  <h3 className="section-title" style={{ marginBottom: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>{t('settings.preferences', 'Preferences')}</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Application Language Selector */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{t('settings.language', 'Application Language')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choose your preferred interface language for the platform.</div>
                      </div>
                      <LanguageSelector variant="settings" />
                    </div>

                    {/* Email Notifications Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Email Notifications</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Receive newsletter and code submissions evaluation alerts.</div>
                      </div>
                      <button 
                        type="button"
                        className={`btn ${emailNotifications ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setEmailNotifications(!emailNotifications)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        {emailNotifications ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* Sound Effects Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Code Execution Sound Effects</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Play compile and success bells on sandboxed tests runs.</div>
                      </div>
                      <button 
                        type="button"
                        className={`btn ${soundEffects ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSoundEffects(!soundEffects)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        {soundEffects ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* High Contrast Mode Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>High Contrast Editor Mode</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Increases text visibility and syntax contrasts in Monaco mockup textareas.</div>
                      </div>
                      <button 
                        type="button"
                        className={`btn ${highContrastMode ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setHighContrastMode(!highContrastMode)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        {highContrastMode ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Support & Feedback Center Page */}
            {currentPage === 'support' && (
              <SupportCenter
                user={displayUser}
                theme={theme}
                onBack={() => setCurrentPage('dashboard')}
              />
            )}

            {/* Admin Support Dashboard Page */}
            {currentPage === 'admin-support' && (
              <AdminSupportDashboard
                user={displayUser}
                theme={theme}
                isOrgPortal={false}
              />
            )}

            {/* User Assessments System Pages */}
            {currentPage === 'assessments' && (
              <div>
                {assessmentSubView === 'list' && (
                  <UserAssessmentList
                    token={token}
                    onSelectAssessment={(item) => {
                      setSelectedAssessmentId(item.id);
                      if (item.hasActiveAttempt && item.activeAttemptId) {
                        setSelectedAttemptId(item.activeAttemptId);
                        setAssessmentSubView('workspace');
                      } else {
                        setAssessmentSubView('details');
                      }
                    }}
                    onOpenResult={(attemptId) => {
                      setSelectedAttemptId(attemptId);
                      setAssessmentSubView('result');
                    }}
                    onViewHistory={() => setAssessmentSubView('history')}
                  />
                )}

                {assessmentSubView === 'details' && selectedAssessmentId && (
                  <UserAssessmentDetails
                    assessmentId={selectedAssessmentId}
                    token={token}
                    onBack={() => setAssessmentSubView('list')}
                    onStartAttempt={(attemptId) => {
                      setSelectedAttemptId(attemptId);
                      setAssessmentSubView('workspace');
                    }}
                    onViewResults={(attemptId) => {
                      setSelectedAttemptId(attemptId);
                      setAssessmentSubView('result');
                    }}
                  />
                )}

                {assessmentSubView === 'workspace' && selectedAttemptId && (
                  <UserAssessmentWorkspace
                    attemptId={selectedAttemptId}
                    token={token}
                    onFinishAssessment={(attemptId) => {
                      setSelectedAttemptId(attemptId);
                      setAssessmentSubView('result');
                    }}
                  />
                )}

                {assessmentSubView === 'result' && selectedAttemptId && (
                  <UserAssessmentResultPage
                    attemptId={selectedAttemptId}
                    token={token}
                    onBack={() => setAssessmentSubView('list')}
                    onRetake={() => setAssessmentSubView('details')}
                  />
                )}

                {assessmentSubView === 'history' && (
                  <UserAssessmentHistory
                    token={token}
                    onBack={() => setAssessmentSubView('list')}
                    onOpenResult={(attemptId) => {
                      setSelectedAttemptId(attemptId);
                      setAssessmentSubView('result');
                    }}
                  />
                )}
              </div>
            )}

            {/* User Course System Pages */}
            {currentPage === 'courses' && (
              <div>
                {selectedCourseId ? (
                  <UserCourseWorkspace
                    courseId={selectedCourseId}
                    token={token}
                    onBack={() => setSelectedCourseId(null)}
                    onGoToCertificates={() => {
                      setSelectedCourseId(null);
                      setCurrentPage('achievements');
                    }}
                  />
                ) : (
                  <UserCourseLibrary
                    token={token}
                    onSelectCourse={(id) => setSelectedCourseId(id)}
                    onGoToCertificates={() => setCurrentPage('achievements')}
                  />
                )}
              </div>
            )}

            {/* User Contest System Pages */}
            {currentPage === 'contests' && contestSubView === 'hub' && (
              <ContestHub
                token={token}
                currentUser={user}
                onViewDetails={(id) => {
                  setSelectedContestId(id);
                  setContestSubView('detail');
                }}
                onEnterContest={(id) => {
                  setSelectedContestId(id);
                  setContestSubView('workspace');
                }}
              />
            )}

            {currentPage === 'contests' && contestSubView === 'detail' && selectedContestId && (
              <ContestDetailPage
                contestId={selectedContestId}
                token={token}
                currentUser={user}
                onBack={() => setContestSubView('hub')}
                onEnterContest={(id) => {
                  setSelectedContestId(id);
                  setContestSubView('workspace');
                }}
                onViewResults={(id) => {
                  setSelectedContestId(id);
                  setContestSubView('result');
                }}
              />
            )}

            {currentPage === 'contests' && contestSubView === 'workspace' && selectedContestId && (
              <ContestWorkspace
                contestId={selectedContestId}
                token={token}
                currentUser={user}
                onBack={() => setContestSubView('hub')}
                onContestEnd={(id) => {
                  setSelectedContestId(id);
                  setContestSubView('result');
                }}
              />
            )}

            {currentPage === 'contests' && contestSubView === 'result' && selectedContestId && (
              <ContestResultPage
                contestId={selectedContestId}
                token={token}
                currentUser={user}
                onBack={() => {
                  setContestSubView('hub');
                }}
              />
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* ADMIN LOGGED IN VIEW PAGES                                     */}
        {/* ============================================================== */}
        {displayUser.role === 'admin' && (
          <>
            {/* 1. Admin Dashboard View */}
            {currentPage === 'dashboard' && (
              <div>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 className="page-title">Admin Management Dashboard</h1>
                    <p className="page-subtitle">Supervise members, review live submission trends, and manage platform database.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', animation: 'pulse 2s infinite' }}></span>
                      Live DB Connected
                    </span>
                    <button className="btn btn-secondary" onClick={() => fetchAdminStats()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.85rem' }}>
                      <RotateCcw size={14} /> Refresh Stats
                    </button>
                  </div>
                </div>

                {/* Admin Metrics Grid */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                      <Users size={24} />
                    </div>
                    <div>
                      <div className="stat-value">{adminStats?.totalUsers ?? 0}</div>
                      <div className="stat-label">Total Users</div>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                      <Activity size={24} />
                    </div>
                    <div>
                      <div className="stat-value">{adminStats?.activeUsers ?? 0}</div>
                      <div className="stat-label">Active Users</div>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
                      <Code size={24} />
                    </div>
                    <div>
                      <div className="stat-value">{adminStats?.totalProblems ?? 0}</div>
                      <div className="stat-label">Total Problems</div>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="stat-value">{adminStats?.totalSubmissions ?? 0}</div>
                      <div className="stat-label">Submissions</div>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container solved">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <div className="stat-value">{adminStats?.acceptedSolutions ?? 0}</div>
                      <div className="stat-label">Accepted Code</div>
                    </div>
                  </div>

                  <div className="glass-panel stat-card">
                    <div className="stat-icon-container" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                      <Terminal size={24} />
                    </div>
                    <div>
                      <div className="stat-value">{adminStats?.todaySubmissions ?? 0}</div>
                      <div className="stat-label">Today's Solves</div>
                    </div>
                  </div>
                </div>

                {/* Admin Charts & Live Activity Layout */}
                <div className="dashboard-grid">
                  
                  {/* Left Column: Bar chart & Line chart */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* Submission Statistics Bar Chart */}
                    <div className="glass-panel">
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BarChart2 size={18} color="#6366f1" /> Submission Statistics (Daily Output)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>Last 7 Days</span>
                      </h3>

                      {(() => {
                        const dailySubs = adminStats?.charts?.dailySubmissions || [];
                        const maxCount = Math.max(...dailySubs.map(b => b.count), 1);

                        if (!dailySubs || dailySubs.length === 0) {
                          return (
                            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No submission activity recorded in database yet.
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', padding: '10px 20px', borderLeft: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                            {dailySubs.map((bar, idx) => {
                              const heightPct = bar.count > 0 ? Math.max((bar.count / maxCount) * 100, 8) : 4;
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45px', gap: '8px' }} title={`${bar.count} total (${bar.accepted} accepted) on ${bar.date}`}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: bar.count > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                    {bar.count}
                                  </div>
                                  <div 
                                    style={{ 
                                      width: '100%', 
                                      height: `${heightPct * 1.1}px`, 
                                      maxHeight: '120px', 
                                      background: bar.count > 0 
                                        ? 'linear-gradient(180deg, var(--primary) 0%, rgba(99,102,241,0.15) 100%)' 
                                        : 'rgba(255,255,255,0.05)', 
                                      borderRadius: '4px 4px 0 0',
                                      boxShadow: bar.count > 0 ? '0 0 10px rgba(99, 102, 241, 0.2)' : 'none',
                                      transition: 'height 0.4s ease'
                                    }} 
                                  />
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bar.label}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* User Accounts & Growth Timeline Line Chart */}
                    <div className="glass-panel">
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={18} color="#6366f1" /> User Accounts & Growth Timeline
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>Last 7 Days</span>
                      </h3>

                      {(() => {
                        const dailyRegs = adminStats?.charts?.dailyRegistrations || [];
                        if (!dailyRegs || dailyRegs.length === 0) {
                          return (
                            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No user accounts recorded in database.
                            </div>
                          );
                        }

                        const maxReg = Math.max(...dailyRegs.map(r => r.count), 1);
                        const minReg = Math.min(...dailyRegs.map(r => r.count), 0);
                        const width = 500;
                        const height = 130;
                        const paddingX = 25;
                        const paddingY = 20;

                        const points = dailyRegs.map((item, idx) => {
                          const x = paddingX + (idx / Math.max(dailyRegs.length - 1, 1)) * (width - 2 * paddingX);
                          const y = maxReg === minReg
                            ? height / 2
                            : (height - paddingY) - ((item.count - minReg) / Math.max(maxReg - minReg, 1)) * (height - 2 * paddingY);
                          return { x, y, count: item.count, newSignups: item.newSignups || 0, label: item.label, day: item.day, date: item.date };
                        });

                        const pathD = points.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');

                        return (
                          <div style={{ position: 'relative', width: '100%', height: '180px', borderLeft: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="80%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                              {/* Background Grid lines */}
                              <line x1="0" y1="25" x2={width} y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              <line x1="0" y1="65" x2={width} y2="65" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              <line x1="0" y1="105" x2={width} y2="105" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                              {/* Polyline Path */}
                              <path 
                                d={pathD} 
                                fill="none" 
                                stroke="url(#gradient-line-dynamic)" 
                                strokeWidth="3.5" 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              {/* Dots */}
                              {points.map((pt, i) => (
                                <g key={i}>
                                  <circle 
                                    cx={pt.x} 
                                    cy={pt.y} 
                                    r="5" 
                                    fill={pt.count > 0 ? 'var(--primary)' : 'var(--text-dark)'} 
                                    stroke="#fff" 
                                    strokeWidth="2" 
                                  >
                                    <title>{`${pt.label}: ${pt.count} available users (${pt.newSignups > 0 ? `+${pt.newSignups} new signup(s)` : 'no new signups'})`}</title>
                                  </circle>
                                </g>
                              ))}

                              {/* Gradients */}
                              <defs>
                                <linearGradient id="gradient-line-dynamic" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="var(--primary)" />
                                  <stop offset="50%" stopColor="var(--accent-purple)" />
                                  <stop offset="100%" stopColor="var(--success)" />
                                </linearGradient>
                              </defs>
                            </svg>

                            {/* X-axis Labels */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '10px', paddingRight: '10px' }}>
                              {points.map((pt, i) => (
                                <span key={i} title={`${pt.date}: ${pt.count} total users (${pt.newSignups} new)`}>{pt.label}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Donut Chart and Live Activity Feed */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* Language Usage Donut Chart */}
                    <div className="glass-panel">
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <PieChart size={18} color="#6366f1" /> Language Share (All Submissions)
                      </h3>
                      {(() => {
                        const langUsage = adminStats?.charts?.languageUsage || [];
                        const totalSubs = adminStats?.totalSubmissions || 0;

                        if (!langUsage || langUsage.length === 0 || totalSubs === 0) {
                          return (
                            <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              <PieChart size={32} opacity={0.3} />
                              <span>No submission language data recorded yet.</span>
                            </div>
                          );
                        }

                        let accumulatedPct = 0;
                        const donutSegments = langUsage.map(item => {
                          const pct = item.percentage;
                          const offset = 25 - accumulatedPct;
                          accumulatedPct += pct;
                          return {
                            ...item,
                            dashArray: `${pct} ${100 - pct}`,
                            dashOffset: offset
                          };
                        });

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            {/* Donut representation */}
                            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                              <svg width="100%" height="100%" viewBox="0 0 42 42">
                                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                {donutSegments.map((seg, idx) => (
                                  <circle 
                                    key={idx} 
                                    cx="21" 
                                    cy="21" 
                                    r="15.915" 
                                    fill="transparent" 
                                    stroke={seg.color} 
                                    strokeWidth="6" 
                                    strokeDasharray={seg.dashArray} 
                                    strokeDashoffset={seg.dashOffset} 
                                  >
                                    <title>{`${seg.label}: ${seg.count} submissions (${seg.percentage}%)`}</title>
                                  </circle>
                                ))}
                              </svg>
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{totalSubs}</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submissions</span>
                              </div>
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                              {langUsage.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{item.label}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{item.percentage}% ({item.count})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Live Platform Activity Feed */}
                    <div className="glass-panel">
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Terminal size={18} color="#10b981" /> Recent Real-Time Activity
                      </h3>
                      {(() => {
                        const activities = adminStats?.recentActivity || [];
                        if (!activities || activities.length === 0) {
                          return (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No recent activity recorded in database.
                            </div>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activities.slice(0, 6).map((act) => (
                              <div key={act.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className={`status-pill ${act.status === 'Accepted' ? 'solved' : 'attempted'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                    {act.status}
                                  </span>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{act.display_name || act.username}</span>
                                    <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>-</span>
                                    <span style={{ color: 'var(--primary)' }}>{act.problem_title}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0 }}>
                                  <span style={{ textTransform: 'uppercase', fontWeight: 600, color: 'var(--accent-purple)' }}>{act.language}</span>
                                  <span>{new Date(act.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* 2. User Management View */}
            {currentPage === 'user-management' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">User Account Supervision</h1>
                    <p className="page-subtitle">Manage, inspect, and remove developer profiles. Currently filtered by: <strong>{userTab.toUpperCase()}</strong></p>
                  </div>
                </div>

                <div className="glass-panel">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User Details</th>
                          <th>Email Address</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Solved Problems</th>
                          <th>Metrics</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList
                          .filter((usr) => {
                            if (usr.role === 'admin') return false;
                            if (userTab === 'active') return usr.activity_status === 'online';
                            if (userTab === 'blocked') return usr.is_blocked === 1;
                            return true;
                          })
                          .map((usr) => (
                            <tr key={usr.id} style={{ opacity: usr.is_blocked ? 0.6 : 1 }}>
                              <td>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{usr.display_name || usr.username}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{usr.username}</div>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{usr.email}</td>
                              <td>
                                <span className={`admin-role-badge ${usr.role}`}>
                                  {usr.role}
                                </span>
                              </td>
                              <td>
                                <span 
                                  className="status-pill"
                                  style={{ 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    padding: '4px 8px',
                                    borderRadius: '9999px',
                                    background: usr.activity_status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                    color: usr.activity_status === 'online' ? 'var(--success)' : 'var(--text-muted)'
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: usr.activity_status === 'online' ? 'var(--success)' : 'var(--text-dark)' }}></span>
                                  {usr.activity_status === 'online' ? 'Online' : 'Offline'}
                                </span>
                              </td>
                              <td style={{ fontWeight: '600', textAlign: 'center' }}>{usr.solved_count || 0}</td>
                              <td>
                                <div style={{ fontSize: '0.85rem' }}>{usr.xp || 0} XP</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{usr.streak || 0} day streak</div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    className="btn"
                                    onClick={() => handleToggleBlockUser(usr.id, usr.is_blocked)}
                                    title={usr.is_blocked ? "Unblock account" : "Block account"}
                                    style={{ 
                                      padding: '4px 8px', 
                                      fontSize: '0.75rem',
                                      background: usr.is_blocked ? 'var(--success-glow)' : 'var(--danger-glow)',
                                      color: usr.is_blocked ? 'var(--success)' : 'var(--danger)',
                                      border: usr.is_blocked ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                    }}
                                  >
                                    {usr.is_blocked ? 'Unblock' : 'Block'}
                                  </button>
                                  <button 
                                    className="admin-action-btn"
                                    onClick={() => handleDeleteUser(usr.id)}
                                    title="Delete user profile"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Problem Management View */}
            {currentPage === 'problem-management' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Problem Database Console</h1>
                    <p className="page-subtitle">Configure, seed, and manage technical questions database. Currently tab: <strong>{problemTab.toUpperCase()}</strong></p>
                  </div>
                </div>

                {/* Sub Tab All Problems */}
                {problemTab === 'all' && (
                  <div className="glass-panel">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Problem Title</th>
                            <th>Category</th>
                            <th>Difficulty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {problems.map((p) => (
                            <tr key={p.id}>
                              <td>#{p.id}</td>
                              <td style={{ fontWeight: '600' }}>{p.title}</td>
                              <td>
                                {(() => {
                                  const cStyle = getCategoryStyle(p.category);
                                  return (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 9px',
                                      borderRadius: '6px',
                                      fontSize: '0.78rem',
                                      fontWeight: '600',
                                      background: cStyle.badgeBg,
                                      color: cStyle.badgeText,
                                      border: cStyle.border
                                    }}>
                                      <span>{cStyle.icon}</span>
                                      <span>{p.category}</span>
                                    </span>
                                  );
                                })()}
                              </td>
                              <td>
                                <span className={`difficulty-badge ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub Tab Add Problem */}
                {problemTab === 'add' && (
                  <div className="glass-panel" style={{ maxWidth: '800px' }}>
                    <h3 className="section-title" style={{ marginBottom: '20px' }}>Seed Custom Challenge</h3>
                    
                    {adminMessage && (
                      <div style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        fontSize: '0.85rem', 
                        marginBottom: '16px', 
                        background: adminMessage.startsWith('Error') ? 'var(--danger-glow)' : 'var(--success-glow)',
                        color: adminMessage.startsWith('Error') ? 'var(--danger)' : 'var(--success)',
                        border: adminMessage.startsWith('Error') ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)'
                      }}>
                        {adminMessage}
                      </div>
                    )}

                    <form onSubmit={handleAddProblem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label className="form-label">Problem Title *</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={newProblemTitle}
                            onChange={(e) => setNewProblemTitle(e.target.value)}
                            placeholder="e.g. FizzBuzz" 
                            required 
                          />
                        </div>
                        <div>
                          <label className="form-label">Category *</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={newProblemCategory}
                            onChange={(e) => setNewProblemCategory(e.target.value)}
                            placeholder="e.g. Arrays" 
                            required 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Difficulty *</label>
                        <select 
                          className="form-input" 
                          value={newProblemDifficulty}
                          onChange={(e) => setNewProblemDifficulty(e.target.value)}
                          style={{ background: 'var(--bg-input)', color: '#fff' }}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Description (Markdown Supported) *</label>
                        <textarea 
                          className="form-input" 
                          rows="4" 
                          value={newProblemDescription}
                          onChange={(e) => setNewProblemDescription(e.target.value)}
                          placeholder="Write the full problem description..."
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label">Constraints</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={newProblemConstraints}
                          onChange={(e) => setNewProblemConstraints(e.target.value)}
                          placeholder="e.g. 1 <= nums.length <= 10^5" 
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label className="form-label">Input Format</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={newProblemInput}
                            onChange={(e) => setNewProblemInput(e.target.value)}
                            placeholder="Describe parameters format..." 
                          />
                        </div>
                        <div>
                          <label className="form-label">Output Format</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={newProblemOutput}
                            onChange={(e) => setNewProblemOutput(e.target.value)}
                            placeholder="Describe return type..." 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label className="form-label">Sample Input</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={newProblemSampleInput}
                            onChange={(e) => setNewProblemSampleInput(e.target.value)}
                            placeholder="1 2 3" 
                          />
                        </div>
                        <div>
                          <label className="form-label">Sample Output</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={newProblemSampleOutput}
                            onChange={(e) => setNewProblemSampleOutput(e.target.value)}
                            placeholder="6" 
                          />
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '8px' }}>
                        <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '12px' }}>Starter Code Mappings</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label className="form-label">JavaScript Starter</label>
                            <textarea 
                              className="form-input" 
                              rows="3" 
                              value={newStarterJs}
                              onChange={(e) => setNewStarterJs(e.target.value)}
                              placeholder="function solve() { ... }"
                              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                          </div>
                          <div>
                            <label className="form-label">Python Starter</label>
                            <textarea 
                              className="form-input" 
                              rows="3" 
                              value={newStarterPython}
                              onChange={(e) => setNewStarterPython(e.target.value)}
                              placeholder="def solve(): ..."
                              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                          </div>
                          <div>
                            <label className="form-label">C++ Starter</label>
                            <textarea 
                              className="form-input" 
                              rows="3" 
                              value={newStarterCpp}
                              onChange={(e) => setNewStarterCpp(e.target.value)}
                              placeholder="int main() { ... }"
                              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                          </div>
                          <div>
                            <label className="form-label">Java Starter</label>
                            <textarea 
                              className="form-input" 
                              rows="3" 
                              value={newStarterJava}
                              onChange={(e) => setNewStarterJava(e.target.value)}
                              placeholder="public class Solution { ... }"
                              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '8px' }}>
                        <label className="form-label">Test Cases (JSON Format) *</label>
                        <textarea 
                          className="form-input" 
                          rows="4" 
                          value={newTestCasesJson}
                          onChange={(e) => setNewTestCasesJson(e.target.value)}
                          required
                          style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                          Provide a JSON array of objects: <code>{'[{"input": "...", "expected": "..."}]'}</code>
                        </span>
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>Add Problem</button>
                    </form>
                  </div>
                )}

                {/* Sub Tab Categories */}
                {problemTab === 'categories' && (
                  <div className="glass-panel">
                    <h3 className="section-title" style={{ marginBottom: '20px' }}>Database categories breakdown</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      {Array.from(new Set([
                        'Arrays', 'Strings', 'Math', 'Two Pointers', 'Sliding Window', 'Binary Search',
                        ...problems.map(p => p.category).filter(Boolean)
                      ])).map((cat) => {
                        const style = getCategoryStyle(cat);
                        const count = problems.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase()).length;
                        return (
                          <div 
                            key={cat} 
                            style={{ 
                              background: style.bg, 
                              padding: '22px', 
                              borderRadius: '14px', 
                              border: style.border,
                              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                              <span style={{ fontSize: '1.75rem' }}>{style.icon}</span>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: '700', 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                background: style.badgeBg, 
                                color: style.badgeText,
                                border: style.border
                              }}>
                                {count} {count === 1 ? 'problem' : 'problems'}
                              </span>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: style.textColor, letterSpacing: '-0.01em' }}>
                                {cat}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
                                {count > 0 ? `${count} problem(s) created` : '0 problem(s) created'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub Tab Difficulty */}
                {problemTab === 'difficulty' && (
                  <div className="glass-panel">
                    <h3 className="section-title" style={{ marginBottom: '20px' }}>Difficulty segregation</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                      {['Easy', 'Medium', 'Hard'].map((diff) => {
                        const count = problems.filter(p => p.difficulty === diff).length;
                        return (
                          <div key={diff} style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: diff === 'Easy' ? 'var(--success)' : (diff === 'Medium' ? 'var(--warning)' : 'var(--danger)') }}>{diff}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '8px' }}>{count} challenge(s)</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Test Case Mgmt View */}
            {currentPage === 'testcase-mgmt' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Test Cases Supervision</h1>
                    <p className="page-subtitle">Configure input & output expected properties for sandboxed testing evaluations.</p>
                  </div>
                </div>

                <div className="glass-panel">
                  <h3 className="section-title" style={{ marginBottom: '20px' }}>Evaluation Suite</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {problems.map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{p.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>JSON array constraints configured.</div>
                        </div>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => alert('Test case editor is locked for demonstration purposes.')}>
                          Configure Tests
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. Submissions log view */}
            {currentPage === 'submissions-mgmt' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Global Submissions Log</h1>
                    <p className="page-subtitle">Supervise and audit compilation evaluations across all users. Tab: <strong>{submissionsTab.toUpperCase()}</strong></p>
                  </div>
                </div>

                <div className="glass-panel">
                  {/* Status Filters */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'All Submissions', val: 'all' },
                      { label: 'Accepted Only', val: 'accepted' },
                      { label: 'Wrong Answers', val: 'wrong' },
                      { label: 'Runtime Errors', val: 'runtime' }
                    ].map(tab => (
                      <button 
                        key={tab.val}
                        className={`filter-pill ${submissionsTab === tab.val ? 'active' : ''}`}
                        onClick={() => setSubmissionsTab(tab.val)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Problem</th>
                          <th>Language</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions
                          .filter(s => {
                            if (submissionsTab === 'accepted') return s.status === 'Accepted';
                            if (submissionsTab === 'wrong') return s.status === 'Wrong Answer';
                            if (submissionsTab === 'runtime') return s.status.includes('Error');
                            return true;
                          })
                          .map((sub) => (
                            <tr key={sub.id}>
                              <td>#{sub.id}</td>
                              <td style={{ fontWeight: '600' }}>{sub.problem_title}</td>
                              <td>{sub.language.toUpperCase()}</td>
                              <td>
                                <span className={`status-text ${sub.status === 'Accepted' ? 'accepted' : 'wrong'}`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(sub.submitted_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        {submissions.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                              No log matching current status.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Admin View Leaderboard */}
            {currentPage === 'leaderboard' && (
              <div>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h1 className="page-title">Global Platform Leaderboard</h1>
                    <p className="page-subtitle">Calculated statistics, rankings, and performance metrics for all registered developers.</p>
                  </div>

                  {/* Leaderboard Timeframe Filter Tabs */}
                  <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                    {[
                      { id: 'DAILY', label: 'Daily' },
                      { id: 'WEEKLY', label: 'Weekly' },
                      { id: 'ALL_TIME', label: 'All-Time' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setLeaderboardFilter(tab.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          border: 'none',
                          background: leaderboardFilter === tab.id ? 'var(--primary)' : 'transparent',
                          color: leaderboardFilter === tab.id ? '#ffffff' : 'var(--text-muted)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-panel">
                  <div className="leaderboard-list">
                    {leaderboard
                      .filter(item => item.role !== 'admin')
                      .map((item, idx) => {
                        // Apply simulated timeframe multipliers for Daily/Weekly preview
                        const scoreMultiplier = leaderboardFilter === 'DAILY' ? 0.15 : leaderboardFilter === 'WEEKLY' ? 0.45 : 1.0;
                        const displayXp = Math.round((item.xp || 0) * scoreMultiplier);
                        const displaySolved = Math.max(0, Math.round((item.solved_count || 0) * scoreMultiplier));

                        return (
                          <div className={`leaderboard-item ${idx < 3 ? 'top-three' : ''}`} key={item.id}>
                            <div className="rank-number">#{idx + 1}</div>
                            <div className="rank-user-profile">
                              <div className="avatar-circle" style={{ fontWeight: '700' }}>
                                {item.username ? item.username.substring(0, 2).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <span className="rank-username">{item.username}</span>
                                {item.display_name && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.display_name}</div>
                                )}
                              </div>
                            </div>
                            <div className="rank-stats">
                              <div className="rank-stat-item">
                                <span className="rank-stat-val">{displaySolved}</span>
                                <span className="rank-stat-lbl">{t('leaderboard.solved', 'Solved')}</span>
                              </div>
                              <div className="rank-stat-item">
                                <span className="rank-stat-val">{item.streak || 0} {t('dashboard.days', 'Days')}</span>
                                <span className="rank-stat-lbl">{t('leaderboard.streak', 'Streak')}</span>
                              </div>
                              <div className="rank-stat-item">
                                <span className="rank-stat-val" style={{ color: 'var(--primary)', fontWeight: '800' }}>{displayXp} XP</span>
                                <span className="rank-stat-lbl">{t('leaderboard.score', 'Score')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* 8. Admin Profile View */}
            {currentPage === 'profile' && (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle">View and update your administrative settings and details.</p>
                  </div>
                </div>

                <div className="admin-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                  {/* Left: Editable Details */}
                  <div className="glass-panel">
                    <h3 className="section-title" style={{ marginBottom: '20px' }}>Edit Account Profile</h3>
                    {profileMessage && (
                      <div style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        fontSize: '0.85rem', 
                        marginBottom: '16px', 
                        background: profileMessage.startsWith('Error') ? 'var(--danger-glow)' : 'var(--success-glow)',
                        color: profileMessage.startsWith('Error') ? 'var(--danger)' : 'var(--success)',
                        border: profileMessage.startsWith('Error') ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)'
                      }}>
                        {profileMessage}
                      </div>
                    )}
                    <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label className="form-label">Username *</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={profileUsername}
                            onChange={(e) => setProfileUsername(e.target.value)}
                            required 
                          />
                        </div>
                        <div>
                          <label className="form-label">Display Name</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={profileDisplayName}
                            onChange={(e) => setProfileDisplayName(e.target.value)}
                            placeholder="e.g. John Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Email Address *</label>
                        <input 
                          type="email" 
                          className="form-input" 
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          required
                          placeholder="name@example.com"
                        />
                      </div>
                      <div>
                        <label className="form-label">Password (Leave blank to keep current)</label>
                        <input 
                          type="password" 
                          className="form-input" 
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          placeholder="••••••••" 
                        />
                      </div>
                      <div>
                        <label className="form-label">Bio (Tell us about yourself)</label>
                        <textarea 
                          className="form-input" 
                          rows="3" 
                          value={profileBio}
                          onChange={(e) => setProfileBio(e.target.value)}
                          placeholder="e.g. Platform Administrator."
                        />
                      </div>
                      <div>
                        <label className="form-label">GitHub Link</label>
                        <input 
                          type="url" 
                          className="form-input" 
                          value={profileGithub}
                          onChange={(e) => setProfileGithub(e.target.value)}
                          placeholder="e.g. https://github.com/your-username" 
                        />
                      </div>
                      <div>
                        <label className="form-label">Skills (Comma-separated)</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={profileSkills}
                          onChange={(e) => setProfileSkills(e.target.value)}
                          placeholder="e.g. Admin, MySQL, Node.js" 
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                        Save Profile Details
                      </button>
                    </form>
                  </div>

                  {/* Right: Info Preview Card */}
                  <div className="glass-panel" style={{ height: 'fit-content' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                      <div className="avatar-circle" style={{ width: '70px', height: '70px', fontSize: '1.75rem' }}>
                        {(displayUser.display_name || displayUser.username).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{displayUser.display_name || displayUser.username}</h3>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>@{displayUser.username} • Platform {displayUser.role} member</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bio Summary</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {displayUser.bio || 'No bio written yet.'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GitHub URL</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>
                          {displayUser.github_profile ? (
                            <a href={displayUser.github_profile} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                              {displayUser.github_profile}
                            </a>
                          ) : (
                            'No github linked.'
                          )}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Skills & Expertise</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>
                          {displayUser.skills || 'None declared yet.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* 9. Admin Certificates Management View */}
            {currentPage === 'admin-certificates' && (
              <AdminCertificatesView currentUser={displayUser} />
            )}

            {/* 9.1 Admin Organization Verification View */}
            {currentPage === 'admin-organizations' && (
              <AdminOrganizationVerification token={token} />
            )}

            {/* 10. Admin Assessment System Pages */}
            {currentPage === 'admin-assessments' && (
              <div>
                {adminAssessmentSubView === 'dashboard' && (
                  <AdminAssessmentDashboard
                    token={token}
                    onCreateNew={() => {
                      setSelectedAdminAssessmentId(null);
                      setAdminAssessmentSubView('wizard');
                    }}
                    onEditAssessment={(id) => {
                      setSelectedAdminAssessmentId(id);
                      setAdminAssessmentSubView('wizard');
                    }}
                    onViewResults={(id) => {
                      setSelectedAdminAssessmentId(id);
                      setAdminAssessmentSubView('results');
                    }}
                  />
                )}

                {adminAssessmentSubView === 'wizard' && (
                  <AdminCreateAssessmentWizard
                    assessmentId={selectedAdminAssessmentId}
                    token={token}
                    onBack={() => setAdminAssessmentSubView('dashboard')}
                    onSaveSuccess={() => setAdminAssessmentSubView('dashboard')}
                  />
                )}

                {adminAssessmentSubView === 'results' && selectedAdminAssessmentId && (
                  <AdminAssessmentResultsView
                    assessmentId={selectedAdminAssessmentId}
                    token={token}
                    onBack={() => setAdminAssessmentSubView('dashboard')}
                  />
                )}

                {adminAssessmentSubView === 'candidates' && selectedAdminAssessmentId && (
                  <AdminAssessmentCandidatesView
                    assessmentId={selectedAdminAssessmentId}
                    token={token}
                    onBack={() => setAdminAssessmentSubView('dashboard')}
                  />
                )}

                {adminAssessmentSubView === 'violations' && selectedAdminAssessmentId && (
                  <AdminAssessmentViolationsView
                    assessmentId={selectedAdminAssessmentId}
                    token={token}
                    onBack={() => setAdminAssessmentSubView('dashboard')}
                  />
                )}
              </div>
            )}

            {/* Admin Course System Pages */}
            {currentPage === 'admin-courses' && (
              <div>
                {adminCourseSubView === 'wizard' ? (
                  <AdminCourseWizard
                    courseId={editingCourseId}
                    token={token}
                    onBack={() => {
                      setAdminCourseSubView('dashboard');
                      setEditingCourseId(null);
                    }}
                    onSaveSuccess={() => {
                      setAdminCourseSubView('dashboard');
                      setEditingCourseId(null);
                    }}
                  />
                ) : (
                  <AdminCourseDashboard
                    token={token}
                    onCreateNewCourse={() => {
                      setEditingCourseId(null);
                      setAdminCourseSubView('wizard');
                    }}
                    onEditCourse={(id) => {
                      setEditingCourseId(id);
                      setAdminCourseSubView('wizard');
                    }}
                  />
                )}
              </div>
            )}



            {/* ============================================================ */}
            {/* ADMIN CONTEST SYSTEM PAGES */}
            {/* ============================================================ */}
            {currentPage === 'admin-contests' && (
              <div>
                {adminContestSubView === 'wizard' ? (
                  <AdminContestWizard
                    contestId={editingContestId}
                    token={token}
                    onBack={() => {
                      setAdminContestSubView('dashboard');
                      setEditingContestId(null);
                    }}
                    onSaveSuccess={() => {
                      setAdminContestSubView('dashboard');
                      setEditingContestId(null);
                    }}
                  />
                ) : (
                  <AdminContestDashboard
                    token={token}
                    onCreateContest={() => {
                      setEditingContestId(null);
                      setAdminContestSubView('wizard');
                    }}
                    onEditContest={(id) => {
                      setEditingContestId(id);
                      setAdminContestSubView('wizard');
                    }}
                    onViewContest={(id) => {
                      setSelectedContestId(id);
                      setCurrentPage('contests');
                      setContestSubView('detail');
                    }}
                  />
                )}
              </div>
            )}

          </>
        )}



      </main>

      {/* --- WORKSPACE FEEDBACK MODAL --- */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon-container ${modalData.status}`}>
              {modalData.status === 'success' ? <CheckCircle size={36} /> : <AlertTriangle size={36} />}
            </div>
            <h2 className="modal-title">{modalData.title}</h2>
            <p className="modal-desc">{modalData.message}</p>
            <button className="btn btn-secondary" style={{ minWidth: '100px' }} onClick={() => setShowModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- ACHIEVEMENT UNLOCKED NOTIFICATION POPUP MODAL --- */}
      {unlockedCertNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6 relative overflow-hidden animate-bounce-short">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-center">
              <CertificateBadge
                milestone={unlockedCertNotice.milestone}
                theme={unlockedCertNotice.theme}
                size={140}
                isUnlocked={true}
              />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                🏆 New Certificate Unlocked!
              </span>
              <h2 className="text-2xl font-black text-white">{unlockedCertNotice.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {unlockedCertNotice.motivation_message}
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  setUnlockedCertNotice(null);
                  setCurrentPage('achievements');
                }}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all"
              >
                View Certificate
              </button>
              <button
                onClick={() => setUnlockedCertNotice(null)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AI CHATBOT FLOATING WIDGET --- */}
      <AIChatbot arenaProblem={arenaProblem} currentUser={user} />

    </div>
  );
}
