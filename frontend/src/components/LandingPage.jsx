import React, { useState } from 'react';
import { 
  Code, 
  Sparkles, 
  Terminal, 
  Play, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Cpu, 
  Zap, 
  ChevronRight,
  BarChart3,
  Globe,
  Sun,
  Moon,
  Monitor,
  Tag,
  Building2
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../i18n/I18nContext';

export default function LandingPage({
  theme = 'dark',
  onToggleTheme,
  onOpenAuth,
  onStartExploring,
  onSelectProblem
}) {
  const [activeTab, setActiveTab] = useState('algorithms');
  const { t } = useTranslation();

  // Featured problems preview
  const featuredProblems = [
    {
      id: 1,
      title: 'Two Sum',
      category: 'Arrays & Hashing',
      difficulty: 'Easy',
      acceptance: '49.2%',
      codeSnippet: `function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n}`
    },
    {
      id: 2,
      title: 'Reverse String',
      category: 'Two Pointers',
      difficulty: 'Easy',
      acceptance: '78.5%',
      codeSnippet: `function reverseString(s) {\n  let left = 0, right = s.length - 1;\n  while (left < right) {\n    [s[left], s[right]] = [s[right], s[left]];\n    left++; right--;\n  }\n}`
    },
    {
      id: 3,
      title: 'Valid Parentheses',
      category: 'Stack',
      difficulty: 'Easy',
      acceptance: '40.8%',
      codeSnippet: `function isValid(s) {\n  const stack = [];\n  const pairs = { ')': '(', '}': '{', ']': '[' };\n  for (let char of s) {\n    if (pairs[char]) {\n      if (stack.pop() !== pairs[char]) return false;\n    } else stack.push(char);\n  }\n  return stack.length === 0;\n}`
    }
  ];

  return (
    <div className="landing-page-wrapper">
      
      {/* ============================================================== */}
      {/* TOP NAVIGATION BAR                                            */}
      {/* ============================================================== */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          
          {/* Logo */}
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="landing-logo-icon">
              <Code size={22} color="var(--primary)" />
            </div>
            <span className="landing-logo-text">CodeArena</span>
            <span className="landing-v2-badge">PRO v2.0</span>
          </div>

          {/* Center Navigation Links */}
          <nav className="landing-nav-links">
            <a href="#explore" className="landing-nav-link" onClick={(e) => { e.preventDefault(); onStartExploring(); }}>
              <Sparkles size={14} style={{ marginRight: '4px' }} /> {t('nav.explore', 'Explore')}
            </a>
            <a href="#problems" className="landing-nav-link" onClick={(e) => { e.preventDefault(); onStartExploring(); }}>
              {t('nav.problems', 'Problems')}
            </a>
            <a href="#product" className="landing-nav-link" onClick={(e) => { e.preventDefault(); document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' }); }}>
              {t('nav.product', 'Product')}
            </a>
          </nav>

          {/* Action Buttons & Theme Selector */}
          <div className="landing-nav-actions">
            {/* Global Searchable Language Selector */}
            <LanguageSelector variant="landing" />

            {/* Theme Toggle Pill */}
            <div className="theme-toggle-pill">
              <button 
                className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => onToggleTheme && onToggleTheme('light')}
                title="Light Mode"
              >
                <Sun size={14} />
              </button>
              <button 
                className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => onToggleTheme && onToggleTheme('dark')}
                title="Dark Mode"
              >
                <Moon size={14} />
              </button>
              <button 
                className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => onToggleTheme && onToggleTheme('system')}
                title="System Theme"
              >
                <Monitor size={14} />
              </button>
            </div>

            <button 
              className="btn btn-secondary landing-signin-btn"
              onClick={() => onOpenAuth('login')}
            >
              {t('nav.signin', 'Sign in')}
            </button>
            <button 
              className="btn btn-primary landing-create-btn"
              onClick={() => onOpenAuth('register')}
            >
              {t('nav.create_account', 'Create Account')} <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </header>

      {/* ============================================================== */}
      {/* HERO SECTION                                                  */}
      {/* ============================================================== */}
      <section className="landing-hero-section">
        <div className="hero-glow-bg"></div>
        <div className="landing-hero-container">
          
          {/* Hero Left Column: Copy & CTA */}
          <div className="hero-text-block">
            <div className="hero-top-badge">
              <Sparkles size={14} color="var(--primary)" />
              <span>{t('landing.hero_badge', 'Next-Generation Developer Coding Arena')}</span>
            </div>

            <h1 className="hero-headline">
              {t('landing.hero_title', 'Master Coding Challenges with Instant Sandboxed Execution')}
            </h1>

            <p className="hero-subtext">
              {t('landing.hero_subtext', 'Elevate your software engineering skills with our split-pane interactive workspace. Solve real-world data structures, algorithms, and system design challenges with instant compiler execution.')}
            </p>

            <div className="hero-cta-group">
              <button 
                className="btn btn-primary hero-btn-main"
                onClick={() => onOpenAuth('register')}
              >
                {t('nav.create_account', 'Create Account')} <ChevronRight size={18} />
              </button>
              
              <button 
                className="btn btn-secondary hero-btn-explore"
                onClick={onStartExploring}
              >
                <Terminal size={18} color="var(--primary)" /> {t('landing.explore_sandbox', 'Explore Sandbox')}
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="hero-metrics-row">
              <div className="hero-metric-item">
                <div className="hero-metric-num">1,200+</div>
                <div className="hero-metric-lbl">{t('landing.daily_solved', 'Daily Solved Challenges')}</div>
              </div>
              <div className="hero-metric-divider"></div>
              <div className="hero-metric-item">
                <div className="hero-metric-num">99.9%</div>
                <div className="hero-metric-lbl">{t('landing.sandbox_uptime', 'Sandbox Execution Uptime')}</div>
              </div>
              <div className="hero-metric-divider"></div>
              <div className="hero-metric-item">
                <div className="hero-metric-num">4 Languages</div>
                <div className="hero-metric-lbl">{t('landing.supported_langs', 'JS, Python, C++, Java')}</div>
              </div>
            </div>
          </div>

          {/* Hero Right Column: Graphic Mockup & Dynamic Interactive Preview */}
          <div className="hero-mockup-block">
            <div className="mockup-window glass-panel">
              {/* Window Header */}
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="mockup-title-bar">
                  <Code size={14} color="var(--primary)" /> CodeArena Split-Pane Workspace
                </div>
                <div className="mockup-badge-live">
                  <span className="live-dot"></span> LIVE
                </div>
              </div>

              {/* Window Content Split Preview */}
              <div className="mockup-split-preview">
                {/* Left Side: Problem Card */}
                <div className="mockup-left-pane">
                  <div className="mockup-problem-meta">
                    <span className="badge-difficulty easy">{t('dashboard.easy', 'Easy')}</span>
                    <span className="mockup-cat">Arrays & Hashing</span>
                  </div>
                  <h4 className="mockup-prob-title">1. Two Sum</h4>
                  <p className="mockup-prob-desc">
                    Given an array of integers <code className="inline-code">nums</code> and an integer <code className="inline-code">target</code>, return indices of two numbers that add up to <code className="inline-code">target</code>.
                  </p>
                  
                  <div className="example-container" style={{ margin: '8px 0', padding: '8px 10px' }}>
                    <div className="example-title-row" style={{ fontSize: '0.75rem' }}>{t('workspace.input_format', 'Input:')}</div>
                    <code style={{ fontSize: '0.78rem' }}>nums = [2,7,11,15], target = 9</code>
                    <div className="example-title-row" style={{ fontSize: '0.75rem', marginTop: '4px' }}>{t('workspace.output_format', 'Output:')}</div>
                    <code style={{ color: 'var(--success)', fontSize: '0.78rem' }}>[0, 1]</code>
                  </div>
                </div>

                {/* Right Side: Code Editor & Execution Result */}
                <div className="mockup-right-pane">
                  <div className="editor-header-bar" style={{ height: '30px', padding: '0 8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>JavaScript (Node.js)</span>
                    <button className="btn-action-run" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={onStartExploring}>
                      <Play size={10} fill="currentColor" /> {t('workspace.run', 'Run')}
                    </button>
                  </div>

                  <div className="mockup-editor-lines">
                    <div className="line"><span className="ln">1</span><span className="k">function</span> <span className="f">twoSum</span>(nums, target) &#123;</div>
                    <div className="line"><span className="ln">2</span>  <span className="k">const</span> map = <span className="k">new</span> <span className="t">Map</span>();</div>
                    <div className="line"><span className="ln">3</span>  <span className="k">for</span> (<span className="k">let</span> i = 0; i &lt; nums.length; i++) &#123;</div>
                    <div className="line"><span className="ln">4</span>    <span className="k">const</span> diff = target - nums[i];</div>
                    <div className="line active-line"><span className="ln">5</span>    <span className="k">if</span> (map.has(diff)) <span className="k">return</span> [map.get(diff), i];</div>
                    <div className="line"><span className="ln">6</span>    map.set(nums[i], i);</div>
                    <div className="line"><span className="ln">7</span>  &#125;</div>
                    <div className="line"><span className="ln">8</span>&#125;</div>
                  </div>

                  {/* Output Drawer Preview */}
                  <div className="testcase-drawer-container" style={{ borderTop: '1px solid var(--border-light)', padding: '6px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <CheckCircle2 size={14} color="var(--success)" />
                      <span style={{ color: 'var(--success)', fontWeight: '700' }}>{t('status.accepted', 'Accepted')}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 'auto' }}>Runtime: 38 ms</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* STYLIZED GRAPHIC MOCKUPS & STATS CARDS ILLUSTRATIONS           */}
      {/* ============================================================== */}
      <section id="features-section" className="landing-graphics-section">
        <div className="landing-container">
          
          <div className="section-header-center">
            <span className="section-pill">{t('landing.feature_pill', 'FEATURE HIGHLIGHTS')}</span>
            <h2 className="section-title-lg">
              {t('landing.feature_title', 'Engineered for Speed, Precision & Deep Learning')}
            </h2>
            <p className="section-sub-lg">
              {t('landing.feature_sub', 'Everything you need to master problem-solving skills in one unified, modern workspace.')}
            </p>
          </div>

          <div className="graphics-grid">
            
            {/* Graphic Card 1: Daily Performance Analytics */}
            <div className="graphic-card glass-panel">
              <div className="graphic-card-icon shadow-purple">
                <BarChart3 size={24} color="var(--accent-purple)" />
              </div>
              <h3>{t('landing.analytics_title', 'Real-Time Skill Analytics')}</h3>
              <p>{t('landing.analytics_desc', 'Track your submission accuracy rates, difficulty progression, and time complexity trends across topic areas.')}</p>
              
              <div className="graphic-mockup-chart">
                <div className="chart-bars-row">
                  <div className="chart-bar-col"><div className="bar" style={{ height: '40%' }}></div><span>{t('dashboard.easy', 'Easy')}</span></div>
                  <div className="chart-bar-col"><div className="bar med" style={{ height: '75%' }}></div><span>{t('dashboard.medium', 'Medium')}</span></div>
                  <div className="chart-bar-col"><div className="bar hard" style={{ height: '55%' }}></div><span>{t('dashboard.hard', 'Hard')}</span></div>
                </div>
              </div>
            </div>

            {/* Graphic Card 2: Interactive Split-Pane Workspace */}
            <div className="graphic-card glass-panel">
              <div className="graphic-card-icon shadow-indigo">
                <Layers size={24} color="var(--primary)" />
              </div>
              <h3>{t('landing.split_title', 'Dual Split-Pane Workspace')}</h3>
              <p>{t('landing.split_desc', 'Inspect problem statements, markdown formulas, hints, and community editorials side-by-side with your code compiler.')}</p>
              
              <div className="graphic-mockup-split">
                <div className="split-thumb left">
                  <div className="mini-line"></div>
                  <div className="mini-line w70"></div>
                  <div className="mini-tag">Hints</div>
                </div>
                <div className="split-divider"></div>
                <div className="split-thumb right">
                  <div className="mini-code"></div>
                  <div className="mini-code w80"></div>
                  <div className="mini-btn">{t('workspace.run', 'Run')}</div>
                </div>
              </div>
            </div>

            {/* Graphic Card 3: Multi-Language Execution Sandbox */}
            <div className="graphic-card glass-panel">
              <div className="graphic-card-icon shadow-green">
                <Zap size={24} color="var(--success)" />
              </div>
              <h3>{t('landing.sandbox_title', 'Instant Execution Sandbox')}</h3>
              <p>{t('landing.sandbox_desc', 'Execute and benchmark solutions instantly in JavaScript, Python 3, C++ GCC, and Java JDK environments.')}</p>
              
              <div className="graphic-mockup-langs">
                <span className="lang-chip js">JavaScript</span>
                <span className="lang-chip py">Python 3</span>
                <span className="lang-chip cpp">C++</span>
                <span className="lang-chip java">Java</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* ALTERNATIVE EXPLORATION BLOCK                                   */}
      {/* ============================================================== */}
      <section id="exploration-block" className="landing-exploration-section">
        <div className="landing-container">
          
          <div className="exploration-block-wrapper glass-panel">
            <div className="exploration-left-tier">
              <span className="section-pill">FEATURE EXPLORER</span>
              <h2 className="exploration-title">
                {t('landing.explorer_title', 'Start Exploring Our Practice Tracks')}
              </h2>
              <p className="exploration-sub">
                {t('landing.explorer_sub', 'Dive straight into structured practice modules designed by senior engineers from top tech organizations.')}
              </p>

              {/* Exploration Track Tabs */}
              <div className="exploration-tabs">
                <button 
                  className={`explore-tab-btn ${activeTab === 'algorithms' ? 'active' : ''}`}
                  onClick={() => setActiveTab('algorithms')}
                >
                  <Code size={16} /> {t('landing.track_algo', 'Algorithms & Data Structures')}
                </button>
                <button 
                  className={`explore-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                  onClick={() => setActiveTab('system')}
                >
                  <Cpu size={16} /> {t('landing.track_system', 'System Design & Scalability')}
                </button>
                <button 
                  className={`explore-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
                  onClick={() => setActiveTab('database')}
                >
                  <Globe size={16} /> {t('landing.track_db', 'SQL & Database Optimization')}
                </button>
              </div>

              <div className="exploration-action-row">
                <button className="btn btn-primary" onClick={onStartExploring}>
                  {t('landing.get_started', 'Get Started')} <ChevronRight size={16} />
                </button>
                <span className="exploration-note">{t('landing.no_card', 'No credit card required • Instant access')}</span>
              </div>
            </div>

            {/* Exploration Right Tier: Dynamic Preview Cards */}
            <div className="exploration-right-tier">
              <div className="preview-cards-container">
                {featuredProblems.map((prob) => (
                  <div 
                    key={prob.id} 
                    className="exploration-preview-card"
                    onClick={() => onSelectProblem(prob)}
                  >
                    <div className="prob-card-header">
                      <span className={`badge-difficulty ${prob.difficulty.toLowerCase()}`}>{t(`dashboard.${prob.difficulty.toLowerCase()}`, prob.difficulty)}</span>
                      <span className="prob-card-cat">{prob.category}</span>
                    </div>

                    <h4 className="prob-card-title">{prob.title}</h4>

                    <div className="prob-card-code">
                      <pre><code>{prob.codeSnippet}</code></pre>
                    </div>

                    <div className="prob-card-footer">
                      <span className="prob-acc">{t('dashboard.acceptance_rate', 'Acceptance')}: {prob.acceptance}</span>
                      <button className="prob-solve-btn">
                        {t('problems.solve', 'Solve Challenge')} <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* LANDING FOOTER                                                */}
      {/* ============================================================== */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="landing-logo">
                <div className="landing-logo-icon">
                  <Code size={20} color="var(--primary)" />
                </div>
                <span className="landing-logo-text">CodeArena</span>
              </div>
              <p className="footer-desc">
                {t('landing.footer_desc', 'The modern interactive coding practice platform for software engineers.')}
              </p>
            </div>

            <div className="footer-links-group">
              <div className="footer-col">
                <h4>{t('nav.product', 'Product')}</h4>
                <a href="#features" onClick={onStartExploring}>{t('problems.title', 'Challenges Bank')}</a>
                <a href="#features" onClick={onStartExploring}>Monaco Workspace</a>
                <a href="#features" onClick={onStartExploring}>{t('nav.leaderboard', 'Leaderboards')}</a>
              </div>
              <div className="footer-col">
                <h4>Resources</h4>
                <a href="#features" onClick={onStartExploring}>{t('workspace.tab.editorial', 'Editorials')}</a>
                <a href="#features" onClick={onStartExploring}>Community Solutions</a>
                <a href="#features" onClick={onStartExploring}>API Sandbox</a>
              </div>
              <div className="footer-col">
                <h4>Account</h4>
                <a href="#login" onClick={() => onOpenAuth('login')}>{t('nav.signin', 'Sign In')}</a>
                <a href="#register" onClick={() => onOpenAuth('register')}>{t('nav.create_account', 'Create Account')}</a>
                <a href="#demo" onClick={onStartExploring}>{t('landing.explore_sandbox', 'Guest Practice')}</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} CodeArena. {t('landing.rights', 'All rights reserved. Designed for excellence.')}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
