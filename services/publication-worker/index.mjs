import { renderPlainPreview, renderLinePreview } from '../../packages/channel-adapters/index.mjs';

/** Render locally while preserving the exact source observation saved by Platform. */
export function previewPublication(campaign, { channel = 'plain' } = {}) {
  if (!campaign || typeof campaign.campaign_id !== 'string' || !Number.isSafeInteger(campaign.aggregate_version) || campaign.aggregate_version < 1) {
    throw new TypeError('Preview a saved campaign returned by Platform.');
  }
  if (!campaign.source_snapshot || typeof campaign.source_snapshot !== 'object' || Array.isArray(campaign.source_snapshot)
      || typeof campaign.source_sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(campaign.source_sha256)
      || typeof campaign.content_sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(campaign.content_sha256)) {
    throw new TypeError('The saved campaign must include its source_snapshot, source_sha256 and content_sha256.');
  }
  const render = channel === 'plain' ? renderPlainPreview : channel === 'line' ? renderLinePreview : null;
  if (!render) throw new TypeError('Supported local preview channels: plain, line.');
  return {
    mode: 'local_preview',
    publication_status: 'not_published',
    provider_action: false,
    campaign_id: campaign.campaign_id,
    aggregate_version: campaign.aggregate_version,
    source_snapshot: structuredClone(campaign.source_snapshot),
    source_sha256: campaign.source_sha256,
    content_sha256: campaign.content_sha256,
    hashes: 'preserved_from_platform_not_recomputed',
    content: render(campaign),
  };
}
