import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkEligibility } from './checkEligibility';
import type { EligibilityResult, Fixtures } from './types/index';

const fixtures: Fixtures = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/fixtures.json'), 'utf-8')
);

type Case = {
  name: string;
  volunteerId: string;
  openingId: string;
  expected: EligibilityResult;
};

const cases: Case[] = JSON.parse(readFileSync(join(__dirname, '../fixtures/cases.json'), 'utf-8'));

const expectResult = (actual: EligibilityResult, expected: EligibilityResult) => {
  expect(actual.status).toBe(expected.status);
  expect([...actual.reasons].sort()).toEqual([...expected.reasons].sort());
};

describe('checkEligibility (fixtures/cases.json)', () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      const result = checkEligibility(testCase.volunteerId, testCase.openingId, fixtures);
      expectResult(result, testCase.expected);
    });
  }
});

// These cover the judgment calls made while resolving spec ambiguities --
// see DECISIONS.md/DECISIONS_LOG.md for the reasoning behind each one.
describe('checkEligibility (supplementary cases for resolved ambiguities)', () => {
  it('DOES_NOT_HAVE_ALL fails when holding ANY listed qualification, not just all of them (Fern/warehouse worked example)', () => {
    const result = checkEligibility('vol-006', 'open-warehouse-mon-loader', fixtures);
    expectResult(result, { status: 'BLOCKED', reasons: ['DISALLOWED_QUALIFICATION'] });
  });

  it('group restriction alone hides its reason entirely', () => {
    const result = checkEligibility('vol-002', 'open-kitchen-sat-cleaner', fixtures);
    expectResult(result, { status: 'BLOCKED', reasons: [] });
  });

  it('group restriction hides only its own reason, other reasons still surface', () => {
    const result = checkEligibility('vol-003', 'open-kitchen-sat-cleaner', fixtures);
    expectResult(result, { status: 'BLOCKED', reasons: ['WAIVER_REQUIRED'] });
  });

  it('two different roles on the same shift are not a schedule conflict -- it is the same time slot, not a separate commitment', () => {
    const result = checkEligibility('vol-002', 'open-meals-tue-full', fixtures);
    expectResult(result, { status: 'BLOCKED', reasons: ['AT_CAPACITY'] });
  });

  it('a qualification rule with an empty list is a no-op', () => {
    const result = checkEligibility('vol-005', 'open-youth-tue-mentor', fixtures);
    expectResult(result, { status: 'ELIGIBLE', reasons: [] });
  });

  it('a blocking reason overrides an otherwise-WAITLIST capacity outcome', () => {
    const result = checkEligibility('vol-005', 'open-meals-tue-server', fixtures);
    expectResult(result, { status: 'BLOCKED', reasons: ['MISSING_QUALIFICATION'] });
  });

  it('a waitlisted signup counts as already signed up, and other reasons still accumulate', () => {
    const result = checkEligibility('vol-003', 'open-meals-tue-server', fixtures);
    expectResult(result, {
      status: 'BLOCKED',
      reasons: ['ALREADY_SIGNED_UP', 'MISSING_QUALIFICATION', 'WAIVER_REQUIRED'],
    });
  });

  it('back-to-back shifts with no gap do not conflict', () => {
    const result = checkEligibility('vol-002', 'open-meals-mon-pm-server', fixtures);
    expectResult(result, { status: 'ELIGIBLE', reasons: [] });
  });
});
