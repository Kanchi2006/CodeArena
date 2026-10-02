import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  X, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Mail, 
  Lock, 
  ArrowRight, 
  Code2, 
  Award, 
  Trophy, 
  BookOpen, 
  CheckSquare 
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import LanguageSelector from './LanguageSelector';
import authIllustrationImg from '../assets/auth_illustration.png';

export default function AuthModal({
  isOpen,
  onClose,
  authMode,
  setAuthMode,
  handleAuthSubmit,
  nameInput,
  setNameInput,
  usernameInput,
  setUsernameInput,
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  confirmPasswordInput,
  setConfirmPasswordInput,
  authError,
  authLoading,
  onOAuthSuccess
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'github' | null
  const [oauthError, setOauthError] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const googleButtonRef = useRef(null);
  const { t } = useTranslation();

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

  // --- Initialize Google Identity Services ---
  useEffect(() => {
    if (!isOpen || !GOOGLE_CLIENT_ID) return;

    const initializeGoogle = () => {
      if (!window.google || !window.google.accounts) return;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 340,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });
        }
      } catch (e) {
        console.error('[Google GIS Init Error]:', e);
      }
    };

    if (window.google && window.google.accounts) {
      initializeGoogle();
    } else {
      const scriptId = 'google-identity-services';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initializeGoogle;
        document.head.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.google && window.google.accounts) {
            clearInterval(checkInterval);
            initializeGoogle();
          }
        }, 100);
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    }
  }, [isOpen, GOOGLE_CLIENT_ID]);

  // --- Google: Handle ID Token from Google's callback ---
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setOauthError('Google sign-in was cancelled or failed. Please try again.');
      return;
    }

    setOauthLoading('google');
    setOauthError('');

    const targetEndpoint = BACKEND_URL
      ? `${BACKEND_URL.replace(/\/$/, '')}/api/auth/google`
      : '/api/auth/google';

    try {
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();

      if (!res.ok) {
        console.error(`[Google Auth] Backend error ${res.status}:`, data?.error || 'Unknown error');
        setOauthError(data?.error || 'Google sign-in failed. Please try again.');
        return;
      }

      if (onOAuthSuccess) {
        onOAuthSuccess(data.token, data.user);
      }
      onClose();
    } catch (err) {
      console.error('[Google Auth] Network request failed:', err.message);
      setOauthError('Network error during Google sign-in. Please try again.');
    } finally {
      setOauthLoading(null);
    }
  };

  // --- Google: Trigger Google Sign-In popup ---
  const handleGoogleSignIn = () => {
    if (!GOOGLE_CLIENT_ID) {
      setOauthError('Google Sign-In is not configured. Please add VITE_GOOGLE_CLIENT_ID to your frontend .env file.');
      return;
    }

    if (!window.google || !window.google.accounts) {
      setOauthError('Google Sign-In library is still loading. Please wait a moment and try again.');
      return;
    }

    setOauthError('');
    setOauthLoading('google');

    const renderedBtn = googleButtonRef.current?.querySelector('div[role="button"]') || 
                        googleButtonRef.current?.querySelector('iframe') ||
                        googleButtonRef.current?.firstElementChild;

    if (renderedBtn) {
      try {
        renderedBtn.click();
        setTimeout(() => setOauthLoading(null), 2000);
        return;
      } catch (e) {
        console.warn('Failed to click rendered Google button:', e);
      }
    }

    try {
      window.google.accounts.id.prompt((notification) => {
        setOauthLoading(null);
        if (notification.isNotDisplayed()) {
          setOauthError('Google Sign-In prompt was suppressed by browser. Please allow popups.');
        }
      });
    } catch (e) {
      setOauthLoading(null);
      setOauthError('Google Sign-In initialization failed. Please try again.');
    }
  };

  const handleGitHubSignIn = () => {
    setOauthError('');
    setOauthLoading('github');
    const apiBase = BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
    window.location.href = `${apiBase.replace(/\/$/, '')}/api/auth/github`;
  };

  // Handle Forgot Password submit
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const targetEndpoint = BACKEND_URL
        ? `${BACKEND_URL.replace(/\/$/, '')}/api/auth/forgot-password`
        : '/api/auth/forgot-password';
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotMessage('Password reset link sent! Please check your email inbox.');
      } else {
        setForgotMessage(data.error || 'Failed to send reset link.');
      }
    } catch (err) {
      setForgotMessage('If an account exists with this email, a reset code was generated.');
    } finally {
      setForgotLoading(false);
    }
  };

  if (!isOpen) return null;

  const combinedError = authError || oauthError;

  const featureItems = [
    {
      icon: Code2,
      title: 'Coding Problems',
      subtitle: 'Practice with real-world problems'
    },
    {
      icon: Award,
      title: 'Assessments',
      subtitle: 'Test your knowledge and skills'
    },
    {
      icon: Trophy,
      title: 'Contests',
      subtitle: 'Compete and win rewards'
    },
    {
      icon: BookOpen,
      title: 'Courses',
      subtitle: 'Learn from experts'
    }
  ];

  return (
    <div className="auth-split-overlay" onClick={onClose}>
      <div 
        className="auth-split-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          className="auth-split-close-btn" 
          onClick={onClose} 
          title={t('common.close', 'Close Modal')}
        >
          <X size={20} />
        </button>

        {/* LEFT SIDE — BRANDING PANEL */}
        <div className="auth-left-panel">
          {/* Floating Subtle Geometric Background Shapes */}
          <div className="bg-shape bg-shape-1"></div>
          <div className="bg-shape bg-shape-2"></div>
          <div className="bg-shape bg-shape-3"></div>

          <div className="left-panel-content">
            {/* Header / Brand */}
            <div className="brand-header">
              <div className="brand-logo-row">
                <div className="brand-icon-box">
                  <Zap size={22} className="brand-zap-icon" />
                </div>
                <span className="brand-title-text">CodeArena</span>
              </div>
              <div className="brand-tagline">
                LEARN • PRACTICE • COMPETE
              </div>
            </div>

            {/* Main Heading & Subtitle */}
            <div className="hero-text-block">
              <h1 className="hero-main-title">
                Build Your Skills,<br />
                Shape Your <span className="title-gradient-purple">Future</span>
              </h1>
              <p className="hero-subtitle">
                Join thousands of developers, students and professionals in the ultimate coding platform.
              </p>
            </div>

            {/* Features List */}
            <div className="features-list-grid">
              {featureItems.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div className="feature-item-row" key={idx}>
                    <div className="feature-icon-wrapper">
                      <IconComponent size={20} color="#6C38FF" />
                    </div>
                    <div className="feature-text-group">
                      <h4 className="feature-item-title">{item.title}</h4>
                      <p className="feature-item-subtitle">{item.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coding Workspace Illustration */}
            <div className="illustration-wrapper">
              <img 
                src={authIllustrationImg} 
                alt="CodeArena Workspace Illustration" 
                className="auth-illustration-img"
              />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — LOGIN FORM PANEL */}
        <div className="auth-right-panel">
          {/* Top Header Row with Language Selector */}
          <div className="right-panel-top-bar">
            <LanguageSelector variant="auth-top" />
          </div>

          <div className="right-panel-form-container">
            {/* Title & Subtitle */}
            <div className="form-header-block">
              <h2 className="form-heading">
                Welcome back,<br />
                <span className="purple-heading-accent">CodeArena!</span>
              </h2>
              <p className="form-subheading">
                {authMode === 'login'
                  ? 'Sign in to continue your coding journey'
                  : authMode === 'register'
                  ? 'Create an account to start your coding journey'
                  : 'Enter verification code to secure your account'}
              </p>
            </div>

            {/* Social Login Buttons (Google & GitHub) */}
            <div className="social-login-row">
              {/* Hidden GIS Google Button Container */}
              <div 
                ref={googleButtonRef} 
                style={{ display: 'none' }}
              />

              {/* Custom Google Button */}
              <button
                type="button"
                className="social-btn google-btn"
                onClick={handleGoogleSignIn}
                disabled={oauthLoading !== null || authLoading}
              >
                {oauthLoading === 'google' ? (
                  <div className="social-spinner google-spinner" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* Custom GitHub Button */}
              <button
                type="button"
                className="social-btn github-btn"
                onClick={handleGitHubSignIn}
                disabled={oauthLoading !== null || authLoading}
              >
                {oauthLoading === 'github' ? (
                  <div className="social-spinner github-spinner" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                )}
                <span>Continue with GitHub</span>
              </button>
            </div>

            {/* Divider */}
            <div className="auth-divider-container">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">or continue with</span>
              <div className="auth-divider-line" />
            </div>

            {/* Error Banner */}
            {combinedError && (
              <div className="auth-error-banner">
                <ShieldAlert size={18} className="error-icon" />
                <span>{t(combinedError, combinedError)}</span>
              </div>
            )}

            {/* OTP Verification Flow */}
            {authMode === 'otp' ? (
              <div className="otp-container">
                <div className="otp-info-box">
                  <p className="otp-info-text">
                    We sent a 6-digit code to <strong>{emailInput}</strong>
                  </p>
                </div>

                <div className="split-form-group">
                  <label className="split-form-label">Enter Verification Code *</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="split-form-input otp-code-input"
                    placeholder="123456"
                    value={confirmPasswordInput || ''}
                    onChange={(e) => setConfirmPasswordInput && setConfirmPasswordInput(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAuthSubmit}
                  className="auth-primary-gradient-btn"
                  disabled={authLoading || (confirmPasswordInput || '').length !== 6}
                >
                  {authLoading ? (
                    <div className="btn-loading-ring"></div>
                  ) : (
                    <>
                      <span>Verify & Complete Account</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Main Login / Register Form */
              <form onSubmit={handleAuthSubmit} className="split-auth-form">
                {authMode === 'register' && (
                  <div className="split-form-group">
                    <label className="split-form-label">Full Name *</label>
                    <div className="input-with-icon-wrapper">
                      <input
                        type="text"
                        className="split-form-input"
                        placeholder="Enter your full name"
                        value={nameInput || usernameInput}
                        onChange={(e) => {
                          if (setNameInput) setNameInput(e.target.value);
                          if (setUsernameInput) setUsernameInput(e.target.value);
                        }}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* EMAIL ADDRESS FIELD */}
                <div className="split-form-group">
                  <label className="split-form-label">Email Address *</label>
                  <div className="input-with-icon-wrapper">
                    <Mail size={18} className="input-left-icon" />
                    <input
                      type={authMode === 'login' ? 'text' : 'email'}
                      className="split-form-input has-left-icon"
                      placeholder="Enter your email address"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* PASSWORD FIELD */}
                <div className="split-form-group">
                  <label className="split-form-label">Password *</label>
                  <div className="input-with-icon-wrapper">
                    <Lock size={18} className="input-left-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="split-form-input has-left-icon has-right-icon"
                      placeholder="Enter your password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="input-eye-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="split-form-group">
                    <label className="split-form-label">Confirm Password *</label>
                    <div className="input-with-icon-wrapper">
                      <Lock size={18} className="input-left-icon" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="split-form-input has-left-icon has-right-icon"
                        placeholder="Re-enter your password"
                        value={confirmPasswordInput || ''}
                        onChange={(e) => setConfirmPasswordInput && setConfirmPasswordInput(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="input-eye-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* OPTIONS ROW: Remember Me & Forgot Password */}
                {authMode === 'login' && (
                  <div className="options-row">
                    <label className="remember-me-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="custom-purple-checkbox"
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(emailInput || '');
                        setShowForgotPasswordModal(true);
                      }}
                      className="forgot-password-link-btn"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* PRIMARY GRADIENT BUTTON */}
                <button
                  type="submit"
                  className="auth-primary-gradient-btn"
                  disabled={authLoading || oauthLoading !== null}
                >
                  {authLoading ? (
                    <div className="btn-loading-ring"></div>
                  ) : (
                    <>
                      <span>{authMode === 'login' ? 'Sign In' : 'Sign Up'}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* FOOTER SWITCH LINK */}
            <div className="auth-footer-switch-container">
              {authMode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setOauthError(''); }}
                    className="switch-mode-bold-purple"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setOauthError(''); }}
                    className="switch-mode-bold-purple"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPasswordModal && (
        <div 
          className="forgot-password-modal-backdrop"
          onClick={() => setShowForgotPasswordModal(false)}
        >
          <div 
            className="forgot-password-modal-card glass-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="modal-close-btn"
              onClick={() => setShowForgotPasswordModal(false)}
            >
              <X size={18} />
            </button>
            <h3 className="forgot-modal-title">Reset Your Password</h3>
            <p className="forgot-modal-desc">
              Enter your registered email address and we will send you instructions to reset your password.
            </p>
            {forgotMessage && (
              <div className="forgot-modal-alert">
                {forgotMessage}
              </div>
            )}
            <form onSubmit={handleForgotPasswordSubmit} style={{ marginTop: '16px' }}>
              <div className="split-form-group">
                <label className="split-form-label">Email Address *</label>
                <div className="input-with-icon-wrapper">
                  <Mail size={18} className="input-left-icon" />
                  <input
                    type="email"
                    className="split-form-input has-left-icon"
                    placeholder="Enter your email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="auth-primary-gradient-btn"
                disabled={forgotLoading}
                style={{ marginTop: '12px' }}
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
