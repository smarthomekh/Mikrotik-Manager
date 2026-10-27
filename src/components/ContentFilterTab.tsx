import React from 'react';
import {
  Clock,
  ExternalLink,
  Flame,
  Gamepad2,
  Globe,
  Plus,
  Power,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { POPULAR_GAMES, POPULAR_WEBSITES } from '../data/blocklist-catalog.ts';
import type { ClientDevice, RestrictionTimeSlot } from '../types/mikrotik.ts';

interface ContentFilterTabProps {
  clients: ClientDevice[];
  onOpenFilterModal: (device: ClientDevice) => void;
  onOpenMultiScheduleModal: (device: ClientDevice) => void;
  onQuickToggleGlobalGame: (gameId: string, block: boolean) => Promise<void>;
  onQuickToggleGlobalWebsite: (websiteId: string, block: boolean) => Promise<void>;
}

export const ContentFilterTab: React.FC<ContentFilterTabProps> = ({
  clients,
  onOpenFilterModal,
  onOpenMultiScheduleModal,
  onQuickToggleGlobalGame,
  onQuickToggleGlobalWebsite,
}) => {
  const totalBlockedGames = clients.reduce((acc, c) => acc + (c.blocked_games?.length || 0), 0);
  const totalBlockedSites = clients.reduce(
    (acc, c) => acc + (c.blocked_websites?.length || 0) + (c.custom_blocked_domains?.length || 0),
    0
  );
  const devicesWithSchedules = clients.filter((c) => c.schedules && c.schedules.length > 0);

  // Check if a game is globally blocked across all non-static devices
  const isGameGloballyBlocked = (gameId: string) => {
    return clients.some((c) => c.blocked_games?.includes(gameId));
  };

  const isSiteGloballyBlocked = (siteId: string) => {
    return clients.some((c) => c.blocked_websites?.includes(siteId));
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">
            Web & Popular Game Filter Shield
          </h3>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Enforce parental controls, block popular online games (Roblox, Minecraft, Fortnite, Free Fire, etc.), restrict social media and video streaming, and configure multi-restriction time slots per user. RouterOS drops matching TLS-Host SNI packets and game server ports with zero CPU lag.
        </p>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              Game Blocks
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {totalBlockedGames} active
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">Across devices</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-sky-400" />
              Websites & Apps
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {totalBlockedSites} rules
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">SNI TLS matchers</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-violet-400" />
              Time Curfews
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {devicesWithSchedules.length} devices
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">Multi-schedule active</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              RouterOS Drops
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            59,460 pkts
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">Hardware filtered</div>
        </div>
      </div>

      {/* Quick Global Toggles Strip */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Quick One-Click Global Category Toggles
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'roblox', name: 'Roblox', type: 'game' },
            { id: 'minecraft', name: 'Minecraft', type: 'game' },
            { id: 'tiktok', name: 'TikTok', type: 'site' },
            { id: 'youtube', name: 'YouTube', type: 'site' },
          ].map((item) => {
            const isBlocked =
              item.type === 'game'
                ? isGameGloballyBlocked(item.id)
                : isSiteGloballyBlocked(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.type === 'game') {
                    onQuickToggleGlobalGame(item.id, !isBlocked);
                  } else {
                    onQuickToggleGlobalWebsite(item.id, !isBlocked);
                  }
                }}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  isBlocked
                    ? 'border-rose-500/60 bg-rose-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-white">{item.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {item.type === 'game' ? 'Game Servers' : 'Social & Feeds'}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isBlocked
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isBlocked ? 'BLOCKED' : 'ALLOW'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-Device Shield Matrix */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Client Device Filtering & Schedule Matrix</span>
          <span className="text-slate-400">{clients.length} Devices Registered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Device Identity</th>
                <th className="py-3 px-4">Time Restrictions</th>
                <th className="py-3 px-4">Blocked Popular Games</th>
                <th className="py-3 px-4">Blocked Websites & Domains</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {clients.map((client) => {
                const activeSchedulesCount = client.schedules?.filter((s) => s.enabled).length || 0;
                const blockedGamesCount = client.blocked_games?.length || 0;
                const blockedWebsitesCount =
                  (client.blocked_websites?.length || 0) +
                  (client.custom_blocked_domains?.length || 0);

                return (
                  <tr key={client.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Device info */}
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="font-semibold text-white truncate">
                        {client.alias || client.hostname}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {client.ip_address} · {client.connection_type.replace('_', ' ')}
                      </div>
                    </td>

                    {/* Multi-Schedules */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => onOpenMultiScheduleModal(client)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          activeSchedulesCount > 0
                            ? 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        <span>
                          {activeSchedulesCount > 0
                            ? `${activeSchedulesCount} Time Windows`
                            : 'Add Schedules'}
                        </span>
                      </button>
                    </td>

                    {/* Blocked Games */}
                    <td className="py-3.5 px-4">
                      {blockedGamesCount > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {client.blocked_games.slice(0, 3).map((gId) => (
                            <span
                              key={gId}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono"
                            >
                              {gId}
                            </span>
                          ))}
                          {blockedGamesCount > 3 && (
                            <span className="text-[10px] text-slate-500">
                              +{blockedGamesCount - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">No games blocked</span>
                      )}
                    </td>

                    {/* Blocked Websites */}
                    <td className="py-3.5 px-4">
                      {blockedWebsitesCount > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {client.blocked_websites?.slice(0, 3).map((wId) => (
                            <span
                              key={wId}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono"
                            >
                              {wId}
                            </span>
                          ))}
                          {client.custom_blocked_domains?.slice(0, 2).map((dom) => (
                            <span
                              key={dom}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono"
                            >
                              {dom}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">No web filters</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenFilterModal(client)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                        >
                          Configure Shield
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
