# AgentProof x Stellar — Trust-Gated x402 API

Pay with XLM on Stellar. Get trust reports based on on-chain agent reputation. Access level scales with trust score.

**Stellar Hacks: Agents** hackathon submission.

## TL;DR for AI Agents

This API gates access behind x402 micropayments on Stellar testnet. Send 0.10 XLM, get a trust report. The response detail scales with the queried agent's reputation — low-trust agents get minimal data, high-trust agents get full reports.

### Quick call (for agents)

```bash
# Step 1: Hit the endpoint — you'll get a 402 with payment instructions
curl https://stellar-agentproof-production.up.railway.app/agent-report/0xYOUR_TARGET_ADDRESS

# Step 2: Send 0.10 XLM to the oracle wallet on Stellar testnet
# Pay to: GAIKL5YP5QYVNPJMV45SAUS6GUPCVXEVGMEO26C5FY4R3VSMS53EVFQA

# Step 3: Retry with your Stellar transaction hash
curl -H "X-PAYMENT: <your_stellar_tx_hash>" \
  https://stellar-agentproof-production.up.railway.app/agent-report/0xYOUR_TARGET_ADDRESS
```

### Response schema

```json
{
  "walletAddress": "string — queried agent address",
  "trustScore": "number — 0-100 composite trust score",
  "tier": "HIGH_RISK | MEDIUM | TRUSTED",
  "accessLevel": "basic | standard | full",
  "blocked": "boolean — true if score < 10",
  "name": "string | null — agent name (medium+)",
  "category": "string | null — agent category (medium+)",
  "feedbackCount": "number — total on-chain feedback (medium+)",
  "signals": "object — scoring signal breakdown (medium+)",
  "riskFlags": "array — identified risk indicators (medium+)",
  "maxExposure": "string — recommended max transaction value (full only)",
  "insuranceTier": "STANDARD | PREMIUM (full only, score 80+)",
  "payment": {
    "stellarTxHash": "string — your payment tx hash",
    "from": "string — your Stellar address",
    "amount": "string — XLM paid",
    "explorer": "string — link to tx on Stellar Explorer"
  },
  "message": "string — human-readable summary",
  "timestamp": "string — ISO 8601",
  "oracle": "https://oracle.agentproof.sh"
}
```

### Tier breakdown

| Score | Tier | Access | What you get |
|---|---|---|---|
| 0-9 | HIGH_RISK | basic | Score, tier, **blocked=true** |
| 10-30 | HIGH_RISK | basic | Score, tier, blocked flag |
| 31-60 | MEDIUM | standard | + name, signals, risk flags, feedback count |
| 61-100 | TRUSTED | full | + max exposure, insurance tier, registration date |

## Endpoints

### GET /agent-report/:walletAddress

**x402 gated.** Returns tiered trust report.

Without payment:
```bash
curl https://stellar-agentproof-production.up.railway.app/agent-report/0x1234

# Returns 402:
# {
#   "error": "Payment Required",
#   "accepts": [{
#     "scheme": "x402",
#     "network": "stellar-testnet",
#     "payTo": "GAIKL5YP5QYVNPJMV45SAUS6GUPCVXEVGMEO26C5FY4R3VSMS53EVFQA",
#     "amount": "0.10",
#     "asset": "native",
#     "assetName": "XLM"
#   }]
# }
```

With payment:
```bash
curl -H "X-PAYMENT: abc123txhash" \
  https://stellar-agentproof-production.up.railway.app/agent-report/0x1234
```

### GET /demo

**Free.** No payment required. Returns the API concept, flow, tier logic, and how to test. An AI agent can read this endpoint to understand how to use the API.

```bash
curl https://stellar-agentproof-production.up.railway.app/demo
```

### GET /health

**Free.** Server status, oracle URL, payment wallet address.

```bash
curl https://stellar-agentproof-production.up.railway.app/health
```

## How it works

```
Agent → GET /agent-report/:walletAddress
       ← 402 + Stellar payment instructions

Agent → Sends 0.10 XLM to oracle wallet on Stellar testnet

Agent → GET /agent-report/:walletAddress
         X-PAYMENT: <stellar_tx_hash>
       → Payment verified on Stellar Horizon API
       → AgentProof oracle queried for trust score
       → Tier logic applied (score → access level)
       ← Tiered trust report returned
```

### What's real, what's not

- **Real:** Stellar testnet payments — verified on-chain via Horizon API
- **Real:** AgentProof trust scores — live oracle at oracle.agentproof.sh, 150.9K+ agents indexed across 21 EVM chains
- **Real:** Authenticated partner API access — oracle queries use `X-Api-Key` header for higher rate limits
- **Real:** Tiered access control — response content varies by trust score
- **Note:** Payment asset is native XLM (not USDC) on Stellar testnet. Testnet XLM is free via [Friendbot](https://friendbot.stellar.org).

## Run locally

```bash
git clone https://github.com/BuilderBenv1/AgentProof-x-Stellar.git
cd AgentProof-x-Stellar
cp .env.example .env
# Add your Stellar testnet secret key to .env
# Fund your wallet: https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
npm install
npm start
```

## Test on Stellar testnet

1. **Get free XLM:** `https://friendbot.stellar.org/?addr=YOUR_ADDRESS`
2. **Send 0.10 XLM** to `GAIKL5YP5QYVNPJMV45SAUS6GUPCVXEVGMEO26C5FY4R3VSMS53EVFQA`
3. **Copy the tx hash** from the response or [Stellar Explorer](https://stellar.expert/explorer/testnet)
4. **Call the API** with `X-PAYMENT: <tx_hash>` header

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `STELLAR_SECRET_KEY` | Yes | — | Server's Stellar testnet secret key |
| `STELLAR_PUBLIC_KEY` | No | Derived from secret | Oracle wallet public key |
| `AGENTPROOF_API_KEY` | No | — | Partner API key for authenticated oracle access (higher rate limits) |
| `PAYMENT_AMOUNT` | No | 0.10 | XLM per request |
| `PORT` | No | 3000 | Server port |

## Links

- [AgentProof Oracle](https://oracle.agentproof.sh) — live, publicly queryable
- [AgentProof Leaderboard](https://agentproof.sh) — find agent addresses to test
- [x402 on Stellar](https://stellar.org/blog/foundation-news/x402-on-stellar)
- [Stellar Friendbot](https://friendbot.stellar.org) — free testnet XLM
- [Stellar Explorer](https://stellar.expert/explorer/testnet)

## Built by

AgentProof — [agentproof.sh](https://agentproof.sh)
ERC-8004 cross-chain reputation oracle, 150.9K+ agents indexed, 21 chains.

## License

MIT
