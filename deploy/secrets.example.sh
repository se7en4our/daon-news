#!/usr/bin/env sh
# Creates the daon-news-secrets Secret in the cluster. Run once by hand (not by Argo CD) so no secret
# ever lands in git. Re-running with --dry-run=client | kubectl apply rotates values.
#   LLM_API_KEY=sk-... [TELEGRAM_BOT_TOKEN=... SMTP_HOST=... SMTP_USER=... SMTP_PASSWORD=...] sh deploy/secrets.example.sh
# Re-running regenerates POSTGRES_PASSWORD/ADMIN_PASSWORD/SESSION_SECRET too: for later changes use
# kubectl -n news patch secret daon-news-secrets instead.
set -eu
: "${LLM_API_KEY:?set LLM_API_KEY (the daon-news virtual key issued by the LiteLLM proxy)}"
: "${LLM_BASE_URL:?set LLM_BASE_URL (the LiteLLM proxy, e.g. https://<host>/v1)}"

hex() { openssl rand -hex "$1"; }

kubectl create namespace news --dry-run=client -o yaml | kubectl apply -f -
kubectl -n news create secret generic daon-news-secrets \
  --from-literal=POSTGRES_PASSWORD="$(hex 24)" \
  --from-literal=ADMIN_PASSWORD="$(hex 12)" \
  --from-literal=SESSION_SECRET="$(hex 32)" \
  --from-literal=IMG_PROXY_SIGN_SECRET="$(hex 32)" \
  --from-literal=LLM_BASE_URL="$LLM_BASE_URL" \
  --from-literal=LLM_API_KEY="$LLM_API_KEY" \
  --from-literal=TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}" \
  --from-literal=SMTP_HOST="${SMTP_HOST:-}" \
  --from-literal=SMTP_USER="${SMTP_USER:-}" \
  --from-literal=SMTP_PASSWORD="${SMTP_PASSWORD:-}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "admin password: kubectl -n news get secret daon-news-secrets -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d"
# Note: POSTGRES_PASSWORD is only read by initdb on the first start. Rotating it later also needs
# ALTER ROLE aihot PASSWORD '...' inside the database.
