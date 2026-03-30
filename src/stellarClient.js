const StellarSdk = require("@stellar/stellar-sdk");

const NETWORK = process.env.STELLAR_NETWORK || "TESTNET";
const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

function getKeypair() {
  const secret = process.env.STELLAR_SECRET_KEY;
  if (!secret) throw new Error("STELLAR_SECRET_KEY not set");
  return StellarSdk.Keypair.fromSecret(secret);
}

function getPublicKey() {
  if (process.env.STELLAR_PUBLIC_KEY) return process.env.STELLAR_PUBLIC_KEY;
  return getKeypair().publicKey();
}

/**
 * Verify that a payment was made to our wallet.
 * Checks recent transactions for a matching payment.
 */
async function verifyPayment(paymentHash) {
  try {
    const tx = await server.transactions().transaction(paymentHash).call();

    if (!tx) return { verified: false, reason: "Transaction not found" };

    // Check the transaction was successful
    if (!tx.successful) {
      return { verified: false, reason: "Transaction failed" };
    }

    // Get operations to verify payment details
    const ops = await server.operations().forTransaction(paymentHash).call();
    const publicKey = getPublicKey();
    const requiredAmount = process.env.PAYMENT_AMOUNT || "0.10";

    for (const op of ops.records) {
      if (op.type === "payment" && op.to === publicKey) {
        const amount = parseFloat(op.amount);
        const required = parseFloat(requiredAmount);

        if (amount >= required) {
          return {
            verified: true,
            from: op.from,
            to: op.to,
            amount: op.amount,
            asset: op.asset_type === "native" ? "XLM" : op.asset_code,
            txHash: paymentHash,
            ledger: tx.ledger,
          };
        }
      }
    }

    return { verified: false, reason: "No matching payment found in transaction" };
  } catch (err) {
    return { verified: false, reason: `Verification error: ${err.message}` };
  }
}

/**
 * Build the 402 payment instructions for Stellar testnet.
 */
function buildPaymentInstructions(resource) {
  const publicKey = getPublicKey();
  const amount = process.env.PAYMENT_AMOUNT || "0.10";

  return {
    error: "Payment Required",
    message: "This endpoint requires an x402 micropayment on Stellar testnet",
    accepts: [
      {
        scheme: "x402",
        network: "stellar-testnet",
        payTo: publicKey,
        amount,
        asset: "native",
        assetName: "XLM",
        resource,
        description: "AgentProof trust-gated agent report",
        merchantName: "AgentProof Oracle",
      },
    ],
    instructions: {
      step1: `Send ${amount} XLM to ${publicKey} on Stellar testnet`,
      step2: "Include the transaction hash in the X-PAYMENT header",
      step3: "Retry your request with the X-PAYMENT header",
      stellarExplorer: `https://stellar.expert/explorer/testnet/account/${publicKey}`,
      friendbot: "https://friendbot.stellar.org/?addr=YOUR_ADDRESS",
    },
  };
}

module.exports = {
  server,
  getKeypair,
  getPublicKey,
  verifyPayment,
  buildPaymentInstructions,
};
