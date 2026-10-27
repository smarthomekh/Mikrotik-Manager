import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Cpu,
  Database,
  Flame,
  Globe,
  HardDrive,
  Laptop,
  Radio,
  Server,
  Shield,
  ShieldAlert,
  Wifi,
  Zap,
} from 'lucide-react';
import type {
  ClientDevice,
  InterfaceTraffic,
  RouterInfo,
  SimpleQueue,
  ThroughputHistoryPoint,
} from '../types/mikrotik.ts';
import { formatBps, formatBytes, formatNumber } from '../utils/formatters.ts';

interface OverviewTabProps {
  routerInfo: RouterInfo | null;
  interfaces: InterfaceTraffic[];
  wanInterface: InterfaceTraffic | null;
  history: ThroughputHistoryPoint[];
  clients: ClientDevice[];
  queues: SimpleQueue[];
  panicActive: boolean;
  onTogglePanic: () => void;
  onBlockClient: (ip: string, block: boolean) => void;
  onOpenSpeedModal: (device: ClientDevice) => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  routerInfo,
  interfaces,
  wanInterface,
  history,
  clients,
  queues,
  panicActive,
  onTogglePanic,
  onBlockClient,
  onOpenSpeedModal,
  onNavigateTab,
}) => {
  const activeClients = clients.filter((c) => c.status === 'active');
  const blockedClients = clients.filter((c) => c.is_blocked);
  const throttledClients = clients.filter((c) => c.max_download_limit && c.max_download_limit !== 'Uncapped');

  const topClients = [...clients]
    .sort((a, b) => b.rx_rate_bps + b.tx_rate_bps - (a.rx_rate_bps + a.tx_rate_bps))
    .slice(0, 5);

  // SVG Chart Calculations for Live Throughput
  const chartHeight = 160;
  const chartWidth = 720;
  const pointsCount = history.length;
  const maxRx = Math.max(10, ...history.map((p) => Math.max(p.wan_rx_mbps, p.wan_tx_mbps))) * 1.15;

  const getCoordinates = (values: number[]) => {
    if (values.length < 2) return '';
    return values
      .map((val, idx) => {
        const x = (idx / (values.length - 1)) * chartWidth;
        const y = chartHeight - (val / maxRx) * (chartHeight - 20) - 10;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const rxPoints = history.map((p) => p.wan_rx_mbps);
  const txPoints = history.map((p) => p.wan_tx_mbps);

  const rxPolyline = getCoordinates(rxPoints);
  const txPolyline = getCoordinates(txPoints);

  const rxArea =
    rxPoints.length >= 2
      ? `0,${chartHeight} ${rxPolyline} ${chartWidth},${chartHeight}`
      : '';
  const txArea =
    txPoints.length >= 2
      ? `0,${chartHeight} ${txPolyline} ${chartWidth},${chartHeight}`
      : '';

  const currentWanRx = wanInterface ? wanInterface.rx_bps : 0;
  const currentWanTx = wanInterface ? wanInterface.tx_bps : 0;

  return (
    <div className="space-y-6">
      {/* Top Telemetry KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* WAN Download */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
              WAN Download
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Live</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {formatBps(currentWanRx)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
            <span>Peak: {(Math.max(...rxPoints, 0)).toFixed(1)} Mbps</span>
            <span>{wanInterface ? `${formatNumber(wanInterface.rx_packets_per_sec)} p/s` : ''}</span>
          </div>
        </div>

        {/* WAN Upload */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <ArrowUp className="w-3.5 h-3.5 text-sky-400" />
              WAN Upload
            </span>
            <span className="text-[10px] text-sky-400 font-mono">Live</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {formatBps(currentWanTx)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
            <span>Peak: {(Math.max(...txPoints, 0)).toFixed(1)} Mbps</span>
            <span>{wanInterface ? `${formatNumber(wanInterface.tx_packets_per_sec)} p/s` : ''}</span>
          </div>
        </div>

        {/* CPU Load */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              CPU Load
            </span>
            <span className="text-[11px] text-slate-400 font-mono">{routerInfo?.cpu_frequency_mhz} MHz</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight flex items-baseline gap-2">
            <span>{routerInfo?.cpu_load_percent || 0}%</span>
            <span className="text-xs text-slate-400 font-normal">
              {routerInfo ? `${routerInfo.cpu_count} Cores` : ''}
            </span>
          </div>
          {/* Visual bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (routerInfo?.cpu_load_percent || 0) > 80
                  ? 'bg-rose-500'
                  : (routerInfo?.cpu_load_percent || 0) > 50
                  ? 'bg-amber-500'
                  : 'bg-violet-500'
              }`}
              style={{ width: `${routerInfo?.cpu_load_percent || 0}%` }}
            />
          </div>
        </div>

        {/* Memory Free */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              RAM Usage
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {routerInfo ? `${routerInfo.total_memory_mb} MB` : ''}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {routerInfo ? `${routerInfo.total_memory_mb - routerInfo.free_memory_mb} MB` : '0 MB'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {routerInfo ? `${routerInfo.free_memory_mb} MB available` : ''}
          </div>
        </div>

        {/* Connected Clients */}
        <div
          onClick={() => onNavigateTab('clients')}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Laptop className="w-3.5 h-3.5 text-sky-400" />
              Clients Online
            </span>
            <span className="text-[10px] text-sky-400 font-mono">View all</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {activeClients.length}{' '}
            <span className="text-xs font-normal text-slate-400">/ {clients.length} total</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono flex items-center gap-2">
            <span className="text-rose-400">{blockedClients.length} blocked</span>
            <span>·</span>
            <span className="text-amber-400">{throttledClients.length} limited</span>
          </div>
        </div>

        {/* Router Uptime */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              RouterBOARD
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">Up</span>
          </div>
          <div className="text-sm font-semibold font-mono text-white tracking-tight truncate mt-1">
            {routerInfo?.uptime || 'Loading...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">
            {routerInfo?.temperature_celsius ? `${routerInfo.temperature_celsius}°C · ` : ''}
            {routerInfo?.architecture}
          </div>
        </div>
      </div>

      {/* Real-time Bandwidth Throughput Chart */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-semibold text-white">Live WAN Interface Throughput</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time traffic flow via <span className="font-mono text-slate-300">{wanInterface?.name || 'ether1-WAN'}</span> (sampling every 1,000ms)
            </p>
          </div>

          {/* Legend and rate markers */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/80" />
              <span className="text-slate-300">Download ({formatBps(currentWanRx)})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-sky-500/80" />
              <span className="text-slate-300">Upload ({formatBps(currentWanTx)})</span>
            </div>
          </div>
        </div>

        {/* SVG Streaming Chart */}
        <div className="relative pt-4 overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-44 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle grid lines */}
            <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
            <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
            <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />

            {/* Filled Areas */}
            {rxArea && <polygon points={rxArea} fill="url(#rxGradient)" />}
            {txArea && <polygon points={txArea} fill="url(#txGradient)" />}

            {/* Foreground Line paths */}
            {rxPolyline && (
              <polyline
                points={rxPolyline}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {txPolyline && (
              <polyline
                points={txPolyline}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Time axis stamps */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            <span>{history[0]?.time_label || '60s ago'}</span>
            <span>30s ago</span>
            <span>15s ago</span>
            <span className="text-slate-300 font-semibold">{history[history.length - 1]?.time_label || 'Now'}</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Interfaces Grid & Top Bandwidth Hogs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Physical & Virtual Interfaces */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm font-semibold text-white">Router Interfaces & Link Status</h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {interfaces.filter((i) => i.running).length} / {interfaces.length} Links Up
            </span>
          </div>

          <div className="space-y-2">
            {interfaces.map((iface) => (
              <div
                key={iface.id}
                className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      iface.running ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-mono font-medium text-white truncate flex items-center gap-1.5">
                      <span>{iface.name}</span>
                      {iface.is_wan && (
                        <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20 font-sans">
                          WAN Gateway
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {iface.comment || iface.mac_address}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono text-[11px]">
                  <div className="text-emerald-400 flex items-center justify-end gap-1">
                    <ArrowDown className="w-3 h-3" />
                    <span>{formatBps(iface.rx_bps)}</span>
                  </div>
                  <div className="text-sky-400 flex items-center justify-end gap-1">
                    <ArrowUp className="w-3 h-3" />
                    <span>{formatBps(iface.tx_bps)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Active Bandwidth Clients */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-white">Top Active Bandwidth Devices</h4>
            </div>
            <button
              onClick={() => onNavigateTab('clients')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Manage all clients →
            </button>
          </div>

          <div className="space-y-2">
            {topClients.map((client) => {
              const totalRate = client.rx_rate_bps + client.tx_rate_bps;
              return (
                <div
                  key={client.id}
                  className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate flex items-center gap-2">
                      <span>{client.alias || client.hostname}</span>
                      {client.is_blocked && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                          Blocked
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {client.ip_address} · {client.connection_type.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono text-[11px]">
                      <div className="text-white font-medium">{formatBps(totalRate)}</div>
                      <div className="text-slate-400 text-[10px]">
                        ↓{formatBps(client.rx_rate_bps)} ↑{formatBps(client.tx_rate_bps)}
                      </div>
                    </div>

                    {/* Quick Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenSpeedModal(client)}
                        title="Throttle Speed"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onBlockClient(client.ip_address, !client.is_blocked)}
                        title={client.is_blocked ? 'Unblock Internet' : 'Block Internet'}
                        className={`p-1.5 rounded transition-colors ${
                          client.is_blocked
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            : 'bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
