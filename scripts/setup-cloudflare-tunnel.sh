#!/bin/bash
#
# Cloudflare Tunnel Setup Script for MTG Binder
#
# This script installs cloudflared and sets up a quick tunnel as a systemd service.
# Run this on your Coolify server to expose MTG Binder to the internet.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/your-repo/mtgbinder/main/scripts/setup-cloudflare-tunnel.sh | sudo bash
#
# Or download and run:
#   chmod +x setup-cloudflare-tunnel.sh
#   sudo ./setup-cloudflare-tunnel.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cloudflare Tunnel Setup for MTG Binder ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo)${NC}"
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        CLOUDFLARED_ARCH="amd64"
        ;;
    aarch64|arm64)
        CLOUDFLARED_ARCH="arm64"
        ;;
    armv7l)
        CLOUDFLARED_ARCH="arm"
        ;;
    *)
        echo -e "${RED}Error: Unsupported architecture: $ARCH${NC}"
        exit 1
        ;;
esac

echo -e "${YELLOW}Detected architecture: ${ARCH} (using ${CLOUDFLARED_ARCH})${NC}"

# Download and install cloudflared
CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CLOUDFLARED_ARCH}"
CLOUDFLARED_BIN="/usr/local/bin/cloudflared"

echo ""
echo -e "${YELLOW}Downloading cloudflared...${NC}"
if command -v cloudflared &> /dev/null; then
    echo "cloudflared is already installed at $(which cloudflared)"
    echo "Updating to latest version..."
fi

curl -L "$CLOUDFLARED_URL" -o "$CLOUDFLARED_BIN"
chmod +x "$CLOUDFLARED_BIN"

echo -e "${GREEN}cloudflared installed: $($CLOUDFLARED_BIN --version)${NC}"

# Check if service already exists
SERVICE_NAME="cloudflared-tunnel"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo ""
    echo -e "${YELLOW}Service is already running. Stopping it first...${NC}"
    systemctl stop "$SERVICE_NAME"
fi

# Create systemd service
echo ""
echo -e "${YELLOW}Creating systemd service...${NC}"

cat > "$SERVICE_FILE" << 'EOF'
[Unit]
Description=Cloudflare Tunnel for MTG Binder
After=network.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:80
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}Service file created at ${SERVICE_FILE}${NC}"

# Reload systemd and start service
echo ""
echo -e "${YELLOW}Starting cloudflared tunnel service...${NC}"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

# Wait for tunnel to be established
echo ""
echo -e "${YELLOW}Waiting for tunnel URL (this may take a few seconds)...${NC}"
sleep 5

# Get the tunnel URL from logs
TUNNEL_URL=$(journalctl -u "$SERVICE_NAME" --no-pager -n 50 | grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1)

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""

if [ -n "$TUNNEL_URL" ]; then
    echo -e "Your tunnel URL is: ${GREEN}${TUNNEL_URL}${NC}"
    echo ""
    echo "Share this URL with your beta testers!"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Update your CLIENT_URL in Coolify:${NC}"
    echo "  1. Go to your MTG Binder application in Coolify"
    echo "  2. Navigate to Environment Variables"
    echo "  3. Set CLIENT_URL=${TUNNEL_URL}"
    echo "  4. Redeploy the application"
else
    echo -e "${YELLOW}Tunnel URL not yet available. Check logs with:${NC}"
    echo "  sudo journalctl -u ${SERVICE_NAME} -f"
    echo ""
    echo "Look for a line like:"
    echo "  Your quick Tunnel has been created! Visit it at https://xxx.trycloudflare.com"
fi

echo ""
echo "Useful commands:"
echo "  View logs:        sudo journalctl -u ${SERVICE_NAME} -f"
echo "  Check status:     sudo systemctl status ${SERVICE_NAME}"
echo "  Stop tunnel:      sudo systemctl stop ${SERVICE_NAME}"
echo "  Disable tunnel:   sudo systemctl disable ${SERVICE_NAME}"
echo ""
