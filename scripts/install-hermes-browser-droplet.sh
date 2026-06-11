#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/clawuser/ottoserv-website}"
HERMES_USER="${HERMES_USER:-hermes-agent}"
HERMES_HOME="${HERMES_HOME:-/home/hermes-agent}"
PROFILE_DIR="${HERMES_BROWSER_PROFILE_DIR:-$HERMES_HOME/.config/hermes-browser-profile}"
EVIDENCE_DIR="${HERMES_EVIDENCE_DIR:-$HERMES_HOME/workspace/evidence}"
ENV_DIR="/etc/ottoserv"
ENV_FILE="$ENV_DIR/hermes-browser.env"
DISPLAY_NUM="${HERMES_BROWSER_DISPLAY:-99}"
BRIDGE_PORT="${HERMES_BROWSER_BRIDGE_PORT:-7788}"
NOVNC_PORT="${HERMES_BROWSER_NOVNC_PORT:-6080}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi
if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Repo not found at $REPO_DIR. Set REPO_DIR=/actual/path." >&2
  exit 1
fi
if ! id "$HERMES_USER" >/dev/null 2>&1; then
  echo "User $HERMES_USER does not exist." >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  xvfb x11vnc novnc websockify curl ca-certificates fonts-liberation openssl

cd "$REPO_DIR"
npm install --no-save playwright
npx playwright install --with-deps chromium

install -d -o "$HERMES_USER" -g "$HERMES_USER" "$PROFILE_DIR" "$EVIDENCE_DIR"
install -d -m 0750 "$ENV_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  BRIDGE_TOKEN="$(openssl rand -hex 32)"
  cat >"$ENV_FILE" <<EOF
HERMES_BROWSER_BRIDGE_HOST=127.0.0.1
HERMES_BROWSER_BRIDGE_PORT=$BRIDGE_PORT
HERMES_BROWSER_BRIDGE_URL=http://127.0.0.1:$BRIDGE_PORT
HERMES_BROWSER_BRIDGE_TOKEN=$BRIDGE_TOKEN
HERMES_BROWSER_ADAPTER_MODULE=$REPO_DIR/runtime/hermes-browser-adapter.mjs
HERMES_BROWSER_PROFILE_DIR=$PROFILE_DIR
HERMES_EVIDENCE_DIR=$EVIDENCE_DIR
HERMES_BROWSER_HEADLESS=false
HERMES_BROWSER_LIVE_DM=false
DISPLAY=:$DISPLAY_NUM
EOF
  chmod 0600 "$ENV_FILE"
else
  echo "Keeping existing $ENV_FILE"
fi

cat >/etc/systemd/system/hermes-browser-display.service <<EOF
[Unit]
Description=Hermes browser virtual display
After=network.target

[Service]
Type=simple
User=$HERMES_USER
ExecStart=/usr/bin/Xvfb :$DISPLAY_NUM -screen 0 1440x1000x24 -nolisten tcp -ac
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/hermes-browser-bridge.service <<EOF
[Unit]
Description=Hermes authenticated browser bridge
After=network.target hermes-browser-display.service
Requires=hermes-browser-display.service

[Service]
Type=simple
User=$HERMES_USER
WorkingDirectory=$REPO_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node $REPO_DIR/scripts/hermes-browser-bridge.mjs
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$PROFILE_DIR $EVIDENCE_DIR $REPO_DIR/data

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/hermes-browser-novnc.service <<EOF
[Unit]
Description=Loopback-only noVNC for Hermes browser login/maintenance
After=hermes-browser-display.service
Requires=hermes-browser-display.service

[Service]
Type=simple
User=$HERMES_USER
Environment=DISPLAY=:$DISPLAY_NUM
ExecStart=/bin/bash -lc '/usr/bin/x11vnc -display :$DISPLAY_NUM -localhost -forever -shared -rfbport 5900 -nopw & exec /usr/bin/websockify --web=/usr/share/novnc/ 127.0.0.1:$NOVNC_PORT 127.0.0.1:5900'
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

install -d -o "$HERMES_USER" -g "$HERMES_USER" "$HERMES_HOME/workspace/skills/hermes-browser"
cp "$REPO_DIR/skills/hermes-browser/SKILL.md" "$HERMES_HOME/workspace/skills/hermes-browser/SKILL.md"
chown -R "$HERMES_USER:$HERMES_USER" "$HERMES_HOME/workspace/skills/hermes-browser"

systemctl daemon-reload
systemctl enable --now hermes-browser-display.service hermes-browser-bridge.service
# noVNC is deliberately not enabled at boot. Start it only for interactive login.

cat <<EOF
Installed Hermes browser runtime.

1. Check bridge:
   sudo -u $HERMES_USER bash -lc 'set -a; source $ENV_FILE; set +a; cd $REPO_DIR; npm run hermes:browser-status'

2. For one-time social login, start loopback-only noVNC:
   systemctl start hermes-browser-novnc.service
   From Windows, open an SSH tunnel:
   ssh -L $NOVNC_PORT:127.0.0.1:$NOVNC_PORT root@YOUR_DROPLET_IP
   Then browse to: http://127.0.0.1:$NOVNC_PORT/vnc.html

3. Trigger browser creation if the desktop is blank:
   sudo -u $HERMES_USER bash -lc 'set -a; source $ENV_FILE; set +a; cd $REPO_DIR; npm run hermes:browser-status'

4. Log into only the approved social accounts, then stop noVNC:
   systemctl stop hermes-browser-novnc.service

5. Keep HERMES_BROWSER_LIVE_DM=false until read-only research and prepared-DM tests pass.
EOF
