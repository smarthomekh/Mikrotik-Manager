import React, { useState } from 'react';
import { Gauge, Shield, X, Zap } from 'lucide-react';
import type { ClientDevice } from '../types/mikrotik.ts';

interface DeviceSpeedModalProps {
  device: ClientDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSpeed: (ip: string, maxDownload: string, maxUpload: string) => Promise<void>;
}

const PRESETS = [
  { label: 'Uncapped (Full ISP Speed)', down: 'Uncapped', up: 'Uncapped', desc: 'No queue or throttling limits applied' },
  { label: '2 Mbps (Strict Homework)', down: '2M', up: '512k', desc: 'Sufficient for text documents & audio only' },
  { label: '5 Mbps (Web & SD Video)', down: '5M', up: '1M', desc: 'Standard browsing, blocks 4K streaming' },
  { label: '10 Mbps (Full HD Stream)', down: '10M', up: '2M', desc: 'Smooth 1080p video, reasonable downloading' },
  { label: '25 Mbps (Fast Home Office)', down: '25M', up: '10M', desc: 'Great for video conferences & multiple tabs' },
  { label: '50 Mbps (Gaming & Heavy)', down: '50M', up: '20M', desc: 'Low latency, high speed headroom' },
];

export const DeviceSpeedModal: React.FC<DeviceSpeedModalProps> = ({
  device,
  isOpen,
  onClose,
  onSaveSpeed,
}) => {
  if (!isOpen || !device) return null;

  const currentDown = device.max_download_limit || 'Uncapped';
  const currentUp = device.max_upload_limit || 'Uncapped';

  const [selectedDown, setSelectedDown] = useState(currentDown);
  const [selectedUp, setSelectedUp] = useState(currentUp);
  const [isCustom, setIsCustom] = useState(
    !PRESETS.some((p) => p.down === currentDown && p.up === currentUp) && currentDown !== 'Uncapped'
  );
  const [customDown, setCustomDown] = useState(currentDown !== 'Uncapped' ? currentDown : '15M');
  const [customUp, setCustomUp] = useState(currentUp !== 'Uncapped' ? currentUp : '5M');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setIsCustom(false);
    setSelectedDown(preset.down);
    setSelectedUp(preset.up);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const down = isCustom ? customDown : selectedDown;
      const up = isCustom ? customUp : selectedUp;
      await onSaveSpeed(device.ip_address, down, up);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Bandwidth Throttle</h3>
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

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Bandwidth Ceiling
            </label>
            <div className="space-y-1.5">
              {PRESETS.map((preset) => {
                const isSelected = !isCustom && selectedDown === preset.down;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-500/10 text-white'
                        : 'border-slate-800/80 bg-slate-950/30 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{preset.label}</div>
                      <div className="text-[11px] text-slate-400">{preset.desc}</div>
                    </div>
                    <div className="text-xs font-mono text-sky-400 shrink-0 ml-3">
                      {preset.down === 'Uncapped' ? '∞' : `↓${preset.down} ↑${preset.up}`}
                    </div>
                  </button>
                );
              })}

              {/* Custom speed option */}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  isCustom
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-800/80 bg-slate-950/30 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-white">Custom Speed Limit</div>
                  <div className="text-[11px] text-slate-400">Specify manual upload and download rates</div>
                </div>
                <Zap className="w-4 h-4 text-sky-400" />
              </button>
            </div>
          </div>

          {/* Custom values inputs */}
          {isCustom && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Max Download (e.g. 15M, 500k)</label>
                  <input
                    type="text"
                    value={customDown}
                    onChange={(e) => setCustomDown(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Max Upload (e.g. 5M, 256k)</label>
                  <input
                    type="text"
                    value={customUp}
                    onChange={(e) => setCustomUp(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            Target IP: <span className="font-mono text-slate-300">{device.ip_address}/32</span>. This creates or modifies a RouterOS Simple Queue with token bucket policing.
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
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
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-400 rounded-lg transition-colors shadow-sm shadow-sky-500/20 disabled:opacity-50"
            >
              {isSaving ? 'Applying Queue...' : 'Apply Speed Limit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
