const ORACLE_BASE = "https://oracle.agentproof.sh/v1";

/**
 * Query the AgentProof oracle for an agent's trust data.
 * The oracle is publicly queryable — no API key required.
 */
async function getAgentTrust(walletAddress) {
  const url = `${ORACLE_BASE}/agent/${walletAddress}`;

  try {
    const res = await fetch(url);

    if (res.status === 404) {
      return {
        found: false,
        walletAddress,
        trustScore: 0,
        tier: "UNKNOWN",
        signals: {},
        riskFlags: [],
        maxExposure: "$0",
      };
    }

    if (!res.ok) {
      throw new Error(`Oracle returned ${res.status}`);
    }

    const data = await res.json();

    return {
      found: true,
      walletAddress,
      trustScore: data.trustScore ?? data.composite_score ?? 0,
      tier: data.tier || "UNKNOWN",
      signals: data.signals || {},
      riskFlags: data.riskFlags || data.risk_flags || [],
      maxExposure: data.maxExposure || data.max_exposure || "$0",
      name: data.name || null,
      category: data.category || null,
      feedbackCount: data.total_feedback || 0,
      registeredAt: data.registered_at || null,
      sourceChain: data.source_chain || null,
    };
  } catch (err) {
    console.error(`[agentproof] Error querying oracle: ${err.message}`);
    throw err;
  }
}

module.exports = { getAgentTrust };
