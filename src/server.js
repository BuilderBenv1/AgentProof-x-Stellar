const express = require("express");
const path = require("path");
const {
  verifyPayment,
  buildPaymentInstructions,
  getPublicKey,
} = require("./stellarClient");
const { getAgentTrust } = require("./agentProof");
const { buildTieredResponse } = require("./tierLogic");

const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "X-PAYMENT, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "stellar-agentproof",
    network: "stellar-testnet",
    oracle: "https://oracle.agentproof.sh",
    payTo: getPublicKey(),
    version: "1.0.0",
  });
});

// Demo endpoint — structured for AI agents to parse and use immediately
app.get("/demo", (_req, res) => {
  const publicKey = getPublicKey();
  const amount = process.env.PAYMENT_AMOUNT || "0.10";

  res.json({
    service: "AgentProof trust-gated x402 API on Stellar",
    version: "1.0.0",
    description:
      "Pay with XLM on Stellar testnet, get tiered trust reports based on on-chain agent reputation. Response detail scales with the queried agent's trust score.",
    howToUse: {
      step1: { action: "GET /agent-report/:walletAddress", result: "Returns 402 with payment instructions" },
      step2: { action: `Send ${amount} XLM to ${publicKey} on Stellar testnet`, result: "You receive a Stellar transaction hash", getFreeXLM: "https://friendbot.stellar.org/?addr=YOUR_ADDRESS" },
      step3: { action: "GET /agent-report/:walletAddress with header X-PAYMENT: <tx_hash>", result: "Returns tiered trust report" },
    },
    payment: {
      network: "stellar-testnet",
      asset: "XLM (native)",
      amount,
      payTo: publicKey,
      explorer: `https://stellar.expert/explorer/testnet/account/${publicKey}`,
    },
    tiers: [
      { range: "0-30", tier: "HIGH_RISK", access: "basic", fields: ["trustScore", "tier", "blocked"] },
      { range: "31-60", tier: "MEDIUM", access: "standard", fields: ["trustScore", "tier", "name", "signals", "riskFlags", "feedbackCount"] },
      { range: "61-100", tier: "TRUSTED", access: "full", fields: ["trustScore", "tier", "name", "signals", "riskFlags", "feedbackCount", "maxExposure", "insuranceTier", "registeredAt"] },
    ],
    testAgents: {
      note: "Find real agent addresses at https://agentproof.sh — use wallet addresses from the leaderboard",
      oracle: "https://oracle.agentproof.sh/v1/agent/:walletAddress",
    },
    endpoints: {
      "/agent-report/:walletAddress": "x402 gated — tiered trust report",
      "/demo": "Free — this endpoint, API docs for agents",
      "/health": "Free — server status and payment wallet",
    },
  });
});

// Main paid endpoint — x402 gated
app.get("/agent-report/:walletAddress", async (req, res) => {
  const { walletAddress } = req.params;
  const paymentHeader = req.headers["x-payment"];

  // No payment → 402
  if (!paymentHeader) {
    res.status(402).json(buildPaymentInstructions(`/agent-report/${walletAddress}`));
    return;
  }

  // Verify payment on Stellar testnet
  const payment = await verifyPayment(paymentHeader);

  if (!payment.verified) {
    res.status(402).json({
      error: "Payment verification failed",
      reason: payment.reason,
      ...buildPaymentInstructions(`/agent-report/${walletAddress}`),
    });
    return;
  }

  // Payment verified — query AgentProof oracle
  try {
    const agentData = await getAgentTrust(walletAddress);

    const response = buildTieredResponse(agentData, {
      stellarTxHash: payment.txHash,
      from: payment.from,
      amount: payment.amount,
      asset: payment.asset,
      ledger: payment.ledger,
      explorer: `https://stellar.expert/explorer/testnet/tx/${payment.txHash}`,
    });

    res.json(response);
  } catch (err) {
    console.error("[server] Error:", err);
    res.status(500).json({ error: "Failed to fetch agent trust data" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[stellar-agentproof] Running on port ${PORT}`);
  console.log(`[stellar-agentproof] Wallet: ${getPublicKey()}`);
  console.log(`[stellar-agentproof] GET /agent-report/:walletAddress (x402 gated)`);
  console.log(`[stellar-agentproof] GET /demo`);
  console.log(`[stellar-agentproof] GET /health`);
});

module.exports = app;
