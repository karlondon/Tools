# VibeList.uk Deployment — Part 2: Build, Deploy & Go Live

## Step 12 — Build & Push Images (LOCAL Machine)

> ⚠️ Complete this BEFORE `docker compose up` on the server.

```bash
docker login
# Username: vibelistuk / Password: your-password

cd backend
docker build -t vibelistuk/vibelist-api:latest .
cd ../frontend
docker build -t vibelistuk/vibelist-web:latest .

docker push vibelistuk/vibelist-api:latest
docker push vibelistuk/vibelist-web:latest
```

Verify at: `https://hub.docker.com/u/vibelistuk`

## Step 13 — Deploy (Back on SERVER via SSH)

```bash
ssh ubuntu@<YOUR_STATIC_IP>
cd ~/vibelist
docker compose --env-file .env up -d
```

## Step 14 — Verify All Containers Running

```bash
docker compose ps
```

Expected output — all 4 services show `Up`:

```
NAME                IMAGE                              STATUS
vibelist_postgres   postgres:16                        Up
vibelist-api-1      vibelistuk/vibelist-api:latest     Up
vibelist-web-1      vibelistuk/vibelist-web:latest     Up
vibelist-nginx-1    nginx:alpine                       Up
```

If any fail: `docker compose logs <service-name>`

## Step 15 — Test Locally on Server

```bash
curl http://localhost        # Should return frontend HTML
curl http://localhost/api/   # Should return API response
```

## Step 16 — Configure Cloudflare DNS

In Cloudflare DNS settings, add two A records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | YOUR_STATIC_IP | DNS only (grey cloud initially) |
| A | www | YOUR_STATIC_IP | DNS only (grey cloud initially) |

Wait a few minutes, then test: `http://vibelist.uk`

## Step 17 — Enable SSL via Cloudflare

1. Cloudflare → SSL/TLS → set mode to **Full (Strict)**.
2. Cloudflare → Origin Server → **Create Certificate**.
3. Copy the certificate and private key.
4. On the server:

```bash
nano ~/vibelist/certs/origin.pem
# Paste the certificate, save

nano ~/vibelist/certs/origin-key.pem
# Paste the private key, save
```

5. Update `~/vibelist/nginx/default.conf` to add SSL:

```nginx
server {
    listen 80;
    server_name vibelist.uk www.vibelist.uk;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name vibelist.uk www.vibelist.uk;
    ssl_certificate /etc/nginx/certs/origin.pem;
    ssl_certificate_key /etc/nginx/certs/origin-key.pem;

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/ {
        proxy_pass http://api:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /uploads/ {
        alias /var/www/uploads/;
    }
}
```

6. Restart nginx:

```bash
docker compose restart nginx
```

7. In Cloudflare, enable the orange proxy cloud on both A records.

## Step 18 — Useful Commands

| Task | Command |
|------|---------|
| View all logs | `docker compose logs -f` |
| View one service | `docker compose logs -f api` |
| Restart a service | `docker compose restart api` |
| Stop everything | `docker compose down` |
| Update images | `docker compose pull && docker compose up -d` |
| DB backup | `docker compose exec postgres pg_dump -U vibelist vibelist > backup.sql` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `pull access denied` | You didn't push images to Docker Hub (Step 12), or DOCKERHUB_USER in .env is wrong |
| Container keeps restarting | `docker compose logs <service>` to see the error |
| Port already in use | `sudo lsof -i :<port>` then stop the conflicting process |
| DB connection refused | Check POSTGRES_PASSWORD matches in .env |
| 502 Bad Gateway | Backend/frontend container crashed — check logs |
| Out of memory | Add swap: `sudo fallocate -l 2G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |

---

> **To convert these .md files to .docx:** Open in VS Code, use "Markdown PDF" extension, or run: `pandoc VibeList_Deployment_Part1_Setup.md VibeList_Deployment_Part2_Build_Deploy.md -o VibeList_Deployment_Guide.docx`