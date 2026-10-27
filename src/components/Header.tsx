import React from 'react';
import {
  Activity,
  AlertOctagon,
  HardDrive,
  RefreshCw,
  Server,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import type { RouterConnectionConfig, RouterInfo } from '../types/mikrotik.ts';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  routerInfo: RouterInfo | null;
  config: RouterConnectionConfig | null;
  panicActive: boolean;
  onTogglePanic: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  routerInfo,
  config,
  panicActive,
  onTogglePanic,
  onOpenSettings,
  onRefresh,
  isRefreshing,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'clients', label: 'Connected Clients' },
    { id: 'filters', label: 'Game & Web Filter' },
    { id: 'queues', label: 'Queues & QoS' },
    { id: 'firewall', label: 'Firewall & Rules' },
    { id: 'schedules', label: 'Schedules' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      {/* Panic Alert Banner when activated */}
      {panicActive && (
        <div className="bg-rose-950/90 border-b border-rose-500/30 px-6 py-2 text-xs font-medium text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              EMERGENCY PANIC CUTOFF ACTIVE: All WAN forwarding traffic is blocked on RouterOS firewall.
            </span>
          </div>
          <button
            onClick={onTogglePanic}
            className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold px-2.5 py-1 rounded transition-colors whitespace-nowrap"
          >
            Deactivate Cutoff
          </button>
        </div>
      )}

      {/* 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Server className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">
              MikroTik RouterOS
            </span>
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 whitespace-nowrap">
              {routerInfo ? `${routerInfo.model} · ${routerInfo.routeros_version}` : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (single line, clean typography) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`transition-colors whitespace-nowrap py-1 relative cursor-pointer ${
                  isActive
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action / Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Status info */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                config?.connected
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50'
                  : 'bg-rose-400 animate-pulse'
              }`}
            />
            <span className="truncate max-w-[150px] text-slate-300">
              {config?.host ? `${config.host}:${config.port}` : 'Disconnected'}
            </span>
            <span
              className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                config?.connected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {config?.connected ? 'Online' : 'Offline'}
            </span>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh Router Data"
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          {/* Panic Killswitch toggle */}
          <button
            onClick={onTogglePanic}
            title={panicActive ? 'Deactivate Emergency Cutoff' : 'Activate Panic Internet Cutoff'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border whitespace-nowrap ${
              panicActive
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-900/50'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-rose-500/50 hover:text-rose-300'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Panic Cutoff</span>
          </button>

          {/* Router Connection Settings */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-400 transition-colors shadow-sm shadow-sky-500/20 whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Connection</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-slate-800/60 gap-4 text-xs font-medium scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md transition-colors ${
              activeTab === item.id
                ? 'bg-sky-500/20 text-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
