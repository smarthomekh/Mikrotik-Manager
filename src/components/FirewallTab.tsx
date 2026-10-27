import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  ListFilter,
  Lock,
  Plus,
  Power,
  RefreshCw,
  Shield,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';
import type { AddressListEntry, FirewallFilterRule, NatRule } from '../types/mikrotik.ts';
import { formatBytes, formatNumber } from '../utils/formatters.ts';

interface FirewallTabProps {
  filterRules: FirewallFilterRule[];
  addressLists: AddressListEntry[];
  natRules: NatRule[];
  panicActive: boolean;
  onTogglePanic: () => void;
  onOpenCreateRule: () => void;
  onToggleRule: (id: string, disabled: boolean) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onRemoveAddressListEntry: (id: string) => Promise<void>;
}

export const FirewallTab: React.FC<FirewallTabProps> = ({
  filterRules,
  addressLists,
  natRules,
  panicActive,
  onTogglePanic,
  onOpenCreateRule,
  onToggleRule,
  onDeleteRule,
  onRemoveAddressListEntry,
}) => {
  const [subSection, setSubSection] = useState<'filter' | 'address-list' | 'nat'>('filter');

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'accept':
        return <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ACCEPT</span>;
      case 'drop':
        return <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">DROP</span>;
      case 'reject':
        return <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">REJECT</span>;
      case 'fasttrack-connection':
        return <span className="text-[11px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">FASTTRACK</span>;
      default:
        return <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{action.toUpperCase()}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Panic Emergency Banner */}
      <div
        className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          panicActive
            ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/50'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              panicActive ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              {panicActive ? 'Emergency Forwarding Cutoff is ACTIVE' : 'Global Firewall Panic Cutoff'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly drops all forwarded transit packets from LAN to WAN without disconnecting local smart home devices.
            </p>
          </div>
        </div>

        <button
          onClick={onTogglePanic}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all border whitespace-nowrap self-start sm:self-auto ${
            panicActive
              ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700'
              : 'bg-slate-950 text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
          }`}
        >
          {panicActive ? 'Deactivate Emergency Cutoff' : 'Activate Panic Cutoff'}
        </button>
      </div>

      {/* Navigation Sub-Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setSubSection('filter')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              subSection === 'filter' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Filter Rules ({filterRules.length})
          </button>
          <button
            onClick={() => setSubSection('address-list')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              subSection === 'address-list' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Address Lists ({addressLists.length})
          </button>
          <button
            onClick={() => setSubSection('nat')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              subSection === 'nat' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            NAT Rules ({natRules.length})
          </button>
        </div>

        {subSection === 'filter' && (
          <button
            onClick={onOpenCreateRule}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-sm shadow-rose-600/20 whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Filter Rule</span>
          </button>
        )}
      </div>

      {/* Filter Rules Table */}
      {subSection === 'filter' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Chain</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Criteria & Matching</th>
                  <th className="py-3 px-4">Description / Comment</th>
                  <th className="py-3 px-4 text-right">Packets / Bytes</th>
                  <th className="py-3 px-4 text-center">State</th>
                  <th className="py-3 px-4 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filterRules.map((rule) => {
                  return (
                    <tr
                      key={rule.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        rule.disabled ? 'opacity-50 bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Chain */}
                      <td className="py-3 px-4 font-mono font-semibold text-white whitespace-nowrap">
                        {rule.chain}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">{getActionBadge(rule.action)}</td>

                      {/* Matching */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {rule.src_address_list && (
                          <div className="text-rose-400 font-semibold">
                            src-list: {rule.src_address_list}
                          </div>
                        )}
                        {rule.src_address && <div>src: {rule.src_address}</div>}
                        {rule.dst_address && <div>dst: {rule.dst_address}</div>}
                        {rule.protocol && (
                          <div className="text-slate-400">
                            proto: {rule.protocol}
                            {rule.dst_port ? `:${rule.dst_port}` : ''}
                          </div>
                        )}
                        {rule.connection_state && (
                          <div className="text-slate-500">state: {rule.connection_state}</div>
                        )}
                        {rule.in_interface && <div>in: {rule.in_interface}</div>}
                      </td>

                      {/* Comment */}
                      <td className="py-3 px-4 text-slate-400 text-xs max-w-xs truncate">
                        {rule.comment || '—'}
                      </td>

                      {/* Counters */}
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        <div>{formatNumber(rule.packets)} pkts</div>
                        <div className="text-[10px] text-slate-500">{formatBytes(rule.bytes)}</div>
                      </td>

                      {/* Toggle */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onToggleRule(rule.id, !rule.disabled)}
                          title={rule.disabled ? 'Enable Rule' : 'Disable Rule'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            rule.disabled
                              ? 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Delete */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Address Lists View */}
      {subSection === 'address-list' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Address lists dynamically group IPs. Used by Home Assistant to instantly block devices via list <span className="font-mono text-white">ha_blocked_users</span>.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4">List Name</th>
                  <th className="py-3 px-4">Address / Subnet</th>
                  <th className="py-3 px-4">Description / Source</th>
                  <th className="py-3 px-4">Added Time</th>
                  <th className="py-3 px-4 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {addressLists.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-sky-400">
                      {entry.list}
                    </td>
                    <td className="py-3 px-4 font-mono text-white">{entry.address}</td>
                    <td className="py-3 px-4 text-slate-400">{entry.comment || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {entry.creation_time || 'Static'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onRemoveAddressListEntry(entry.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                        title="Remove from address list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NAT Rules View */}
      {subSection === 'nat' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Chain</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Port / Protocol</th>
                  <th className="py-3 px-4">Target Address : Port</th>
                  <th className="py-3 px-4">Comment</th>
                  <th className="py-3 px-4 text-right">Packets / Bytes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {natRules.map((nat) => (
                  <tr key={nat.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-white">{nat.chain}</td>
                    <td className="py-3 px-4 font-mono text-amber-400">{nat.action}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {nat.protocol || 'any'} {nat.dst_port ? `port ${nat.dst_port}` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400">
                      {nat.to_addresses ? `${nat.to_addresses}:${nat.to_ports || ''}` : 'Outbound WAN'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{nat.comment || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                      <div>{formatNumber(nat.packets)} pkts</div>
                      <div className="text-[10px] text-slate-500">{formatBytes(nat.bytes)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
