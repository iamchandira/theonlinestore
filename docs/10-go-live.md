# 10 · Go-live runbook (VPS)

How to put The Online Store on a server, connect the domain, configure it from the admin, and keep it updated. Everything here was rehearsed on an empty database: migrations, production build, standalone server, first admin account, store settings, a product with photo upload, and a bank-transfer order with its email.

## 1. Branches

| Branch | What it is | Who uses it |
|---|---|---|
| `main` | Development: the store plus tests, seed/demo scripts, the test gateway and the styleguide | Developers |
| `production` | What the server runs. Built from `main` by `scripts/make-production.sh`, which removes everything that only exists for development and testing | The server |
| `launch-prep`, `sprint/*` | Short-lived work branches, merged into `main` | Developers |

**Release a new version** from the separate production folder, so the development copy keeps its test tools:

```bash
# once: git worktree add ../theonlinestore-production production
cd ../theonlinestore-production
git merge main          # conflicts in package.json, the lockfile or deleted test files are expected
./scripts/make-production.sh   # resolves those conflicts and strips dev-only files again
git add -A && git commit -m "Production: merge main"
git push origin production
```

Then on the server: `./deploy/deploy.sh` (section 5).

**Database changes:** whenever a collection or field changes on `main`, create a migration and commit it with the change:

```bash
pnpm payload migrate:create <short-name>
```

The server applies migrations in `deploy.sh` before every build. Never point the dev server (`pnpm dev`) at the production database: development mode rewrites the schema on its own.

## 2. Before you start (owner)

| Item | Why |
|---|---|
| A VPS: Ubuntu 24.04, 2 vCPU, 4 GB RAM, 80 GB SSD, in Singapore or Mumbai (e.g. DigitalOcean, Vultr, Linode, Hetzner, AWS Lightsail) | Runs the store and database |
| Access to the `theonlinestore.lk` DNS settings | To point the domain at the server |
| A private GitHub (or GitLab) repository for the code | The server pulls the `production` branch from it |
| An email-sending account (Zoho Mail, Amazon SES, Brevo or Resend) with SMTP details | Order emails, password resets |
| PayHere merchant account (Merchant ID + secret), and a Business App with Payment Refund permission (App ID + secret) | Card payments and refunds |
| Bank account details for bank transfer | Shown to shoppers |
| Off-site backup storage (Google Drive, Backblaze B2 or S3) | Copies of the nightly backups |

## 3. Set up the server (once)

Replace everything in `<…>`. `your-mac$` lines run on your computer, `root#` on the server as root, `store$` on the server as the app user.

**3.1 First login and updates**

```bash
your-mac$ ssh root@<server-ip>
root# apt update && apt -y upgrade && apt -y install ufw unattended-upgrades git curl
root# timedatectl set-timezone Asia/Colombo
root# dpkg-reconfigure -f noninteractive unattended-upgrades
```

**3.2 Firewall and swap** (the build needs more memory than 4 GB on its own)

```bash
root# ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
root# fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
root# echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**3.3 App user and folders**

```bash
root# adduser --disabled-password --gecos "" store
root# mkdir -p /home/store/.ssh && cp ~/.ssh/authorized_keys /home/store/.ssh/ && chown -R store:store /home/store/.ssh
root# mkdir -p /srv/theonlinestore/{uploads,backups,pgdata,image-cache,repo.git}
root# chown -R store:store /srv/theonlinestore
root# echo 'store ALL=(root) NOPASSWD: /usr/bin/systemctl restart theonlinestore' > /etc/sudoers.d/theonlinestore
```

**3.4 Software: Docker, Node 22, pnpm, Caddy**

```bash
root# curl -fsSL https://get.docker.com | sh && usermod -aG docker store
root# curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt -y install nodejs
root# npm install -g pnpm@12.8.1
root# apt -y install debian-keyring debian-archive-keyring apt-transport-https
root# curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
root# curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
root# apt update && apt -y install caddy
root# node -v && pnpm -v && docker -v && caddy version
```

**3.5 SSH hardening** (first check `ssh store@<server-ip>` works from your computer)

```bash
root# sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
root# systemctl restart ssh
```

**3.6 Send the code to the server** (a private Git repository on the server itself; nothing goes to a third party)

```bash
store$ git init --bare /srv/theonlinestore/repo.git

your-mac$ cd "<project>/theonlinestore-production"
your-mac$ git remote add server store@<server-ip>:/srv/theonlinestore/repo.git
your-mac$ git push server production

store$ git clone -b production /srv/theonlinestore/repo.git /srv/theonlinestore/app
```

(If you use a private GitHub repository instead, push `production` there and clone from it; `deploy.sh` pulls from `origin` either way.)

**3.7 Settings file**

```bash
store$ cp /srv/theonlinestore/app/deploy/env.production.example /srv/theonlinestore/.env
store$ openssl rand -hex 24      # database password: paste into POSTGRES_PASSWORD and inside DATABASE_URL
store$ openssl rand -hex 32      # PAYLOAD_SECRET
store$ nano /srv/theonlinestore/.env
store$ chmod 600 /srv/theonlinestore/.env
```

Fill every value: `NEXT_PUBLIC_SITE_URL=https://theonlinestore.lk`, the password written out in full in both places, SMTP details, PayHere values (or leave PayHere empty to launch with cash on delivery and bank transfer). Never add `ALLOW_TEST_GATEWAY`.

**3.8 Database**

```bash
store$ docker compose -f /srv/theonlinestore/app/deploy/docker-compose.db.yml --env-file /srv/theonlinestore/.env up -d
store$ docker ps          # postgres … 127.0.0.1:5432->5432/tcp (healthy)
```

Start the database only with this command. Don't deploy the project from a hosting panel's Docker manager (e.g. Hostinger's): the panel can start containers on public ports. The production branch has no root `docker-compose.yml`, so `docker ps` should show this one `postgres` container and nothing on `0.0.0.0`.

**3.9 Service and web server**

```bash
root# cp /srv/theonlinestore/app/deploy/theonlinestore.service /etc/systemd/system/
root# systemctl daemon-reload && systemctl enable theonlinestore
root# cp /srv/theonlinestore/app/deploy/Caddyfile /etc/caddy/Caddyfile
root# mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy
root# systemctl reload caddy
```

**3.10 First deploy**

```bash
store$ /srv/theonlinestore/app/deploy/deploy.sh
```

It backs up, installs, creates the database tables (migrations), builds (3–6 minutes), starts the store and prints `✓ Live`. Check: `curl -I http://127.0.0.1:3000` and `journalctl -u theonlinestore -n 50`.

**3.11 Nightly backups**

```bash
store$ crontab -e
30 2 * * * /srv/theonlinestore/app/deploy/backup.sh >> /srv/theonlinestore/backups/backup.log 2>&1
```

Copy `/srv/theonlinestore/backups` off the server too (e.g. `rclone` to Google Drive or Backblaze), and test one restore before launch (command at the bottom of `backup.sh`).

## 4. Connect the domain

At your DNS provider:

| Type | Name | Value |
|---|---|---|
| A | `@` | the server's IPv4 address |
| A | `www` | the server's IPv4 address |
| AAAA (if the server has IPv6) | `@`, `www` | the server's IPv6 address |
| TXT (email) | `@` | SPF record from your email provider |
| TXT/CNAME (email) | as given | DKIM record(s) from your email provider |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:<you>` |

When DNS has updated (minutes to a few hours), Caddy gets the HTTPS certificate automatically. Check `https://theonlinestore.lk`.

## 5. Updating the live store

```bash
your-mac$ cd "<project>/theonlinestore-production"
your-mac$ git merge main && ./scripts/make-production.sh && git add -A && git commit -m "Production: merge main"
your-mac$ git push server production
your-mac$ ssh store@<server-ip> /srv/theonlinestore/app/deploy/deploy.sh
```

It backs up the database, pulls `production`, installs, runs migrations, builds, restarts and checks the store answers. Logs: `journalctl -u theonlinestore -f`. The store is unavailable for a few seconds during the restart.

## 6. Configure the store in the admin (no seeding)

Open `https://theonlinestore.lk/admin`. On an empty database it asks you to **create the first user**: this account is the Super Admin. Then, in order:

1. **Settings › Store details:** store name, phone, WhatsApp number (94…), email, opening hours, address, business registration, social links, announcement bar messages.
2. **Settings › Policies:** write Terms & conditions (and set the version), Returns & refunds (window in days, product types that can't be returned), Privacy. Until written, the pages show a short summary.
3. **Settings › Checkout & delivery:** free delivery on/off and threshold, weight rules, district zones and fees, same-day, gift wrap fee.
4. **Settings › Payments** (Super Admin): bank accounts (bank transfer stays hidden until one is added); cash on delivery limits and excluded districts; PayHere Merchant ID/secret and refund App ID/secret (or in the server `.env`); order of methods; leave Koko and Mintpay off until their integrations are built; keep **Test** mode until a sandbox payment works, then switch to **Live**.
5. **Settings › Couriers:** your couriers and their tracking links.
6. **Catalogue › Categories:** the menu shows a category once it exists. Create them with these names (the web addresses come from the names):
   - **Beauty** (`beauty`) as the parent of Skincare, Hair Care, Body Care and Lips
   - Skincare: Cleansers, Serums & Ampoules (`serums`), Moisturisers (`moisturizers`), Sunscreen, Masks, Toners & Mists (`toners-mists`), Eye, Lash & Brow (`eye-care`), Gift Sets
   - Hair Care: Shampoos, Conditioners, Hair Oils, Masks & Treatments (`hair-treatments`), Styling
   - Body Care: Lotions & Creams (`body-lotion`), Scrubs & Polishes (`body-scrubs`), Body Wash, Petroleum Jelly, Deodorants
   - Lips: Lip Balms (`lip-balm`), Lip Oils & Tints (`lip-oil`)
   - Fragrances: Women’s perfume (`womens-perfume`), Men’s cologne (`mens-cologne`), Unisex (`unisex-fragrance`), Body mists & sets (`body-mists`)
   - Footwear: Sneakers, Sandals & slides (`sandals-slides`), Heels & flats (`heels-flats`), Kids’ shoes (`kids-shoes`)
   - Gifts: Gift hampers, Gift boxes & sets (`gift-boxes`), Personalised gifts
   - Chocolates: Chocolate boxes, Bars & tablets (`chocolate-bars`), Sweet treats
   Where a name and its web address differ, set the slug shown in brackets.
7. **Catalogue › Brands**, then **Products** (photos, prices, variants, stock, descriptions). Products appear on the store when published.
8. **Content › Home page:** hero products, product rails, and **Banners & messages** (hero badge, sale banner with end date, gift banner, newsletter text). Only promise what the store offers.
9. **Settings › Staff & roles:** one login per person with the right role.
10. **Final checks:** one real order per payment method (card, cash on delivery, bank transfer with a slip), refund the card one, check every email arrives, print an invoice and packing slip, track an order at `/track-order`. Then switch Payments to **Live**.

The dashboard's **Launch checklist** tracks the main items.

## 7. What the production branch removes

`scripts/make-production.sh` deletes: tests and test tooling (Vitest, Playwright, Testing Library), seed and demo scripts and the sample catalogue data, the built-in test gateway (and replaces its helper with a stub that is always off), the `/styleguide` page, and local-only settings from `.env.example`. Demo/sample product and review labels no longer exist anywhere in the code.

## 8. Still to come after launch

- Content pages: About, Contact, Delivery information, FAQ (Sprint 9).
- SMS and WhatsApp order updates (Sprint 7).
- Koko and Mintpay live connections (when their merchant guides arrive).
- Courier API integration (when courier accounts allow it).
- Analytics (Sprint 8), full SEO (Sprint 9), security review and staff two-factor login (Sprint 10).
