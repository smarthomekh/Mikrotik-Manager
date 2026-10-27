import React, { useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Clock,
  Edit2,
  Filter,
  Gamepad2,
  Gauge,
  Globe,
  Laptop,
  Moon,
  Power,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Smartphone,
  Tv,
  Wifi,
} from 'lucide-react';
import type { ClientDevice } from '../types/mikrotik.ts';
import { formatBps, formatBytes } from '../utils/formatters.ts';

interface ClientsTabProps {
  clients: ClientDevice[];
  onBlockClient: (ip: string, block: boolean) => Promise<void>;
  onOpenSpeedModal: (device: ClientDevice) => void;
  onOpenMultiScheduleModal: (device: ClientDevice) => void;
  onOpenFilterModal: (device: ClientDevice) => void;
  onUpdateAlias: (ip: string, alias: string) => Promise<void>;
}

export const ClientsTab: React.FC<ClientsTabProps> = ({
  clients,
  onBlockClient,
  onOpenSpeedModal,
  onOpenMultiScheduleModal,
  onOpenFilterModal,
  onUpdateAlias,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'active' | 'blocked' | 'throttled' | 'games_blocked' | 'scheduled' | 'wifi'
  >('all');
  const [editingAliasIp, setEditingAliasIp] = useState<string | null>(null);
  const [tempAlias, setTempAlias] = useState('');
  const [isProcessingIp, setIsProcessingIp] = useState<string | null>(null);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.hostname.toLowerCase().includes(search.toLowerCase()) ||
      client.alias.toLowerCase().includes(search.toLowerCase()) ||
      client.ip_address.toLowerCase().includes(search.toLowerCase()) ||
      client.mac_address.toLowerCase().includes(search.toLowerCase()) ||
      client.vendor.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'active') return client.status === 'active';
    if (filterType === 'blocked') return client.is_blocked;
    if (filterType === 'throttled') return client.max_download_limit && client.max_download_limit !== 'Uncapped';
    if (filterType === 'games_blocked') return client.blocked_games && client.blocked_games.length > 0;
    if (filterType === 'scheduled') return client.schedules && client.schedules.length > 0;
    if (filterType === 'wifi') return client.connection_type.includes('wifi');
    return true;
  });

  const getDeviceIcon = (client: ClientDevice) => {
    const name = (client.hostname + ' ' + client.alias).toLowerCase();
    if (name.includes('tv') || name.includes('oled') || name.includes('soundbar')) return <Tv className="w-4 h-4 text-sky-400" />;
    if (name.includes('phone') || name.includes('s24') || name.includes('iphone') || name.includes('android')) return <Smartphone className="w-4 h-4 text-emerald-400" />;
    if (name.includes('macbook') || name.includes('laptop') || name.includes('pc') || name.includes('desktop')) return <Laptop className="w-4 h-4 text-violet-400" />;
    return <Wifi className="w-4 h-4 text-slate-400" />;
  };

  const handleStartEditAlias = (client: ClientDevice) => {
    setEditingAliasIp(client.ip_address);
    setTempAlias(client.alias || client.hostname);
  };

  const handleSaveAlias = async (ip: string) => {
    if (tempAlias.trim()) {
      await onUpdateAlias(ip, tempAlias.trim());
    }
    setEditingAliasIp(null);
  };

  const handleToggleBlock = async (client: ClientDevice) => {
    setIsProcessingIp(client.ip_address);
    try {
      await onBlockClient(client.ip_address, !client.is_blocked);
    } finally {
      setIsProcessingIp(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-white">Current Connected Users & Devices</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time client management: speed limiting, popular game blocking, website filtering, and multi-restriction schedules.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IP, MAC, Hostname..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-52 font-mono"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            {(
              [
                { id: 'all', label: `All (${clients.length})` },
                { id: 'active', label: `Active` },
                { id: 'blocked', label: `Blocked` },
                { id: 'games_blocked', label: `Games Blocked` },
                { id: 'scheduled', label: `Time Curfews` },
                { id: 'throttled', label: `Throttled` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === tab.id
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Devices List Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Device / Identity</th>
                <th className="py-3 px-4">Network Info</th>
                <th className="py-3 px-4 text-right">Live Throughput</th>
                <th className="py-3 px-4">Speed Limit</th>
                <th className="py-3 px-4">Time Restrictions</th>
                <th className="py-3 px-4">Game & Web Shield</th>
                <th className="py-3 px-4 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No connected devices matched your search or filter.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isProcessing = isProcessingIp === client.ip_address;
                  const isEditingAlias = editingAliasIp === client.ip_address;
                  const activeSchedulesCount = client.schedules?.filter((s) => s.enabled).length || 0;
                  const blockedGamesCount = client.blocked_games?.length || 0;
                  const blockedWebsitesCount =
                    (client.blocked_websites?.length || 0) +
                    (client.custom_blocked_domains?.length || 0);

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        client.is_blocked ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Device / Identity */}
                      <td className="py-3.5 px-4 min-w-[190px]">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg border shrink-0 ${
                              client.is_blocked
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                : 'bg-slate-950 border-slate-800 text-slate-300'
                            }`}
                          >
                            {getDeviceIcon(client)}
                          </div>
                          <div className="min-w-0">
                            {isEditingAlias ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={tempAlias}
                                  onChange={(e) => setTempAlias(e.target.value)}
                                  className="px-2 py-0.5 bg-slate-950 border border-sky-500 rounded text-xs text-white"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveAlias(client.ip_address);
                                    if (e.key === 'Escape') setEditingAliasIp(null);
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveAlias(client.ip_address)}
                                  className="text-[11px] text-sky-400 font-semibold hover:underline"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white truncate">
                                  {client.alias || client.hostname}
                                </span>
                                <button
                                  onClick={() => handleStartEditAlias(client)}
                                  className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                  title="Edit friendly name"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 truncate">
                              {client.hostname} · {client.vendor}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Network Info */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        <div className="font-medium text-white">{client.ip_address}</div>
                        <div className="text-slate-500 text-[10px]">{client.mac_address}</div>
                        <div className="text-slate-400 text-[10px] mt-0.5 font-sans">
                          {client.interface} ({client.connection_type.replace('_', ' ')})
                        </div>
                      </td>

                      {/* Live Throughput */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                        {client.is_blocked ? (
                          <span className="text-rose-400 font-sans font-medium text-[11px]">
                            Internet Blocked
                          </span>
                        ) : (
                          <>
                            <div className="text-emerald-400 flex items-center justify-end gap-1 font-medium">
                              <ArrowDown className="w-3 h-3" />
                              <span>{formatBps(client.rx_rate_bps)}</span>
                            </div>
                            <div className="text-sky-400 flex items-center justify-end gap-1 text-[10px]">
                              <ArrowUp className="w-3 h-3" />
                              <span>{formatBps(client.tx_rate_bps)}</span>
                            </div>
                          </>
                        )}
                      </td>

                      {/* Speed Limit (Simple Queue) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => onOpenSpeedModal(client)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-xs font-mono cursor-pointer ${
                            client.max_download_limit && client.max_download_limit !== 'Uncapped'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <Gauge className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>
                            {client.max_download_limit && client.max_download_limit !== 'Uncapped'
                              ? `↓${client.max_download_limit} ↑${client.max_upload_limit || '5M'}`
                              : 'Uncapped'}
                          </span>
                        </button>
                      </td>

                      {/* Multi-Schedule / Curfew Windows */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => onOpenMultiScheduleModal(client)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-xs font-sans cursor-pointer ${
                            activeSchedulesCount > 0
                              ? 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span>
                            {activeSchedulesCount > 0
                              ? `${activeSchedulesCount} Time Windows`
                              : 'Set Curfews'}
                          </span>
                        </button>
                      </td>

                      {/* Game & Web Shield */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => onOpenFilterModal(client)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-xs font-sans cursor-pointer ${
                            blockedGamesCount > 0 || blockedWebsitesCount > 0
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>
                            {blockedGamesCount > 0 || blockedWebsitesCount > 0
                              ? `${blockedGamesCount} Games, ${blockedWebsitesCount} Sites`
                              : 'Filter Games/Web'}
                          </span>
                        </button>
                      </td>

                      {/* Instant Block / Unblock Internet */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggleBlock(client)}
                          disabled={isProcessing}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all border whitespace-nowrap cursor-pointer ${
                            client.is_blocked
                              ? 'bg-rose-500 text-white border-rose-600 hover:bg-rose-600 shadow-sm shadow-rose-900/40'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-rose-500/50 hover:text-rose-400'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>{client.is_blocked ? 'Blocked' : 'Block Internet'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
