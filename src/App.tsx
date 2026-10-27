import React, { useEffect, useState } from 'react';
import { ClientsTab } from './components/ClientsTab.tsx';
import { ContentFilterModal } from './components/ContentFilterModal.tsx';
import { ContentFilterTab } from './components/ContentFilterTab.tsx';
import { DeviceSpeedModal } from './components/DeviceSpeedModal.tsx';
import { FirewallRuleModal } from './components/FirewallRuleModal.tsx';
import { FirewallTab } from './components/FirewallTab.tsx';
import { Header } from './components/Header.tsx';
import { HomeAssistantTab } from './components/HomeAssistantTab.tsx';
import { MultiScheduleModal } from './components/MultiScheduleModal.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';
import { QueueModal } from './components/QueueModal.tsx';
import { QueuesTab } from './components/QueuesTab.tsx';
import { RouterConfigModal } from './components/RouterConfigModal.tsx';
import { ScheduleModal } from './components/ScheduleModal.tsx';
import { SchedulesTab } from './components/SchedulesTab.tsx';
import type {
  AddressListEntry,
  ClientDevice,
  FirewallFilterRule,
  InterfaceTraffic,
  NatRule,
  RestrictionTimeSlot,
  RouterConnectionConfig,
  RouterInfo,
  RouterSchedule,
  SimpleQueue,
  ThroughputHistoryPoint,
} from './types/mikrotik.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  // Router & Network Data State
  const [routerInfo, setRouterInfo] = useState<RouterInfo | null>(null);
  const [routerConfig, setRouterConfig] = useState<RouterConnectionConfig | null>(null);
  const [interfaces, setInterfaces] = useState<InterfaceTraffic[]>([]);
  const [wanInterface, setWanInterface] = useState<InterfaceTraffic | null>(null);
  const [throughputHistory, setThroughputHistory] = useState<ThroughputHistoryPoint[]>([]);
  const [clients, setClients] = useState<ClientDevice[]>([]);
  const [queues, setQueues] = useState<SimpleQueue[]>([]);
  const [schedules, setSchedules] = useState<RouterSchedule[]>([]);
  const [firewallRules, setFirewallRules] = useState<FirewallFilterRule[]>([]);
  const [addressLists, setAddressLists] = useState<AddressListEntry[]>([]);
  const [natRules, setNatRules] = useState<NatRule[]>([]);
  const [panicActive, setPanicActive] = useState(false);
  const [haFiles, setHaFiles] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speedModalDevice, setSpeedModalDevice] = useState<ClientDevice | null>(null);
  const [multiScheduleDevice, setMultiScheduleDevice] = useState<ClientDevice | null>(null);
  const [filterModalDevice, setFilterModalDevice] = useState<ClientDevice | null>(null);
  const [queueModalData, setQueueModalData] = useState<SimpleQueue | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [scheduleModalData, setScheduleModalData] = useState<RouterSchedule | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isFirewallModalOpen, setIsFirewallModalOpen] = useState(false);

  // Fetch live throughput every 1 second
  useEffect(() => {
    const fetchThroughput = async () => {
      try {
        const res = await fetch('/api/throughput');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setWanInterface(data.wan);
            setInterfaces(data.interfaces || []);
            setThroughputHistory(data.history || []);
          }
        }
      } catch (err) {
        console.error('Failed to poll throughput:', err);
      }
    };

    fetchThroughput();
    const interval = setInterval(fetchThroughput, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all core router entities
  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      const [statusRes, clientsRes, queuesRes, schedulesRes, fwRes, haRes] =
        await Promise.all([
          fetch('/api/status').then((r) => r.json()),
          fetch('/api/clients').then((r) => r.json()),
          fetch('/api/queues').then((r) => r.json()),
          fetch('/api/schedules').then((r) => r.json()),
          fetch('/api/firewall').then((r) => r.json()),
          fetch('/api/ha/package').then((r) => r.json()),
        ]);

      if (statusRes?.success) {
        setRouterInfo(statusRes.info);
        setRouterConfig(statusRes.config);
      }
      if (clientsRes?.success) setClients(clientsRes.clients);
      if (queuesRes?.success) setQueues(queuesRes.queues);
      if (schedulesRes?.success) setSchedules(schedulesRes.schedules);
      if (fwRes?.success) {
        setFirewallRules(fwRes.filter || []);
        setAddressLists(fwRes.address_lists || []);
        setNatRules(fwRes.nat || []);
        setPanicActive(Boolean(fwRes.killswitch_active));
      }
      if (haRes?.success) setHaFiles(haRes.files || {});
    } catch (err) {
      console.error('Failed to load router data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Actions: Clients Block & Speed
  const handleBlockClient = async (ip: string, block: boolean) => {
    try {
      const res = await fetch(`/api/clients/${ip}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block }),
      });
      const data = await res.json();
      if (data.success) {
        setClients((prev) =>
          prev.map((c) =>
            c.ip_address === ip ? { ...c, is_blocked: block, status: block ? 'blocked' : 'active' } : c
          )
        );
        const fwRes = await fetch('/api/firewall').then((r) => r.json());
        if (fwRes?.success) setAddressLists(fwRes.address_lists || []);
      }
    } catch (err) {
      console.error('Failed to block client:', err);
    }
  };

  const handleSaveSpeed = async (ip: string, maxDownload: string, maxUpload: string) => {
    try {
      const res = await fetch(`/api/clients/${ip}/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDownload, maxUpload }),
      });
      const data = await res.json();
      if (data.success) {
        setClients((prev) =>
          prev.map((c) =>
            c.ip_address === ip
              ? { ...c, max_download_limit: maxDownload, max_upload_limit: maxUpload }
              : c
          )
        );
        const qRes = await fetch('/api/queues').then((r) => r.json());
        if (qRes?.success) setQueues(qRes.queues);
      }
    } catch (err) {
      console.error('Failed to set speed limit:', err);
    }
  };

  // Actions: Multiple Restriction Time Slots
  const handleSaveClientSchedules = async (ip: string, schedules: RestrictionTimeSlot[]) => {
    try {
      const res = await fetch(`/api/clients/${ip}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules }),
      });
      const data = await res.json();
      if (data.success) {
        setClients((prev) =>
          prev.map((c) => (c.ip_address === ip ? { ...c, schedules } : c))
        );
      }
    } catch (err) {
      console.error('Failed to save client schedules:', err);
    }
  };

  // Actions: Games & Website Filtering
  const handleSaveClientGames = async (ip: string, games: string[]) => {
    try {
      const res = await fetch(`/api/clients/${ip}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games }),
      });
      const data = await res.json();
      if (data.success) {
        setClients((prev) =>
          prev.map((c) => (c.ip_address === ip ? { ...c, blocked_games: games } : c))
        );
        // Refresh firewall rules to reflect RouterOS tls-host drop rules
        const fwRes = await fetch('/api/firewall').then((r) => r.json());
        if (fwRes?.success) setFirewallRules(fwRes.filter || []);
      }
    } catch (err) {
      console.error('Failed to save client games filter:', err);
    }
  };

  const handleSaveClientWebsites = async (
    ip: string,
    websites: string[],
    customDomains: string[]
  ) => {
    try {
      const res = await fetch(`/api/clients/${ip}/websites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websites, customDomains }),
      });
      const data = await res.json();
      if (data.success) {
        setClients((prev) =>
          prev.map((c) =>
            c.ip_address === ip
              ? { ...c, blocked_websites: websites, custom_blocked_domains: customDomains }
              : c
          )
        );
        const fwRes = await fetch('/api/firewall').then((r) => r.json());
        if (fwRes?.success) setFirewallRules(fwRes.filter || []);
      }
    } catch (err) {
      console.error('Failed to save client websites filter:', err);
    }
  };

  const handleQuickToggleGlobalGame = async (gameId: string, block: boolean) => {
    // Apply to target client devices (excluding router/servers)
    const targetClients = clients.filter((c) => !c.hostname.includes('HomeAssistant'));
    for (const client of targetClients) {
      const current = client.blocked_games || [];
      const updated = block
        ? Array.from(new Set([...current, gameId]))
        : current.filter((g) => g !== gameId);
      await handleSaveClientGames(client.ip_address, updated);
    }
  };

  const handleQuickToggleGlobalWebsite = async (websiteId: string, block: boolean) => {
    const targetClients = clients.filter((c) => !c.hostname.includes('HomeAssistant'));
    for (const client of targetClients) {
      const current = client.blocked_websites || [];
      const updated = block
        ? Array.from(new Set([...current, websiteId]))
        : current.filter((w) => w !== websiteId);
      await handleSaveClientWebsites(client.ip_address, updated, client.custom_blocked_domains || []);
    }
  };

  const handleUpdateAlias = async (ip: string, alias: string) => {
    try {
      const res = await fetch(`/api/clients/${ip}/alias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias }),
      });
      const data = await res.json();
      if (data.success) {
        setClients((prev) =>
          prev.map((c) => (c.ip_address === ip ? { ...c, alias } : c))
        );
      }
    } catch (err) {
      console.error('Failed to update alias:', err);
    }
  };

  // Actions: Panic Killswitch
  const handleTogglePanic = async () => {
    const nextState = !panicActive;
    try {
      const res = await fetch('/api/firewall/killswitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setPanicActive(nextState);
        const fwRes = await fetch('/api/firewall').then((r) => r.json());
        if (fwRes?.success) setFirewallRules(fwRes.filter || []);
      }
    } catch (err) {
      console.error('Failed to toggle panic killswitch:', err);
    }
  };

  // Actions: Queues
  const handleSaveQueue = async (queueData: Partial<SimpleQueue>) => {
    try {
      if (queueModalData?.id) {
        const res = await fetch(`/api/queues/${queueModalData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queueData),
        });
        const data = await res.json();
        if (data.success) {
          setQueues((prev) => prev.map((q) => (q.id === data.queue.id ? data.queue : q)));
        }
      } else {
        const res = await fetch('/api/queues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queueData),
        });
        const data = await res.json();
        if (data.success) {
          setQueues((prev) => [...prev, data.queue]);
        }
      }
    } catch (err) {
      console.error('Failed to save queue:', err);
    }
  };

  const handleToggleQueue = async (id: string, disabled: boolean) => {
    try {
      const res = await fetch(`/api/queues/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled }),
      });
      const data = await res.json();
      if (data.success) {
        setQueues((prev) => prev.map((q) => (q.id === id ? { ...q, disabled } : q)));
      }
    } catch (err) {
      console.error('Failed to toggle queue:', err);
    }
  };

  const handleDeleteQueue = async (id: string) => {
    try {
      const res = await fetch(`/api/queues/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setQueues((prev) => prev.filter((q) => q.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete queue:', err);
    }
  };

  // Actions: System Schedules
  const handleSaveRouterSchedule = async (schData: Partial<RouterSchedule>) => {
    try {
      if (scheduleModalData?.id) {
        const res = await fetch(`/api/schedules/${scheduleModalData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schData),
        });
        const data = await res.json();
        if (data.success) {
          setSchedules((prev) => prev.map((s) => (s.id === data.schedule.id ? data.schedule : s)));
        }
      } else {
        const res = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schData),
        });
        const data = await res.json();
        if (data.success) {
          setSchedules((prev) => [...prev, data.schedule]);
        }
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
  };

  const handleToggleRouterSchedule = async (id: string, disabled: boolean) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled }),
      });
      const data = await res.json();
      if (data.success) {
        setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, disabled } : s)));
      }
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  };

  const handleDeleteRouterSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === id ? { ...s, run_count: s.run_count + 1 } : s))
        );
      }
    } catch (err) {
      console.error('Failed to run schedule:', err);
    }
  };

  // Actions: Firewall Filter Rules
  const handleSaveFirewallRule = async (ruleData: Partial<FirewallFilterRule>) => {
    try {
      const res = await fetch('/api/firewall/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });
      const data = await res.json();
      if (data.success) {
        setFirewallRules((prev) => [...prev, data.rule]);
      }
    } catch (err) {
      console.error('Failed to add firewall rule:', err);
    }
  };

  const handleToggleFirewallRule = async (id: string, disabled: boolean) => {
    try {
      const res = await fetch(`/api/firewall/filter/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled }),
      });
      const data = await res.json();
      if (data.success) {
        setFirewallRules((prev) => prev.map((r) => (r.id === id ? { ...r, disabled } : r)));
      }
    } catch (err) {
      console.error('Failed to toggle firewall rule:', err);
    }
  };

  const handleDeleteFirewallRule = async (id: string) => {
    try {
      const res = await fetch(`/api/firewall/filter/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFirewallRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete firewall rule:', err);
    }
  };

  const handleRemoveAddressListEntry = async (id: string) => {
    setAddressLists((prev) => prev.filter((a) => a.id !== id));
  };

  // Actions: Router Configuration
  const handleSaveConfig = async (newCfg: Partial<RouterConnectionConfig>) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCfg),
    });
    const data = await res.json();
    if (data.success) {
      setRouterConfig(data.config);
      loadAllData();
    }
  };

  const handleTestConnection = async (testCfg: Partial<RouterConnectionConfig>) => {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCfg),
    });
    return await res.json();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        routerInfo={routerInfo}
        config={routerConfig}
        panicActive={panicActive}
        onTogglePanic={handleTogglePanic}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={loadAllData}
        isRefreshing={isRefreshing}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            routerInfo={routerInfo}
            interfaces={interfaces}
            wanInterface={wanInterface}
            history={throughputHistory}
            clients={clients}
            queues={queues}
            panicActive={panicActive}
            onTogglePanic={handleTogglePanic}
            onBlockClient={handleBlockClient}
            onOpenSpeedModal={(device) => setSpeedModalDevice(device)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsTab
            clients={clients}
            onBlockClient={handleBlockClient}
            onOpenSpeedModal={(device) => setSpeedModalDevice(device)}
            onOpenMultiScheduleModal={(device) => setMultiScheduleDevice(device)}
            onOpenFilterModal={(device) => setFilterModalDevice(device)}
            onUpdateAlias={handleUpdateAlias}
          />
        )}

        {activeTab === 'filters' && (
          <ContentFilterTab
            clients={clients}
            onOpenFilterModal={(device) => setFilterModalDevice(device)}
            onOpenMultiScheduleModal={(device) => setMultiScheduleDevice(device)}
            onQuickToggleGlobalGame={handleQuickToggleGlobalGame}
            onQuickToggleGlobalWebsite={handleQuickToggleGlobalWebsite}
          />
        )}

        {activeTab === 'queues' && (
          <QueuesTab
            queues={queues}
            onOpenCreateQueue={() => {
              setQueueModalData(null);
              setIsQueueModalOpen(true);
            }}
            onOpenEditQueue={(queue) => {
              setQueueModalData(queue);
              setIsQueueModalOpen(true);
            }}
            onToggleQueue={handleToggleQueue}
            onDeleteQueue={handleDeleteQueue}
          />
        )}

        {activeTab === 'firewall' && (
          <FirewallTab
            filterRules={firewallRules}
            addressLists={addressLists}
            natRules={natRules}
            panicActive={panicActive}
            onTogglePanic={handleTogglePanic}
            onOpenCreateRule={() => setIsFirewallModalOpen(true)}
            onToggleRule={handleToggleFirewallRule}
            onDeleteRule={handleDeleteFirewallRule}
            onRemoveAddressListEntry={handleRemoveAddressListEntry}
          />
        )}

        {activeTab === 'schedules' && (
          <SchedulesTab
            schedules={schedules}
            onOpenCreateSchedule={() => {
              setScheduleModalData(null);
              setIsScheduleModalOpen(true);
            }}
            onOpenEditSchedule={(sch) => {
              setScheduleModalData(sch);
              setIsScheduleModalOpen(true);
            }}
            onToggleSchedule={handleToggleRouterSchedule}
            onDeleteSchedule={handleDeleteRouterSchedule}
            onRunScheduleNow={handleRunScheduleNow}
          />
        )}

        {activeTab === 'homeassistant' && (
          <HomeAssistantTab files={haFiles} routerConfig={routerConfig} />
        )}
      </main>

      {/* Modals */}
      {routerConfig && (
        <RouterConfigModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={routerConfig}
          onSave={handleSaveConfig}
          onTest={handleTestConnection}
          onSwitchToSimulator={() => loadAllData()}
        />
      )}

      <DeviceSpeedModal
        device={speedModalDevice}
        isOpen={Boolean(speedModalDevice)}
        onClose={() => setSpeedModalDevice(null)}
        onSaveSpeed={handleSaveSpeed}
      />

      <MultiScheduleModal
        device={multiScheduleDevice}
        isOpen={Boolean(multiScheduleDevice)}
        onClose={() => setMultiScheduleDevice(null)}
        onSaveSchedules={handleSaveClientSchedules}
      />

      <ContentFilterModal
        device={filterModalDevice}
        isOpen={Boolean(filterModalDevice)}
        onClose={() => setFilterModalDevice(null)}
        onSaveGames={handleSaveClientGames}
        onSaveWebsites={handleSaveClientWebsites}
      />

      <QueueModal
        queue={queueModalData}
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        onSave={handleSaveQueue}
      />

      <ScheduleModal
        schedule={scheduleModalData}
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSave={handleSaveRouterSchedule}
      />

      <FirewallRuleModal
        isOpen={isFirewallModalOpen}
        onClose={() => setIsFirewallModalOpen(false)}
        onSave={handleSaveFirewallRule}
      />
    </div>
  );
}
