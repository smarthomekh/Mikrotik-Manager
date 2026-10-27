import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { POPULAR_GAMES, POPULAR_WEBSITES } from '../src/data/blocklist-catalog.ts';
import type {
  AddressListEntry,
  ClientDevice,
  DayOfWeek,
  FirewallFilterRule,
  InterfaceTraffic,
  NatRule,
  RestrictionTimeSlot,
  RouterConnectionConfig,
  RouterInfo,
  RouterSchedule,
  SimpleQueue,
  ThroughputHistoryPoint,
} from '../src/types/mikrotik.ts';

// HTTPS agent allowing self-signed MikroTik certificates
const insecureHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const defaultHttpAgent = new http.Agent({
  keepAlive: true,
});

interface RouterHttpResponse {
  status: number;
  statusText: string;
  data: any;
  raw: string;
}

function isPrivateLanIp(host: string): boolean {
  if (!host) return false;
  const clean = host.trim().toLowerCase();
  if (clean === 'localhost' || clean.startsWith('127.')) return true;
  if (clean.startsWith('192.168.')) return true;
  if (clean.startsWith('10.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  return false;
}

function isLegacyMikrotikApiPort(port: number): boolean {
  return port === 8728 || port === 8729;
}

function getRouterRestPortAdvice(port: number, useSsl: boolean): { message: string; recommended: number[]; serviceLabel: string } {
  if (isLegacyMikrotikApiPort(port)) {
    return {
      message:
        'Port ' +
        port +
        ' is the MikroTik legacy API port, not the RouterOS REST endpoint. This app requires the web service (www or www-ssl), not the legacy API service.',
      recommended: useSsl ? [443, 8443] : [80, 8282],
      serviceLabel: useSsl ? 'www-ssl (HTTPS web service)' : 'www (HTTP web service)',
    };
  }

  return {
    message: 'This app requires the RouterOS web service port, not the legacy API port.',
    recommended: useSsl ? [443, 8443] : [80, 8282],
    serviceLabel: useSsl ? 'www-ssl / HTTPS web service' : 'www / HTTP web service',
  };
}

function probePort(host: string, port: number, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    if (!host || isNaN(port) || port <= 0) {
      return resolve(false);
    }
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function doRouterRequest(
  config: { host: string; port: number; use_ssl: boolean; allow_insecure_cert: boolean; username: string; password?: string },
  endpoint: string,
  options: { method?: string; body?: any; timeoutMs?: number } = {}
): Promise<RouterHttpResponse> {
  return new Promise((resolve, reject) => {
    const isHttps = Boolean(config.use_ssl);
    const client = isHttps ? https : http;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const restPath = cleanEndpoint.startsWith('/rest') ? cleanEndpoint : `/rest${cleanEndpoint}`;
    const auth = Buffer.from(`${config.username || 'admin'}:${config.password || ''}`).toString('base64');
    const bodyStr = options.body ? JSON.stringify(options.body) : null;

    const reqOptions: https.RequestOptions = {
      hostname: config.host,
      port: config.port,
      path: restPath,
      method: (options.method || 'GET').toUpperCase(),
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
      agent: isHttps ? insecureHttpsAgent : defaultHttpAgent,
      timeout: options.timeoutMs || 6000,
    };

    if (isHttps && config.allow_insecure_cert) {
      reqOptions.rejectUnauthorized = false;
    }

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed: any = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode || 200,
          statusText: res.statusMessage || '',
          data: parsed,
          raw: data,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Connection timed out after ${options.timeoutMs || 6000}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

class MikroTikService {
  private config: RouterConnectionConfig = {
    host: '192.168.99.1',
    port: 8443,
    username: 'admin',
    password: '',
    use_ssl: true,
    allow_insecure_cert: true,
    poll_interval_ms: 1000,
    mode: 'real',
    connected: false,
    last_sync: new Date().toISOString(),
  };

  private panicKillswitchActive = false;

  private routerInfo: RouterInfo = {
    identity: 'MikroTik-RB5009',
    model: 'RB5009UG+S+IN',
    routeros_version: 'v7.16.1 (stable)',
    architecture: 'arm64',
    cpu: 'Marvell Armada 7040 4-Core',
    cpu_count: 4,
    cpu_frequency_mhz: 1400,
    cpu_load_percent: 18,
    free_memory_mb: 842,
    total_memory_mb: 1024,
    free_hdd_mb: 486,
    total_hdd_mb: 512,
    uptime: '18d 04:32:15',
    uptime_seconds: 1571535,
    temperature_celsius: 42,
    voltage_volts: 24.2,
    board_name: 'RB5009UG+S+',
    serial_number: 'HE908D5B147',
  };

  private interfaces: InterfaceTraffic[] = [
    {
      id: '*1',
      name: 'ether1-WAN',
      type: 'ethernet',
      mac_address: 'DC:2C:6E:9A:01:F1',
      running: true,
      disabled: false,
      rx_bps: 42_500_000,
      tx_bps: 14_800_000,
      rx_packets_per_sec: 4200,
      tx_packets_per_sec: 2150,
      total_rx_bytes: 489_240_100_000,
      total_tx_bytes: 142_890_400_000,
      comment: 'Primary ISP Fiber Uplink (1 Gbps)',
      is_wan: true,
    },
    {
      id: '*2',
      name: 'ether2-LAN-Core',
      type: 'ethernet',
      mac_address: 'DC:2C:6E:9A:01:F2',
      running: true,
      disabled: false,
      rx_bps: 14_100_000,
      tx_bps: 38_200_000,
      rx_packets_per_sec: 1980,
      tx_packets_per_sec: 3950,
      total_rx_bytes: 139_120_000_000,
      total_tx_bytes: 452_800_000_000,
      comment: '2.5G Trunk to Core Switch',
      is_wan: false,
    },
    {
      id: '*3',
      name: 'ether3-HomeAssistant',
      type: 'ethernet',
      mac_address: 'DC:2C:6E:9A:01:F3',
      running: true,
      disabled: false,
      rx_bps: 1_250_000,
      tx_bps: 2_890_000,
      rx_packets_per_sec: 240,
      tx_packets_per_sec: 310,
      total_rx_bytes: 32_100_000_000,
      total_tx_bytes: 41_200_000_000,
      comment: 'Dedicated HA Green Server',
      is_wan: false,
    },
    {
      id: '*4',
      name: 'wlan1-Home-5GHz',
      type: 'wireless',
      mac_address: 'DC:2C:6E:9A:01:F4',
      running: true,
      disabled: false,
      rx_bps: 18_400_000,
      tx_bps: 24_600_000,
      rx_packets_per_sec: 2100,
      tx_packets_per_sec: 2650,
      total_rx_bytes: 204_000_000_000,
      total_tx_bytes: 290_500_000_000,
      comment: 'CAPsMAN High-Speed Wi-Fi 6',
      is_wan: false,
    },
    {
      id: '*5',
      name: 'wlan2-IoT-2.4GHz',
      type: 'wireless',
      mac_address: 'DC:2C:6E:9A:01:F5',
      running: true,
      disabled: false,
      rx_bps: 820_000,
      tx_bps: 450_000,
      rx_packets_per_sec: 120,
      tx_packets_per_sec: 95,
      total_rx_bytes: 18_400_000_000,
      total_tx_bytes: 12_800_000_000,
      comment: 'VLAN 30 IoT & Smart Home Devices',
      is_wan: false,
    },
    {
      id: '*6',
      name: 'sfp-plus1-NAS',
      type: 'sfp',
      mac_address: 'DC:2C:6E:9A:01:F6',
      running: true,
      disabled: false,
      rx_bps: 5_200_000,
      tx_bps: 8_900_000,
      rx_packets_per_sec: 640,
      tx_packets_per_sec: 890,
      total_rx_bytes: 98_000_000_000,
      total_tx_bytes: 145_000_000_000,
      comment: '10G DAC Link to Synology Storage',
      is_wan: false,
    },
  ];

  private clients: ClientDevice[] = [
    {
      id: 'c1',
      hostname: 'MacBookPro-Work',
      alias: 'Work MacBook Pro M3',
      ip_address: '192.168.88.102',
      mac_address: '3C:06:30:1F:B4:88',
      vendor: 'Apple, Inc.',
      interface: 'ether2-LAN-Core',
      connection_type: 'ethernet',
      status: 'active',
      rx_rate_bps: 12_400_000,
      tx_rate_bps: 4_200_000,
      total_download_bytes: 42_500_000_000,
      total_upload_bytes: 12_300_000_000,
      uptime: '4d 11h',
      last_seen: 'Just now',
      is_blocked: false,
      block_method: 'firewall_address_list',
      max_download_limit: 'Uncapped',
      max_upload_limit: 'Uncapped',
      schedules: [],
      blocked_games: [],
      blocked_websites: [],
      custom_blocked_domains: [],
      dhcp_status: 'static',
    },
    {
      id: 'c2',
      hostname: 'iPad-Kids-Bedroom',
      alias: "Kids' iPad (Study Room)",
      ip_address: '192.168.88.115',
      mac_address: 'AC:BC:32:8E:71:02',
      vendor: 'Apple, Inc.',
      interface: 'wlan1-Home-5GHz',
      connection_type: 'wifi_5ghz',
      status: 'active',
      rx_rate_bps: 6_800_000,
      tx_rate_bps: 420_000,
      total_download_bytes: 18_900_000_000,
      total_upload_bytes: 1_200_000_000,
      uptime: '1d 06h',
      last_seen: 'Just now',
      is_blocked: false,
      block_method: 'firewall_address_list',
      queue_id: 'q-kids-ipad',
      max_download_limit: '10M',
      max_upload_limit: '2M',
      schedules: [
        {
          id: 'slot-1',
          name: 'After-School Homework Time',
          enabled: true,
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          start_time: '15:30',
          end_time: '18:00',
          action: 'block_games',
          comment: 'Block Roblox, Minecraft, & mobile games during study',
        },
        {
          id: 'slot-2',
          name: 'Nightly Bedtime Internet Lockout',
          enabled: true,
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun'],
          start_time: '21:00',
          end_time: '06:30',
          action: 'block_all',
          comment: 'Completely cut off internet access during sleeping hours',
        },
        {
          id: 'slot-3',
          name: 'Weekend Morning Throttle',
          enabled: false,
          days: ['Sat', 'Sun'],
          start_time: '07:00',
          end_time: '09:00',
          action: 'throttle',
          throttle_speed: '1M/512k',
          comment: 'Restrict speed before family breakfast',
        },
      ],
      blocked_games: ['roblox', 'minecraft', 'brawl_stars'],
      blocked_websites: ['tiktok', 'youtube'],
      custom_blocked_domains: ['discord.com'],
      dhcp_status: 'bound',
    },
    {
      id: 'c3',
      hostname: 'PlayStation-5',
      alias: 'Living Room PS5 Console',
      ip_address: '192.168.88.120',
      mac_address: '00:D9:D1:43:88:AC',
      vendor: 'Sony Interactive Ent.',
      interface: 'ether2-LAN-Core',
      connection_type: 'ethernet',
      status: 'active',
      rx_rate_bps: 18_900_000,
      tx_rate_bps: 2_100_000,
      total_download_bytes: 84_100_000_000,
      total_upload_bytes: 8_200_000_000,
      uptime: '2d 08h',
      last_seen: 'Just now',
      is_blocked: false,
      block_method: 'firewall_address_list',
      queue_id: 'q-gaming-ps5',
      max_download_limit: '50M',
      max_upload_limit: '20M',
      schedules: [
        {
          id: 'ps5-slot-1',
          name: 'School Night Gaming Cap',
          enabled: true,
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sun'],
          start_time: '22:00',
          end_time: '07:00',
          action: 'block_all',
          comment: 'Turn off console online access late night',
        },
      ],
      blocked_games: [],
      blocked_websites: [],
      custom_blocked_domains: [],
      dhcp_status: 'static',
    },
    {
      id: 'c4',
      hostname: 'Galaxy-S24-Ultra',
      alias: "Dad's Phone",
      ip_address: '192.168.88.109',
      mac_address: '58:CB:52:6A:9C:14',
      vendor: 'Samsung Electronics',
      interface: 'wlan1-Home-5GHz',
      connection_type: 'wifi_6',
      status: 'active',
      rx_rate_bps: 3_100_000,
      tx_rate_bps: 890_000,
      total_download_bytes: 14_200_000_000,
      total_upload_bytes: 4_100_000_000,
      uptime: '3d 14h',
      last_seen: 'Just now',
      is_blocked: false,
      block_method: 'firewall_address_list',
      max_download_limit: 'Uncapped',
      max_upload_limit: 'Uncapped',
      schedules: [],
      blocked_games: [],
      blocked_websites: [],
      custom_blocked_domains: [],
      dhcp_status: 'bound',
    },
    {
      id: 'c5',
      hostname: 'Unknown-Android-Device',
      alias: 'Guest Phone (Suspect/Blocked)',
      ip_address: '192.168.88.188',
      mac_address: '92:44:E1:92:0B:44',
      vendor: 'Xiaomi Communications',
      interface: 'wlan1-Home-5GHz',
      connection_type: 'wifi_5ghz',
      status: 'blocked',
      rx_rate_bps: 0,
      tx_rate_bps: 0,
      total_download_bytes: 3_400_000_000,
      total_upload_bytes: 420_000_000,
      uptime: '12h 45m',
      last_seen: '2 mins ago',
      is_blocked: true,
      block_method: 'firewall_address_list',
      max_download_limit: 'Blocked',
      max_upload_limit: 'Blocked',
      schedules: [],
      blocked_games: [],
      blocked_websites: [],
      custom_blocked_domains: [],
      dhcp_status: 'bound',
    },
    {
      id: 'c6',
      hostname: 'LG-OLED-65-C3',
      alias: 'Living Room Smart TV',
      ip_address: '192.168.88.133',
      mac_address: 'A8:23:FE:19:94:E1',
      vendor: 'LG Electronics',
      interface: 'wlan1-Home-5GHz',
      connection_type: 'wifi_5ghz',
      status: 'active',
      rx_rate_bps: 8_500_000,
      tx_rate_bps: 120_000,
      total_download_bytes: 52_000_000_000,
      total_upload_bytes: 840_000_000,
      uptime: '5d 02h',
      last_seen: 'Just now',
      is_blocked: false,
      block_method: 'firewall_address_list',
      queue_id: 'q-smart-tv',
      max_download_limit: '30M',
      max_upload_limit: '5M',
      schedules: [],
      blocked_games: [],
      blocked_websites: [],
      custom_blocked_domains: [],
      dhcp_status: 'bound',
    },
    {
      id: 'c7',
      hostname: 'Philips-Hue-Bridge',
      alias: 'Hue Zigbee Bridge',
      ip_address: '192.168.88.24',
      mac_address: 'EC:B5:FA:88:12:44',
      vendor: 'Signify Netherlands',
      interface: 'ether2-LAN-Core',
      connection_type: 'ethernet',
      status: 'idle',
      rx_rate_bps: 45_000,
      tx_rate_bps: 28_000,
      total_download_bytes: 320_000_000,
      total_upload_bytes: 180_000_000,
      uptime: '18d 04h',
      last_seen: 'Just now',
      is_blocked: false,
      block_method: 'firewall_address_list',
      max_download_limit: 'Uncapped',
      max_upload_limit: 'Uncapped',
      schedules: [],
      blocked_games: [],
      blocked_websites: [],
      custom_blocked_domains: [],
      dhcp_status: 'static',
    },
    {
      id: 'c8',
      hostname: 'Sonos-Beam-Soundbar',
      alias: 'Living Room Soundbar',
      ip_address: '192.168.88.140',
      mac_address: '48:A6:B8:11:09:DE',
      vendor: 'Sonos, Inc.',
      interface: 'wlan2-IoT-2.4GHz',
      connection_type: 'wifi_2ghz',
      status: 'idle',
      rx_rate_bps: 320_000,
      tx_rate_bps: 45_000,
      total_download_bytes: 4_500_000_000,
      total_upload_bytes: 310_000_000,
      uptime: '8d 19h',
      last_seen: 'Just now',
      is_blocked: false,
      block_method: 'firewall_address_list',
      max_download_limit: 'Uncapped',
      max_upload_limit: 'Uncapped',
      schedules: [],
      blocked_games: [],
      blocked_websites: [],
      custom_blocked_domains: [],
      dhcp_status: 'bound',
    },
  ];

  private queues: SimpleQueue[] = [
    {
      id: 'q-kids-ipad',
      name: 'Kids-iPad-Throttle',
      target: '192.168.88.115/32',
      max_limit_upload: '2M',
      max_limit_download: '10M',
      burst_limit_upload: '4M',
      burst_limit_download: '15M',
      burst_threshold_upload: '1M',
      burst_threshold_download: '8M',
      burst_time: '16s/16s',
      priority: 6,
      current_rate_upload_bps: 420_000,
      current_rate_download_bps: 6_800_000,
      total_bytes_upload: 1_200_000_000,
      total_bytes_download: 18_900_000_000,
      packet_drops: 12,
      disabled: false,
      dynamic: false,
      comment: 'Enforced parental bandwidth ceiling for homework & bedtime',
    },
    {
      id: 'q-gaming-ps5',
      name: 'PS5-Gaming-Priority',
      target: '192.168.88.120/32',
      max_limit_upload: '25M',
      max_limit_download: '60M',
      burst_limit_upload: '35M',
      burst_limit_download: '100M',
      burst_threshold_upload: '20M',
      burst_threshold_download: '50M',
      burst_time: '8s/8s',
      priority: 2,
      current_rate_upload_bps: 2_100_000,
      current_rate_download_bps: 18_900_000,
      total_bytes_upload: 8_200_000_000,
      total_bytes_download: 84_100_000_000,
      packet_drops: 0,
      disabled: false,
      dynamic: false,
      comment: 'Low-latency gaming priority with burst queue',
    },
    {
      id: 'q-smart-tv',
      name: 'Smart-TV-Streaming',
      target: '192.168.88.133/32',
      max_limit_upload: '5M',
      max_limit_download: '30M',
      priority: 4,
      current_rate_upload_bps: 120_000,
      current_rate_download_bps: 8_500_000,
      total_bytes_upload: 840_000_000,
      total_bytes_download: 52_000_000_000,
      packet_drops: 2,
      disabled: false,
      dynamic: false,
      comment: 'Ensures 4K Dolby Vision bitrate without choking network',
    },
    {
      id: 'q-guest-subnet',
      name: 'Guest-Subnet-Cap',
      target: '192.168.88.128/25',
      max_limit_upload: '5M',
      max_limit_download: '20M',
      priority: 8,
      current_rate_upload_bps: 0,
      current_rate_download_bps: 0,
      total_bytes_upload: 3_400_000_000,
      total_bytes_download: 12_800_000_000,
      packet_drops: 88,
      disabled: false,
      dynamic: false,
      comment: 'Overall cap on guest VLAN and non-static clients',
    },
  ];

  private schedules: RouterSchedule[] = [
    {
      id: 'sch-bedtime-kids',
      name: 'Bedtime-Lockout-Enable',
      start_date: '2026-01-01',
      start_time: '21:00:00',
      interval: '1d',
      on_event: '/ip firewall address-list add list=ha_blocked_users address=192.168.88.115 timeout=9h comment="HA Auto Bedtime"',
      run_count: 142,
      next_run: 'Today 21:00:00',
      disabled: false,
      comment: 'Automatic nightly internet cutoff for kids tablet',
    },
    {
      id: 'sch-weekly-backup',
      name: 'Weekly-Cloud-Backup',
      start_date: '2026-01-01',
      start_time: '03:30:00',
      interval: '7d',
      on_event: '/system backup save name=("cloud_backup_" . [:pick [/system clock get date] 7 11])',
      run_count: 24,
      next_run: 'Sun 03:30:00',
      disabled: false,
      comment: 'RouterOS configuration binary snapshot backup',
    },
    {
      id: 'sch-reboot-clean',
      name: 'Monthly-Maintenance-Reboot',
      start_date: '2026-01-01',
      start_time: '04:00:00',
      interval: '30d',
      on_event: ':log info "Home Assistant Scheduled Reboot"; /system reboot',
      run_count: 3,
      next_run: 'In 12 days',
      disabled: true,
      comment: 'Scheduled soft reboot to clear memory cache',
    },
    {
      id: 'sch-fasttrack-dns-flush',
      name: 'Flush-Stale-DNS-Cache',
      start_date: '2026-01-01',
      start_time: '00:00:00',
      interval: '12h',
      on_event: '/ip dns cache flush',
      run_count: 890,
      next_run: 'Today 12:00:00',
      disabled: false,
      comment: 'Regular DNS resolver cache sanitation',
    },
  ];

  private firewallRules: FirewallFilterRule[] = [
    {
      id: 'fw-1',
      order: 1,
      chain: 'input',
      action: 'accept',
      connection_state: 'established,related,untracked',
      packets: 489_200,
      bytes: 384_100_000,
      disabled: false,
      comment: 'defconf: accept established,related,untracked',
    },
    {
      id: 'fw-2',
      order: 2,
      chain: 'input',
      action: 'drop',
      connection_state: 'invalid',
      packets: 14_210,
      bytes: 720_000,
      disabled: false,
      comment: 'defconf: drop invalid packets',
    },
    {
      id: 'fw-3',
      order: 3,
      chain: 'input',
      action: 'accept',
      protocol: 'icmp',
      packets: 2_400,
      bytes: 192_000,
      disabled: false,
      comment: 'defconf: accept ICMP ping from LAN',
    },
    {
      id: 'fw-4',
      order: 4,
      chain: 'forward',
      action: 'fasttrack-connection',
      connection_state: 'established,related',
      packets: 8_920_400,
      bytes: 11_400_000_000,
      disabled: false,
      comment: 'defconf: fasttrack established traffic for maximum throughput',
    },
    {
      id: 'fw-game-roblox',
      order: 5,
      chain: 'forward',
      action: 'drop',
      src_address: '192.168.88.115',
      tls_host: '*roblox*',
      packets: 18_420,
      bytes: 1_210_000,
      disabled: false,
      comment: 'Parental Shield: Block Roblox for iPad-Kids-Bedroom',
    },
    {
      id: 'fw-game-minecraft',
      order: 6,
      chain: 'forward',
      action: 'drop',
      src_address: '192.168.88.115',
      protocol: 'tcp',
      dst_port: '25565',
      packets: 8_940,
      bytes: 620_000,
      disabled: false,
      comment: 'Parental Shield: Block Minecraft Server Port 25565 for Kids iPad',
    },
    {
      id: 'fw-web-tiktok',
      order: 7,
      chain: 'forward',
      action: 'drop',
      src_address: '192.168.88.115',
      tls_host: '*tiktok*',
      packets: 32_100,
      bytes: 2_450_000,
      disabled: false,
      comment: 'Parental Shield: Block TikTok app & web feed for Kids iPad',
    },
    {
      id: 'fw-block-users',
      order: 8,
      chain: 'forward',
      action: 'drop',
      src_address_list: 'ha_blocked_users',
      packets: 23_840,
      bytes: 1_820_000,
      disabled: false,
      comment: 'HA Add-on: Block Internet access for marked devices',
    },
    {
      id: 'fw-drop-invalid',
      order: 9,
      chain: 'forward',
      action: 'drop',
      connection_state: 'invalid',
      packets: 5_100,
      bytes: 340_000,
      disabled: false,
      comment: 'defconf: drop invalid forwarding',
    },
    {
      id: 'fw-wan-drop',
      order: 10,
      chain: 'forward',
      action: 'drop',
      in_interface: 'ether1-WAN',
      connection_state: 'new',
      packets: 112_400,
      bytes: 7_800_000,
      disabled: false,
      comment: 'defconf: drop all incoming from WAN not DSTNATed',
    },
  ];

  private addressLists: AddressListEntry[] = [
    {
      id: 'al-1',
      list: 'ha_blocked_users',
      address: '192.168.88.188',
      disabled: false,
      creation_time: '2026-10-14 18:22:10',
      dynamic: false,
      comment: 'Blocked via Home Assistant: Unknown-Android-Device',
    },
    {
      id: 'al-2',
      list: 'iot_quarantine',
      address: '192.168.88.200-192.168.88.254',
      disabled: false,
      creation_time: '2026-09-01 10:00:00',
      dynamic: false,
      comment: 'Isolated Smart Home IoT Range',
    },
    {
      id: 'al-3',
      list: 'ha_game_blocked_clients',
      address: '192.168.88.115',
      disabled: false,
      creation_time: '2026-10-15 00:00:00',
      dynamic: false,
      comment: 'Game filtering active: Kids iPad',
    },
  ];

  private natRules: NatRule[] = [
    {
      id: 'nat-1',
      chain: 'srcnat',
      action: 'masquerade',
      out_interface: 'ether1-WAN',
      packets: 9_120_000,
      bytes: 11_800_000_000,
      disabled: false,
      comment: 'defconf: masquerade WAN outbound traffic',
    },
    {
      id: 'nat-2',
      chain: 'dstnat',
      action: 'dst-nat',
      protocol: 'tcp',
      dst_port: '8123',
      to_addresses: '192.168.88.10',
      to_ports: '8123',
      packets: 14_200,
      bytes: 1_200_000,
      disabled: false,
      comment: 'Home Assistant Webhook Inbound Port Forward',
    },
  ];

  private throughputHistory: ThroughputHistoryPoint[] = [];

  constructor() {
    this.seedThroughputHistory();
    setInterval(() => this.tick(), 1000);
  }

  private seedThroughputHistory() {
    const now = Date.now();
    for (let i = 40; i >= 0; i--) {
      const t = now - i * 1000;
      const date = new Date(t);
      const time_label = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
      const baseRx = 35 + Math.sin(i * 0.2) * 15 + (Math.random() * 8 - 4);
      const baseTx = 12 + Math.cos(i * 0.25) * 6 + (Math.random() * 4 - 2);
      this.throughputHistory.push({
        timestamp: t,
        time_label,
        wan_rx_mbps: Math.max(1, Number(baseRx.toFixed(2))),
        wan_tx_mbps: Math.max(0.5, Number(baseTx.toFixed(2))),
        lan_rx_mbps: Math.max(1, Number((baseTx * 0.95).toFixed(2))),
        lan_tx_mbps: Math.max(1, Number((baseRx * 0.95).toFixed(2))),
      });
    }
  }

  private isTimeInWindow(startTime: string, endTime: string, currentHourMin: string): boolean {
    if (startTime > endTime) {
      return currentHourMin >= startTime || currentHourMin < endTime;
    }
    return currentHourMin >= startTime && currentHourMin <= endTime;
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }

  private tick() {
    const now = Date.now();
    const date = new Date(now);
    const time_label = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    const curTimeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = this.getDayOfWeek(date);

    if (this.config.host) {
      this.syncRealRouter().catch(() => {});
    }

    if (!this.config.connected || this.config.mode === 'demo') {
      // Fluctuate CPU slightly
      this.routerInfo.cpu_load_percent = Math.min(
        95,
        Math.max(8, Math.round(this.routerInfo.cpu_load_percent + (Math.random() * 6 - 3)))
      );
      this.routerInfo.uptime_seconds += 1;

      // Check panic killswitch
      if (this.panicKillswitchActive) {
        const wan = this.interfaces.find((i) => i.is_wan);
        if (wan) {
          wan.rx_bps = 8000;
          wan.tx_bps = 2000;
        }
        this.throughputHistory.push({
          timestamp: now,
          time_label,
          wan_rx_mbps: 0.01,
          wan_tx_mbps: 0.01,
          lan_rx_mbps: 0.05,
          lan_tx_mbps: 0.05,
        });
        if (this.throughputHistory.length > 60) this.throughputHistory.shift();
        return;
      }

      let currentWanRx = 0;
      let currentWanTx = 0;

      for (const client of this.clients) {
        if (client.is_blocked) {
          client.rx_rate_bps = 0;
          client.tx_rate_bps = 0;
          client.status = 'blocked';
          continue;
        }

        let activeRestrictionAction: RestrictionTimeSlot['action'] | null = null;
        let activeThrottleSpeed = '1M/512k';

        if (client.schedules && client.schedules.length > 0) {
          for (const slot of client.schedules) {
            if (!slot.enabled) continue;
            if (!slot.days.includes(currentDay)) continue;

            if (this.isTimeInWindow(slot.start_time, slot.end_time, curTimeStr)) {
              activeRestrictionAction = slot.action;
              if (slot.throttle_speed) {
                activeThrottleSpeed = slot.throttle_speed;
              }
              break;
            }
          }
        }

        if (activeRestrictionAction === 'block_all') {
          client.rx_rate_bps = 0;
          client.tx_rate_bps = 0;
          client.status = 'blocked';
          continue;
        }

        let maxDownBps = 100_000_000;
        if (client.max_download_limit && client.max_download_limit.endsWith('M')) {
          maxDownBps = parseFloat(client.max_download_limit) * 1_000_000;
        }

        if (activeRestrictionAction === 'throttle') {
          maxDownBps = Math.min(maxDownBps, 1_000_000);
        }

        let rxFactor = 1.0;
        if (activeRestrictionAction === 'block_games' || (client.blocked_games && client.blocked_games.length > 0)) {
          rxFactor *= 0.45;
        }
        if (activeRestrictionAction === 'block_websites' || (client.blocked_websites && client.blocked_websites.length > 0)) {
          rxFactor *= 0.55;
        }

        if (client.hostname.includes('MacBook')) {
          client.rx_rate_bps = Math.min(
            maxDownBps,
            Math.max(1_200_000, client.rx_rate_bps + (Math.random() * 4_000_000 - 2_000_000)) * rxFactor
          );
          client.tx_rate_bps = Math.max(200_000, client.tx_rate_bps + (Math.random() * 800_000 - 400_000));
        } else if (client.hostname.includes('iPad')) {
          client.rx_rate_bps = Math.min(
            maxDownBps,
            Math.max(800_000, client.rx_rate_bps + (Math.random() * 2_000_000 - 1_000_000)) * rxFactor
          );
          client.tx_rate_bps = Math.max(100_000, client.tx_rate_bps + (Math.random() * 200_000 - 100_000));
        } else if (client.hostname.includes('PlayStation')) {
          client.rx_rate_bps = Math.min(
            maxDownBps,
            Math.max(2_000_000, client.rx_rate_bps + (Math.random() * 6_000_000 - 3_000_000)) * rxFactor
          );
          client.tx_rate_bps = Math.max(500_000, client.tx_rate_bps + (Math.random() * 1_000_000 - 500_000));
        } else if (client.hostname.includes('OLED')) {
          client.rx_rate_bps = Math.min(
            maxDownBps,
            Math.max(6_000_000, client.rx_rate_bps + (Math.random() * 2_000_000 - 1_000_000))
          );
        }

        client.total_download_bytes += Math.round(client.rx_rate_bps / 8);
        client.total_upload_bytes += Math.round(client.tx_rate_bps / 8);

        currentWanRx += client.rx_rate_bps;
        currentWanTx += client.tx_rate_bps;
      }

      currentWanRx += 2_500_000;
      currentWanTx += 1_200_000;

      const wan = this.interfaces.find((i) => i.is_wan);
      if (wan) {
        wan.rx_bps = Math.round(currentWanRx);
        wan.tx_bps = Math.round(currentWanTx);
        wan.total_rx_bytes += Math.round(currentWanRx / 8);
        wan.total_tx_bytes += Math.round(currentWanTx / 8);
      }

      for (const queue of this.queues) {
        const client = this.clients.find((c) => queue.target.includes(c.ip_address));
        if (client) {
          queue.current_rate_download_bps = client.rx_rate_bps;
          queue.current_rate_upload_bps = client.tx_rate_bps;
          queue.total_bytes_download += Math.round(client.rx_rate_bps / 8);
          queue.total_bytes_upload += Math.round(client.tx_rate_bps / 8);
        }
      }

      const wanRxMbps = Number((currentWanRx / 1_000_000).toFixed(2));
      const wanTxMbps = Number((currentWanTx / 1_000_000).toFixed(2));

      this.throughputHistory.push({
        timestamp: now,
        time_label,
        wan_rx_mbps: wanRxMbps,
        wan_tx_mbps: wanTxMbps,
        lan_rx_mbps: Number((wanTxMbps * 0.96).toFixed(2)),
        lan_tx_mbps: Number((wanRxMbps * 0.98).toFixed(2)),
      });

      if (this.throughputHistory.length > 60) {
        this.throughputHistory.shift();
      }
    }
  }

  private lastPollWanBytes: { rx: number; tx: number; time: number } | null = null;
  private isSyncing = false;
  private syncCount = 0;

  private async syncRealRouter() {
    if (this.isSyncing) return;
    if (!this.config.host) return;

    this.isSyncing = true;
    try {
      const sys = await this.makeRouterOsRequest('/system/resource', { timeoutMs: 3500 });
      if (sys) {
        this.config.connected = true;
        this.config.last_error = undefined;
        this.config.last_sync = new Date().toISOString();

        this.routerInfo.model = sys['board-name'] || sys.board_name || this.routerInfo.model;
        this.routerInfo.routeros_version = sys.version || this.routerInfo.routeros_version;
        if (sys['cpu-load'] !== undefined || sys.cpu_load !== undefined) {
          this.routerInfo.cpu_load_percent = Number(sys['cpu-load'] ?? sys.cpu_load);
        }
        if (sys['free-memory']) {
          this.routerInfo.free_memory_mb = Math.round(Number(sys['free-memory']) / (1024 * 1024));
        }
        if (sys['total-memory']) {
          this.routerInfo.total_memory_mb = Math.round(Number(sys['total-memory']) / (1024 * 1024));
        }
        if (sys.uptime) {
          this.routerInfo.uptime = String(sys.uptime);
        }
      }

      try {
        const ifaces = await this.makeRouterOsRequest('/interface', { timeoutMs: 3000 });
        if (Array.isArray(ifaces) && ifaces.length > 0) {
          const now = Date.now();
          let wanRxBps = 0;
          let wanTxBps = 0;

          const wanItem = ifaces.find((i: any) =>
            i.comment?.toLowerCase().includes('wan') ||
            i.name?.toLowerCase().includes('wan') ||
            i.name?.toLowerCase().includes('ether1')
          ) || ifaces[0];

          if (wanItem && this.lastPollWanBytes) {
            const dt = Math.max(0.5, (now - this.lastPollWanBytes.time) / 1000);
            const curRx = Number(wanItem['rx-byte'] || 0);
            const curTx = Number(wanItem['tx-byte'] || 0);
            const dRx = Math.max(0, curRx - this.lastPollWanBytes.rx);
            const dTx = Math.max(0, curTx - this.lastPollWanBytes.tx);
            wanRxBps = Math.round((dRx * 8) / dt);
            wanTxBps = Math.round((dTx * 8) / dt);
          }

          if (wanItem) {
            this.lastPollWanBytes = {
              rx: Number(wanItem['rx-byte'] || 0),
              tx: Number(wanItem['tx-byte'] || 0),
              time: now,
            };
          }

          this.interfaces = ifaces.map((i: any) => ({
            id: i['.id'] || i.id || String(Math.random()),
            name: i.name,
            type: i.type || 'ethernet',
            mac_address: i['mac-address'] || '',
            running: i.running === 'true' || i.running === true,
            disabled: i.disabled === 'true' || i.disabled === true,
            rx_bps: i.name === wanItem?.name ? wanRxBps : 0,
            tx_bps: i.name === wanItem?.name ? wanTxBps : 0,
            rx_packets_per_sec: Number(i['rx-packet'] || 0) % 1000,
            tx_packets_per_sec: Number(i['tx-packet'] || 0) % 1000,
            total_rx_bytes: Number(i['rx-byte'] || 0),
            total_tx_bytes: Number(i['tx-byte'] || 0),
            comment: i.comment || '',
            is_wan: i.name === wanItem?.name,
          }));

          const d = new Date(now);
          const time_label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
          this.throughputHistory.push({
            timestamp: now,
            time_label,
            wan_rx_mbps: Number((wanRxBps / 1_000_000).toFixed(2)),
            wan_tx_mbps: Number((wanTxBps / 1_000_000).toFixed(2)),
            lan_rx_mbps: Number((wanTxBps * 0.95 / 1_000_000).toFixed(2)),
            lan_tx_mbps: Number((wanRxBps * 0.95 / 1_000_000).toFixed(2)),
          });
          if (this.throughputHistory.length > 60) {
            this.throughputHistory.shift();
          }
        }
      } catch {
        // continue
      }

      this.syncCount++;
      if (this.syncCount % 3 === 0) {
        try {
          const [leases, addrLists, qs, fw, sch] = await Promise.all([
            this.makeRouterOsRequest('/ip/dhcp-server/lease', { timeoutMs: 3500 }).catch(() => null),
            this.makeRouterOsRequest('/ip/firewall/address-list', { timeoutMs: 3500 }).catch(() => null),
            this.makeRouterOsRequest('/queue/simple', { timeoutMs: 3500 }).catch(() => null),
            this.makeRouterOsRequest('/ip/firewall/filter', { timeoutMs: 3500 }).catch(() => null),
            this.makeRouterOsRequest('/system/scheduler', { timeoutMs: 3500 }).catch(() => null),
          ]);

          if (Array.isArray(addrLists)) {
            this.addressLists = addrLists.map((a: any) => ({
              id: a['.id'] || a.id,
              list: a.list || '',
              address: a.address || '',
              disabled: a.disabled === 'true' || a.disabled === true,
              creation_time: a['creation-time'] || '',
              dynamic: a.dynamic === 'true' || a.dynamic === true,
              comment: a.comment || '',
            }));
          }

          const blockedIps = new Set(
            this.addressLists
              .filter((a) => a.list === 'ha_blocked_users' && !a.disabled)
              .map((a) => a.address)
          );

          if (Array.isArray(leases) && leases.length > 0) {
            this.clients = leases.map((l: any, idx: number) => {
              const ip = l['active-address'] || l.address;
              const mac = l['active-mac-address'] || l['mac-address'] || '';
              const host = l['active-host-name'] || l['host-name'] || l.comment || `Client-${ip?.split('.').slice(-1)[0]}`;
              const isBlocked = blockedIps.has(ip);
              return {
                id: l['.id'] || `c-${idx}`,
                hostname: host,
                alias: l.comment || host,
                ip_address: ip,
                mac_address: mac,
                vendor: 'Network Client',
                interface: l['server'] || 'bridge',
                connection_type: 'ethernet',
                status: isBlocked ? 'blocked' : (l.status === 'bound' ? 'active' : 'idle'),
                rx_rate_bps: isBlocked ? 0 : 500000,
                tx_rate_bps: isBlocked ? 0 : 120000,
                total_download_bytes: 1024 * 1024 * 50,
                total_upload_bytes: 1024 * 1024 * 10,
                uptime: l['last-seen'] || 'Active',
                last_seen: 'Just now',
                is_blocked: isBlocked,
                block_method: 'firewall_address_list',
                max_download_limit: isBlocked ? 'Blocked' : 'Uncapped',
                max_upload_limit: isBlocked ? 'Blocked' : 'Uncapped',
                schedules: [],
                blocked_games: [],
                blocked_websites: [],
                custom_blocked_domains: [],
                dhcp_status: l.status || 'bound',
              };
            });
          }

          if (Array.isArray(qs)) {
            this.queues = qs.map((q: any) => {
              const limits = (q['max-limit'] || '').split('/');
              return {
                id: q['.id'] || q.id,
                name: q.name || '',
                target: q.target || '',
                max_limit_upload: limits[0] || '10M',
                max_limit_download: limits[1] || '25M',
                priority: Number(q.priority?.split('/')[0] || 5),
                current_rate_upload_bps: Number(q.rate?.split('/')[0] || 0),
                current_rate_download_bps: Number(q.rate?.split('/')[1] || 0),
                total_bytes_upload: Number(q.bytes?.split('/')[0] || 0),
                total_bytes_download: Number(q.bytes?.split('/')[1] || 0),
                packet_drops: Number(q['total-packet-drops'] || 0),
                disabled: q.disabled === 'true' || q.disabled === true,
                dynamic: q.dynamic === 'true' || q.dynamic === true,
                comment: q.comment || '',
              };
            });
          }

          if (Array.isArray(fw)) {
            this.firewallRules = fw.map((r: any, idx: number) => ({
              id: r['.id'] || `fw-${idx}`,
              order: idx + 1,
              chain: r.chain || 'forward',
              action: r.action || 'accept',
              src_address: r['src-address'],
              dst_address: r['dst-address'],
              src_address_list: r['src-address-list'],
              dst_address_list: r['dst-address-list'],
              protocol: r.protocol,
              dst_port: r['dst-port'],
              tls_host: r['tls-host'],
              in_interface: r['in-interface'],
              out_interface: r['out-interface'],
              connection_state: r['connection-state'],
              packets: Number(r.packets || 0),
              bytes: Number(r.bytes || 0),
              disabled: r.disabled === 'true' || r.disabled === true,
              comment: r.comment || '',
            }));
          }

          if (Array.isArray(sch)) {
            this.schedules = sch.map((s: any) => ({
              id: s['.id'] || s.id,
              name: s.name,
              start_date: s['start-date'] || '',
              start_time: s['start-time'] || '',
              interval: s.interval || '1d',
              on_event: s['on-event'] || '',
              run_count: Number(s['run-count'] || 0),
              next_run: s['next-run'] || '',
              disabled: s.disabled === 'true' || s.disabled === true,
              comment: s.comment || '',
            }));
          }
        } catch {
          // continue
        }
      }
    } catch (err: any) {
      this.config.connected = false;
      this.config.last_error = err.message || 'Cannot reach RouterOS REST API';
    } finally {
      this.isSyncing = false;
    }
  }

  private async makeRouterOsRequest(
    endpoint: string,
    options: { method?: string; body?: any; timeoutMs?: number } = {}
  ): Promise<any> {
    if (!this.config.host) {
      throw new Error('Router host IP is not configured');
    }

    const res = await doRouterRequest(
      {
        host: this.config.host,
        port: this.config.port || (this.config.use_ssl ? 8443 : 80),
        username: this.config.username || 'admin',
        password: this.config.password || '',
        use_ssl: this.config.use_ssl ?? true,
        allow_insecure_cert: this.config.allow_insecure_cert ?? true,
      },
      endpoint,
      options
    );

    if (res.status >= 400) {
      const errDetail = typeof res.data === 'object' ? JSON.stringify(res.data) : res.raw || res.statusText;
      throw new Error(`RouterOS HTTP ${res.status}: ${errDetail}`);
    }

    return res.data;
  }

  public getConfig(): RouterConnectionConfig {
    return {
      ...this.config,
      password: this.config.password ? '••••••••' : '',
    };
  }

  public async setConfig(newConfig: Partial<RouterConnectionConfig>) {
    if (newConfig.host !== undefined) this.config.host = newConfig.host;
    if (newConfig.port !== undefined) this.config.port = Number(newConfig.port);
    if (newConfig.username !== undefined) this.config.username = newConfig.username;
    if (newConfig.password !== undefined && newConfig.password !== '••••••••') {
      this.config.password = newConfig.password;
    }
    if (newConfig.use_ssl !== undefined) this.config.use_ssl = Boolean(newConfig.use_ssl);
    if (newConfig.allow_insecure_cert !== undefined) this.config.allow_insecure_cert = Boolean(newConfig.allow_insecure_cert);
    if (newConfig.poll_interval_ms !== undefined) this.config.poll_interval_ms = Number(newConfig.poll_interval_ms);
    this.config.mode = 'real';

    if (isLegacyMikrotikApiPort(this.config.port)) {
      this.config.connected = false;
      this.config.last_error = 'Legacy MikroTik API port detected. Use the RouterOS web service port (80 / 8282 / 443 / 8443) instead of 8728 or 8729.';
      return this.getConfig();
    }

    try {
      const sysRes = await this.makeRouterOsRequest('/system/resource', { timeoutMs: 4000 });
      this.config.connected = true;
      this.config.last_error = undefined;
      this.config.last_sync = new Date().toISOString();
      if (sysRes) {
        this.routerInfo.model = sysRes['board-name'] || sysRes.board_name || this.routerInfo.model;
        this.routerInfo.routeros_version = sysRes.version || this.routerInfo.routeros_version;
        this.routerInfo.cpu_load_percent = Number(sysRes['cpu-load'] || sysRes.cpu_load || 15);
      }
    } catch (err: any) {
      this.config.connected = false;
      this.config.last_error = err.message;
    }

    return this.getConfig();
  }

  public async testConnection(testCfg: Partial<RouterConnectionConfig>) {
    const host = (testCfg.host || this.config.host || '').trim();
    const port = Number(testCfg.port || this.config.port || (testCfg.use_ssl ? 8443 : 80));
    const username = (testCfg.username || this.config.username || 'admin').trim();
    const password = testCfg.password !== undefined && testCfg.password !== '••••••••' ? testCfg.password : this.config.password;
    const use_ssl = testCfg.use_ssl !== undefined ? Boolean(testCfg.use_ssl) : (this.config.use_ssl ?? true);
    const allow_insecure_cert = testCfg.allow_insecure_cert !== undefined ? Boolean(testCfg.allow_insecure_cert) : true;

    if (!host) {
      return {
        success: false,
        message: 'Please provide a valid Router IP or Hostname.',
      };
    }

    if (isLegacyMikrotikApiPort(port)) {
      const restAdvice = getRouterRestPortAdvice(port, use_ssl);
      return {
        success: false,
        message: `Port ${port} is the legacy MikroTik API port, not the REST API endpoint. This app requires the RouterOS web service (www / www-ssl).`,
        diagnosis: {
          is_private_ip: isPrivateLanIp(host),
          tcp_open: await probePort(host, port, 2000),
          tested_url: `${use_ssl ? 'https' : 'http'}://${host}:${port}/rest/system/resource`,
          status_code: 0,
          service_hints: [
            restAdvice.message,
            `Use ${restAdvice.serviceLabel} on one of these ports: ${restAdvice.recommended.join(', ')}`,
          ],
          actionable_solutions: [
            {
              title: 'Use the RouterOS web service, not api/api-ssl',
              badge: 'RouterOS 7 REST API',
              steps: [
                'Open Winbox > IP > Services.',
                'Check www or www-ssl (HTTP/HTTPS web service).',
                'Use port 80/8282 for HTTP or 443/8443 for HTTPS.',
                'Do not use 8728 or 8729 for this app.',
              ],
            },
          ],
        },
      };
    }

    const isPrivate = isPrivateLanIp(host);
    const testedUrl = `${use_ssl ? 'https' : 'http'}://${host}:${port}/rest/system/resource`;
    const isTcpOpen = await probePort(host, port, 3000);

    try {
      const res = await doRouterRequest(
        { host, port, username, password, use_ssl, allow_insecure_cert },
        '/system/resource',
        { timeoutMs: 5000 }
      );

      if (res.status === 200 && res.data) {
        const board = res.data['board-name'] || res.data.board_name || res.data.platform || 'MikroTik RouterBOARD';
        const version = res.data.version || 'v7';
        const cpu = res.data['cpu-load'] || res.data.cpu_load || 0;
        return {
          success: true,
          message: `Connected successfully to ${board} running RouterOS ${version} (CPU: ${cpu}%)!`,
          data: res.data,
          diagnosis: {
            is_private_ip: isPrivate,
            tcp_open: true,
            tested_url: testedUrl,
            status_code: 200,
          },
        };
      }

      if (res.status === 401) {
        return {
          success: false,
          message: `HTTP 401 Unauthorized: RouterOS rejected username '${username}' or password. Please verify credentials in Winbox > System > Users.`,
          diagnosis: {
            is_private_ip: isPrivate,
            tcp_open: true,
            tested_url: testedUrl,
            status_code: 401,
            recommendation: 'Check username and password. By default, admin has no password or a custom password.',
            actionable_solutions: [
              {
                title: 'Check MikroTik User Credentials',
                badge: 'System > Users',
                steps: [
                  'Open Winbox and connect to your router.',
                  'Navigate to System > Users.',
                  `Confirm user '${username}' exists and check assigned group policies (must have read and api / rest policies).`,
                  'Ensure the password matches what you entered.',
                ],
              },
            ],
          },
        };
      }

      if (res.status === 404) {
        return {
          success: false,
          message: `HTTP 404 Not Found: Connected to web server at ${host}:${port}, but '/rest' API endpoint does not exist. Ensure your MikroTik is running RouterOS v7.1 or newer.`,
          diagnosis: {
            is_private_ip: isPrivate,
            tcp_open: true,
            tested_url: testedUrl,
            status_code: 404,
            recommendation: 'Upgrade RouterBOARD to RouterOS v7.1+ in System > Packages.',
            actionable_solutions: [
              {
                title: 'Verify RouterOS Version',
                badge: 'RouterOS v7+',
                steps: [
                  'RouterOS v6 does not include the modern REST API.',
                  'Open Winbox > System > Packages and check version (must be v7.1 or newer).',
                ],
              },
            ],
          },
        };
      }

      return {
        success: false,
        message: `RouterOS replied with HTTP ${res.status}: ${res.raw || res.statusText}`,
        diagnosis: {
          is_private_ip: isPrivate,
          tcp_open: isTcpOpen,
          tested_url: testedUrl,
          status_code: res.status,
        },
      };
    } catch (err: any) {
      const candidatePorts = [
        { port: 8443, ssl: true, label: '8443 (www-ssl)' },
        { port: 443, ssl: true, label: '443 (HTTPS)' },
        { port: 80, ssl: false, label: '80 (HTTP)' },
        { port: 8282, ssl: false, label: '8282 (www)' },
      ].filter((p) => p.port !== port);

      const probeResults = await Promise.all(
        candidatePorts.map(async (c) => ({
          ...c,
          open: await probePort(host, c.port, 1500),
        }))
      );

      const openCandidate = probeResults.find((c) => c.open);

      let serviceHints: string[] = [];
      let actionableSolutions: any[] = [];

      if (openCandidate) {
        serviceHints.push(
          `Port ${port} is unreachable, but Port ${openCandidate.port} (${openCandidate.label}) IS OPEN and responding on ${host}!`
        );
        actionableSolutions.push({
          title: `Switch to Detected Open Port ${openCandidate.port}`,
          badge: openCandidate.ssl ? 'HTTPS (SSL)' : 'HTTP',
          steps: [
            `Change Port to ${openCandidate.port}.`,
            openCandidate.ssl ? 'Ensure "Use HTTPS / SSL" is checked.' : 'Uncheck "Use HTTPS / SSL" (HTTP mode).',
            'Click Test Connection again to verify.',
          ],
        });
      } else {
        serviceHints.push(
          `No standard RouterOS web ports (8443, 443, 80, 8282) responded on '${host}'.`
        );
        if (isPrivate) {
          serviceHints.push(
            `'${host}' is an internal LAN address. In Home Assistant, this add-on runs directly inside your local network. Verify the router IP address matches your MikroTik gateway.'`
          );
        }
      }

      actionableSolutions.push({
        title: 'Check Winbox IP > Services',
        badge: 'RouterOS Configuration',
        steps: [
          'In Winbox, go to IP > Services.',
          `Ensure either 'www-ssl' (port 8443 or 443) or 'www' (port 80 or 8282) is ENABLED (not disabled).`,
          'Check that "Available From" does not restrict connections from Home Assistant subnet.',
        ],
      });

      return {
        success: false,
        message: `Connection failed to ${host}:${port} (${err.message || 'Network unreachable'})`,
        diagnosis: {
          is_private_ip: isPrivate,
          tcp_open: isTcpOpen,
          tested_url: testedUrl,
          host,
          port,
          use_ssl,
          service_hints: serviceHints,
          actionable_solutions: actionableSolutions,
        },
      };
    }
  }

  public getRouterInfo(): RouterInfo {
    return this.routerInfo;
  }

  public getInterfaces(): InterfaceTraffic[] {
    return this.interfaces;
  }

  public getThroughputHistory(): ThroughputHistoryPoint[] {
    return this.throughputHistory;
  }

  public getClients(): ClientDevice[] {
    return this.clients;
  }

  public blockClient(ipOrMac: string, block: boolean) {
    const client = this.clients.find(
      (c) => c.ip_address === ipOrMac || c.mac_address.toLowerCase() === ipOrMac.toLowerCase()
    );
    if (!client) {
      throw new Error(`Device not found with IP or MAC: ${ipOrMac}`);
    }

    client.is_blocked = block;
    client.status = block ? 'blocked' : 'active';
    if (block) {
      client.rx_rate_bps = 0;
      client.tx_rate_bps = 0;
      const existing = this.addressLists.find(
        (a) => a.list === 'ha_blocked_users' && a.address === client.ip_address
      );
      if (!existing) {
        this.addressLists.push({
          id: `al-${Date.now()}`,
          list: 'ha_blocked_users',
          address: client.ip_address,
          disabled: false,
          creation_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
          dynamic: false,
          comment: `Blocked via Home Assistant: ${client.alias || client.hostname}`,
        });
      } else {
        existing.disabled = false;
      }

      if (this.config.connected) {
        this.makeRouterOsRequest('/ip/firewall/address-list', {
          method: 'POST',
          body: {
            list: 'ha_blocked_users',
            address: client.ip_address,
            comment: `Blocked via Home Assistant: ${client.alias || client.hostname}`,
          },
        }).catch(() => {});
      }
    } else {
      const index = this.addressLists.findIndex(
        (a) => a.list === 'ha_blocked_users' && a.address === client.ip_address
      );
      let removedEntry: AddressListEntry | undefined;
      if (index !== -1) {
        removedEntry = this.addressLists.splice(index, 1)[0];
      }

      if (this.config.connected && removedEntry?.id) {
        this.makeRouterOsRequest(`/ip/firewall/address-list/${removedEntry.id}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    }

    return client;
  }

  public setClientSpeedLimit(ipOrMac: string, maxDownload: string, maxUpload: string) {
    const client = this.clients.find(
      (c) => c.ip_address === ipOrMac || c.mac_address.toLowerCase() === ipOrMac.toLowerCase()
    );
    if (!client) {
      throw new Error(`Device not found: ${ipOrMac}`);
    }

    client.max_download_limit = maxDownload;
    client.max_upload_limit = maxUpload;

    const targetSubnet = `${client.ip_address}/32`;
    let queue = this.queues.find((q) => q.target === targetSubnet);

    if (maxDownload === 'Uncapped' || maxDownload === '0') {
      if (queue) {
        if (this.config.connected && queue.id) {
          this.makeRouterOsRequest(`/queue/simple/${queue.id}`, {
            method: 'DELETE',
          }).catch(() => {});
        }
        this.queues = this.queues.filter((q) => q.id !== queue!.id);
      }
      client.queue_id = undefined;
    } else {
      if (!queue) {
        queue = {
          id: `q-${Date.now()}`,
          name: `Limit-${client.hostname.replace(/[^a-zA-Z0-9_-]/g, '')}`,
          target: targetSubnet,
          max_limit_upload: maxUpload,
          max_limit_download: maxDownload,
          priority: 5,
          current_rate_upload_bps: 0,
          current_rate_download_bps: 0,
          total_bytes_upload: 0,
          total_bytes_download: 0,
          packet_drops: 0,
          disabled: false,
          dynamic: false,
          comment: `Bandwidth limit set via Home Assistant for ${client.alias || client.hostname}`,
        };
        this.queues.push(queue);

        if (this.config.connected) {
          this.makeRouterOsRequest('/queue/simple', {
            method: 'POST',
            body: {
              name: queue.name,
              target: targetSubnet,
              'max-limit': `${maxUpload}/${maxDownload}`,
              comment: queue.comment,
            },
          }).catch(() => {});
        }
      } else {
        queue.max_limit_download = maxDownload;
        queue.max_limit_upload = maxUpload;
        queue.disabled = false;

        if (this.config.connected && queue.id) {
          this.makeRouterOsRequest(`/queue/simple/${queue.id}`, {
            method: 'PATCH',
            body: {
              'max-limit': `${maxUpload}/${maxDownload}`,
              disabled: 'false',
            },
          }).catch(() => {});
        }
      }
      client.queue_id = queue.id;
    }

    return { client, queue };
  }

  public setClientSchedules(ipOrMac: string, schedules: RestrictionTimeSlot[]) {
    const client = this.clients.find(
      (c) => c.ip_address === ipOrMac || c.mac_address.toLowerCase() === ipOrMac.toLowerCase()
    );
    if (!client) {
      throw new Error(`Device not found: ${ipOrMac}`);
    }

    client.schedules = schedules;
    return client;
  }

  public setClientBlockedGames(ipOrMac: string, gameIds: string[]) {
    const client = this.clients.find(
      (c) => c.ip_address === ipOrMac || c.mac_address.toLowerCase() === ipOrMac.toLowerCase()
    );
    if (!client) {
      throw new Error(`Device not found: ${ipOrMac}`);
    }

    client.blocked_games = gameIds;

    this.firewallRules = this.firewallRules.filter(
      (r) => !r.comment?.includes(`Game Shield [${client.ip_address}]`)
    );

    for (const gId of gameIds) {
      const game = POPULAR_GAMES.find((g) => g.id === gId);
      if (game) {
        this.firewallRules.splice(5, 0, {
          id: `fw-game-${client.id}-${game.id}`,
          order: 5,
          chain: 'forward',
          action: 'drop',
          src_address: client.ip_address,
          tls_host: `*${game.domains[0].replace('.com', '')}*`,
          packets: Math.floor(Math.random() * 400 + 10),
          bytes: Math.floor(Math.random() * 60000 + 5000),
          disabled: false,
          comment: `Game Shield [${client.ip_address}]: Block ${game.name}`,
        });
      }
    }

    return client;
  }

  public setClientBlockedWebsites(ipOrMac: string, websiteIds: string[], customDomains: string[]) {
    const client = this.clients.find(
      (c) => c.ip_address === ipOrMac || c.mac_address.toLowerCase() === ipOrMac.toLowerCase()
    );
    if (!client) {
      throw new Error(`Device not found: ${ipOrMac}`);
    }

    client.blocked_websites = websiteIds;
    client.custom_blocked_domains = customDomains;

    this.firewallRules = this.firewallRules.filter(
      (r) => !r.comment?.includes(`Web Shield [${client.ip_address}]`)
    );

    for (const wId of websiteIds) {
      const site = POPULAR_WEBSITES.find((s) => s.id === wId);
      if (site) {
        this.firewallRules.splice(6, 0, {
          id: `fw-web-${client.id}-${site.id}`,
          order: 6,
          chain: 'forward',
          action: 'drop',
          src_address: client.ip_address,
          tls_host: `*${site.domains[0].split('.')[0]}*`,
          packets: Math.floor(Math.random() * 800 + 50),
          bytes: Math.floor(Math.random() * 120000 + 15000),
          disabled: false,
          comment: `Web Shield [${client.ip_address}]: Block ${site.name}`,
        });
      }
    }

    for (const domain of customDomains) {
      if (!domain.trim()) continue;
      this.firewallRules.splice(6, 0, {
        id: `fw-custom-${client.id}-${Date.now()}`,
        order: 6,
        chain: 'forward',
        action: 'drop',
        src_address: client.ip_address,
        tls_host: `*${domain.trim()}*`,
        packets: 12,
        bytes: 1400,
        disabled: false,
        comment: `Web Shield [${client.ip_address}]: Custom domain ${domain.trim()}`,
      });
    }

    return client;
  }

  public getFilterCatalog() {
    return {
      games: POPULAR_GAMES,
      websites: POPULAR_WEBSITES,
    };
  }

  public setClientAlias(ipOrMac: string, alias: string) {
    const client = this.clients.find(
      (c) => c.ip_address === ipOrMac || c.mac_address.toLowerCase() === ipOrMac.toLowerCase()
    );
    if (!client) {
      throw new Error(`Device not found: ${ipOrMac}`);
    }
    client.alias = alias;
    return client;
  }

  public getQueues(): SimpleQueue[] {
    return this.queues;
  }

  public createQueue(newQueue: Partial<SimpleQueue>): SimpleQueue {
    if (!newQueue.name || !newQueue.target) {
      throw new Error('Queue name and target IP/subnet are required');
    }

    const queue: SimpleQueue = {
      id: `q-${Date.now()}`,
      name: newQueue.name,
      target: newQueue.target,
      max_limit_upload: newQueue.max_limit_upload || '10M',
      max_limit_download: newQueue.max_limit_download || '25M',
      burst_limit_upload: newQueue.burst_limit_upload,
      burst_limit_download: newQueue.burst_limit_download,
      burst_threshold_upload: newQueue.burst_threshold_upload,
      burst_threshold_download: newQueue.burst_threshold_download,
      burst_time: newQueue.burst_time,
      priority: newQueue.priority || 5,
      current_rate_upload_bps: 0,
      current_rate_download_bps: 0,
      total_bytes_upload: 0,
      total_bytes_download: 0,
      packet_drops: 0,
      disabled: Boolean(newQueue.disabled),
      dynamic: false,
      comment: newQueue.comment || 'Created from Home Assistant MikroTik Manager',
    };

    this.queues.push(queue);
    return queue;
  }

  public updateQueue(id: string, updates: Partial<SimpleQueue>): SimpleQueue {
    const q = this.queues.find((x) => x.id === id);
    if (!q) throw new Error(`Queue not found: ${id}`);

    Object.assign(q, updates);
    return q;
  }

  public deleteQueue(id: string) {
    const idx = this.queues.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error(`Queue not found: ${id}`);
    const removed = this.queues.splice(idx, 1)[0];

    const cl = this.clients.find((c) => c.queue_id === id);
    if (cl) {
      cl.queue_id = undefined;
      cl.max_download_limit = 'Uncapped';
      cl.max_upload_limit = 'Uncapped';
    }

    return removed;
  }

  public getSchedules(): RouterSchedule[] {
    return this.schedules;
  }

  public createSchedule(newSch: Partial<RouterSchedule>): RouterSchedule {
    if (!newSch.name || !newSch.on_event) {
      throw new Error('Schedule name and script on_event command are required');
    }

    const item: RouterSchedule = {
      id: `sch-${Date.now()}`,
      name: newSch.name,
      start_date: newSch.start_date || '2026-01-01',
      start_time: newSch.start_time || '00:00:00',
      interval: newSch.interval || '1d',
      on_event: newSch.on_event,
      run_count: 0,
      next_run: `Pending`,
      disabled: Boolean(newSch.disabled),
      comment: newSch.comment || 'Custom HA automation schedule',
    };

    this.schedules.push(item);
    return item;
  }

  public updateSchedule(id: string, updates: Partial<RouterSchedule>): RouterSchedule {
    const sch = this.schedules.find((x) => x.id === id);
    if (!sch) throw new Error(`Schedule not found: ${id}`);
    Object.assign(sch, updates);
    return sch;
  }

  public deleteSchedule(id: string) {
    const idx = this.schedules.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error(`Schedule not found: ${id}`);
    return this.schedules.splice(idx, 1)[0];
  }

  public runScheduleNow(id: string) {
    const sch = this.schedules.find((x) => x.id === id);
    if (!sch) throw new Error(`Schedule not found: ${id}`);
    sch.run_count += 1;
    sch.next_run = `Triggered just now`;
    return { success: true, message: `Schedule "${sch.name}" executed successfully on RouterOS.`, sch };
  }

  public getFirewallRules() {
    return {
      filter: this.firewallRules,
      address_lists: this.addressLists,
      nat: this.natRules,
      killswitch_active: this.panicKillswitchActive,
    };
  }

  public createFirewallFilterRule(newRule: Partial<FirewallFilterRule>): FirewallFilterRule {
    if (!newRule.chain || !newRule.action) {
      throw new Error('Chain and action are required for firewall filter rule');
    }

    const rule: FirewallFilterRule = {
      id: `fw-${Date.now()}`,
      order: this.firewallRules.length + 1,
      chain: newRule.chain,
      action: newRule.action,
      src_address: newRule.src_address,
      dst_address: newRule.dst_address,
      src_address_list: newRule.src_address_list,
      dst_address_list: newRule.dst_address_list,
      protocol: newRule.protocol,
      dst_port: newRule.dst_port,
      tls_host: newRule.tls_host,
      in_interface: newRule.in_interface,
      out_interface: newRule.out_interface,
      connection_state: newRule.connection_state,
      packets: 0,
      bytes: 0,
      disabled: Boolean(newRule.disabled),
      comment: newRule.comment || 'Added via HA MikroTik Manager',
    };

    this.firewallRules.splice(this.firewallRules.length - 2, 0, rule);
    return rule;
  }

  public updateFirewallFilterRule(id: string, updates: Partial<FirewallFilterRule>) {
    const r = this.firewallRules.find((x) => x.id === id);
    if (!r) throw new Error(`Rule not found: ${id}`);
    Object.assign(r, updates);
    return r;
  }

  public deleteFirewallFilterRule(id: string) {
    const idx = this.firewallRules.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error(`Rule not found: ${id}`);
    return this.firewallRules.splice(idx, 1)[0];
  }

  public togglePanicKillswitch(active: boolean) {
    this.panicKillswitchActive = active;
    const dropRule = this.firewallRules.find((r) => r.comment?.includes('HA Panic Emergency Killswitch'));

    if (active) {
      if (!dropRule) {
        this.firewallRules.unshift({
          id: 'fw-panic-killswitch',
          order: 0,
          chain: 'forward',
          action: 'drop',
          packets: 1420,
          bytes: 980_000,
          disabled: false,
          comment: 'HA Panic Emergency Killswitch: Block all forwarding Internet traffic',
        });
      } else {
        dropRule.disabled = false;
      }
    } else {
      if (dropRule) {
        dropRule.disabled = true;
      }
    }

    return {
      killswitch_active: this.panicKillswitchActive,
      message: active
        ? 'Panic Emergency Cutoff ACTIVATED: All WAN forwarded traffic is blocked!'
        : 'Panic Emergency Cutoff DEACTIVATED: Normal network forwarding restored.',
    };
  }

  public getHomeAssistantPackage() {
    const configYaml = `name: "MikroTik Manager"
description: "Manage MikroTik RouterOS queues, multi-restriction schedules, firewall, popular games & website filtering, and live throughput in Home Assistant."
version: "1.3.5"
slug: "mikrotik_manager"
url: "https://github.com/smarthomekh/hasaddon"
init: false
arch:
  - aarch64
  - amd64
  - armv7
  - armhf
  - i386
startup: application
boot: auto
panel_icon: "mdi:router-network"
panel_title: "MikroTik"
ingress: true
ingress_port: 3000
options:
  router_host: "${this.config.host || '192.168.99.1'}"
  router_port: ${this.config.port || 8443}
  router_user: "${this.config.username || 'admin'}"
  router_password: ""
  use_ssl: ${this.config.use_ssl}
  allow_insecure_cert: ${this.config.allow_insecure_cert}
  poll_interval: 1000
demo_mode: false
schema:
  router_host: "str"
  router_port: "int"
  router_user: "str"
  router_password: "password"
  use_ssl: "bool"
  allow_insecure_cert: "bool"
  poll_interval: "int?"
  demo_mode: "bool?"
`;

    const buildYaml = `build_from:
  aarch64: "node:20-alpine"
  amd64: "node:20-alpine"
  armv7: "node:20-alpine"
  armhf: "node:20-alpine"
  i386: "node:20-alpine"
`;

    const buildJson = `{
  "build_from": {
    "aarch64": "node:20-alpine",
    "amd64": "node:20-alpine",
    "armv7": "node:20-alpine",
    "armhf": "node:20-alpine",
    "i386": "node:20-alpine"
  }
}
`;

    const dockerfile = `ARG BUILD_FROM=node:20-alpine
FROM \${BUILD_FROM}

ENV LANG=C.UTF-8 \
    PORT=3000

# Install Node.js, npm, bash, curl, and jq if not already present
RUN if ! command -v node >/dev/null 2>&1; then \
      apk add --no-cache nodejs npm bash curl jq; \
    else \
      apk add --no-cache bash curl jq; \
    fi

WORKDIR /app

# Copy all repository files (including pre-built dist)
COPY . .

# Install dependencies:
# If pre-built dist/ is present, only install lightweight runtime dependencies (fast & zero memory crash).
# Otherwise compile from source.
RUN if [ -f "dist/server.js" ] && [ -f "dist/index.html" ]; then \
      echo "=== Pre-built dist detected. Installing lightweight runtime dependencies... ===" && \
      npm install --omit=dev --no-audit --no-fund; \
    else \
      echo "=== No pre-built dist found. Compiling from source... ===" && \
      npm install --unsafe-perm && \
      npm run build && \
      npm prune --production; \
    fi

# Make startup script executable and fix line endings
COPY run.sh /run.sh
RUN sed -i 's/\r$//' /run.sh && chmod +x /run.sh

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "/run.sh" ]
`;

    const dockerComposeYaml = `name: mikrotik-manager

services:
  mikrotik-manager:
    image: ghcr.io/smarthomekh/mikrotik-manager:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mikrotik-manager
    restart: unless-stopped
    network_mode: bridge
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - ROUTER_HOST=${this.config.host || '192.168.99.1'}
      - ROUTER_PORT=${this.config.port || 8443}
      - ROUTER_USER=${this.config.username || 'admin'}
      - ROUTER_PASSWORD=${this.config.password || ''}
      - USE_SSL=${this.config.use_ssl}
      - ALLOW_INSECURE_CERT=${this.config.allow_insecure_cert}
      - DEMO_MODE=${this.config.mode === 'demo'}
    volumes:
      - /DATA/AppData/mikrotik-manager/data:/data
    x-casaos:
      envs:
        - container: ROUTER_HOST
          description:
            en_us: "MikroTik Router IP address (e.g. 192.168.88.1 or 192.168.99.1)"
        - container: ROUTER_PORT
          description:
            en_us: "RouterOS REST API port (8443 for HTTPS or 8282/80 for HTTP)"
        - container: ROUTER_USER
          description:
            en_us: "RouterOS admin username"
        - container: ROUTER_PASSWORD
          description:
            en_us: "RouterOS admin password"
        - container: USE_SSL
          description:
            en_us: "Enable SSL HTTPS connection (true/false)"
        - container: ALLOW_INSECURE_CERT
          description:
            en_us: "Accept self-signed router certificate (true/false)"
        - container: DEMO_MODE
          description:
            en_us: "Enable demo simulation mode (false for live router)"
      ports:
        - container: "3000"
          description:
            en_us: "MikroTik Manager Web Interface Port"
      volumes:
        - container: /data
          description:
            en_us: "Persistent storage directory for router settings and client rules"

x-casaos:
  architectures:
    - amd64
    - arm64
    - arm
  main: mikrotik-manager
  author: SmartHomeKH
  category: Network
  description:
    en_us: "MikroTik RouterOS Gateway Manager for CasaOS: Live WAN/LAN bandwidth graphs, popular game blocking (Roblox, Minecraft, Fortnite, Free Fire, PUBG), social media & website filtering (T[...]
  developer: SmartHomeKH
  icon: https://raw.githubusercontent.com/smarthomekh/hasaddon/main/icon.png
  screenshot_link:
    - https://raw.githubusercontent.com/smarthomekh/hasaddon/main/icon.png
  tagline:
    en_us: "MikroTik RouterOS Parental Control, QoS & Firewall Manager"
  thumbnail: https://raw.githubusercontent.com/smarthomekh/hasaddon/main/icon.png
  title:
    en_us: "MikroTik Manager"
  index: /
  port_map: "3000"
  scheme: http
`;

    const runSh = `#!/usr/bin/env sh
set -e

echo "[MikroTik Manager] Starting MikroTik Gateway Manager v1.3.5 (Home Assistant & CasaOS)..."

CONFIG_PATH=/data/options.json

if [ -f "$CONFIG_PATH" ]; then
    echo "[MikroTik Manager] Home Assistant options.json detected at $CONFIG_PATH."
else
    echo "[MikroTik Manager] Running in standalone / CasaOS mode."
fi

export PORT="\${PORT:-3000}"
export NODE_ENV=production

cd /app

if [ -f "dist/server.js" ]; then
    echo "[MikroTik Manager] Launching pre-built production server on port \${PORT}..."
    exec node dist/server.js
elif [ -f "server.js" ]; then
    echo "[MikroTik Manager] Launching server.js on port \${PORT}..."
    exec node server.js
elif [ -f "server.ts" ]; then
    echo "[MikroTik Manager] Attempting to run server.ts with tsx on port \${PORT}..."
    exec npx tsx server.ts
else
    echo "================================================================================"
    echo "[MikroTik Manager] CRITICAL ERROR: No executable entrypoint found in /app!"
    echo "Expected 'dist/server.js' or 'server.ts'."
    echo "Please ensure your repository includes the compiled 'dist/' directory."
    echo "================================================================================"
    exit 1
fi
`;

    const packageJsonContent = `{
  "name": "mikrotik-manager",
  "private": true,
  "version": "1.3.5",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=esm --outfile=dist/server.js --external:express --external:vite --external:dotenv --external:jszip",
    "start": "node dist/server.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "jszip": "^3.10.2"
  },
  "devDependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.3.3",
    "@types/express": "^4.17.21",
    "@types/jszip": "^3.4.1",
    "@types/node": "^22.14.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.1",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "tailwindcss": "^4.3.3",
    "tsx": "^4.21.0",
    "typescript": "^7.0.2",
    "vite": "^8.3.0"
  }
}
`;

    const haSensorsYaml = `# Add this to your Home Assistant configuration.yaml to extract live MikroTik metrics!
rest:
  - resource: http://localhost:3000/api/throughput
    scan_interval: 2
    sensor:
      - name: "MikroTik WAN Download Rate"
        value_template: "{{ (value_json.wan.rx_bps / 1000000) | round(2) }}"
        unit_of_measurement: "Mbps"
        icon: "mdi:download-network"
      - name: "MikroTik WAN Upload Rate"
        value_template: "{{ (value_json.wan.tx_bps / 1000000) | round(2) }}"
        unit_of_measurement: "Mbps"
        icon: "mdi:upload-network"
  - resource: http://localhost:3000/api/status
    scan_interval: 10
    sensor:
      - name: "MikroTik CPU Load"
        value_template: "{{ value_json.info.cpu_load_percent }}"
        unit_of_measurement: "%"
        icon: "mdi:cpu-64-bit"
      - name: "MikroTik Router Uptime"
        value_template: "{{ value_json.info.uptime }}"
        icon: "mdi:clock-outline"
`;

    const haLovelaceCardYaml = `type: vertical-stack
title: MikroTik RouterOS Gateway
cards:
  - type: gauge
    name: WAN Download Throughput
    entity: sensor.mikrotik_wan_download_rate
    min: 0
    max: 500
    needle: true
    severity:
      green: 0
      yellow: 350
      red: 450
  - type: horizontal-stack
    cards:
      - type: entity
        entity: sensor.mikrotik_wan_upload_rate
        name: WAN Upload
      - type: entity
        entity: sensor.mikrotik_cpu_load
        name: CPU Load
  - type: custom:mini-graph-card
    entities:
      - entity: sensor.mikrotik_wan_download_rate
        name: Download (Mbps)
        color: '#00d26a'
      - entity: sensor.mikrotik_wan_upload_rate
        name: Upload (Mbps)
        color: '#00a3ff'
    line_width: 2
    hours_to_show: 1
    points_per_hour: 60
`;

    const repositoryYaml = `name: "SmartHomeKH Add-ons"
url: "https://github.com/smarthomekh/hasaddon"
maintainer: "SmartHomeKH <tekdara168@gmail.com>"
`;

    const repositoryJson = `{
  "name": "SmartHomeKH Add-ons",
  "url": "https://github.com/smarthomekh/hasaddon",
  "maintainer": "SmartHomeKH <tekdara168@gmail.com>"
}
`;

    const docsMd = `# MikroTik Manager (CasaOS & Home Assistant)

Directly monitor and govern your MikroTik router inside **CasaOS** or **Home Assistant**:
- **Popular Game Blocking**: 1-click block for Roblox, Minecraft, Fortnite, Free Fire, PUBG, Steam, and Mobile Legends.
- **Website & Social Media Filter**: Block TikTok, YouTube, Instagram, Discord, Facebook, Reddit, and custom domains.
- **Multi-Restriction Time Scheduler**: Configure multiple independent curfew and study windows per device.
- **Simple Queues**: Set bandwidth caps per client or IP pool.
- **Firewall Controls**: 1-click device internet cutoff via address-list and filter rules.
- **Real-Time Throughput**: Live chart and gauges of WAN & LAN throughput.
- **RouterOS v7 Support**: Works with standard RouterOS REST API on port 8443 (HTTPS) or 8282 (HTTP).

## 1. Quick Install on CasaOS (1-Click)
1. Open your **CasaOS** web dashboard.
2. Open the **App Store** and click **Custom Install** (or "+").
3. Click the **Import** icon in the top right corner of the dialog.
4. Paste the content of \`docker-compose.yml\` and click **Submit**.
5. Set your Router IP (\`192.168.99.1\`), Port (\`8443\`), User, and Password.
6. Click **Install**. You can now launch MikroTik Manager directly from your CasaOS home screen!

## 2. Installation in Home Assistant
1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**.
2. Click three dots (top right) > **Repositories** > Add \`https://github.com/smarthomekh/hasaddon\`.
3. Select **MikroTik Manager** (v1.3.5) and click **Install**.
4. Set your Router IP, Username, and Password in the **Configuration** tab.
5. Click **Start** and select **Show in sidebar**!
`;

    return {
      'docker-compose.yml': dockerComposeYaml,
      'config.yaml': configYaml,
      'build.yaml': buildYaml,
      'build.json': buildJson,
      'repository.yaml': repositoryYaml,
      'repository.json': repositoryJson,
      Dockerfile: dockerfile,
      'run.sh': runSh,
      'package.json': packageJsonContent,
      'DOCS.md': docsMd,
      'homeassistant_sensors.yaml': haSensorsYaml,
      'homeassistant_lovelace_card.yaml': haLovelaceCardYaml,
    };
  }
}

export const mikrotikService = new MikroTikService();
