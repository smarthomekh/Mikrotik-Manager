import React, { useState } from 'react';
import { Calendar, Code, X, Zap } from 'lucide-react';
import type { RouterSchedule } from '../types/mikrotik.ts';

interface ScheduleModalProps {
  schedule: RouterSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (s: Partial<RouterSchedule>) => Promise<void>;
}

const TEMPLATES = [
  {
    name: 'Nightly System Reboot',
    interval: '1d',
    time: '04:00:00',
    script: ':log info "HA Schedule: Nightly maintenance reboot"; /system reboot',
    comment: 'Reboots router at 4 AM to refresh memory pools',
  },
  {
    name: 'Hourly DNS Cache Flush',
    interval: '1h',
    time: '00:00:00',
    script: '/ip dns cache flush',
    comment: 'Clears stale DNS records and addresses',
  },
  {
    name: 'Daily Config Cloud Backup',
    interval: '1d',
    time: '03:00:00',
    script: '/system backup save name=("ha_backup_" . [:pick [/system clock get date] 7 11])',
    comment: 'Exports binary RouterOS backup to storage',
  },
  {
    name: 'Disable Guest Wi-Fi at Night',
    interval: '1d',
    time: '23:00:00',
    script: '/interface set [find name="wlan2-IoT-2.4GHz"] disabled=yes',
    comment: 'Turns off guest wireless radio overnight',
  },
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(schedule);

  const [formData, setFormData] = useState<Partial<RouterSchedule>>({
    name: schedule?.name || '',
    start_time: schedule?.start_time || '00:00:00',
    interval: schedule?.interval || '1d',
    on_event: schedule?.on_event || '',
    comment: schedule?.comment || '',
    disabled: schedule?.disabled || false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleApplyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setFormData({
      ...formData,
      name: tpl.name,
      interval: tpl.interval,
      start_time: tpl.time,
      on_event: tpl.script,
      comment: tpl.comment,
    });
  };

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
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {isEditing ? 'Edit RouterOS Schedule' : 'Create RouterOS Schedule'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">/system schedule automated script</p>
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
          {/* Quick Script Templates */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Quick Script Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:border-emerald-500/50 text-left transition-colors"
                  >
                    <div className="text-xs font-medium text-white truncate">{tpl.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{tpl.interval} interval</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Schedule Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Flush-DNS-Cache"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Interval (e.g. 1d, 12h, 30m)
              </label>
              <input
                type="text"
                value={formData.interval || ''}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                required
                placeholder="1d"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Start Time (HH:MM:SS)</label>
              <input
                type="text"
                value={formData.start_time || ''}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
                placeholder="00:00:00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Comment</label>
              <input
                type="text"
                value={formData.comment || ''}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Brief description"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* RouterOS Script Event */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
              <span>On Event (RouterOS CLI Script)</span>
              <span className="text-[11px] text-slate-500">RouterOS Syntax</span>
            </label>
            <textarea
              rows={4}
              value={formData.on_event || ''}
              onChange={(e) => setFormData({ ...formData, on_event: e.target.value })}
              required
              placeholder="/ip dns cache flush"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
            />
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
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
