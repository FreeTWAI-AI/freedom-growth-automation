/** Prepare an API command body locally. No job is claimed, saved, or published. */
export function prepareCampaignDraft({ title, audience, goal, draftText, source } = {}) {
  const limits = { title: 120, audience: 1000, goal: 1000, draft_text: 6000 };
  const body = { title, audience, goal, draft_text: draftText };
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > limit) {
      throw new TypeError(`${field} must contain 1–${limit} characters.`);
    }
    body[field] = body[field].trim();
  }
  body.source_project_id = null;
  body.source_supplier_product_id = null;
  body.source_brief = '';
  if (source?.kind === 'oss_project') {
    body.source_project_id = sourceId(source.project_id, 'project_id');
  } else if (source?.kind === 'supplier_product') {
    body.source_supplier_product_id = sourceId(source.product_id, 'product_id');
  } else if (source?.kind === 'manual_brief' && typeof source.brief === 'string' && source.brief.trim() && source.brief.trim().length <= 3000) {
    body.source_brief = source.brief.trim();
  } else {
    throw new TypeError('Choose one saved oss_project, supplier_product, or a nonempty manual_brief (up to 3000 characters).');
  }
  return body;
}

function sourceId(value, field) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError(`Use the canonical ${field} UUID returned by Platform.`);
  }
  return value;
}
