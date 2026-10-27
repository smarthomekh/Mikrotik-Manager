# MikroTik Manager (CasaOS & Home Assistant)

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
4. Paste the content of `docker-compose.yml` and click **Submit**.
5. Set your Router IP (`192.168.99.1`), Port (`8443`), User, and Password.
6. Click **Install**. You can now launch MikroTik Manager directly from your CasaOS home screen!

## 2. Installation in Home Assistant
1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**.
2. Click three dots (top right) > **Repositories** > Add `https://github.com/smarthomecomkh/hasaddon`.
3. Select **MikroTik Manager** (v1.3.5) and click **Install**.
4. Set your Router IP, Username, and Password in the **Configuration** tab.
5. Click **Start** and select **Show in sidebar**!
