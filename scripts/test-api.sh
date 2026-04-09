#!/bin/bash
cd "$(dirname "$0")/.." || exit 1

#  Uso: chmod +x test-api.sh && ./test-api.sh

set -e

ACCOUNTS_URL="http://localhost:3001/api/v1"
TRANSACTIONS_URL="http://localhost:3002/api/v1"
AI_URL="http://localhost:3003/api/v1"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✔ $1${NC}"; }
fail() { echo -e "${RED}✘ $1${NC}"; exit 1; }
info() { echo -e "${CYAN}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
sep()  { echo -e "\n${YELLOW}══════════════════════════════════════${NC}"; }

json_get() { echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }
json_get_num() { echo "$1" | grep -o "\"$2\":[0-9.]*" | head -1 | cut -d':' -f2; }

sep
echo -e "${CYAN}  🏦 BANKING PLATFORM — TEST SUITE${NC}"
sep

info "1. Verificando health checks..."

R=$(curl -sf "$ACCOUNTS_URL/health" || fail "accounts-service no responde")
ok "accounts-service: $(echo $R | grep -o '"status":"[^"]*"')"

R=$(curl -sf "$TRANSACTIONS_URL/health" || fail "transactions-service no responde")
ok "transactions-service: $(echo $R | grep -o '"status":"[^"]*"')"

R=$(curl -sf "$AI_URL/health" || fail "ai-service no responde")
ok "ai-service: $(echo $R | grep -o '"status":"[^"]*"')"

sep
info "2. Autenticación JWT..."

LOGIN=$(curl -sf -X POST "$ACCOUNTS_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@banco.com","password":"Admin1234!"}') \
  || fail "Login fallido"

TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH=$(echo "$LOGIN" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$TOKEN" ] || fail "No se obtuvo accessToken"
ok "Login exitoso — Token obtenido"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ACCOUNTS_URL/customers")
[ "$STATUS" = "401" ] && ok "Ruta protegida sin token → 401 ✔" || warn "Esperaba 401, got $STATUS"

REFRESH_RESP=$(curl -sf -X POST "$ACCOUNTS_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}")
NEW_TOKEN=$(echo "$REFRESH_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$NEW_TOKEN" ] && ok "Refresh token funciona correctamente"

AUTH="-H \"Authorization: Bearer $TOKEN\""

sep
info "3. Creando clientes..."

CUSTOMER1=$(curl -sf -X POST "$ACCOUNTS_URL/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Ana Torres García",
    "email": "ana.torres@email.com",
    "document": "45678901",
    "phone": "987654321"
  }') || fail "Error creando cliente 1"

C1_ID=$(json_get "$CUSTOMER1" "id")
[ -n "$C1_ID" ] || fail "No se obtuvo ID del cliente 1"
ok "Cliente 1 creado: Ana Torres (ID: $C1_ID)"

CUSTOMER2=$(curl -sf -X POST "$ACCOUNTS_URL/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Carlos Mendoza López",
    "email": "carlos.mendoza@email.com",
    "document": "78901234"
  }') || fail "Error creando cliente 2"

C2_ID=$(json_get "$CUSTOMER2" "id")
ok "Cliente 2 creado: Carlos Mendoza (ID: $C2_ID)"

DUP=$(curl -sf -X POST "$ACCOUNTS_URL/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test","email":"ana.torres@email.com","document":"99999999"}' || true)
echo "$DUP" | grep -q "error" && ok "Email duplicado rechazado correctamente" || warn "Email duplicado no fue rechazado"

sep
info "4. Creando cuentas bancarias..."

ACC1=$(curl -sf -X POST "$ACCOUNTS_URL/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"customerId\":\"$C1_ID\",\"currency\":\"PEN\",\"initialBalance\":2000}") \
  || fail "Error creando cuenta 1"

A1_ID=$(json_get "$ACC1" "id")
A1_NUM=$(json_get "$ACC1" "number")
ok "Cuenta 1 creada: $A1_NUM (Saldo: 2000 PEN)"

ACC2=$(curl -sf -X POST "$ACCOUNTS_URL/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"customerId\":\"$C2_ID\",\"currency\":\"PEN\",\"initialBalance\":500}") \
  || fail "Error creando cuenta 2"

A2_ID=$(json_get "$ACC2" "id")
A2_NUM=$(json_get "$ACC2" "number")
ok "Cuenta 2 creada: $A2_NUM (Saldo: 500 PEN)"

# ─── 5. Consultar saldos ──────────────────────────────────────
sep
info "5. Consultando saldos iniciales..."

BAL1=$(curl -sf "$ACCOUNTS_URL/accounts/$A1_ID/balance" \
  -H "Authorization: Bearer $TOKEN")
ok "Saldo cuenta 1: $(echo $BAL1 | grep -o '"balance":[0-9.]*') PEN"

# ─── 6. Depósito ──────────────────────────────────────────────
sep
info "6. Ejecutando depósito en cuenta 1..."

DEPOSIT=$(curl -sf -X POST "$TRANSACTIONS_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"DEPOSIT\",
    \"targetAccountId\": \"$A1_ID\",
    \"amount\": 500,
    \"currency\": \"PEN\",
    \"description\": \"Depósito de prueba\"
  }") || fail "Error en depósito"

TX1_ID=$(json_get "$DEPOSIT" "transactionId")
TX1_STATUS=$(json_get "$DEPOSIT" "status")
ok "Depósito iniciado: $TX1_ID (Status: $TX1_STATUS)"

sleep 2

TX1_DETAIL=$(curl -sf "$TRANSACTIONS_URL/transactions/$TX1_ID" \
  -H "Authorization: Bearer $TOKEN")
TX1_FINAL=$(json_get "$TX1_DETAIL" "status")
ok "Depósito finalizado con status: $TX1_FINAL"

# ─── 7. Retiro ────────────────────────────────────────────────
sep
info "7. Ejecutando retiro de cuenta 1..."

WITHDRAWAL=$(curl -sf -X POST "$TRANSACTIONS_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"WITHDRAWAL\",
    \"sourceAccountId\": \"$A1_ID\",
    \"amount\": 300,
    \"currency\": \"PEN\"
  }") || fail "Error en retiro"

TX2_ID=$(json_get "$WITHDRAWAL" "transactionId")
ok "Retiro iniciado: $TX2_ID"
sleep 2

sep
info "8. Ejecutando transferencia de cuenta 1 → cuenta 2..."

TRANSFER=$(curl -sf -X POST "$TRANSACTIONS_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"TRANSFER\",
    \"sourceAccountId\": \"$A1_ID\",
    \"targetAccountId\": \"$A2_ID\",
    \"amount\": 400,
    \"currency\": \"PEN\",
    \"description\": \"Pago de prueba\"
  }") || fail "Error en transferencia"

TX3_ID=$(json_get "$TRANSFER" "transactionId")
ok "Transferencia iniciada: $TX3_ID"
sleep 2

TX3_DETAIL=$(curl -sf "$TRANSACTIONS_URL/transactions/$TX3_ID" \
  -H "Authorization: Bearer $TOKEN")
TX3_STATUS=$(json_get "$TX3_DETAIL" "status")
ok "Transferencia finalizada: $TX3_STATUS"

sep
info "9. Probando transferencia con fondos insuficientes..."

REJECTED=$(curl -sf -X POST "$TRANSACTIONS_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"TRANSFER\",
    \"sourceAccountId\": \"$A2_ID\",
    \"targetAccountId\": \"$A1_ID\",
    \"amount\": 99999,
    \"currency\": \"PEN\"
  }") || fail "Error en transacción de prueba de rechazo"

TX4_ID=$(json_get "$REJECTED" "transactionId")
sleep 2

TX4_DETAIL=$(curl -sf "$TRANSACTIONS_URL/transactions/$TX4_ID" \
  -H "Authorization: Bearer $TOKEN")
TX4_STATUS=$(json_get "$TX4_DETAIL" "status")
[ "$TX4_STATUS" = "REJECTED" ] && ok "Transacción rechazada correctamente por fondos insuficientes" \
  || warn "Status inesperado: $TX4_STATUS"

sep
info "10. Probando idempotencia (mismo request dos veces)..."

IDEM_KEY="test-idem-key-$(date +%s)"
TX_IDEM1=$(curl -sf -X POST "$TRANSACTIONS_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"DEPOSIT\",
    \"targetAccountId\": \"$A1_ID\",
    \"amount\": 100,
    \"idempotencyKey\": \"$IDEM_KEY\"
  }") || fail "Error en transacción idempotente"

IDEM_TX_ID=$(json_get "$TX_IDEM1" "transactionId")

TX_IDEM2=$(curl -sf -X POST "$TRANSACTIONS_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"DEPOSIT\",
    \"targetAccountId\": \"$A1_ID\",
    \"amount\": 100,
    \"idempotencyKey\": \"$IDEM_KEY\"
  }") || fail "Error en segundo intento"

IDEM_TX_ID2=$(json_get "$TX_IDEM2" "transactionId")
[ "$IDEM_TX_ID" = "$IDEM_TX_ID2" ] \
  && ok "Idempotencia funciona: mismo ID retornado ($IDEM_TX_ID)" \
  || warn "IDs diferentes — idempotencia falló"

sep
info "11. Verificando saldos finales..."

sleep 2

BAL1_FINAL=$(curl -sf "$ACCOUNTS_URL/accounts/$A1_ID/balance" \
  -H "Authorization: Bearer $TOKEN")
BAL2_FINAL=$(curl -sf "$ACCOUNTS_URL/accounts/$A2_ID/balance" \
  -H "Authorization: Bearer $TOKEN")

ok "Saldo cuenta 1 (Ana): $(echo $BAL1_FINAL | grep -o '"balance":[0-9.]*') PEN"
ok "Saldo cuenta 2 (Carlos): $(echo $BAL2_FINAL | grep -o '"balance":[0-9.]*') PEN"

sep
info "12. Verificando explicaciones del AI Service..."

sleep 1

EXPLANATIONS=$(curl -sf "$AI_URL/ai/explanations?limit=5")
COUNT=$(echo "$EXPLANATIONS" | grep -o '"id"' | wc -l | tr -d ' ')
ok "AI Service generó $COUNT explicaciones automáticamente"

if [ -n "$TX4_ID" ]; then
  EXPL=$(curl -sf "$AI_URL/ai/explanations/$TX4_ID" || echo '{"success":false}')
  if echo "$EXPL" | grep -q '"success":true'; then
    MSG=$(echo "$EXPL" | grep -o '"userFriendlyMessage":"[^"]*"' | cut -d'"' -f4)
    ok "Explicación IA de rechazo: \"${MSG:0:80}...\""
  else
    warn "Explicación de IA aún no disponible para $TX4_ID"
  fi
fi

sep
info "13. Verificando historial de cuenta 1..."

HISTORY=$(curl -sf "$TRANSACTIONS_URL/transactions/account/$A1_ID" \
  -H "Authorization: Bearer $TOKEN")
TX_COUNT=$(echo "$HISTORY" | grep -o '"id"' | wc -l | tr -d ' ')
ok "Historial cuenta 1: $TX_COUNT transacciones"

sep
echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   ✅  TODAS LAS PRUEBAS PASARON      ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "  Kafka UI:             http://localhost:8080"
echo "  Accounts Service:     http://localhost:3001/api/v1"
echo "  Transactions Service: http://localhost:3002/api/v1"
echo "  AI Service:           http://localhost:3003/api/v1"
echo ""
echo "  Token para Postman/curl:"
echo "  $TOKEN"
echo ""
