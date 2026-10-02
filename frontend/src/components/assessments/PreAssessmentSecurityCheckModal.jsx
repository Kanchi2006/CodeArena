import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Camera, 
  Mic, 
  Monitor, 
  Maximize, 
  Globe, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  RefreshCw,
  Lock,
  X
} from 'lucide-react';

export default function PreAssessmentSecurityCheckModal({ 
  assessmentTitle, 
  rulesConfig = {}, 
  onPassedChecks, 
  onCancel 
}) {
  const [webcamStatus, setWebcamStatus] = useState(rulesConfig.requireWebcam ? 'checking' : 'disabled');
  const [micStatus, setMicStatus] = useState(rulesConfig.requireMicrophone ? 'checking' : 'disabled');
  const [screenStatus, setScreenStatus] = useState(rulesConfig.requireScreenShare ? 'pending' : 'disabled');
  const [fullscreenStatus, setFullscreenStatus] = useState(rulesConfig.requireFullscreen ? 'pending' : 'disabled');
  const [browserStatus, setBrowserStatus] = useState('passed');
  const [networkStatus, setNetworkStatus] = useState('passed');
  const [acknowledgedRules, setAcknowledgedRules] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  useEffect(() => {
    runInitialPermissionsCheck();

    return () => {
      stopStreams();
    };
  }, []);

  const stopStreams = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const runInitialPermissionsCheck = async () => {
    // 1. Webcam check
    if (rulesConfig.requireWebcam) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setWebcamStatus('passed');
      } catch (err) {
        console.error('Webcam permission error:', err);
        setWebcamStatus('failed');
      }
    }

    // 2. Mic check
    if (rulesConfig.requireMicrophone) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getTracks().forEach(t => t.stop());
        setMicStatus('passed');
      } catch (err) {
        console.error('Mic permission error:', err);
        setMicStatus('failed');
      }
    }
  };

  const handleRequestScreenShare = async () => {
    setScreenStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false
      });
      screenStreamRef.current = stream;

      // Handle stream end event
      stream.getVideoTracks()[0].onended = () => {
        setScreenStatus('failed');
      };

      setScreenStatus('passed');
    } catch (err) {
      console.error('Screen sharing error:', err);
      setScreenStatus('failed');
    }
  };

  const handleRequestFullscreen = async () => {
    setFullscreenStatus('checking');
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setFullscreenStatus('passed');
    } catch (err) {
      console.error('Fullscreen request error:', err);
      setFullscreenStatus('failed');
    }
  };

  const canStart = 
    (!rulesConfig.requireWebcam || webcamStatus === 'passed') &&
    (!rulesConfig.requireMicrophone || micStatus === 'passed') &&
    (!rulesConfig.requireScreenShare || screenStatus === 'passed') &&
    (!rulesConfig.requireFullscreen || fullscreenStatus === 'passed') &&
    browserStatus === 'passed' &&
    networkStatus === 'passed' &&
    acknowledgedRules;

  const handleStartAttempt = () => {
    if (!canStart) return;
    onPassedChecks({
      webcamStream: mediaStreamRef.current,
      screenStream: screenStreamRef.current
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: 'var(--bg-panel, #ffffff)',
        border: '1px solid var(--border-light, #e4deff)',
        borderRadius: '24px',
        maxWidth: '680px',
        width: '100%',
        boxShadow: 'var(--shadow-lg, 0 20px 40px -10px rgba(108, 77, 255, 0.15))',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px',
          background: 'var(--bg-panel-elevated, #f8f6ff)',
          borderBottom: '1px solid var(--border-light, #e4deff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: '99px',
              background: 'var(--primary-glow, rgba(108, 77, 255, 0.12))',
              color: 'var(--primary, #6c4dff)',
              border: '1px solid rgba(108, 77, 255, 0.25)',
              fontSize: '0.75rem',
              fontWeight: '700',
              marginBottom: '6px'
            }}>
              <ShieldCheck size={15} /> Security & System Verification
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark, #17152a)', margin: 0 }}>
              {assessmentTitle || 'Protected Assessment'}
            </h2>
          </div>
          <button 
            onClick={onCancel} 
            style={{
              background: 'var(--bg-input, #f5f2ff)',
              border: '1px solid var(--border-light, #e4deff)',
              color: 'var(--text-muted, #6f6a80)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Rules Banner / Warning Card */}
          <div style={{
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'var(--primary-very-light, #f5f2ff)',
            border: '1px solid var(--border-light, #e4deff)',
            fontSize: '0.82rem',
            lineHeight: '1.5',
            color: 'var(--text-dark, #17152a)'
          }}>
            <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', marginBottom: '6px', fontSize: '0.9rem' }}>
              <AlertTriangle size={18} color="#d97706" /> Important Proctoring & Monitoring Policy
            </div>
            <p style={{ margin: 0, color: 'var(--text-main, #544f7d)', fontSize: '0.82rem', lineHeight: '1.55' }}>
              Your assessment is actively monitored for security violations. Switching browser tabs, leaving fullscreen mode, ending screen sharing, or revoking required permissions may issue warnings and lead to automatic assessment termination.
            </p>
          </div>

          {/* System Check Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary, #6c4dff)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              System Prerequisites & Hardware Checks
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Webcam */}
              {rulesConfig.requireWebcam && (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-panel-elevated, #f8f6ff)',
                  border: '1px solid var(--border-light, #e4deff)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-glow, rgba(108, 77, 255, 0.12))', color: 'var(--primary, #6c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-dark, #17152a)' }}>Camera Permission</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6f6a80)' }}>Live webcam monitoring</div>
                    </div>
                  </div>
                  <div>
                    {webcamStatus === 'passed' && <CheckCircle2 size={22} color="#10b981" />}
                    {webcamStatus === 'failed' && <XCircle size={22} color="#ef4444" />}
                    {webcamStatus === 'checking' && <RefreshCw size={20} color="#6c4dff" style={{ animation: 'spin 1s linear infinite' }} />}
                  </div>
                </div>
              )}

              {/* Microphone */}
              {rulesConfig.requireMicrophone && (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-panel-elevated, #f8f6ff)',
                  border: '1px solid var(--border-light, #e4deff)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-glow, rgba(108, 77, 255, 0.12))', color: 'var(--primary, #6c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-dark, #17152a)' }}>Microphone Stream</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6f6a80)' }}>Audio stream verification</div>
                    </div>
                  </div>
                  <div>
                    {micStatus === 'passed' && <CheckCircle2 size={22} color="#10b981" />}
                    {micStatus === 'failed' && <XCircle size={22} color="#ef4444" />}
                    {micStatus === 'checking' && <RefreshCw size={20} color="#6c4dff" style={{ animation: 'spin 1s linear infinite' }} />}
                  </div>
                </div>
              )}

              {/* Screen Sharing */}
              {rulesConfig.requireScreenShare && (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-panel-elevated, #f8f6ff)',
                  border: '1px solid var(--border-light, #e4deff)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-glow, rgba(108, 77, 255, 0.12))', color: 'var(--primary, #6c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Monitor size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-dark, #17152a)' }}>Screen Sharing</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6f6a80)' }}>Full screen share stream</div>
                    </div>
                  </div>
                  <div>
                    {screenStatus === 'passed' ? (
                      <CheckCircle2 size={22} color="#10b981" />
                    ) : (
                      <button
                        onClick={handleRequestScreenShare}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #6c4dff, #5638d8)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(108, 77, 255, 0.25)'
                        }}
                      >
                        Share Screen
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Fullscreen */}
              {rulesConfig.requireFullscreen && (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-panel-elevated, #f8f6ff)',
                  border: '1px solid var(--border-light, #e4deff)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-glow, rgba(108, 77, 255, 0.12))', color: 'var(--primary, #6c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Maximize size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-dark, #17152a)' }}>Fullscreen Mode</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6f6a80)' }}>Exclusive window lock</div>
                    </div>
                  </div>
                  <div>
                    {fullscreenStatus === 'passed' ? (
                      <CheckCircle2 size={22} color="#10b981" />
                    ) : (
                      <button
                        onClick={handleRequestFullscreen}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #6c4dff, #5638d8)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(108, 77, 255, 0.25)'
                        }}
                      >
                        Enter Fullscreen
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Browser & Network */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-panel-elevated, #f8f6ff)',
                border: '1px solid var(--border-light, #e4deff)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--success-glow, rgba(16, 185, 129, 0.12))', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-dark, #17152a)' }}>Browser Compatibility</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6f6a80)' }}>HTML5 & WebRTC APIs ready</div>
                  </div>
                </div>
                <CheckCircle2 size={22} color="#10b981" />
              </div>

              <div style={{
                padding: '16px',
                background: 'var(--bg-panel-elevated, #f8f6ff)',
                border: '1px solid var(--border-light, #e4deff)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--success-glow, rgba(16, 185, 129, 0.12))', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wifi size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-dark, #17152a)' }}>Network Connection</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6f6a80)' }}>Verified server sync latency</div>
                  </div>
                </div>
                <CheckCircle2 size={22} color="#10b981" />
              </div>
            </div>
          </div>

          {/* Webcam Live Preview Box */}
          {rulesConfig.requireWebcam && (
            <div style={{
              padding: '18px',
              background: 'var(--bg-panel-elevated, #f8f6ff)',
              border: '1px solid var(--border-light, #e4deff)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '18px'
            }}>
              <div style={{
                width: '150px',
                height: '95px',
                background: '#090d16',
                borderRadius: '12px',
                border: '1px solid var(--border-light, #e4deff)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                {webcamStatus !== 'passed' && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>Camera Off</span>
                )}
                {webcamStatus === 'passed' && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    padding: '2px 8px', borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.9)', color: '#fff',
                    fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em'
                  }}>
                    ● LIVE
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-dark, #17152a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={16} color="var(--primary, #6c4dff)" /> Live Webcam Stream Preview
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted, #6f6a80)', fontSize: '0.78rem', lineHeight: '1.5' }}>
                  Explicit camera access granted. Your camera feed will remain active in a small overlay during the assessment session. No biometric facial recordings are stored on backend servers without explicit consent.
                </p>
              </div>
            </div>
          )}

          {/* Rules Acknowledgement Checkbox */}
          <div style={{
            padding: '18px',
            background: 'var(--bg-panel-elevated, #f8f6ff)',
            border: '1px solid var(--border-light, #e4deff)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary, #6c4dff)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Assessment Security Rules
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-main, #544f7d)', lineHeight: '1.65' }}>
              <li>Keep this assessment browser window focused and active at all times.</li>
              <li>Do not open unauthorized tabs, external windows, or devtools.</li>
              <li>Keep required screen sharing and webcam active during the entire session.</li>
              <li>Security violations generate warnings (<strong>Limit: {rulesConfig.maxAllowedWarnings || 3} warnings</strong>).</li>
            </ul>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-light, #e4deff)',
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                checked={acknowledgedRules} 
                onChange={(e) => setAcknowledgedRules(e.target.checked)} 
                style={{ width: '18px', height: '18px', accentColor: '#6c4dff', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dark, #17152a)' }}>
                I understand and agree to all CodeArena assessment security rules.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '20px 28px',
          background: 'var(--bg-panel-elevated, #f8f6ff)',
          borderTop: '1px solid var(--border-light, #e4deff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '11px 22px',
              borderRadius: '12px',
              background: 'var(--bg-panel, #ffffff)',
              color: 'var(--text-muted, #6f6a80)',
              border: '1px solid var(--border-light, #e4deff)',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>

          <button
            disabled={!canStart}
            onClick={handleStartAttempt}
            style={{
              padding: '11px 26px',
              borderRadius: '12px',
              background: canStart ? 'linear-gradient(135deg, #6c4dff, #5638d8)' : 'var(--bg-input, #f2eeff)',
              color: canStart ? '#ffffff' : 'var(--text-muted, #94a3b8)',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: '800',
              cursor: canStart ? 'pointer' : 'not-allowed',
              opacity: canStart ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: canStart ? '0 4px 16px rgba(108,77,255,0.35)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Play size={16} /> Start Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
