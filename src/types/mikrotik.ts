/**
 * MikroTik RouterOS & Home Assistant Add-on Type Definitions
 */

export interface RouterInfo {
  identity: string;
  model: string;
  routeros_version: string;
  architecture: string;
  cpu: string;
  cpu_count: number;
  cpu_frequency_mhz: number;
  cpu_load_percent: number;
  free_memory_mb: number;
  total_memory_mb: number;
  free_hdd_mb: number;
  total_hdd_mb: number;
  uptime: string;
  uptime_seconds: number;
  temperature_celsius?: number;
  voltage_volts?: number;
  board_name: string;
  serial_number: string;
}

export interface InterfaceTraffic {
  id: string;
  name: string;
  type: 'ethernet' | 'wireless' | 'bridge' | 'vlan' | 'sfp' | 'lte' | 'wireguard';
  mac_address: string;
  running: boolean;
  disabled: boolean;
  rx_bps: number;
  tx_bps: number;
  rx_packets_per_sec: number;
  tx_packets_per_sec: number;
  total_rx_bytes: number;
  total_tx_bytes: number;
  comment?: string;
  is_wan?: boolean;
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface RestrictionTimeSlot {
  id: string;
  name: string;
  enabled: boolean;
  days: DayOfWeek[];
  start_time: string; // e.g. "16:00"
  end_time: string;   // e.g. "18:30"
  action: 'block_all' | 'block_games' | 'block_websites' | 'throttle';
  throttle_speed?: string; // e.g. "512k/512k" or "1M/1M"
  comment?: string;
}

export interface PopularGameItem {
  id: string;
  name: string;
  category: 'battle_royale' | 'sandbox' | 'moba' | 'fps' | 'mobile_gaming';
  ports?: string;
  domains: string[];
  description: string;
  icon_name: string;
}

export interface PopularWebsiteItem {
  id: string;
  name: string;
  category: 'social_media' | 'video_streaming' | 'messaging' | 'entertainment' | 'adult_gambling';
  domains: string[];
  description: string;
}

export interface ClientDevice {
  id: string;
  hostname: string;
  alias: string;
  ip_address: string;
  mac_address: string;
  vendor: string;
  interface: string;
  connection_type: 'ethernet' | 'wifi_5ghz' | 'wifi_2ghz' | 'wifi_6';
  status: 'active' | 'idle' | 'blocked';
  rx_rate_bps: number;
  tx_rate_bps: number;
  total_download_bytes: number;
  total_upload_bytes: number;
  uptime: string;
  last_seen: string;
  is_blocked: boolean;
  block_method: 'firewall_address_list' | 'queue_drop' | 'arp';
  queue_id?: string;
  max_download_limit?: string; // e.g. "10M"
  max_upload_limit?: string;   // e.g. "5M"
  schedules: RestrictionTimeSlot[]; // multiple time windows!
  blocked_games: string[]; // game IDs, e.g. ['roblox', 'minecraft', 'fortnite']
  blocked_websites: string[]; // website IDs, e.g. ['tiktok', 'youtube', 'discord']
  custom_blocked_domains: string[]; // custom domain strings e.g. ['gambling.com', 'badsite.org']
  dhcp_status: 'bound' | 'static' | 'dynamic';
}

export interface SimpleQueue {
  id: string;
  name: string;
  target: string; // e.g. "192.168.88.105/32" or "192.168.88.0/24"
  max_limit_upload: string;   // e.g. "5M"
  max_limit_download: string; // e.g. "20M"
  burst_limit_upload?: string;
  burst_limit_download?: string;
  burst_threshold_upload?: string;
  burst_threshold_download?: string;
  burst_time?: string;
  priority: number; // 1 to 8 (1 highest)
  current_rate_upload_bps: number;
  current_rate_download_bps: number;
  total_bytes_upload: number;
  total_bytes_download: number;
  packet_drops: number;
  disabled: boolean;
  dynamic: boolean;
  comment?: string;
}

export interface RouterSchedule {
  id: string;
  name: string;
  start_date: string;
  start_time: string;
  interval: string; // e.g. "1d", "12:00:00", "1h"
  on_event: string; // RouterOS script command
  run_count: number;
  next_run: string;
  disabled: boolean;
  comment?: string;
}

export interface FirewallFilterRule {
  id: string;
  order: number;
  chain: 'input' | 'forward' | 'output';
  action: 'accept' | 'drop' | 'reject' | 'fasttrack-connection' | 'log' | 'passthrough';
  src_address?: string;
  dst_address?: string;
  src_address_list?: string;
  dst_address_list?: string;
  protocol?: string;
  dst_port?: string;
  tls_host?: string;
  in_interface?: string;
  out_interface?: string;
  connection_state?: string;
  packets: number;
  bytes: number;
  disabled: boolean;
  comment?: string;
}

export interface AddressListEntry {
  id: string;
  list: string;
  address: string;
  disabled: boolean;
  creation_time?: string;
  timeout?: string;
  dynamic: boolean;
  comment?: string;
}

export interface NatRule {
  id: string;
  chain: 'srcnat' | 'dstnat';
  action: 'masquerade' | 'dst-nat' | 'redirect' | 'src-nat';
  to_addresses?: string;
  to_ports?: string;
  protocol?: string;
  dst_port?: string;
  in_interface?: string;
  out_interface?: string;
  packets: number;
  bytes: number;
  disabled: boolean;
  comment?: string;
}

export interface RouterConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  use_ssl: boolean;
  allow_insecure_cert: boolean;
  poll_interval_ms: number;
  mode: 'real' | 'demo';
  connected: boolean;
  last_error?: string;
  last_sync?: string;
}

export interface ThroughputHistoryPoint {
  timestamp: number;
  time_label: string;
  wan_rx_mbps: number;
  wan_tx_mbps: number;
  lan_rx_mbps: number;
  lan_tx_mbps: number;
}
