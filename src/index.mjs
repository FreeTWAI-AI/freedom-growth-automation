// Inject the pinned Platform client; this package has no DB or provider credentials.
function requireClient(client) {
  if (!client || typeof client.call !== 'function') throw new TypeError('A Platform client with call(operationId, options) is required.');
}

function mutationOptions(options = {}) {
  const { idempotencyKey } = options;
  if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    throw new TypeError('Keep an explicit idempotencyKey for this exact command and reuse it only when retrying that command.');
  }
  return { idempotencyKey };
}

function campaignOptions(campaign, options = {}) {
  if (!campaign || typeof campaign.campaign_id !== 'string' || !campaign.campaign_id.trim()) {
    throw new TypeError('A saved campaign with campaign_id is required.');
  }
  const version = options.version ?? campaign.aggregate_version;
  if (!Number.isSafeInteger(version) || version < 1) throw new TypeError('Use the saved campaign aggregate_version as a positive integer.');
  return { ...mutationOptions(options), params: { id: campaign.campaign_id }, version };
}

function items(result, operationId) {
  if (!result || !Array.isArray(result.items)) throw new TypeError(`${operationId} returned an incompatible response: expected { items: [] }.`);
  return result.items;
}

/** Read the signed-in member's drafts and available source selections. */
export async function loadCampaignWorkspace(client) {
  requireClient(client);
  const operations = ['listCampaigns', 'listProjects', 'listSupplierProducts'];
  const result = await Promise.all(operations.map(operationId => client.call(operationId)));
  return {
    campaigns: items(result[0], operations[0]),
    projects: items(result[1], operations[1]),
    supplierProducts: items(result[2], operations[2]),
  };
}

/** The Platform checks source ownership and captures the immutable source version. */
export async function createCampaignDraft(client, body, options) {
  requireClient(client);
  return client.call('createCampaign', { body, ...mutationOptions(options) });
}

/** Revisions edit draft content, never its source snapshot. Conflicts propagate. */
export async function reviseCampaignDraft(client, campaign, body, options) {
  requireClient(client);
  return client.call('reviseCampaign', { body, ...campaignOptions(campaign, options) });
}

/** Record an already-shared URL as self-reported evidence; this does not publish it. */
export async function recordManualShare(client, campaign, body, options) {
  requireClient(client);
  return client.call('recordShare', { body, ...campaignOptions(campaign, options) });
}

export { prepareCampaignDraft } from '../services/campaign-worker/index.mjs';
export { previewPublication } from '../services/publication-worker/index.mjs';
export { renderPlainPreview, renderLinePreview } from '../packages/channel-adapters/index.mjs';
