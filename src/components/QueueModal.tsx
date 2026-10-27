import React, { useState } from 'react';
import { Layers, X } from 'lucide-react';
import type { SimpleQueue } from '../types/mikrotik.ts';

interface QueueModalProps {
  queue: SimpleQueue | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (q: Partial<SimpleQueue>) => Promise<void>;
}

export const QueueModal: React.FC<QueueModalProps> = ({
  queue,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(queue);

  const [formData, setFormData] = useState<Partial<SimpleQueue>>({
    name: queue?.name || '',
    target: queue?.target || '192.168.88.0/24',
    max_limit_upload: queue?.max_limit_upload || '10M',
    max_limit_download: queue?.max_limit_download || '50M',
    burst_limit_upload: queue?.burst_limit_upload || '15M',
    burst_limit_download: queue?.burst_limit_download || '80M',
    burst_threshold_upload: queue?.burst_threshold_upload || '8M',
    burst_threshold_download: queue?.burst_threshold_download || '40M',
    burst_time: queue?.burst_time || '8s/8s',
    priority: queue?.priority || 5,
    comment: queue?.comment || '',
    disabled: queue?.disabled || false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {isEditing ? 'Edit Simple Queue' : 'Create Simple Queue'}
              </h3>
              <p className="text-xs text-slate-400">RouterOS Hierarchical Token Bucket QoS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Queue Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Streaming-Limit"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target IP / CIDR</label>
              <input
                type="text"
                value={formData.target || ''}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                required
                placeholder="192.168.88.50/32"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Max Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Max Download Limit</label>
              <input
                type="text"
                value={formData.max_limit_download || ''}
                onChange={(e) => setFormData({ ...formData, max_limit_download: e.target.value })}
                required
                placeholder="e.g. 20M or 512k"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Max Upload Limit</label>
              <input
                type="text"
                value={formData.max_limit_upload || ''}
                onChange={(e) => setFormData({ ...formData, max_limit_upload: e.target.value })}
                required
                placeholder="e.g. 5M or 256k"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Burst Limits */}
          <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Optional Burst Settings (Short Speed Bursts)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Burst Down / Up</label>
                <input
                  type="text"
                  value={formData.burst_limit_download || ''}
                  onChange={(e) => setFormData({ ...formData, burst_limit_download: e.target.value })}
                  placeholder="e.g. 40M"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Burst Duration</label>
                <input
                  type="text"
                  value={formData.burst_time || ''}
                  onChange={(e) => setFormData({ ...formData, burst_time: e.target.value })}
                  placeholder="e.g. 8s/8s"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Priority & Comment */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Priority (1 to 8)</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value={1}>1 (Highest - Gaming/VoIP)</option>
                <option value={2}>2 (High)</option>
                <option value={3}>3</option>
                <option value={4}>4 (Normal Media)</option>
                <option value={5}>5 (Default)</option>
                <option value={6}>6</option>
                <option value={7}>7 (Low)</option>
                <option value={8}>8 (Lowest - Background/Torrents)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Comment</label>
              <input
                type="text"
                value={formData.comment || ''}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Description of queue purpose"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
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
              {isSaving ? 'Saving...' : isEditing ? 'Update Queue' : 'Create Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
