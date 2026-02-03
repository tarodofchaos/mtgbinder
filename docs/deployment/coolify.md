# Deploying MTG Binder to Coolify

This guide covers deploying MTG Binder to a self-hosted [Coolify](https://coolify.io/) instance.

## Overview

MTG Binder is deployed as a single Docker container that:
- Serves the Express backend API
- Serves the React frontend as static files
- Automatically runs database migrations on startup
- Automatically imports card data from MTGJSON if the database is empty

## Prerequisites

- A running Coolify instance (v4.x recommended)
- Access to a PostgreSQL database (can be created in Coolify)
- The MTG Binder repository (public or with deploy key configured)

## Deployment Steps

### Step 1: Create PostgreSQL Database

1. Go to Coolify UI → **Resources** → **+ New** → **Database**
2. Select **PostgreSQL**
3. Configure:
   - **Name**: `mtg-binder-db`
   - **Version**: `16` (or latest stable)
   - **Database Name**: `mtgbinder`
4. Click **Deploy**
5. Once running, note the internal connection details:
   - Host: `<container-name>` (e.g., `mtg-binder-db`)
   - Port: `5432`
   - Username/Password: shown in the database settings

### Step 2: Create the Application

1. Go to **Resources** → **+ New** → **Application**
2. Select your source:
   - **Public Git Repository**: Enter `https://github.com/your-username/mtgbinder.git`
   - **Private Repository**: Configure deploy keys first
3. Set branch to `main`
4. Select **Dockerfile** as the build pack

### Step 3: Configure Build Settings

In the application's **Build** settings:

| Setting | Value |
|---------|-------|
| Build Pack | Dockerfile |
| Dockerfile Location | `./Dockerfile` |
| Docker Build Target | (leave empty) |

### Step 4: Configure Environment Variables

In the application's **Environment Variables** section, add:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@mtg-binder-db:5432/mtgbinder` | Use the internal hostname from Step 1 |
| `JWT_SECRET` | `<generate-secure-key>` | See below for generation |
| `NODE_ENV` | `production` | Required for production mode |
| `PORT` | `5000` | Must match Dockerfile EXPOSE |
| `CLIENT_URL` | `https://your-domain.com` | Your public URL (used for CORS) |

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 5: Configure Network Settings

In the **Network** tab:

1. **Port Mappings**:
   - Container port: `5000`
   - Public port: `80` (or `443` for HTTPS)

2. **Domain Configuration**:
   - If you have a domain: Enter it and configure DNS
   - If using IP access: Coolify will provide a `*.sslip.io` domain

3. **HTTPS** (recommended):
   - Enable if you have a domain
   - Coolify can auto-generate Let's Encrypt certificates

### Step 6: Deploy

1. Click **Deploy**
2. Monitor the build logs in the **Deployments** tab
3. First deployment takes longer due to:
   - Docker image build (~3-5 minutes)
   - Database migrations
   - Card data import from MTGJSON (~5-10 minutes for 100k+ cards)

### Step 7: Verify Deployment

Once the deployment shows "Running" and "Healthy":

1. **Health Check**:
   ```bash
   curl https://your-domain.com/health
   # Expected: {"status":"ok","timestamp":"..."}
   ```

2. **Frontend**: Visit `https://your-domain.com/` - should show login page

3. **API Test**:
   ```bash
   curl https://your-domain.com/api/cards/search?q=lightning
   # Expected: JSON array of card results
   ```

4. **Create Account**: Register through the UI to verify full functionality

## Automatic Startup Tasks

The Docker entrypoint script (`docker-entrypoint.sh`) automatically handles:

1. **Database Migrations**: Runs `prisma migrate deploy` on every startup
2. **Card Data Import** (runs in background):
   - Checks if the `Card` table is empty
   - If empty, starts downloading card data from MTGJSON (~155MB compressed) **in the background**
   - The server starts immediately while import continues
   - Imports ~100,000+ cards (takes 5-10 minutes)
   - Subsequent startups skip this if data exists
   - **Note**: Card search may return limited results until import completes

## Troubleshooting

### Blank Page / CORS Errors

**Symptom**: Page loads but shows nothing, console shows CORS errors

**Solution**: Ensure `CLIENT_URL` environment variable matches your actual domain:
```
CLIENT_URL=https://your-actual-domain.com
```

### Certificate Errors (ERR_CERT_AUTHORITY_INVALID)

**Symptom**: Browser shows certificate warning or refuses to load

**Cause**: Using HTTP but the app's Content Security Policy has `upgrade-insecure-requests`

**Solution**: Either:
1. Enable HTTPS in Coolify (recommended)
2. Or ensure you're using the HTTP version of the URL

### Database Connection Failed

**Symptom**: Container keeps restarting, logs show database connection errors

**Solutions**:
1. Verify `DATABASE_URL` uses the **internal hostname** (container name), not external IP
2. Ensure the database container is running and healthy
3. Check database credentials match what's configured in Coolify

### Card Search Returns No Results

**Symptom**: Card search returns empty results right after first deployment

**Explanation**: The card import runs in the background and takes 5-10 minutes. During this time, card search will return limited or no results.

**Check progress**: View container logs in Coolify:
```
Importing card data from MTGJSON in background...
Imported 50000 cards from 200 sets...
```

**Solution**: Wait for the import to complete. You can verify by checking if searches return results.

### Container Unhealthy

**Symptom**: Coolify shows container as "Unhealthy"

**Debug steps**:
1. Check container logs for errors
2. Verify health endpoint works: `curl http://localhost:5000/health`
3. Ensure `PORT` environment variable is `5000`

## Updating the Application

### Via Coolify UI

1. Push changes to your Git repository
2. In Coolify, go to your application
3. Click **Deploy** to trigger a new build

### Via Coolify API

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://your-coolify-instance:8000/api/v1/deploy?uuid=YOUR_APP_UUID"
```

## Backup & Restore

### Database Backup

In Coolify, you can configure automatic backups for the PostgreSQL database:

1. Go to your database resource
2. Navigate to **Backups**
3. Configure backup schedule and S3/local storage

### Manual Backup

```bash
# From the database container
pg_dump -U postgres mtgbinder > backup.sql
```

### Restore

```bash
# From the database container
psql -U postgres mtgbinder < backup.sql
```

## Production Checklist

Before going live, ensure:

- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is a secure, randomly generated value
- [ ] HTTPS is enabled (if using a public domain)
- [ ] Database backups are configured
- [ ] `CLIENT_URL` matches your actual domain
- [ ] Rate limiting is appropriate for your use case (default: 100 req/15min)
- [ ] Health checks are passing

## Exposing to the Internet with Cloudflare Tunnel

If your Coolify instance is running on a local network (e.g., home server) and you want to share the app with beta testers without opening router ports, Cloudflare Tunnel provides a secure solution.

### Option A: Quick Tunnel (Simplest - Recommended for Beta)

Run a single command on the Coolify server to get a public URL instantly:

```bash
# SSH into your Coolify server
ssh user@your-coolify-server

# Run cloudflared in quick tunnel mode (port 80 is Coolify's reverse proxy)
cloudflared tunnel --url http://localhost:80
```

This gives you a random `https://*.trycloudflare.com` URL immediately.

**Pros:** No setup, instant, HTTPS included, no Cloudflare account needed
**Cons:** URL changes each time you restart cloudflared

### Making the Quick Tunnel Persistent

To run cloudflared as a system service:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Create systemd service
sudo tee /etc/systemd/system/cloudflared-tunnel.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel for MTG Binder
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:80
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable cloudflared-tunnel
sudo systemctl start cloudflared-tunnel

# Check the URL in logs
sudo journalctl -u cloudflared-tunnel -f
```

The tunnel URL will be logged when the service starts. Look for a line like:
```
Your quick Tunnel has been created! Visit it at https://random-words-here.trycloudflare.com
```

### Option B: Named Tunnel (Stable URL)

For a stable URL that doesn't change, create a named tunnel with a free Cloudflare account:

#### 1. Create Cloudflare Account & Authenticate

```bash
# On the Coolify server
cloudflared tunnel login
# Opens browser to authenticate with Cloudflare
```

#### 2. Create Named Tunnel

```bash
cloudflared tunnel create mtg-binder
# Note the tunnel ID output (e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890)
```

#### 3. Configure Tunnel

```bash
# Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: mtg-binder.your-domain.com
    service: http://localhost:80
  - service: http_status:404
EOF
```

#### 4. Configure DNS (in Cloudflare Dashboard)

Add a CNAME record pointing your subdomain to the tunnel:
- Type: `CNAME`
- Name: `mtg-binder` (or your chosen subdomain)
- Target: `<TUNNEL_ID>.cfargotunnel.com`

#### 5. Run as Service

```bash
cloudflared service install
sudo systemctl start cloudflared
```

### Post-Tunnel Setup

After getting your tunnel URL, update the `CLIENT_URL` environment variable in Coolify:

1. Go to your MTG Binder application in Coolify
2. Navigate to **Environment Variables**
3. Update `CLIENT_URL`:
   ```
   CLIENT_URL=https://your-tunnel-url.trycloudflare.com
   ```
4. Click **Deploy** to restart with the new URL

### Verify the Tunnel

```bash
# Health check
curl https://your-tunnel-url.trycloudflare.com/health

# Card search
curl "https://your-tunnel-url.trycloudflare.com/api/cards/search?q=lightning"

# Test WebSocket (Socket.IO) - should return JSON
curl "https://your-tunnel-url.trycloudflare.com/socket.io/?EIO=4&transport=polling"
```

### Stopping the Tunnel

When done with the beta:

```bash
# If using quick tunnel service
sudo systemctl stop cloudflared-tunnel
sudo systemctl disable cloudflared-tunnel

# If using named tunnel
sudo systemctl stop cloudflared
cloudflared tunnel delete mtg-binder
```

### Tunnel Notes

- **Security**: Traffic is encrypted end-to-end through Cloudflare's network
- **WebSocket**: Cloudflare Tunnel fully supports WebSocket, so Socket.IO real-time trading works
- **Rate Limiting**: Your app's rate limiting still applies (100 req/15min by default)
- **No Port Forwarding**: The tunnel works without opening any ports on your router
- **Free Tier**: Both quick tunnels and named tunnels are free

---

## Architecture Notes

### Single Container Design

MTG Binder uses a monolithic architecture where one container serves both:
- **API**: Express.js backend at `/api/*`
- **WebSocket**: Socket.IO at `/socket.io/*`
- **Frontend**: Static React build for all other routes

This simplifies deployment and reduces infrastructure complexity.

### Static File Serving

In production mode, the Express server:
1. Serves static files from `client/dist/`
2. Returns `index.html` for any non-API route (SPA fallback)
3. This enables client-side routing to work correctly

### Health Checks

The container exposes a health endpoint at `/health` that:
- Returns `{"status":"ok","timestamp":"..."}` when healthy
- Coolify uses this for container health monitoring
- Health check runs every 30 seconds with 10-second timeout

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Secret key for JWT signing |
| `NODE_ENV` | Yes | - | Must be `production` |
| `PORT` | No | `5000` | Server port |
| `CLIENT_URL` | Yes | - | Frontend URL (for CORS) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiration |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
