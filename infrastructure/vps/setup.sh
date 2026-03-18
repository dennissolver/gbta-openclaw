#!/usr/bin/env bash
# ============================================================
# GBTA OpenClaw VPS Setup Script
# Target: Ubuntu 24.04 on DigitalOcean/Vultr (Sydney region)
# Run as root: curl -sL <url> | bash
# ============================================================
set -euo pipefail

echo "=== GBTA OpenClaw VPS Setup ==="
echo ""

# --- 1. System basics ---
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw fail2ban

# --- 2. Node.js 22 LTS ---
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v)"

# --- 3. Create openclaw user ---
if ! id openclaw &>/dev/null; then
  useradd -m -s /bin/bash openclaw
fi

# --- 4. Install OpenClaw ---
su - openclaw -c '
  if ! command -v openclaw &>/dev/null; then
    npm install -g openclaw
  fi
  echo "OpenClaw: $(openclaw --version)"
'

# --- 5. Firewall ---
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 18789/tcp   # OpenClaw gateway
ufw --force enable
echo "Firewall configured."

# --- 6. OpenClaw config directory ---
su - openclaw -c '
  mkdir -p ~/.openclaw
'

# --- 7. Generate gateway config ---
# NOTE: You must fill in your actual OpenRouter API key
GATEWAY_TOKEN=$(openssl rand -hex 24)
echo "Generated gateway token: $GATEWAY_TOKEN"
echo "SAVE THIS TOKEN — you need it for the Vercel env vars."
echo ""

cat > /home/openclaw/.openclaw/openclaw.json << OCEOF
{
  "meta": {
    "lastTouchedVersion": "2026.3.13"
  },
  "auth": {
    "profiles": {
      "openrouter:default": {
        "provider": "openrouter",
        "mode": "api_key"
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "openrouter/auto"
      },
      "models": {
        "openrouter/auto": {
          "alias": "OpenRouter"
        }
      },
      "workspace": "/home/openclaw/.openclaw/workspace"
    }
  },
  "tools": {
    "profile": "coding",
    "web": {
      "search": {
        "enabled": true,
        "provider": "gemini"
      }
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true
  },
  "session": {
    "dmScope": "per-channel-peer"
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "boot-md": { "enabled": true },
        "bootstrap-extra-files": { "enabled": true },
        "command-logger": { "enabled": true },
        "session-memory": { "enabled": true }
      }
    }
  },
  "channels": {},
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "${GATEWAY_TOKEN}"
    },
    "tailscale": {
      "mode": "off"
    }
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  }
}
OCEOF

chown openclaw:openclaw /home/openclaw/.openclaw/openclaw.json

# --- 8. Systemd service ---
cat > /etc/systemd/system/openclaw.service << 'SVCEOF'
[Unit]
Description=OpenClaw AI Agent Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
WorkingDirectory=/home/openclaw
ExecStart=/usr/bin/openclaw up --non-interactive
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable openclaw
systemctl start openclaw

echo ""
echo "=== Setup Complete ==="
echo ""
echo "OpenClaw gateway running on port 18789"
echo "Gateway token: $GATEWAY_TOKEN"
echo ""
echo "Next steps:"
echo "  1. Set your OpenRouter API key:"
echo "     su - openclaw -c 'openclaw configure --section auth'"
echo ""
echo "  2. Add these to Vercel env vars:"
echo "     OPENCLAW_GATEWAY_URL=ws://<this-server-ip>:18789"
echo "     OPENCLAW_GATEWAY_TOKEN=$GATEWAY_TOKEN"
echo ""
echo "  3. Verify:"
echo "     systemctl status openclaw"
echo "     journalctl -u openclaw -f"
