# stellar-agentproof

AgentProof trust-gated x402 API on Stellar. Pay with XLM, get tiered trust reports based on on-chain agent reputation.

Built for **Stellar Hacks: Agents** hackathon.

## Why this matters

AI agents transacting autonomously need a way to assess counterparty risk before settling payments. This API combines Stellar's x402 micropayment protocol with AgentProof's cross-chain reputation oracle to create trust-gated access:

- Low-trust agents get blocked or receive minimal data
- High-trust agents get full reports with insurance tiers and max exposure limits
- Every query requires a real Stellar testnet payment — no free rides

## Architecture

```
Agent → GET /agent-report/:walletAddress
       ← 402 Payment Required (XLM on Stellar testnet)

Agent → Send 0.10 XLM to oracle wallet on Stellar testnet
       → Gets transaction hash

Agent → GET /agent-report/:walletAddress
         Headers: X-PAYMENT: <stellar_tx_hash>
       → Verify payment on Stellar Horizon
       → Query AgentProof oracle for trust score
       → Apply tier logic based on score
       ← Returns tiered trust report

Score 0-30  → HIGH_RISK  → Basic: score, tier, blocked flag
Score 31-60 → MEDIUM     → Standard: score, signals, risk flags
Score 61-100 → TRUSTED   → Full: all signals, max exposure, insurance tier
```

## Quick start

```bash
cp .env.example .env
# Generate a Stellar testnet keypair and add to .env
# Fund it: https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
npm install
npm start
```

## Testing on Stellar testnet

1. **Fund a test wallet** — visit `https://friendbot.stellar.org/?addr=YOUR_ADDRESS`

2. **Hit the endpoint** — it returns 402 with payment instructions:
```bash
curl http://localhost:3000/agent-report/0xYOUR_AGENT_ADDRESS
```

3. **Send payment** — use the Stellar Laboratory or SDK to send 0.10 XLM to the oracle wallet

4. **Retry with payment proof**:
```bash
curl -H "X-PAYMENT: <stellar_tx_hash>" \
  http://localhost:3000/agent-report/0xYOUR_AGENT_ADDRESS
```

5. **View your tx** — `https://stellar.expert/explorer/testnet/tx/<hash>`

## API

### GET /agent-report/:walletAddress
x402 gated. Requires `X-PAYMENT` header with Stellar testnet tx hash.
Returns tiered trust report based on AgentProof score.

### GET /demo
Free. Shows the concept, flow, and how to test.

### GET /health
Free. Server status, oracle info, payment wallet.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `STELLAR_SECRET_KEY` | Yes | Server's Stellar testnet secret key |
| `STELLAR_PUBLIC_KEY` | No | Auto-derived from secret key |
| `PAYMENT_AMOUNT` | No | XLM per request, defaults to 0.10 |
| `PORT` | No | Server port, defaults to 3000 |

## Live demo

https://stellar-agentproof-production.up.railway.app

## Links

- [AgentProof Oracle](https://oracle.agentproof.sh) — live, publicly queryable
- [AgentProof Leaderboard](https://agentproof.sh) — 149.7K+ agents indexed
- [x402 on Stellar](https://stellar.org/blog/foundation-news/x402-on-stellar)
- [Stellar Testnet Friendbot](https://friendbot.stellar.org)

## Built by

AgentProof — [agentproof.sh](https://agentproof.sh)
ERC-8004 cross-chain reputation oracle, 149.7K+ agents indexed, 21 chains.

## License

MIT
