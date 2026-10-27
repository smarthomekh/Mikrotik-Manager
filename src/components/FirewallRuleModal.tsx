import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import type { FirewallFilterRule } from '../types/mikrotik.ts';

interface FirewallRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Partial<FirewallFilterRule>) => Promise<void>;
}

export const FirewallRuleModal: React.FC<FirewallRuleModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<Partial<FirewallFilterRule>>({
    chain: 'forward',
    action: 'drop',
    protocol: 'tcp',
    dst_port: '',
    src_address: '',
    dst_address: '',
    src_address_list: '',
    in_interface: '',
    out_interface: '',
    comment: '',
    disabled: false,
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
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Add Firewall Filter Rule</h3>
              <p className="text-xs text-slate-400 font-mono">/ip firewall filter rule</p>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Chain</label>
              <select
                value={formData.chain}
                onChange={(e) => setFormData({ ...formData, chain: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="forward">forward (Transit packets through router)</option>
                <option value="input">input (Packets destined to router itself)</option>
                <option value="output">output (Packets originating from router)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Action</label>
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="drop">drop (Silently discard packet)</option>
                <option value="accept">accept (Allow packet)</option>
                <option value="reject">reject (Send ICMP unreachable)</option>
                <option value="fasttrack-connection">fasttrack-connection</option>
                <option value="log">log</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Protocol</label>
              <select
                value={formData.protocol}
                onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="tcp">tcp</option>
                <option value="udp">udp</option>
                <option value="icmp">icmp</option>
                <option value="gre">gre</option>
                <option value="">(any protocol)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Dst Port(s)</label>
              <input
                type="text"
                value={formData.dst_port || ''}
                onChange={(e) => setFormData({ ...formData, dst_port: e.target.value })}
                placeholder="e.g. 80,443 or 5000-5010"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Src Address</label>
              <input
                type="text"
                value={formData.src_address || ''}
                onChange={(e) => setFormData({ ...formData, src_address: e.target.value })}
                placeholder="e.g. 192.168.88.100"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Src Address List</label>
              <input
                type="text"
                value={formData.src_address_list || ''}
                onChange={(e) => setFormData({ ...formData, src_address_list: e.target.value })}
                placeholder="e.g. ha_blocked_users"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Comment / Rule Description</label>
            <input
              type="text"
              value={formData.comment || ''}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="e.g. Block malicious outbound traffic"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
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
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-sm shadow-rose-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Inserting Rule...' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
