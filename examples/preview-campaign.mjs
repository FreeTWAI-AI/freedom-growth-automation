import { readFile } from 'node:fs/promises';
import { previewPublication } from '../src/index.mjs';

const fixture = JSON.parse(await readFile(new URL('../tests/fixtures/campaign.json', import.meta.url), 'utf8'));
console.log(JSON.stringify(previewPublication(fixture, { channel: 'plain' }), null, 2));
