# Deploying to AWS EC2 with Docker

This runs the whole app on one small EC2 server:

```
Internet ──HTTPS──> Caddy (ports 80/443) ──> FastAPI (gunicorn) ──> PostgreSQL
                                                   │
                                                   └──> S3 bucket (private)
```

- **Caddy** gets a free HTTPS certificate automatically.
- **PostgreSQL** is not exposed to the internet.
- **S3 access** uses an IAM role attached to the server, so there are no AWS keys anywhere.

All steps use the **Asia Pacific (Sydney) / ap-southeast-2** region. Keep the region
selector (top right of the AWS console) on Sydney the whole time.

---

## 0. Test locally first (optional)

Requires Docker Desktop with **Settings → Resources → WSL Integration** enabled.

```bash
cd Tasks_Manager_Project
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and SECRET_KEY (use: openssl rand -hex 32)
# Also update the password inside DATABASE_URL if you run the app without Docker
docker compose up --build
```

Open https://localhost/docs (your browser will warn about the local certificate; that is
expected locally only). Stop with `Ctrl+C`.

---

## 1. Set a billing alert (do this first)

1. AWS console → search **Billing and Cost Management** → **Budgets** → **Create budget**.
2. Choose **Use a template** → **Monthly cost budget**.
3. Amount: e.g. `10` USD. Enter your email. **Create budget**.

You will get an email if spending goes over that amount.

---

## 2. Create the S3 bucket

1. Console → **S3** → **Create bucket**.
2. Bucket name: something unique, e.g. `task-manager-uploads-<random>`.
3. Leave **Block all public access** turned **ON** (the app uses signed links).
4. **Create bucket**.

---

## 3. Create the IAM role for the server

This lets the app use S3 without access keys.

1. Console → **IAM** → **Policies** → **Create policy** → **JSON** tab, paste
   (replace `YOUR_BUCKET_NAME`):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject"],
         "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/tasks/*"
       }
     ]
   }
   ```

   Name it `TaskManagerS3Access` → **Create policy**.

2. IAM → **Roles** → **Create role** → Trusted entity: **AWS service** → Use case: **EC2** → Next.
3. Search and tick `TaskManagerS3Access` → Next.
4. Role name: `TaskManagerEC2Role` → **Create role**.

---

## 4. Launch the EC2 server

Console → **EC2** → **Launch instance**:

| Setting | Value |
|---|---|
| Name | `task-manager-api` |
| AMI | **Ubuntu Server 24.04 LTS** |
| Instance type | `t3.micro` (free-tier eligible) or `t3.small` |
| Key pair | **Create new key pair** → type ED25519, format `.pem` → it downloads. Keep it safe, never commit it. |
| Network settings → Edit | Allow **SSH** from **My IP** only. Tick **Allow HTTPS** and **Allow HTTP** from the internet. |
| Storage | 20 GiB gp3 |
| Advanced details → IAM instance profile | `TaskManagerEC2Role` |
| Advanced details → Metadata version | **V2 only (token required)** |
| Advanced details → Metadata response hop limit | **2** (required so the app inside Docker can use the IAM role) |

Click **Launch instance**.

**Optional but recommended:** EC2 → **Elastic IPs** → **Allocate** → **Associate** it with
your instance. Without it, the public IP changes if you stop/start the server.

Copy the instance's **Public IPv4 address** (e.g. `13.54.10.20`).

---

## 5. Connect to the server

From WSL (the key downloaded to Windows `Downloads`):

```bash
mkdir -p ~/.ssh
cp /mnt/c/Users/<your-windows-user>/Downloads/<key-name>.pem ~/.ssh/
chmod 400 ~/.ssh/<key-name>.pem
ssh -i ~/.ssh/<key-name>.pem ubuntu@<PUBLIC_IP>
```

Type `yes` the first time. You are now on the server.

---

## 6. Prepare the server (one time)

```bash
# Updates
sudo apt update && sudo apt upgrade -y

# Install Docker (official convenience script)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
# Log out and back in so the docker group applies
exit
```

Reconnect with the same `ssh` command, then add swap (helps a 1 GB server build images):

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Automatic security updates
sudo apt install -y unattended-upgrades
```

---

## 7. Deploy the app

```bash
git clone https://github.com/srinuprojects/task-manager-api.git
cd task-manager-api/Tasks_Manager_Project
cp .env.example .env
nano .env
```

Set these in `.env` (generate each secret with `openssl rand -hex 32`, run it in another
terminal or before opening nano):

| Key | Value |
|---|---|
| `DOMAIN` | Your IP with dashes + `.sslip.io`, e.g. `13-54-10-20.sslip.io` |
| `POSTGRES_PASSWORD` | a generated secret |
| `SECRET_KEY` | a *different* generated secret |
| `AWS_REGION` | `ap-southeast-2` |
| `S3_BUCKET` | your bucket name from step 2 |

Do **not** add any `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. The `DATABASE_URL` line
is ignored by Docker and can stay as is.

Save in nano: `Ctrl+O`, `Enter`, `Ctrl+X`. Then:

```bash
chmod 600 .env
docker compose up -d --build
docker compose ps        # all three should be "running"/"healthy"
```

Open `https://<DOMAIN>/docs` in your browser, e.g. `https://13-54-10-20.sslip.io/docs`.
The first load can take ~30 seconds while Caddy gets the certificate.

---

## 8. Everyday commands (run in `Tasks_Manager_Project` on the server)

| Task | Command |
|---|---|
| See logs | `docker compose logs -f api` |
| Deploy new code | `git pull && docker compose up -d --build` |
| Restart | `docker compose restart` |
| Stop | `docker compose down` (data is kept) |
| Back up the database | `docker compose exec -T db pg_dump -U taskmanager taskmanager_db \| gzip > backup-$(date +%F).sql.gz` |

Migrations run automatically every time the `api` container starts.

**Never run `docker compose down -v`.** The `-v` deletes the database volume.

---

## 9. Using a real domain later

1. Buy a domain (Namecheap, Cloudflare, etc.).
2. Add a DNS **A record**, e.g. `api` → your Elastic IP.
3. On the server set `DOMAIN=api.yourdomain.com` in `.env` and run `docker compose up -d`.

Caddy gets a new certificate automatically.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Site does not load | Check the security group allows ports 80 and 443; run `docker compose logs caddy` |
| Upload returns 500 / "Unable to locate credentials" | Instance has no IAM role, or metadata hop limit is not 2 (EC2 → instance → Actions → Instance settings → Modify instance metadata options) |
| Upload returns AccessDenied | Bucket name in `.env` and in the IAM policy must match |
| `api` keeps restarting | `docker compose logs api` — usually a missing `.env` value |
| Build is killed on t3.micro | Make sure swap from step 6 is on (`free -h`) |
