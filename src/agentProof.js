const ORACLE_BASE = "https://oracle.agentproof.sh/v1";
const API_KEY = process.env.AGENTPROOF_API_KEY || null;

/**
 * Query the AgentProof oracle for an agent's trust data.
 * Authenticated via partner API key for higher rate limits
 * and full signal access.
 */
async function getAgentTrust(walletAddress) {
  const url = `${ORACLE_BASE}/agent/${walletAddress}`;
  const headers = {};
  if (API_KEY) {
    headers["X-Api-Key"] = API_KEY;
  }

  try {
    const res = await fetch(url, { headers });

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
