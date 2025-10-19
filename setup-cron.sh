#!/bin/bash

echo "🕐 RSS Polling Cron Setup"
echo "========================="
echo ""

# Detect environment
if [ -f /.dockerenv ]; then
    ENV="docker"
elif systemctl --version >/dev/null 2>&1; then
    ENV="systemd"
else
    ENV="cron"
fi

echo "Detected environment: $ENV"
echo ""

# Get the endpoint URL
read -p "Enter your endpoint URL [http://localhost:3000/api/poll-rss]: " ENDPOINT
ENDPOINT=${ENDPOINT:-http://localhost:3000/api/poll-rss}

echo ""
echo "Selected endpoint: $ENDPOINT"
echo ""

case "$ENV" in
    systemd)
        echo "Setting up systemd timer..."
        echo ""

        # Create service file
        sudo tee /etc/systemd/system/rss-poll.service > /dev/null << EOF
[Unit]
Description=RSS Polling Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s -X POST ${ENDPOINT}
StandardOutput=journal
StandardError=journal
EOF

        # Create timer file
        sudo tee /etc/systemd/system/rss-poll.timer > /dev/null << EOF
[Unit]
Description=RSS Polling Timer
Requires=rss-poll.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
AccuracySec=1s

[Install]
WantedBy=timers.target
EOF

        # Reload systemd
        sudo systemctl daemon-reload

        # Enable and start timer
        sudo systemctl enable rss-poll.timer
        sudo systemctl start rss-poll.timer

        echo "✅ Systemd timer created and started!"
        echo ""
        echo "Check status:"
        echo "  sudo systemctl status rss-poll.timer"
        echo "  sudo systemctl list-timers rss-poll.timer"
        echo ""
        echo "View logs:"
        echo "  sudo journalctl -u rss-poll.service -f"
        ;;

    cron)
        echo "Setting up crontab..."
        echo ""

        # Create cron entry
        CRON_CMD="* * * * * curl -s -X POST ${ENDPOINT} >> /tmp/rss-poll.log 2>&1"

        # Check if entry already exists
        if crontab -l 2>/dev/null | grep -q "api/poll-rss"; then
            echo "⚠️  Cron entry already exists. Please edit manually:"
            echo "  crontab -e"
        else
            # Add to crontab
            (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
            echo "✅ Crontab entry added!"
            echo ""
            echo "Entry: $CRON_CMD"
        fi

        echo ""
        echo "View crontab:"
        echo "  crontab -l"
        echo ""
        echo "View logs:"
        echo "  tail -f /tmp/rss-poll.log"
        ;;

    docker)
        echo "⚠️  Running in Docker container"
        echo ""
        echo "Options for Docker:"
        echo ""
        echo "1. Use host cron (recommended):"
        echo "   Add to host crontab:"
        echo "   * * * * * curl -X POST ${ENDPOINT}"
        echo ""
        echo "2. Use docker-compose with ofelia (cron for containers):"
        echo "   See: https://github.com/mcuadros/ofelia"
        echo ""
        echo "3. Use external cron service (cron-job.org, etc.)"
        ;;
esac

echo ""
echo "✅ Setup complete!"
