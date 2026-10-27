/**
 * Formatting utilities for network telemetry and RouterOS data
 */

export function formatBps(bps: number): string {
  if (bps === 0) return '0 bps';
  if (bps < 1_000) return `${Math.round(bps)} bps`;
  if (bps < 1_000_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  if (bps < 1_000_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function parseSpeedLimit(limitStr?: string): { down: string; up: string } {
  if (!limitStr || limitStr === 'Uncapped' || limitStr === '0') {
    return { down: 'Uncapped', up: 'Uncapped' };
  }
  const parts = limitStr.split('/');
  if (parts.length === 2) {
    return { up: parts[0], down: parts[1] };
  }
  return { down: limitStr, up: '5M' };
}
