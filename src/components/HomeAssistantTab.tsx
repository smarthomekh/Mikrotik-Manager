import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileCode,
  FolderArchive,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutDashboard,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  Sliders,
  Sparkles,
  Terminal,
} from 'lucide-react';
import JSZip from 'jszip';
import type { RouterConnectionConfig } from '../types/mikrotik.ts';

interface HomeAssistantTabProps {
  files: Record<string, string>;
  routerConfig?: RouterConnectionConfig | null;
}

export const HomeAssistantTab: React.FC<HomeAssistantTabProps> = ({
  files,
  routerConfig,
}) => {
  const [platform, setPlatform] = useState<'casaos' | 'homeassistant' | 'docker'>('casaos');
  const fileKeys = Object.keys(files);
  const [selectedFile, setSelectedFile] = useState<string>('docker-compose.yml');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Dynamic CasaOS Compose Configuration State
  const [casaHost, setCasaHost] = useState(routerConfig?.host || '192.168.99.1');
  const [casaPort, setCasaPort] = useState(routerConfig?.port || 8443);
  const [casaUser, setCasaUser] = useState(routerConfig?.username || 'admin');
  const [casaPassword, setCasaPassword] = useState(routerConfig?.password || '');
  const [casaSsl, setCasaSsl] = useState(routerConfig?.use_ssl !== false);
  const [casaInsecureCert, setCasaInsecureCert] = useState(routerConfig?.allow_insecure_cert !== false);
  const [casaDemoMode, setCasaDemoMode] = useState(routerConfig?.mode === 'demo');

  const handleCopy = (content: string, key: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate dynamic CasaOS docker-compose.yml based on user settings
  const generatedCasaCompose = `name: mikrotik-manager

services:
  mikrotik-manager:
    image: ghcr.io/smarthomekh/mikrotik-manager:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mikrotik-manager
    restart: unless-stopped
    network_mode: bridge
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - ROUTER_HOST=${casaHost}
      - ROUTER_PORT=${casaPort}
      - ROUTER_USER=${casaUser}
      - ROUTER_PASSWORD=${casaPassword}
      - USE_SSL=${casaSsl}
      - ALLOW_INSECURE_CERT=${casaInsecureCert}
      - DEMO_MODE=${casaDemoMode}
    volumes:
      - /DATA/AppData/mikrotik-manager/data:/data
    x-casaos:
      envs:
        - container: ROUTER_HOST
          description:
            en_us: "MikroTik Router IP address (e.g. 192.168.88.1 or 192.168.99.1)"
        - container: ROUTER_PORT
          description:
            en_us: "RouterOS REST API port (8443 for HTTPS or 8282/80 for HTTP)"
        - container: ROUTER_USER
          description:
            en_us: "RouterOS admin username"
        - container: ROUTER_PASSWORD
          description:
            en_us: "RouterOS password"
        - container: USE_SSL
          description:
            en_us: "Enable SSL HTTPS connection (true/false)"
        - container: ALLOW_INSECURE_CERT
          description:
            en_us: "Accept self-signed router certificate (true/false)"
        - container: DEMO_MODE
          description:
            en_us: "Enable demo simulation mode (false for live router)"
      ports:
        - container: "3000"
          description:
            en_us: "MikroTik Manager Web Interface Port"
      volumes:
        - container: /data
          description:
            en_us: "Persistent storage directory for router settings and client rules"

x-casaos:
  architectures:
    - amd64
    - arm64
    - arm
  main: mikrotik-manager
  author: SmartHomeKH
  category: Network
  description:
    en_us: "MikroTik RouterOS Gateway Manager for CasaOS: Live WAN/LAN bandwidth graphs, popular game blocking (Roblox, Minecraft, Fortnite, Free Fire, PUBG), social media & website filtering (TikTok, YouTube, Facebook), multi-time curfew locks, simple queues QoS, and firewall rule management."
  developer: SmartHomeKH
  icon: https://raw.githubusercontent.com/smarthomekh/hasaddon/main/icon.png
  screenshot_link:
    - https://raw.githubusercontent.com/smarthomekh/hasaddon/main/icon.png
  tagline:
    en_us: "MikroTik RouterOS Parental Control, QoS & Firewall Manager"
  thumbnail: https://raw.githubusercontent.com/smarthomekh/hasaddon/main/icon.png
  title:
    en_us: "MikroTik Manager"
  index: /
  port_map: "3000"
  scheme: http
`;

  const handleDownloadCasaCompose = () => {
    const blob = new Blob([generatedCasaCompose], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-compose.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const response = await fetch('/api/ha/download-zip');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mikrotik_manager_full_package.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
      throw new Error('Failed to fetch complete bundle from server');
    } catch (err) {
      console.error('Failed to create add-on zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Deployment Hub Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-sky-500/30 shadow-lg shadow-sky-500/10 shrink-0 bg-slate-950 flex items-center justify-center p-1.5">
            <img
              src="/icon.png"
              alt="MikroTik Manager Icon"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Self-Host & Deployment Hub
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                v1.4.1
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Install and run MikroTik Manager on your local <strong className="text-sky-300">CasaOS personal cloud</strong>, as a native <strong className="text-sky-300">Home Assistant Ingress Add-on</strong>, or with standard <strong className="text-sky-300">Docker Compose</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>{isZipping ? 'Bundling...' : 'Download Full Bundle ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Platform Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setPlatform('casaos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            platform === 'casaos'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>CasaOS (1-Click App)</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/20 text-white font-mono">
            Recommended
          </span>
        </button>

        <button
          onClick={() => setPlatform('homeassistant')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            platform === 'homeassistant'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Home Assistant (Add-on Store & Local)</span>
        </button>

        <button
          onClick={() => setPlatform('docker')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            platform === 'docker'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Docker CLI & Compose</span>
        </button>
      </div>

      {/* PLATFORM 1: CASAOS */}
      {platform === 'casaos' && (
        <div className="space-y-6">
          {/* Quick Action Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-base font-bold text-white">
                  1-Click CasaOS App Store Installation
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                CasaOS includes built-in support for the <code className="text-sky-300 font-mono">x-casaos</code> format. Simply click <strong>Copy CasaOS Compose</strong>, open your CasaOS App Store &gt; <strong>Custom Install</strong> &gt; click the <strong>Import</strong> icon, and paste!
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleCopy(generatedCasaCompose, 'casaos-compose')}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-md shadow-sky-500/25 cursor-pointer whitespace-nowrap"
              >
                {copiedKey === 'casaos-compose' ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied for CasaOS!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy CasaOS Compose</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadCasaCompose}
                className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Download YAML</span>
              </button>
            </div>
          </div>

          {/* Router Configuration Builder for CasaOS */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-semibold text-white">
                  Configure Your Router Settings for CasaOS
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Updates the CasaOS compose file live below
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Router IP / Host</label>
                <input
                  type="text"
                  value={casaHost}
                  onChange={(e) => setCasaHost(e.target.value)}
                  placeholder="192.168.99.1"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">REST API Port</label>
                <input
                  type="number"
                  value={casaPort}
                  onChange={(e) => setCasaPort(Number(e.target.value))}
                  placeholder="8443"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Username</label>
                <input
                  type="text"
                  value={casaUser}
                  onChange={(e) => setCasaUser(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Password</label>
                <input
                  type="password"
                  value={casaPassword}
                  onChange={(e) => setCasaPassword(e.target.value)}
                  placeholder="Router Password"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-800/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={casaSsl}
                  onChange={(e) => setCasaSsl(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                />
                <span>Use SSL HTTPS (Recommended for port 8443)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={casaInsecureCert}
                  onChange={(e) => setCasaInsecureCert(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                />
                <span>Allow Self-Signed Router Certificate</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={casaDemoMode}
                  onChange={(e) => setCasaDemoMode(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                />
                <span>Demo Simulation Sandbox Mode</span>
              </label>
            </div>
          </div>

          {/* Step-by-Step Visual Walkthrough for CasaOS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-xs font-bold font-mono">
                1
              </div>
              <h5 className="text-xs font-bold text-white">Open CasaOS App Store</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Log into your CasaOS web dashboard (<code className="text-sky-300 font-mono">http://casaos.local</code> or IP) and click the <strong>App Store</strong> icon.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-xs font-bold font-mono">
                2
              </div>
              <h5 className="text-xs font-bold text-white">Click Custom Install</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                In the top right corner of the App Store, click <strong>Custom Install</strong> (or the <strong>+</strong> button).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-xs font-bold font-mono">
                3
              </div>
              <h5 className="text-xs font-bold text-white">Click Import &amp; Paste</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Click the <strong>Import</strong> icon (top right corner of the popup modal) and paste the copied compose YAML.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-xs font-bold font-mono">
                4
              </div>
              <h5 className="text-xs font-bold text-white">Submit &amp; Launch!</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                CasaOS auto-configures the icon, port 3000, and persistent volume. Click <strong>Install</strong> to start!
              </p>
            </div>
          </div>

          {/* Quick CasaOS SSH / Terminal Alternative */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>Prefer CasaOS SSH / Terminal? Run this 1-line command:</span>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    `mkdir -p /DATA/AppData/mikrotik-manager && cd /DATA/AppData/mikrotik-manager && curl -fsSL https://raw.githubusercontent.com/smarthomekh/hasaddon/main/docker-compose.yml -o docker-compose.yml && docker compose up -d`,
                    'casaos-ssh'
                  )
                }
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-md transition-colors cursor-pointer"
              >
                {copiedKey === 'casaos-ssh' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-sky-300 break-all">
              mkdir -p /DATA/AppData/mikrotik-manager && cd /DATA/AppData/mikrotik-manager && curl -fsSL https://raw.githubusercontent.com/smarthomekh/hasaddon/main/docker-compose.yml -o docker-compose.yml && docker compose up -d
            </div>
          </div>

          {/* CasaOS Live Compose Preview */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-xs font-semibold text-white">
                  docker-compose.yml (Configured for CasaOS with x-casaos metadata)
                </span>
              </div>
              <button
                onClick={() => handleCopy(generatedCasaCompose, 'preview-casa')}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-700 cursor-pointer"
              >
                {copiedKey === 'preview-casa' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy YAML</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 bg-slate-950/90 overflow-x-auto max-h-[380px]">
              <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                <code>{generatedCasaCompose}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* PLATFORM 2: HOME ASSISTANT */}
      {platform === 'homeassistant' && (
        <div className="space-y-6">
          {/* Supervisor Build Log Fix Notice */}
          <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-4">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0" />
              <span>
                Root Cause &amp; Permanent Fix for: <code className="text-white font-mono text-xs">Failed to install app (image build error / 403 Forbidden)</code>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-slate-900/90 border border-amber-500/20 space-y-2.5">
                <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Exact Supervisor Log Error:
                </div>
                <div className="p-2.5 rounded bg-slate-950/80 font-mono text-[10px] text-rose-300/90 space-y-1 overflow-x-auto">
                  <p>ERROR: failed to build: failed to solve: failed to fetch anonymous token: unexpected status from GET request to https://ghcr.io/token?scope=repository%3Ahome-assistant%2Famd64-base-nodejs%3Apull: 403 Forbidden</p>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Why this happened:</strong> When <code className="text-sky-300 font-mono text-[10px]">build.yaml</code> was absent, Home Assistant Supervisor defaulted to requesting a non-existent <code className="text-rose-300 font-mono text-[10px]">home-assistant/amd64-base-nodejs</code> image from GHCR, which rejected the pull with HTTP 403 Forbidden.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/30 space-y-2.5">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Permanent Fix &amp; Updates in v1.4.1:
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px]">
                  <li>
                    <strong>Explicit <code className="text-white font-mono text-[10px]">build.yaml</code> &amp; <code className="text-white font-mono text-[10px]">build.json</code>:</strong> Explicitly maps all architectures (<code className="text-sky-300 font-mono">amd64, aarch64, armv7, armhf, i386</code>) to public <code className="text-emerald-300 font-mono">node:20-alpine</code> on Docker Hub (free, zero auth required, no 403 errors).
                  </li>
                  <li>
                    <strong>Root <code className="text-white font-mono text-[10px]">repository.yaml</code>:</strong> Validates the Git repository for the Home Assistant Add-on Store crawler.
                  </li>
                  <li>
                    <strong>Pre-Built Runtime:</strong> Production bundle <code className="text-sky-300 font-mono">dist/</code> included. Dockerfile installs only runtime packages in 2s with zero compiler memory crashes.
                  </li>
                  <li>
                    <strong>Version Bumped to v1.4.1:</strong> Forces Supervisor to clear its previous failed image cache and deploys persistent game &amp; domain filtering on MikroTik.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Add-on Icon & Logo Showcase */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-semibold text-white">Add-on Visual Assets (icon.png & logo.png)</h4>
              </div>
              <span className="text-[11px] text-slate-400">Included in the ZIP bundle & root directory</span>
            </div>
            <div className="flex items-center gap-6 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex flex-col items-center gap-2">
                <img
                  src="/icon.png"
                  alt="MikroTik Add-on Icon"
                  className="w-20 h-20 rounded-xl border border-sky-500/40 shadow-md shadow-sky-500/20 object-cover"
                />
                <span className="text-[10px] font-mono text-slate-400">icon.png (Store Tile)</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <p className="text-slate-200 font-medium">Official Brand Assets for Home Assistant Add-on Store</p>
                <p className="text-[11px] leading-relaxed">
                  Home Assistant automatically renders <code className="text-sky-300 font-mono">icon.png</code> on your Add-on store card and <code className="text-sky-300 font-mono">logo.png</code> in the header panel.
                </p>
                <a
                  href="/icon.png"
                  download="icon.png"
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download icon.png directly
                </a>
              </div>
            </div>
          </div>

          {/* Cloudflare / Ingress 502 Bad Gateway Troubleshooting Callout */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Fixing "Cloudflare 502 Bad Gateway" / Add-on Starts But Cannot Open Web UI</span>
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              If the add-on installs and starts, but opening the Web UI gives a <strong>502 Bad Gateway</strong> error, it means the container is running without an active server on port 3000 (often caused by missing the compiled <code className="bg-amber-950/60 text-amber-300 font-mono px-1 rounded">dist/</code> folder in the GitHub repository, causing the startup script to fall back to an idle loop).
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isZipping ? 'Downloading...' : 'Download Full Package (Includes pre-built dist/)'}</span>
              </button>
              <span className="text-[11px] text-amber-300/70">
                Extract and push this package to your GitHub repo so the container has all compiled assets!
              </span>
            </div>
          </div>

          {/* 3 Step Deployment Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-xs font-bold font-mono">
                1
              </div>
              <h4 className="text-sm font-semibold text-white">Push Full Bundle to GitHub</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Push all files including the compiled <strong className="text-slate-200">dist/</strong> folder (<strong className="text-slate-200">dist/server.js</strong> &amp; <strong className="text-slate-200">dist/index.html</strong>) to:
                <code className="block mt-1.5 p-1.5 bg-slate-950 rounded text-sky-300 font-mono text-[10px] break-all">
                  https://github.com/smarthomekh/hasaddon
                </code>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-xs font-bold font-mono">
                2
              </div>
              <h4 className="text-sm font-semibold text-white">Check for Updates in HA</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                In Home Assistant, navigate to <strong className="text-slate-200">Settings &gt; Add-ons &gt; Add-on Store</strong>, click the top-right three dots, and click <strong className="text-slate-200">Check for updates</strong>.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-xs font-bold font-mono">
                3
              </div>
              <h4 className="text-sm font-semibold text-white">Install &amp; Start</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select <strong className="text-slate-200">MikroTik Manager (1.4.1)</strong>, click <strong className="text-slate-200">Install</strong>. It will pull node:20-alpine without errors and run on port 3000 with native Ingress!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PLATFORM 3: DOCKER CLI & COMPOSE */}
      {platform === 'docker' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4.5 h-4.5 text-sky-400" />
              <h4 className="text-sm font-semibold text-white">
                Standard Docker Run (CLI)
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Run MikroTik Manager directly on any Linux server, Raspberry Pi, or NAS running Docker:
            </p>
            <div className="relative">
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 leading-relaxed overflow-x-auto">
{`docker run -d \\
  --name mikrotik-manager \\
  --restart unless-stopped \\
  -p 3000:3000 \\
  -v /DATA/AppData/mikrotik-manager/data:/data \\
  -e ROUTER_HOST="${casaHost}" \\
  -e ROUTER_PORT=${casaPort} \\
  -e ROUTER_USER="${casaUser}" \\
  -e ROUTER_PASSWORD="${casaPassword}" \\
  -e USE_SSL=${casaSsl} \\
  -e ALLOW_INSECURE_CERT=${casaInsecureCert} \\
  -e DEMO_MODE=${casaDemoMode} \\
  ghcr.io/smarthomekh/mikrotik-manager:latest`}
              </pre>
              <button
                onClick={() =>
                  handleCopy(
                    `docker run -d --name mikrotik-manager --restart unless-stopped -p 3000:3000 -v /DATA/AppData/mikrotik-manager/data:/data -e ROUTER_HOST="${casaHost}" -e ROUTER_PORT=${casaPort} -e ROUTER_USER="${casaUser}" -e ROUTER_PASSWORD="${casaPassword}" -e USE_SSL=${casaSsl} -e ALLOW_INSECURE_CERT=${casaInsecureCert} -e DEMO_MODE=${casaDemoMode} ghcr.io/smarthomekh/mikrotik-manager:latest`,
                    'docker-cli'
                  )
                }
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-700 cursor-pointer"
              >
                {copiedKey === 'docker-cli' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manifest & File Code Inspector */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        {/* File tabs */}
        <div className="flex items-center overflow-x-auto border-b border-slate-800 bg-slate-950/60 p-2 gap-1.5 scrollbar-none">
          {fileKeys.map((fname) => {
            const isSelected = selectedFile === fname;
            return (
              <button
                key={fname}
                onClick={() => setSelectedFile(fname)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-sky-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{fname}</span>
              </button>
            );
          })}
        </div>

        {/* Selected file content header */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-white">{selectedFile}</span>
            <span className="text-[11px] text-slate-500 font-mono">
              {files[selectedFile]?.length || 0} characters
            </span>
          </div>

          <button
            onClick={() => handleCopy(files[selectedFile] || '', selectedFile)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-700 cursor-pointer"
          >
            {copiedKey === selectedFile ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Block */}
        <div className="p-4 bg-slate-950/90 overflow-x-auto max-h-[460px]">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed selection:bg-sky-500/30">
            <code>{files[selectedFile] || 'No file content'}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
