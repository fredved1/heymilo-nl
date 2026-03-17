#!/bin/bash
# Milo VPS setup script — run as root on 185.107.90.42
# Vereist: api.heymilo.nl DNS A-record → 185.107.90.42 (eerst instellen in Hostnet!)
# Run: bash vps-setup.sh

set -e

DOMAIN="api.heymilo.nl"
# Vul je eigen keys in — zie /root/milo/.env op de VPS
STRIPE_KEY="${STRIPE_SECRET_KEY:?Stel STRIPE_SECRET_KEY in als env var}"

echo "=== Stap 1: .env updaten (zonder webhook secret — komt later) ==="
cat > /root/milo/.env << ENVEOF
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:?}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-Milo2026Admin!}
DEFAULT_MODEL=google/gemini-2.0-flash-exp:free
COMPLEX_MODEL=anthropic/claude-sonnet-4-6
DASHBOARD_PORT=8090
STRIPE_SECRET_KEY=${STRIPE_KEY}
STRIPE_WEBHOOK_SECRET=PLACEHOLDER
MILO_PHONE=31644970320
ENVEOF
echo ".env bijgewerkt"

echo "=== Stap 2: packages installeren ==="
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== Stap 3: nginx HTTP configureren ==="
cat > /etc/nginx/sites-available/milo << 'NGINXEOF'
server {
    listen 80;
    server_name api.heymilo.nl;

    location / {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 30s;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/milo /etc/nginx/sites-enabled/milo
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "nginx HTTP klaar"

echo "=== Stap 4: SSL certificaat ophalen ==="
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m thomas@botlease.nl
echo "SSL certificaat geinstalleerd"

echo "=== Stap 5: Milo service herstarten ==="
cd /root/milo
systemctl restart milo
sleep 3
systemctl status milo --no-pager | head -20

echo ""
echo "======================================"
echo "KLAAR! Webhook URL: https://${DOMAIN}/api/stripe/webhook"
echo ""
echo "Nu in Stripe registreren:"
curl -s https://api.stripe.com/v1/webhook_endpoints \
  -u "${STRIPE_KEY}:" \
  -d "url=https://${DOMAIN}/api/stripe/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=payment_intent.succeeded" \
  -d "description=Milo VPS webhook" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'error' in data:
    print('FOUT:', data['error']['message'])
else:
    secret = data.get('secret', 'zie Stripe dashboard')
    print('Webhook geregistreerd!')
    print('Webhook ID:', data['id'])
    print('Signing secret:', secret)
    print()
    print('Update nu /root/milo/.env:')
    print('STRIPE_WEBHOOK_SECRET=' + secret)
"
echo ""
echo "Daarna: systemctl restart milo"
echo "======================================"
