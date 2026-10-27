import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit2,
  Layers,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import type { SimpleQueue } from '../types/mikrotik.ts';
import { formatBps, formatBytes } from '../utils/formatters.ts';

interface QueuesTabProps {
  queues: SimpleQueue[];
  onOpenCreateQueue: () => void;
  onOpenEditQueue: (queue: SimpleQueue) => void;
  onToggleQueue: (id: string, disabled: boolean) => Promise<void>;
  onDeleteQueue: (id: string) => Promise<void>;
}

export const QueuesTab: React.FC<QueuesTabProps> = ({
  queues,
  onOpenCreateQueue,
  onOpenEditQueue,
  onToggleQueue,
  onDeleteQueue,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Simple Queues & Traffic Shaping (QoS)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            MikroTik Hierarchical Token Bucket (HTB) queue trees. Regulate per-client download/upload ceilings and priority.
          </p>
        </div>

        <button
          onClick={onOpenCreateQueue}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-400 transition-colors shadow-sm shadow-sky-500/20 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Simple Queue</span>
        </button>
      </div>

      {/* Queues Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Queue Name</th>
                <th className="py-3 px-4">Target Subnet</th>
                <th className="py-3 px-4">Max Limit (Up / Down)</th>
                <th className="py-3 px-4 text-right">Current Rate</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-right">Total Transferred</th>
                <th className="py-3 px-4 text-center">State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {queues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No Simple Queues currently active. Click "Add Simple Queue" to create one.
                  </td>
                </tr>
              ) : (
                queues.map((q) => {
                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        q.disabled ? 'opacity-50 bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Name & Comment */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="font-semibold text-white truncate">{q.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {q.comment || 'No description'}
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-sky-400 whitespace-nowrap">
                        {q.target}
                      </td>

                      {/* Max Limit */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        <span className="text-sky-400">↑{q.max_limit_upload}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-emerald-400">↓{q.max_limit_download}</span>
                      </td>

                      {/* Current Live Rate */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                        <div className="text-emerald-400 flex items-center justify-end gap-1">
                          <ArrowDown className="w-3 h-3" />
                          <span>{formatBps(q.current_rate_download_bps)}</span>
                        </div>
                        <div className="text-sky-400 flex items-center justify-end gap-1 text-[10px]">
                          <ArrowUp className="w-3 h-3" />
                          <span>{formatBps(q.current_rate_upload_bps)}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            q.priority <= 2
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : q.priority <= 4
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          P{q.priority}
                        </span>
                      </td>

                      {/* Total bytes */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        <div>{formatBytes(q.total_bytes_download + q.total_bytes_upload)}</div>
                        {q.packet_drops > 0 && (
                          <div className="text-[10px] text-rose-400">
                            {q.packet_drops} drops
                          </div>
                        )}
                      </td>

                      {/* State */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onToggleQueue(q.id, !q.disabled)}
                          title={q.disabled ? 'Enable Queue' : 'Disable Queue'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            q.disabled
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
                            onClick={() => onOpenEditQueue(q)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Edit queue"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteQueue(q.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                            title="Delete queue"
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
