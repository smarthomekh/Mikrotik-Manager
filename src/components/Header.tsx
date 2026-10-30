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
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Router Connection Status Indicator & Quick Setup Button */}
          <button
            onClick={onOpenSettings}
            title="Configure MikroTik Router Connection"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-mono cursor-pointer bg-slate-900 border-slate-800 hover:border-slate-700"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                config?.connected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse'
                  : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
              }`}
            />
            <span className="text-slate-300 font-medium hidden sm:inline">
              {config?.host ? `${config.host}:${config.port}` : 'Configure Router'}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                config?.connected
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {config?.connected ? 'Online' : 'Setup'}
            </span>
          </button>

          <button
            onClick={onOpenSettings}
            title="Connection Settings"
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-800 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onRefresh}
            title="Refresh Router Data"
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
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
