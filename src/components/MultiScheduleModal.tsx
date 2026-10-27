import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Gamepad2,
  Globe,
  Moon,
  Plus,
  Power,
  ShieldAlert,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { ClientDevice, DayOfWeek, RestrictionTimeSlot } from '../types/mikrotik.ts';

interface MultiScheduleModalProps {
  device: ClientDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSchedules: (ip: string, schedules: RestrictionTimeSlot[]) => Promise<void>;
}

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MultiScheduleModal: React.FC<MultiScheduleModalProps> = ({
  device,
  isOpen,
  onClose,
  onSaveSchedules,
}) => {
  if (!isOpen || !device) return null;

  const [schedules, setSchedules] = useState<RestrictionTimeSlot[]>(
    device.schedules && device.schedules.length > 0
      ? JSON.parse(JSON.stringify(device.schedules))
      : [
          {
            id: `slot-${Date.now()}`,
            name: 'Bedtime Internet Lockout',
            enabled: true,
            days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun'],
            start_time: '21:00',
            end_time: '06:30',
            action: 'block_all',
            comment: 'Full Wi-Fi cutoff during sleep hours',
          },
        ]
  );

  const [editingSlotId, setEditingSlotId] = useState<string | null>(
    schedules[0]?.id || null
  );

  const [isSaving, setIsSaving] = useState(false);

  const activeSlot = schedules.find((s) => s.id === editingSlotId) || schedules[0];

  const handleAddSlot = () => {
    const newSlot: RestrictionTimeSlot = {
      id: `slot-${Date.now()}`,
      name: `Time Restriction ${schedules.length + 1}`,
      enabled: true,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      start_time: '16:00',
      end_time: '18:30',
      action: 'block_games',
      comment: 'Restrict entertainment and gaming',
    };
    setSchedules([...schedules, newSlot]);
    setEditingSlotId(newSlot.id);
  };

  const handleDeleteSlot = (id: string) => {
    const remaining = schedules.filter((s) => s.id !== id);
    setSchedules(remaining);
    if (editingSlotId === id && remaining.length > 0) {
      setEditingSlotId(remaining[0].id);
    }
  };

  const handleUpdateActiveSlot = (updates: Partial<RestrictionTimeSlot>) => {
    if (!activeSlot) return;
    setSchedules(
      schedules.map((s) => (s.id === activeSlot.id ? { ...s, ...updates } : s))
    );
  };

  const toggleDay = (day: DayOfWeek) => {
    if (!activeSlot) return;
    const current = activeSlot.days || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    handleUpdateActiveSlot({ days: updated });
  };

  const setDaysPreset = (preset: 'all' | 'weekdays' | 'weekends') => {
    if (!activeSlot) return;
    if (preset === 'all') handleUpdateActiveSlot({ days: [...ALL_DAYS] });
    if (preset === 'weekdays') handleUpdateActiveSlot({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] });
    if (preset === 'weekends') handleUpdateActiveSlot({ days: ['Sat', 'Sun'] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSchedules(device.ip_address, schedules);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const getActionBadge = (action: RestrictionTimeSlot['action']) => {
    switch (action) {
      case 'block_all':
        return <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">Block All Internet</span>;
      case 'block_games':
        return <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Block Games</span>;
      case 'block_websites':
        return <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">Block Websites</span>;
      case 'throttle':
        return <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">Speed Throttle</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Multi-Restriction Time Scheduler</h3>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Slots List Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Scheduled Restriction Windows ({schedules.length})
              </label>
              <button
                type="button"
                onClick={handleAddSlot}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Time Slot</span>
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                No restriction time slots configured. Click "Add Time Slot" above.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {schedules.map((slot) => {
                  const isSelected = editingSlotId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      onClick={() => setEditingSlotId(slot.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'border-violet-500 bg-violet-500/10 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              slot.enabled ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                          <span className="font-semibold text-xs text-white truncate">
                            {slot.name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-1">
                          {slot.start_time} - {slot.end_time}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {getActionBadge(slot.action)}
                          <span className="text-[10px] text-slate-500">
                            {slot.days.length === 7 ? 'All days' : slot.days.join(', ')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlot(slot.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Slot Configuration Form */}
          {activeSlot && (
            <div className="p-5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Edit: {activeSlot.name}
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={activeSlot.enabled}
                    onChange={(e) => handleUpdateActiveSlot({ enabled: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-violet-500"
                  />
                  <span>Active</span>
                </label>
              </div>

              {/* Slot Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={activeSlot.name}
                  onChange={(e) => handleUpdateActiveSlot({ name: e.target.value })}
                  placeholder="e.g. Homework Study Window"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Time Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={activeSlot.start_time}
                    onChange={(e) => handleUpdateActiveSlot({ start_time: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={activeSlot.end_time}
                    onChange={(e) => handleUpdateActiveSlot({ end_time: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Active Days */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Days Active</label>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => setDaysPreset('weekdays')}
                      className="hover:text-violet-400 cursor-pointer"
                    >
                      Weekdays
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setDaysPreset('weekends')}
                      className="hover:text-violet-400 cursor-pointer"
                    >
                      Weekends
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setDaysPreset('all')}
                      className="hover:text-violet-400 cursor-pointer"
                    >
                      All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {ALL_DAYS.map((day) => {
                    const isSelected = activeSlot.days?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`py-1.5 text-xs font-semibold rounded border transition-all ${
                          isSelected
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/50'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Restriction Action */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Action During This Time Window
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateActiveSlot({ action: 'block_all' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      activeSlot.action === 'block_all'
                        ? 'border-rose-500/60 bg-rose-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 mb-0.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Block All Internet</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Total cutoff (Bedtime)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateActiveSlot({ action: 'block_games' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      activeSlot.action === 'block_games'
                        ? 'border-amber-500/60 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-0.5">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>Block Online Games</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Roblox, Minecraft, etc.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateActiveSlot({ action: 'block_websites' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      activeSlot.action === 'block_websites'
                        ? 'border-violet-500/60 bg-violet-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-300 mb-0.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Block Social Media</span>
                    </div>
                    <div className="text-[10px] text-slate-400">TikTok, YouTube, Discord</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateActiveSlot({ action: 'throttle' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      activeSlot.action === 'throttle'
                        ? 'border-sky-500/60 bg-sky-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 mb-0.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Throttle Speed (QoS)</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Clamp to 512k or 1M</div>
                  </button>
                </div>
              </div>

              {/* Comment / Note */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Note</label>
                <input
                  type="text"
                  value={activeSlot.comment || ''}
                  onChange={(e) => handleUpdateActiveSlot({ comment: e.target.value })}
                  placeholder="e.g. Enforced for high school homework"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <div className="text-xs text-slate-400">
            {schedules.filter((s) => s.enabled).length} active restriction slots
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
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors shadow-sm shadow-violet-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Applying Schedules...' : 'Save Multi-Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
