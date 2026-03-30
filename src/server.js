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

// Demo endpoint — shows example flow with real agent data
app.get("/demo", async (_req, res) => {
  try {
    // Example agents — mix of trust levels
    const examples = {
      description:
        "AgentProof trust-gated x402 API on Stellar. Pay with XLM, get tiered trust reports.",
      flow: [
        "1. GET /agent-report/:walletAddress",
        "2. Receive 402 + Stellar payment instructions",
        "3. Send XLM on Stellar testnet to oracle wallet",
        "4. Retry with X-PAYMENT: <stellar_tx_hash>",
        "5. Receive tiered trust report based on agent reputation",
      ],
      tiers: {
        "HIGH_RISK (0-30)": "Basic response — score, tier, blocked flag",
        "MEDIUM (31-60)": "Standard — score, signals, risk flags",
        "TRUSTED (61-100)": "Full report — all signals, max exposure, insurance tier",
      },
      tryIt: {
        endpoint: "/agent-report/<wallet_address>",
        paymentRequired: `${process.env.PAYMENT_AMOUNT || "0.10"} XLM on Stellar testnet`,
        payTo: getPublicKey(),
        getFreeXLM: "https://friendbot.stellar.org/?addr=YOUR_ADDRESS",
      },
      oracle: "https://oracle.agentproof.sh",
      leaderboard: "https://agentproof.sh",
    };

    res.json(examples);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
