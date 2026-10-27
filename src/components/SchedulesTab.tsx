import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Code,
  Edit2,
  Play,
  Plus,
  Power,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { RouterSchedule } from '../types/mikrotik.ts';

interface SchedulesTabProps {
  schedules: RouterSchedule[];
  onOpenCreateSchedule: () => void;
  onOpenEditSchedule: (sch: RouterSchedule) => void;
  onToggleSchedule: (id: string, disabled: boolean) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onRunScheduleNow: (id: string) => Promise<void>;
}

export const SchedulesTab: React.FC<SchedulesTabProps> = ({
  schedules,
  onOpenCreateSchedule,
  onOpenEditSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  onRunScheduleNow,
}) => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">System Schedules & Router Automations</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            MikroTik <span className="font-mono text-slate-300">/system/schedule</span> execution engine. Automate router reboots, backup scripts, DNS flush, and periodic tasks.
          </p>
        </div>

        <button
          onClick={onOpenCreateSchedule}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-600/20 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Schedule</span>
        </button>
      </div>

      {/* Schedules Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Schedule Name</th>
                <th className="py-3 px-4">Interval</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">On Event Script (RouterOS)</th>
                <th className="py-3 px-4 text-center">Run Count</th>
                <th className="py-3 px-4 text-center">State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No system schedules found. Click "New Schedule" to create an automated script.
                  </td>
                </tr>
              ) : (
                schedules.map((sch) => {
                  return (
                    <tr
                      key={sch.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        sch.disabled ? 'opacity-50 bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Name & Comment */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="font-semibold text-white">{sch.name}</div>
                        <div className="text-[11px] text-slate-400">{sch.comment || '—'}</div>
                      </td>

                      {/* Interval */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-emerald-400 whitespace-nowrap">
                        {sch.interval}
                      </td>

                      {/* Start Time / Next Run */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        <div>{sch.start_time}</div>
                        <div className="text-[10px] text-slate-500">{sch.next_run}</div>
                      </td>

                      {/* Script */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                        <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-emerald-300 block truncate">
                          {sch.on_event}
                        </span>
                      </td>

                      {/* Run Count */}
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {sch.run_count} runs
                      </td>

                      {/* State */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onToggleSchedule(sch.id, !sch.disabled)}
                          title={sch.disabled ? 'Enable Schedule' : 'Disable Schedule'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            sch.disabled
                              ? 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onRunScheduleNow(sch.id)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-colors"
                            title="Run script now"
                          >
                            <Play className="w-3 h-3" />
                            <span>Run Now</span>
                          </button>
                          <button
                            onClick={() => onOpenEditSchedule(sch)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Edit schedule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteSchedule(sch.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                            title="Delete schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
