import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkEligibility } from './checkEligibility';
import type { Fixtures } from './types/index';

const [volunteerId, openingId] = process.argv.slice(2);

if (!volunteerId || !openingId) {
  console.error('Usage: npm run cli -- <volunteerId> <openingId>');
  process.exit(1);
}

const fixtures: Fixtures = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/fixtures.json'), 'utf-8')
);

try {
  const result = checkEligibility(volunteerId, openingId, fixtures);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Error: ${(error as Error).message}`);
  process.exit(1);
}
