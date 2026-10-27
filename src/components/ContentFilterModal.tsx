import React, { useState } from 'react';
import {
  AlertCircle,
  Box,
  Check,
  Cpu,
  Crosshair,
  Flame,
  Gamepad2,
  Globe,
  Plus,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Swords,
  Target,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { POPULAR_GAMES, POPULAR_WEBSITES } from '../data/blocklist-catalog.ts';
import type { ClientDevice } from '../types/mikrotik.ts';

interface ContentFilterModalProps {
  device: ClientDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveGames: (ip: string, games: string[]) => Promise<void>;
  onSaveWebsites: (ip: string, websites: string[], customDomains: string[]) => Promise<void>;
}

export const ContentFilterModal: React.FC<ContentFilterModalProps> = ({
  device,
  isOpen,
  onClose,
  onSaveGames,
  onSaveWebsites,
}) => {
  if (!isOpen || !device) return null;

  const [activeTab, setActiveTab] = useState<'games' | 'websites' | 'custom'>('games');
  const [selectedGames, setSelectedGames] = useState<string[]>(device.blocked_games || []);
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>(device.blocked_websites || []);
  const [customDomains, setCustomDomains] = useState<string[]>(device.custom_blocked_domains || []);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleGame = (id: string) => {
    setSelectedGames((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleWebsite = (id: string) => {
    setSelectedWebsites((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  const handleSelectAllGames = () => {
    setSelectedGames(POPULAR_GAMES.map((g) => g.id));
  };

  const handleClearGames = () => {
    setSelectedGames([]);
  };

  const handleSelectAllWebsites = () => {
    setSelectedWebsites(POPULAR_WEBSITES.map((w) => w.id));
  };

  const handleClearWebsites = () => {
    setSelectedWebsites([]);
  };

  const handleAddCustomDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = newDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (domain && !customDomains.includes(domain)) {
      setCustomDomains([...customDomains, domain]);
      setNewDomainInput('');
    }
  };

  const handleRemoveCustomDomain = (domain: string) => {
    setCustomDomains(customDomains.filter((d) => d !== domain));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        onSaveGames(device.ip_address, selectedGames),
        onSaveWebsites(device.ip_address, selectedWebsites, customDomains),
      ]);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const getGameIcon = (iconName: string) => {
    switch (iconName) {
      case 'Gamepad2': return <Gamepad2 className="w-4 h-4 text-amber-400" />;
      case 'Box': return <Box className="w-4 h-4 text-emerald-400" />;
      case 'Crosshair': return <Crosshair className="w-4 h-4 text-sky-400" />;
      case 'Flame': return <Flame className="w-4 h-4 text-rose-400" />;
      case 'Swords': return <Swords className="w-4 h-4 text-purple-400" />;
      case 'Target': return <Target className="w-4 h-4 text-cyan-400" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-slate-400" />;
      case 'Star': return <Star className="w-4 h-4 text-yellow-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-pink-400" />;
      default: return <Gamepad2 className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Game & Website Shield</h3>
              <p className="text-xs text-slate-400 font-mono">
                {device.alias || device.hostname} ({device.ip_address})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-2 shrink-0">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('games')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'games'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Popular Games ({selectedGames.length}/{POPULAR_GAMES.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('websites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'websites'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Websites & Apps ({selectedWebsites.length}/{POPULAR_WEBSITES.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Custom Domains ({customDomains.length})</span>
            </button>
          </div>

          {activeTab === 'games' && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllGames}
                className="text-amber-400 hover:underline font-medium"
              >
                Block All
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={handleClearGames}
                className="text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            </div>
          )}

          {activeTab === 'websites' && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllWebsites}
                className="text-sky-400 hover:underline font-medium"
              >
                Block All
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={handleClearWebsites}
                className="text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Games Selection Tab */}
          {activeTab === 'games' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                RouterOS enforces game blocks via <code className="text-slate-300 font-mono">tls-host</code> SNI filtering, port drops, and game CDN address-lists.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {POPULAR_GAMES.map((game) => {
                  const isBlocked = selectedGames.includes(game.id);
                  return (
                    <div
                      key={game.id}
                      onClick={() => toggleGame(game.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-3 ${
                        isBlocked
                          ? 'border-rose-500/60 bg-rose-500/10 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 shrink-0">
                        {getGameIcon(game.icon_name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white truncate">
                            {game.name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              isBlocked
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isBlocked ? 'BLOCKED' : 'ALLOW'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {game.description}
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                          {game.domains.join(', ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Websites & Social Media Selection Tab */}
          {activeTab === 'websites' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Blocks feeds, media streaming CDNs, and tracking beacons on this device.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {POPULAR_WEBSITES.map((site) => {
                  const isBlocked = selectedWebsites.includes(site.id);
                  return (
                    <div
                      key={site.id}
                      onClick={() => toggleWebsite(site.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-3 ${
                        isBlocked
                          ? 'border-sky-500/60 bg-sky-500/10 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 shrink-0">
                        <Globe className="w-4 h-4 text-sky-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white truncate">
                            {site.name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              isBlocked
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isBlocked ? 'BLOCKED' : 'ALLOW'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {site.description}
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                          {site.domains.join(', ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Domains Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <form onSubmit={handleAddCustomDomain} className="flex gap-2">
                <input
                  type="text"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  placeholder="e.g. discord.gg, gambling.com, badsite.org"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors shrink-0"
                >
                  Add Domain
                </button>
              </form>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Custom Blocked Domains ({customDomains.length})
                </label>

                {customDomains.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                    No custom domains added yet. Type a hostname above and click Add Domain.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customDomains.map((dom) => (
                      <span
                        key={dom}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-rose-300"
                      >
                        <span>{dom}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomDomain(dom)}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <div className="text-xs text-slate-400 font-mono">
            {selectedGames.length} games · {selectedWebsites.length} websites · {customDomains.length} domains blocked
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-sm shadow-rose-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Synchronizing RouterOS...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
