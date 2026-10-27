import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Info,
  Network,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import type { RouterConnectionConfig } from '../types/mikrotik.ts';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  data?: any;
  diagnosis?: {
    is_private_ip?: boolean;
    tcp_open?: boolean;
    tested_url?: string;
    status_code?: number;
    host?: string;
    port?: number;
    use_ssl?: boolean;
    service_hints?: string[];
    recommendation?: string;
    actionable_solutions?: Array<{
      title: string;
      badge: string;
      steps: string[];
    }>;
  };
}

interface RouterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RouterConnectionConfig;
  onSave: (newCfg: Partial<RouterConnectionConfig>) => Promise<void>;
  onTest: (cfg: Partial<RouterConnectionConfig>) => Promise<TestConnectionResult>;
  onSwitchToSimulator?: () => void;
}

// Preset ports based on user's Winbox /ip/service setup
const PORT_PRESETS = [
  {
    port: 8443,
    ssl: true,
    label: '8443 (www-ssl)',
    desc: 'RouterOS HTTPS REST (Active in Winbox)',
    isRecommended: true,
  },
  {
    port: 8282,
    ssl: false,
    label: '8282 (www)',
    desc: 'RouterOS HTTP REST (Active in Winbox)',
    isRecommended: false,
  },
  {
    port: 443,
    ssl: true,
    label: '443 (Reverse-Proxy)',
    desc: 'Winbox Reverse-Proxy service',
    isRecommended: false,
  },
  {
    port: 8728,
    ssl: false,
    label: '8728 (api)',
    desc: 'Binary API socket (Active, restricted IP)',
    isRecommended: false,
  },
];

export const RouterConfigModal: React.FC<RouterConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onTest,
  onSwitchToSimulator,
}) => {
  const [formData, setFormData] = useState<Partial<RouterConnectionConfig>>({
    host: config.host || '192.168.99.1',
    port: config.port || 8443,
    username: config.username || 'admin',
    password: '',
    use_ssl: config.use_ssl !== undefined ? config.use_ssl : true,
    allow_insecure_cert: config.allow_insecure_cert !== undefined ? config.allow_insecure_cert : true,
    mode: config.mode || 'real',
    poll_interval_ms: config.poll_interval_ms || 1000,
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTest(formData);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const applyPortPreset = (preset: typeof PORT_PRESETS[0]) => {
    setFormData((prev) => ({
      ...prev,
      port: preset.port,
      use_ssl: preset.ssl,
      allow_insecure_cert: preset.ssl ? true : prev.allow_insecure_cert,
    }));
  };

  const handleEnableSimulator = async () => {
    const updated: Partial<RouterConnectionConfig> = {
      ...formData,
      mode: 'demo',
    };
    setFormData(updated);
    await onSave(updated);
    if (onSwitchToSimulator) onSwitchToSimulator();
    onClose();
  };

  const isLanIp =
    formData.host?.startsWith('192.168.') ||
    formData.host?.startsWith('10.') ||
    formData.host?.startsWith('172.16.') ||
    formData.host?.startsWith('172.31.') ||
    formData.host === 'localhost' ||
    formData.host === '127.0.0.1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">MikroTik RouterOS Connection</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  RouterOS v7+
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect directly to your MikroTik RouterBOARD or test via Interactive Simulator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Operation Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Operational Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'real' })}
                className={`flex flex-col items-start p-3.5 rounded-lg border text-left transition-all ${
                  formData.mode === 'real'
                    ? 'border-sky-500 bg-sky-500/10 text-white shadow-sm shadow-sky-500/10 ring-1 ring-sky-500/50'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-semibold text-white">Live RouterOS Device</span>
                  </div>
                  {formData.mode === 'real' && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                  )}
                </div>
                <span className="text-xs text-slate-400 leading-relaxed">
                  Real REST API calls to your MikroTik RouterBOARD (/rest/queue, /ip/firewall, /interface).
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'demo' })}
                className={`flex flex-col items-start p-3.5 rounded-lg border text-left transition-all ${
                  formData.mode === 'demo'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Simulator Mode</span>
                  </div>
                  {formData.mode === 'demo' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <span className="text-xs text-slate-400 leading-relaxed">
                  Instant live emulation with synthetic throughput, queues, schedules, and game filtering.
                </span>
              </button>
            </div>
          </div>

          {/* Router Address & Port */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Router IP / Hostname / Cloud DDNS
                  </label>
                  {isLanIp && formData.mode === 'real' && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-normal">
                      <AlertTriangle className="w-3 h-3" /> Private LAN IP
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="e.g. 192.168.99.1 or xxxxx.sn.mynetname.net"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono tracking-tight"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Port
                </label>
                <input
                  type="number"
                  value={formData.port || 8443}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Quick Port Presets based on user's Winbox /ip/service setup */}
            <div>
              <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Select Port from your RouterOS Services:</span>
                <span className="text-[10px] text-slate-500">Matches Winbox /ip/service</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PORT_PRESETS.map((preset) => {
                  const isSelected = formData.port === preset.port;
                  return (
                    <button
                      key={preset.port}
                      type="button"
                      onClick={() => applyPortPreset(preset)}
                      className={`px-2.5 py-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500/15 text-white ring-1 ring-sky-500/40'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-slate-200">
                          {preset.port}
                        </span>
                        {preset.isRecommended && (
                          <span className="text-[9px] uppercase font-bold text-sky-400 bg-sky-500/20 px-1 py-0.2 rounded">
                            Rec
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                        {preset.ssl ? 'HTTPS (SSL)' : 'HTTP'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                RouterOS Username
              </label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                placeholder="admin"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                RouterOS Password
              </label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep existing password"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          {/* SSL & Certificate Options */}
          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.use_ssl}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    use_ssl: e.target.checked,
                    // If switching to SSL, default to port 8443 if on 8282 or 80
                    port: e.target.checked
                      ? formData.port === 8282 || formData.port === 80
                        ? 8443
                        : formData.port
                      : formData.port === 8443 || formData.port === 443
                      ? 8282
                      : formData.port,
                  })
                }
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-200">
                  Use HTTPS / SSL (RouterOS www-ssl service)
                </span>
                <p className="text-[11px] text-slate-400">
                  Connect securely via encrypted REST API endpoint on port {formData.use_ssl ? formData.port || 8443 : 8443}.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-800/60">
              <input
                type="checkbox"
                checked={formData.allow_insecure_cert}
                onChange={(e) => setFormData({ ...formData, allow_insecure_cert: e.target.checked })}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  Accept self-signed TLS certificates (ssl_cert)
                </span>
                <p className="text-[11px] text-slate-400">
                  Essential for MikroTik RouterBOARDs using self-generated or default certificates to prevent SSL handshake rejections.
                </p>
              </div>
            </label>
          </div>

          {/* LAN IP Informational Banner */}
          {isLanIp && formData.mode === 'real' && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-200">
                <Info className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Notice for Private Home Network IPs ({formData.host})</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                In this cloud-hosted preview environment, cloud containers cannot directly reach private LAN IPs (like <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">{formData.host}</code>).
                When installed as a <strong>Home Assistant Add-on</strong> on your local server, Home Assistant will have direct local LAN access to your MikroTik router on port {formData.port}!
              </p>
            </div>
          )}

          {/* Test connection result details */}
          {testResult && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-3 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold text-sm">
                    {testResult.success ? 'Connection Succeeded' : 'Connection Failed'}
                  </div>
                  <p className="text-slate-300 break-words leading-relaxed">{testResult.message}</p>
                </div>
              </div>

              {/* Actionable Diagnostic Card */}
              {testResult.diagnosis && (
                <div className="pt-3 border-t border-slate-800 space-y-3 font-sans">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Tested Endpoint:</span>
                    <span className="font-mono text-slate-300">{testResult.diagnosis.tested_url}</span>
                  </div>

                  {testResult.diagnosis.service_hints && testResult.diagnosis.service_hints.length > 0 && (
                    <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="font-medium text-sky-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Service Configuration Analysis
                      </div>
                      {testResult.diagnosis.service_hints.map((hint, idx) => (
                        <p key={idx} className="leading-relaxed text-slate-400">{hint}</p>
                      ))}
                    </div>
                  )}

                  {testResult.diagnosis.actionable_solutions && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                        How to resolve this:
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {testResult.diagnosis.actionable_solutions.map((sol, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{sol.title}</span>
                              <span className="px-2 py-0.5 text-[9px] uppercase font-bold rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                {sol.badge}
                              </span>
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                              {sol.steps.map((st, sIdx) => (
                                <li key={sIdx} className="leading-relaxed">{st}</li>
                              ))}
                            </ul>
                            {sol.title.includes('Simulator Mode') && (
                              <button
                                type="button"
                                onClick={handleEnableSimulator}
                                className="mt-2 w-full py-1.5 px-3 rounded bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                                1-Click: Switch to Simulator Mode Now
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Guidance Accordion */}
          <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                Troubleshooting Guide & Service Ports
              </span>
              <span className="text-[11px] font-mono text-sky-400">
                {showExplanation ? 'Hide' : 'Show Details'}
              </span>
            </button>
            {showExplanation && (
              <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2.5">
                <p>
                  <strong className="text-slate-200">1. Active Services on your Router:</strong> Your RouterOS
                  configuration shows <code className="text-sky-300">www-ssl</code> on port <strong className="text-white">8443</strong>,
                  <code className="text-sky-300">www</code> on port <strong className="text-white">8282</strong>, and
                  <code className="text-sky-300">reverse-proxy</code> on port <strong className="text-white">443</strong>. Make sure to use port <strong>8443</strong> (HTTPS) or <strong>8282</strong> (HTTP).
                </p>
                <p>
                  <strong className="text-slate-200">2. Local Home Assistant Add-on:</strong> Once downloaded and running inside Home Assistant on your home network,
                  the add-on connects directly to your router at <code className="text-sky-300">{formData.host}:{formData.port}</code> with zero cloud limits.
                </p>
                <p>
                  <strong className="text-slate-200">3. Remote Access via MikroTik Cloud DDNS:</strong> If you wish to manage your router remotely, enable
                  <code className="text-slate-300">/ip cloud set ddns-enabled=yes</code> in RouterOS, forward port 8443 on your firewall NAT, and enter your Cloud DNS name here.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  Testing Link...
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-sky-400" />
                  Test Connection
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-400 rounded-lg transition-colors shadow-sm shadow-sky-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? 'Saving...' : 'Save & Connect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
