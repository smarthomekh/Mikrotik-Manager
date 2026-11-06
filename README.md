# MikroTik Manager (Home Assistant add-on)

Manage a MikroTik RouterOS v7 router from Home Assistant: simple queues, per-device speed limits,
time schedules, firewall rules, client blocking, and game / website filtering. Talks to the router
through the RouterOS REST API (`www` / `www-ssl` service).

## Install (Home Assistant)
1. Settings > Add-ons > Add-on Store > ⋮ > Repositories, add this repository's URL.
2. Install **MikroTik Manager**, set `router_host`, `router_port`, `router_user`, `router_password`.
3. Start it and enable "Show in sidebar".

## Router user
Create a dedicated RouterOS user instead of using `admin`:

```
/user group add name=ha-manager policy=read,write,api,rest-api,test,policy,sensitive
/user add name=ha-manager group=ha-manager password=<strong password>
```

Editing schedulers that were created with broader policies needs a group that has those policies too.

## Security notes
- The web UI has **no login of its own**. In Home Assistant it is only reachable through Ingress
  (Home Assistant authentication). If you run the Docker image standalone (CasaOS, `docker-compose.yml`),
  anyone who can reach port 3000 can control your router, so keep it on a trusted LAN or behind a
  reverse proxy with authentication.
- The router password is stored in `/data/config.json` (file mode 600) inside the add-on's private data volume.
- Prefer the HTTPS service (`use_ssl: true`) and turn off `allow_insecure_cert` once the router has a valid certificate.

## Develop
```
npm install
npm run dev     # http://localhost:3000
npm run build
```
