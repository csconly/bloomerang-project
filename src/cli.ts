import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkEligibility, checkEligibilityForOpportunity } from './checkEligibility';
import type { Fixtures } from './types/index';

const usage = [
  'Usage:',
  '  npm run cli -- opening <volunteerId> <openingId>',
  '  npm run cli -- opportunity <volunteerId> <opportunityId>',
].join('\n');

const [mode, volunteerId, secondId] = process.argv.slice(2);

if (!volunteerId || !secondId || (mode !== 'opening' && mode !== 'opportunity')) {
  console.error(usage);
  process.exit(1);
}

const fixtures: Fixtures = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/fixtures.json'), 'utf-8')
);

try {
  const result =
    mode === 'opening'
      ? checkEligibility(volunteerId, secondId, fixtures)
      : checkEligibilityForOpportunity(volunteerId, secondId, fixtures);

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Error: ${(error as Error).message}`);
  process.exit(1);
}
