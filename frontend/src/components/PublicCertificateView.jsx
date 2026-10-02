import React, { useState, useEffect } from 'react';
import CertificateDocument from './CertificateDocument';
import CourseCertificateDocument from './CourseCertificateDocument';

export default function PublicCertificateView({ code, onNavigateHome }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchVerification() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/certificate/verify/${code}`);
        const result = await res.json();
        if (res.ok && result.verified) {
          setData(result);
        } else {
          setError(result.error || 'Invalid or revoked certificate verification code.');
        }
      } catch (err) {
        setError('Network error verifying certificate.');
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      fetchVerification();
    }
  }, [code]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col print:bg-white print:text-black">
      {/* Header Bar (Hidden during print) */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between print:hidden sticky top-0 z-30">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateHome}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-blue-500/20">
            C
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white">Code<span className="text-blue-500">Arena</span></span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Certificate
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateHome}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-all"
        >
          Go to CodeArena
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center space-y-4 py-16">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">Verifying certificate authenticity...</p>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center shadow-xl my-12">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Certificate Verification Failed</h2>
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <button
              onClick={onNavigateHome}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20"
            >
              Return to CodeArena
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="w-full flex flex-col items-center space-y-6">
            {/* Status Banner (Hidden during print) */}
            <div className="w-full max-w-4xl bg-gradient-to-r from-emerald-900/30 via-slate-900 to-emerald-900/30 border border-emerald-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Authentic & Verified Certificate</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-mono border border-emerald-500/30">
                      ID: {data.certificate.verification_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Issued to <span className="text-slate-200 font-semibold">{data.user?.display_name || data.user?.username}</span> on CodeArena
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center space-x-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print / Download</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-blue-500/20"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Certificate Document */}
            <div id="printable-certificate" className="w-full max-w-[1000px] shadow-2xl print:shadow-none print:w-full">
              {data.type === 'course' || data.certificate?.course_name || data.certificate?.verification_code?.startsWith('CA-COURSE-') ? (
                <CourseCertificateDocument certificate={data.certificate} user={data.user} />
              ) : (
                <CertificateDocument certificate={data.certificate} user={data.user} />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 print:hidden">
        CodeArena Verified Certificates &copy; {new Date().getFullYear()} — Empirically tracked by problem solving consistency.
      </footer>
    </div>
  );
}
