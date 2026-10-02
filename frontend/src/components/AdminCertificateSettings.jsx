import React, { useState, useEffect } from 'react';

const THEME_OPTIONS = [
  { value: 'bronze', label: 'Bronze (5 Milestone)' },
  { value: 'blue', label: 'Blue (30 Milestone)' },
  { value: 'emerald', label: 'Emerald Green (50 Milestone)' },
  { value: 'purple', label: 'Purple (100 Milestone)' },
  { value: 'orange', label: 'Orange (120 Milestone)' },
  { value: 'teal', label: 'Teal (150 Milestone)' },
  { value: 'indigo', label: 'Royal Blue / Indigo (200 Milestone)' }
];

export default function AdminCertificateSettings() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/certificates/settings');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
      }
    } catch (err) {
      console.error('Failed to fetch certificate settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (milestone, field, value) => {
    setConfigs((prev) =>
      prev.map((item) =>
        item.milestone === milestone ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = async (milestone) => {
    const configToSave = configs.find((c) => c.milestone === milestone);
    if (!configToSave) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/certificates/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave)
      });
      const result = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Saved settings for Milestone ${milestone}!` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save milestone config.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error updating milestone config.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <span>Loading milestone configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-1">Milestone Certificate Rules & Copy Editor</h3>
        <p className="text-xs text-slate-400 mb-6">
          Customize certificate titles, visual themes, motivational quotes, and template copy. Dynamic placeholder <span className="font-mono text-blue-400">{"{userName}"}</span> will be replaced automatically.
        </p>

        <div className="space-y-6">
          {configs.map((config) => (
            <div
              key={config.milestone}
              className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 font-mono font-bold flex items-center justify-center border border-blue-500/30">
                    #{config.milestone}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{config.title}</h4>
                    <span className="text-[11px] text-slate-400">Milestone: {config.milestone} Accepted Problems</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(config.is_enabled)}
                      onChange={(e) => handleChange(config.milestone, 'is_enabled', e.target.checked ? 1 : 0)}
                      className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Enabled</span>
                  </label>

                  <button
                    onClick={() => handleSave(config.milestone)}
                    disabled={saving}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-blue-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Certificate Title</label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => handleChange(config.milestone, 'title', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Visual Theme</label>
                  <select
                    value={config.theme}
                    onChange={(e) => handleChange(config.milestone, 'theme', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    {THEME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Motivational Quote / Message</label>
                  <input
                    type="text"
                    value={config.motivation_message}
                    onChange={(e) => handleChange(config.milestone, 'motivation_message', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Description Template</label>
                  <textarea
                    rows={2}
                    value={config.description_template}
                    onChange={(e) => handleChange(config.milestone, 'description_template', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
