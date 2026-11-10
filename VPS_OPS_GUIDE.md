# VPS Master Guide — Right Stay Africa Ops CMS

Guide for deploying and operating the Ops CMS on the production VPS.

| Item | Value |
|------|--------|
| Host | `209.38.75.64` |
| SSH user | `richard` |
| App directory | `/var/www/ops` |
| Public URL | `https://ops.rightstayafrica.com` |
| PM2 process | `ops` |
| App bind | `127.0.0.1:3005` (nginx proxies HTTPS → this) |
| Git remote | `https://github.com/HanSolo4203/right-stay-africa-cms.git` |
| Branch | `main` |
| Node | v20.x |
| Package manager | npm |

---

## 1. SSH in

```bash
ssh richard@209.38.75.64
cd /var/www/ops
```

---

## 2. Standard deploy (use GitHub `main`)

After code is pushed to GitHub, on the VPS:

```bash
cd /var/www/ops

# Match GitHub exactly (discards local-only commits/changes in the repo)
git fetch origin
git reset --hard origin/main

# Install deps if package.json / lockfile changed
npm ci

# Production build (VPS needs extra Node heap or build OOMs / crawls)
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Restart with refreshed env
pm2 restart ops --update-env
pm2 status
```

One-liner after `git reset --hard origin/main`:

```bash
cd /var/www/ops && npm ci && NODE_OPTIONS=--max-old-space-size=4096 npm run build && pm2 restart ops --update-env
```

### Why `NODE_OPTIONS=--max-old-space-size=4096`?

`next build` is heavy. On this droplet:

- Default / `1024` often hangs or dies with **heap out of memory**
- `4096` is the reliable setting
- Expect **~4–6+ minutes** on `Creating an optimized production build ...` — that is normal

### Prefer GitHub over local VPS commits?

If `git pull` complains about divergent branches:

```bash
git fetch origin
git reset --hard origin/main
```

Do **not** rely on `git pull` until you decide merge vs rebase. For this server, **hard reset to origin** is the intended workflow.

---

## 3. PM2 cheatsheet

```bash
pm2 status
pm2 restart ops --update-env   # always use --update-env after .env changes
pm2 logs ops                   # live logs
pm2 logs ops --lines 100       # last 100 lines
pm2 logs ops --lines 200 | grep -E 'uplisting|error|Error'
pm2 describe ops
pm2 flush                      # clear old log files (optional)
```

App must stay named **`ops`**, started as:

```text
next start -p 3005 -H 127.0.0.1
```

If the process is missing:

```bash
cd /var/www/ops
pm2 start node_modules/next/dist/bin/next --name ops -- start -p 3005 -H 127.0.0.1
pm2 save
```

Other PM2 apps on this host (do not confuse them):

| Name | Role |
|------|------|
| `ops` | This CMS (`ops.rightstayafrica.com`) |
| `rightstay` | Separate app |
| `rslexpress` | Separate app (often stopped) |

---

## 4. Environment files

### Where they live

```bash
cd /var/www/ops
ls -la .env*
```

| File | Purpose |
|------|---------|
| `.env` | Base production secrets |
| `.env.local` | Local overrides (Next loads this and it **overrides** `.env`) |

During build you should see something like:

```text
Environments: .env.local, .env
```

Next.js does **not** auto-load a file named `.env.prod`. Use `.env` / `.env.local` / `.env.production`.

### Edit env

```bash
cd /var/www/ops
nano .env.local
# or
nano .env
```

After editing:

1. Rebuild if you changed any `NEXT_PUBLIC_*` variable (those are baked in at build time)
2. Always restart PM2 with `--update-env`

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
pm2 restart ops --update-env
```

### Required variables (Ops CMS)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # service_role JWT (eyJ...), NOT the anon key

# Uplisting
UPLISTING_API_KEY=                  # Connect → API
UPLISTING_WEBHOOK_SECRET=           # Connect → Webhooks (UUID), NOT the API key
UPLISTING_WEBHOOK_TOKEN=            # Query-token auth on /api/uplisting/webhook?token=…
UPLISTING_WEBHOOK_DEBUG=false       # true = log headers + truncated body (temporary)
# UPLISTING_API_URL=https://connect.uplisting.io   # optional

# Sync button protection (must match each other)
SYNC_SECRET=
NEXT_PUBLIC_SYNC_SECRET=

# Public site URL
NEXT_PUBLIC_APP_URL=https://ops.rightstayafrica.com
```

**After any `.env` / `.env.local` change:** rebuild and restart so Next.js + pm2 pick up the new values:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
pm2 restart ops --update-env
```

### Tips / common mistakes

- No stray spaces; avoid wrapping values in quotes unless needed
- `SUPABASE_SERVICE_ROLE_KEY` must be the long `eyJ...` **service_role** key  
  If sync shows `Listing …: Invalid API key`, this key is wrong/overridden
- `UPLISTING_WEBHOOK_SECRET` must be a valid UUID shape `8-4-4-4-12`
- Set a strong random `UPLISTING_WEBHOOK_TOKEN` and re-register hooks (`POST /api/uplisting/hooks`) so the URL includes `?token=…`
- `.env.local` wins over `.env` — a bad value in `.env.local` breaks prod even if `.env` is correct

### Quick sanity checks (do not paste secrets into chat)

```bash
# Confirm keys exist (names only)
grep -E '^[A-Z_]+=' .env .env.local | cut -d= -f1 | sort -u

# Webhook secret UUID shape (lengths only)
python3 - <<'PY'
from pathlib import Path
import re
for f in [".env", ".env.local"]:
    p = Path(f)
    if not p.exists():
        continue
    m = re.search(r"^UPLISTING_WEBHOOK_SECRET=(.*)$", p.read_text(), re.M)
    if not m:
        print(f, "MISSING")
        continue
    v = m.group(1).strip().strip('"').strip("'")
    print(f, [len(x) for x in v.split("-")], "ok" if [len(x) for x in v.split("-")] == [8,4,4,4,12] else "BAD_SHAPE")
PY
```

---

## 5. Nginx

### Config path

```bash
sudo nano /etc/nginx/sites-enabled/ops.rightstayafrica.com
# or
sudo nano /etc/nginx/sites-available/ops.rightstayafrica.com
```

Site files on this host:

- `ops.rightstayafrica.com` ← this app
- `rightstay`
- `rslexpress`
- `default`

### Recommended proxy timeouts (long Sync Now / API jobs)

Inside `location /`:

```nginx
proxy_pass http://127.0.0.1:3005;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_connect_timeout 60s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

Apply:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

A prepared copy may also exist at `/tmp/ops.rightstayafrica.com.nginx` after earlier deploys:

```bash
sudo cp /tmp/ops.rightstayafrica.com.nginx /etc/nginx/sites-enabled/ops.rightstayafrica.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Uplisting webhook & API checks

### Webhook URL (must be registered in Uplisting)

With token auth (recommended):

```text
https://ops.rightstayafrica.com/api/uplisting/webhook?token=YOUR_UPLISTING_WEBHOOK_TOKEN
```

Events: `booking_created`, `booking_updated`, `booking_removed`

Uplisting does **not** receive the signing secret at registration — only `target_url` + `event`.  
Auth on delivery is either HMAC (`UPLISTING_WEBHOOK_SECRET` + signature headers) **or** the `?token=` query param.

### List / re-register hooks via the app

```bash
# List what Uplisting currently has + the URL we would register
curl -sS -X GET http://127.0.0.1:3005/api/uplisting/hooks \
  -H "x-sync-secret: YOUR_SYNC_SECRET"

# Delete matching hooks and recreate with the tokenized URL
curl -sS -X POST http://127.0.0.1:3005/api/uplisting/hooks \
  -H "x-sync-secret: YOUR_SYNC_SECRET"
```

### List registered hooks (Uplisting auth quirk)

Uplisting expects **Basic auth of the raw API key only** (no `username:password` colon form). Prefer:

```bash
curl -s -H "Authorization: Basic $(printf '%s' 'YOUR_UPLISTING_API_KEY' | base64)" \
  https://connect.uplisting.io/hooks
```

Avoid:

```bash
curl -u "YOUR_API_KEY" ...     # prompts for password, often fails
```

### Watch webhook traffic

```bash
pm2 logs ops --lines 200 | grep uplisting-webhook
```

Healthy booking delivery looks like:

```text
[uplisting-webhook] hit … auth=token_ok
[uplisting-webhook] accepted booking_created booking=… property=…
[uplisting-webhook] upserted booking=…
```

Rejected traffic (should be rare after token registration):

```text
[uplisting-webhook] auth failed (no_signature_header; token_query_missing)
```

Enable temporary diagnostics with `UPLISTING_WEBHOOK_DEBUG=true`, rebuild/restart, then grep for `debug headers=` / `debug body=`.

### Manual sync from the UI

1. Open `https://ops.rightstayafrica.com/settings/uplisting`
2. Click **Sync Now** (listings, then per-property bookings)
3. Or use **Sync Bookings** on one property row

Requires `SYNC_SECRET` / `NEXT_PUBLIC_SYNC_SECRET` to match.

### Curl sync (server-side)

```bash
cd /var/www/ops
# load SYNC_SECRET from env file yourself, then:
curl -sS -X POST http://127.0.0.1:3005/api/uplisting/sync \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: YOUR_SYNC_SECRET" \
  -d '{"scope":"listings"}'
```

Scopes: `listings` | `bookings` | `all`

### Safety-net cron (every 15 minutes)

Re-runs the same bookings sync as the UI for all linked properties:

```bash
curl -sS -X GET 'http://127.0.0.1:3005/api/uplisting/cron' \
  -H "x-sync-secret: YOUR_SYNC_SECRET"
```

Crontab on the VPS (as the deploy user):

```cron
*/15 * * * * curl -sS -X GET 'http://127.0.0.1:3005/api/uplisting/cron' -H "x-sync-secret: YOUR_SYNC_SECRET" >> /var/log/uplisting-cron.log 2>&1
```

Replace `YOUR_SYNC_SECRET` with the real value from `.env.local`. Prefer localhost so the secret never crosses the public internet.

---

## 7. Logs & debugging

```bash
# App logs
pm2 logs ops --lines 100

# Uplisting only
pm2 logs ops --lines 300 | grep -iE 'uplisting|Invalid API|webhook'

# Nginx access/error (needs sudo)
sudo tail -n 100 /var/log/nginx/access.log
sudo tail -n 100 /var/log/nginx/error.log

# Is the app listening?
ss -lntp | grep 3005
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3005/login
```

### Common failures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Build hangs / OOM | Heap too small | `NODE_OPTIONS=--max-old-space-size=4096` |
| Sync: `Invalid API key` on every listing | Bad `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` | Fix service_role JWT, rebuild, restart |
| Sync: Safari “string did not match pattern” | Proxy timeout / non-JSON response | Raise nginx timeouts; use current Sync Now (scoped) |
| Webhooks never appear | Hook URL wrong / secret mismatch / disabled hook | Check hooks list + `UPLISTING_WEBHOOK_SECRET` |
| `git pull` divergent | Local VPS history ≠ GitHub | `git fetch && git reset --hard origin/main` |
| Env change ignored | Forgot rebuild and/or `--update-env` | Rebuild + `pm2 restart ops --update-env` |

---

## 8. Disk / Node housekeeping (optional)

```bash
df -h
cd /var/www/ops
rm -rf .next/cache   # optional; next build recreates
npm cache clean --force   # only if installs are corrupted
```

---

## 9. Full checklist (copy/paste)

```bash
ssh richard@209.38.75.64

cd /var/www/ops
git fetch origin
git reset --hard origin/main
npm ci

# Edit secrets if needed
# nano .env.local

export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
pm2 restart ops --update-env
pm2 status
pm2 logs ops --lines 50
```

Then open:

- App: https://ops.rightstayafrica.com  
- Uplisting settings: https://ops.rightstayafrica.com/settings/uplisting  
- Updates feed: https://ops.rightstayafrica.com/updates  

---

## 10. Security notes

- Never commit `.env` / `.env.local`
- Do not paste API keys, service role keys, or webhook secrets into chat/tickets
- Rotate Uplisting + Supabase keys if they were exposed
- Prefer editing env on the server over copying secrets into git history
