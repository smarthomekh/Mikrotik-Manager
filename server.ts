import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { mikrotikService } from './server/mikrotik-service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  app.use(express.json());

  // --- Router connection settings -------------------------------------------------------------
  // Precedence: add-on options are the defaults; settings saved from the web UI win over them,
  // unless the add-on options were edited in Home Assistant since the UI save (then options win).
  const CONFIG_FILE_CANDIDATES = ['/data/config.json', path.resolve(process.cwd(), 'data', 'config.json')];
  const isMasked = (v: any) => typeof v === 'string' && /^[\u2022*]+$/.test(v);

  let savedConfig: any = null;
  for (const cp of CONFIG_FILE_CANDIDATES) {
    if (fs.existsSync(cp)) {
      try {
        savedConfig = JSON.parse(fs.readFileSync(cp, 'utf-8'));
        console.log(`[MikroTik Manager] Loaded saved router configuration from ${cp}`);
        break;
      } catch (err) {
        console.warn(`[MikroTik Manager] Could not parse ${cp}:`, err);
      }
    }
  }
  // A password saved by older versions was the masked placeholder; it is useless, drop it.
  if (savedConfig && isMasked(savedConfig.password)) delete savedConfig.password;

  const HA_OPTIONS_PATH = '/data/options.json';
  let haOptions: any = null;
  if (fs.existsSync(HA_OPTIONS_PATH)) {
    try {
      haOptions = JSON.parse(fs.readFileSync(HA_OPTIONS_PATH, 'utf-8'));
      console.log('[Home Assistant] Found options.json at /data/options.json');
    } catch (e) {
      console.warn('[Home Assistant] Failed to read /data/options.json:', e);
    }
  }

  const optionsConfig: any = {};
  if (haOptions) {
    if (haOptions.router_host) optionsConfig.host = String(haOptions.router_host);
    if (haOptions.router_port) optionsConfig.port = Number(haOptions.router_port);
    if (haOptions.router_user) optionsConfig.username = String(haOptions.router_user);
    if (haOptions.router_password) optionsConfig.password = String(haOptions.router_password);
    if (haOptions.use_ssl !== undefined) optionsConfig.use_ssl = Boolean(haOptions.use_ssl);
    if (haOptions.allow_insecure_cert !== undefined) optionsConfig.allow_insecure_cert = Boolean(haOptions.allow_insecure_cert);
    if (haOptions.poll_interval) optionsConfig.poll_interval_ms = Number(haOptions.poll_interval);
  }
  const optionsSnapshot = JSON.stringify(optionsConfig);

  let mergedConfig: any = {};
  if (!savedConfig) {
    mergedConfig = { ...optionsConfig };
  } else if (haOptions && savedConfig.options_snapshot !== optionsSnapshot) {
    // Add-on options changed in Home Assistant after the last UI save -> they take priority
    mergedConfig = { ...savedConfig, ...optionsConfig };
  } else {
    mergedConfig = { ...optionsConfig, ...savedConfig };
  }
  delete mergedConfig.options_snapshot;

  if (process.env.ROUTER_HOST && !mergedConfig.host) {
    mergedConfig.host = process.env.ROUTER_HOST;
    if (process.env.ROUTER_PORT) mergedConfig.port = Number(process.env.ROUTER_PORT);
    if (process.env.ROUTER_USER) mergedConfig.username = process.env.ROUTER_USER;
    if (process.env.ROUTER_PASSWORD) mergedConfig.password = process.env.ROUTER_PASSWORD;
    if (process.env.USE_SSL !== undefined) mergedConfig.use_ssl = process.env.USE_SSL === 'true' || process.env.USE_SSL === '1';
  }

  if (mergedConfig.host) {
    console.log('[MikroTik Manager] Initializing router connection with:', {
      host: mergedConfig.host,
      port: mergedConfig.port,
      user: mergedConfig.username,
      use_ssl: mergedConfig.use_ssl,
    });
    await mikrotikService.setConfig({ ...mergedConfig, mode: 'real' });
  }

  const saveConfigToDisk = () => {
    const payload = JSON.stringify(
      { ...mikrotikService.getPersistableConfig(), options_snapshot: optionsSnapshot },
      null,
      2
    );
    for (const p of CONFIG_FILE_CANDIDATES) {
      try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        const tmp = `${p}.tmp`;
        fs.writeFileSync(tmp, payload, { encoding: 'utf-8', mode: 0o600 });
        fs.renameSync(tmp, p);
        return p; // stop at the first writable location - one source of truth
      } catch {
        // try next location
      }
    }
    throw new Error('Could not write config.json to /data or ./data');
  };

  // Support Home Assistant Ingress headers
  app.use((req, res, next) => {
    // When Home Assistant proxies via Ingress, it sets X-Ingress-Path
    const ingressPath = req.headers['x-ingress-path'] as string;
    if (ingressPath) {
      res.locals.ingressPath = ingressPath;
    }
    next();
  });

  // --- API Endpoints ---

  // Status & Telemetry
  app.get('/api/status', (req, res) => {
    try {
      const info = mikrotikService.getRouterInfo();
      const config = mikrotikService.getConfig();
      res.json({ success: true, info, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/config', (req, res) => {
    res.json({ success: true, config: mikrotikService.getConfig() });
  });

  app.post('/api/config', async (req, res) => {
    try {
      const updated = await mikrotikService.setConfig(req.body);
      saveConfigToDisk();
      await mikrotikService.refreshNow();
      res.json({ success: true, config: mikrotikService.getConfig() || updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/test-connection', async (req, res) => {
    try {
      const result = await mikrotikService.testConnection(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Live Throughput, Interfaces, Clients & Telemetry
  app.get('/api/throughput', (req, res) => {
    try {
      const interfaces = mikrotikService.getInterfaces();
      const wan = interfaces.find((i) => i.is_wan) || interfaces[0];
      const history = mikrotikService.getThroughputHistory();
      const clients = mikrotikService.getClients();
      const queues = mikrotikService.getQueues();
      const status = mikrotikService.getRouterInfo();
      const config = mikrotikService.getConfig();

      res.json({
        success: true,
        wan,
        interfaces,
        history,
        clients,
        queues,
        status,
        config,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Connected Devices (DHCP / ARP / Users)
  app.get('/api/clients', (req, res) => {
    try {
      const clients = mikrotikService.getClients();
      res.json({ success: true, clients });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/clients/:ip/block', async (req, res) => {
    try {
      const { block } = req.body;
      const client = await mikrotikService.blockClient(req.params.ip, Boolean(block));
      res.json({ success: true, client });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/clients/:ip/speed', async (req, res) => {
    try {
      const { maxDownload, maxUpload } = req.body;
      const result = await mikrotikService.setClientSpeedLimit(req.params.ip, maxDownload, maxUpload);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/clients/:ip/schedules', async (req, res) => {
    try {
      const { schedules } = req.body;
      const client = await mikrotikService.setClientSchedules(req.params.ip, schedules);
      res.json({ success: true, client });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/clients/:ip/games', async (req, res) => {
    try {
      const { games } = req.body;
      const client = await mikrotikService.setClientBlockedGames(req.params.ip, games || []);
      res.json({ success: true, client });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/clients/:ip/websites', async (req, res) => {
    try {
      const { websites, customDomains } = req.body;
      const client = await mikrotikService.setClientBlockedWebsites(
        req.params.ip,
        websites || [],
        customDomains || []
      );
      res.json({ success: true, client });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/filter-catalog', (req, res) => {
    try {
      const catalog = mikrotikService.getFilterCatalog();
      res.json({ success: true, ...catalog });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/clients/:ip/alias', async (req, res) => {
    try {
      const { alias } = req.body;
      const client = await mikrotikService.setClientAlias(req.params.ip, alias);
      res.json({ success: true, client });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Simple Queues & QoS
  app.get('/api/queues', (req, res) => {
    try {
      const queues = mikrotikService.getQueues();
      res.json({ success: true, queues });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/queues', async (req, res) => {
    try {
      const queue = await mikrotikService.createQueue(req.body);
      res.json({ success: true, queue });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/queues/:id', async (req, res) => {
    try {
      const queue = await mikrotikService.updateQueue(req.params.id, req.body);
      res.json({ success: true, queue });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/queues/:id', async (req, res) => {
    try {
      const removed = await mikrotikService.deleteQueue(req.params.id);
      res.json({ success: true, removed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // RouterOS System Schedules
  app.get('/api/schedules', (req, res) => {
    try {
      const schedules = mikrotikService.getSchedules();
      res.json({ success: true, schedules });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/schedules', async (req, res) => {
    try {
      const schedule = await mikrotikService.createSchedule(req.body);
      res.json({ success: true, schedule });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/schedules/:id', async (req, res) => {
    try {
      const schedule = await mikrotikService.updateSchedule(req.params.id, req.body);
      res.json({ success: true, schedule });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/schedules/:id', async (req, res) => {
    try {
      const removed = await mikrotikService.deleteSchedule(req.params.id);
      res.json({ success: true, removed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/schedules/:id/run', async (req, res) => {
    try {
      const result = await mikrotikService.runScheduleNow(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Firewall & Address Lists
  app.get('/api/firewall', (req, res) => {
    try {
      const data = mikrotikService.getFirewallRules();
      res.json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/firewall/filter', async (req, res) => {
    try {
      const rule = await mikrotikService.createFirewallFilterRule(req.body);
      res.json({ success: true, rule });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/firewall/filter/:id', async (req, res) => {
    try {
      const rule = await mikrotikService.updateFirewallFilterRule(req.params.id, req.body);
      res.json({ success: true, rule });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/firewall/filter/:id', async (req, res) => {
    try {
      const removed = await mikrotikService.deleteFirewallFilterRule(req.params.id);
      res.json({ success: true, removed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/firewall/killswitch', async (req, res) => {
    try {
      const { active } = req.body;
      const result = await mikrotikService.togglePanicKillswitch(Boolean(active));
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/firewall/address-list/:id', async (req, res) => {
    try {
      const removed = await mikrotikService.deleteAddressListEntry(req.params.id);
      res.json({ success: true, removed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Home Assistant Add-on files & integration export
  app.get('/api/ha/package', (req, res) => {
    try {
      const files = mikrotikService.getHomeAssistantPackage();
      res.json({ success: true, files });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Complete self-contained add-on zip including compiled dist/ and all configs
  app.get('/api/ha/download-zip', async (req, res) => {
    try {
      const zip = new JSZip();
      const root = process.cwd();

      const addDirRecursive = (dirPath: string, zipFolder: any) => {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            (dirPath === root && entry.name === 'data') ||
            entry.name.startsWith('.env') ||
            entry.name === 'coverage'
          ) {
            continue;
          }
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            const sub = zipFolder.folder(entry.name);
            addDirRecursive(fullPath, sub);
          } else {
            zipFolder.file(entry.name, fs.readFileSync(fullPath));
          }
        }
      };

      addDirRecursive(root, zip);
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="mikrotik_manager_full_package.zip"');
      res.send(zipBuffer);
    } catch (err: any) {
      console.error('[Home Assistant] Failed to generate zip package:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Vite Dev Middleware or Production Static Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build
    const candidatePaths = [
      __dirname,
      path.resolve(__dirname, 'dist'),
      path.resolve(process.cwd(), 'dist'),
    ];
    const distPath = candidatePaths.find((p) => fs.existsSync(path.resolve(p, 'index.html'))) || path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (!fs.existsSync(indexPath)) {
        return res.status(404).send('Not Found');
      }
      const rawIngress = (req.headers['x-ingress-path'] as string) || '';
      const ingressPath = /^\/[A-Za-z0-9/_.\-]*$/.test(rawIngress) ? rawIngress.replace(/\/+$/, '') : '';
      if (ingressPath) {
        let html = fs.readFileSync(indexPath, 'utf-8');
        const injection = `<script>window.__INGRESS_PATH__ = "${ingressPath}";</script><base href="${ingressPath}/">`;
        html = html.replace('<head>', `<head>${injection}`);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
      res.sendFile(indexPath);
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[MikroTik Manager] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[MikroTik Manager] Failed to start server:', err);
  process.exit(1);
});
