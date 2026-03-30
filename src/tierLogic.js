/**
 * Maps a trust score to a response tier and filters the response accordingly.
 *
 * Score 0-30  (HIGH RISK): Basic — score, tier, blocked flag only
 * Score 31-60 (MEDIUM):    Standard — score, signals breakdown, risk flags
 * Score 61-100 (TRUSTED):  Full — complete trust report, all signals, max exposure
 */
function buildTieredResponse(agentData, paymentInfo) {
  const score = agentData.trustScore;
  const base = {
    walletAddress: agentData.walletAddress,
    trustScore: score,
    payment: paymentInfo,
    timestamp: new Date().toISOString(),
    oracle: "https://oracle.agentproof.sh",
  };

  // HIGH RISK: 0-30
  if (score <= 30) {
    return {
      ...base,
      tier: "HIGH_RISK",
      accessLevel: "basic",
      blocked: score < 10,
      message:
        score < 10
          ? "Agent is blocked — trust score critically low"
          : "Agent is high risk — limited data available",
    };
  }

  // MEDIUM: 31-60
  if (score <= 60) {
    return {
      ...base,
      tier: "MEDIUM",
      accessLevel: "standard",
      blocked: false,
      name: agentData.name,
      category: agentData.category,
      feedbackCount: agentData.feedbackCount,
      sourceChain: agentData.sourceChain,
      signals: agentData.signals,
      riskFlags: agentData.riskFlags,
      message: "Agent has moderate trust — standard report provided",
    };
  }

  // TRUSTED: 61-100
  return {
    ...base,
    tier: "TRUSTED",
    accessLevel: "full",
    blocked: false,
    name: agentData.name,
    category: agentData.category,
    feedbackCount: agentData.feedbackCount,
    sourceChain: agentData.sourceChain,
    registeredAt: agentData.registeredAt,
    signals: agentData.signals,
    riskFlags: agentData.riskFlags,
    maxExposure: agentData.maxExposure,
    insuranceTier: score >= 80 ? "PREMIUM" : "STANDARD",
    message: "Agent is trusted — full report provided",
  };
}

module.exports = { buildTieredResponse };
