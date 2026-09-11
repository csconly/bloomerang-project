import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkEligibility, checkEligibilityForOpportunity } from './checkEligibility';
import type { EligibilityResult, Fixtures } from './types/index';

// Independent load, just for computing expected values below -- not passed
// into checkEligibility, which loads its own data internally.
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
      const result = checkEligibility(testCase.volunteerId, testCase.openingId);
      expectResult(result, testCase.expected);
    });
  }
});

// These cover the judgment calls made while resolving spec ambiguities --
// see DECISIONS.md/DECISIONS_LOG.md for the reasoning behind each one.
describe('checkEligibility (supplementary cases for resolved ambiguities)', () => {
  it('DOES_NOT_HAVE_ALL fails when holding ANY listed qualification, not just all of them (Fern/warehouse worked example)', () => {
    const result = checkEligibility('vol-006', 'open-warehouse-mon-loader');
    expectResult(result, { status: 'BLOCKED', reasons: ['DISALLOWED_QUALIFICATION'] });
  });

  it('group restriction alone hides its reason entirely', () => {
    const result = checkEligibility('vol-002', 'open-kitchen-sat-cleaner');
    expectResult(result, { status: 'BLOCKED', reasons: [] });
  });

  it('group restriction hides only its own reason, other reasons still surface', () => {
    const result = checkEligibility('vol-003', 'open-kitchen-sat-cleaner');
    expectResult(result, { status: 'BLOCKED', reasons: ['WAIVER_REQUIRED'] });
  });

  it('two different roles on the same shift are not a schedule conflict -- it is the same time slot, not a separate commitment', () => {
    const result = checkEligibility('vol-002', 'open-meals-tue-full');
    expectResult(result, { status: 'BLOCKED', reasons: ['AT_CAPACITY'] });
  });

  it('a qualification rule with an empty list is a no-op', () => {
    const result = checkEligibility('vol-005', 'open-youth-tue-mentor');
    expectResult(result, { status: 'ELIGIBLE', reasons: [] });
  });

  it('a blocking reason overrides an otherwise-WAITLIST capacity outcome', () => {
    const result = checkEligibility('vol-005', 'open-meals-tue-server');
    expectResult(result, { status: 'BLOCKED', reasons: ['MISSING_QUALIFICATION'] });
  });

  it('a waitlisted signup counts as already signed up, and other reasons still accumulate', () => {
    const result = checkEligibility('vol-003', 'open-meals-tue-server');
    expectResult(result, {
      status: 'BLOCKED',
      reasons: ['ALREADY_SIGNED_UP', 'MISSING_QUALIFICATION', 'WAIVER_REQUIRED'],
    });
  });

  it('back-to-back shifts with no gap do not conflict', () => {
    const result = checkEligibility('vol-002', 'open-meals-mon-pm-server');
    expectResult(result, { status: 'ELIGIBLE', reasons: [] });
  });
});

// The bulk function shares logic with checkEligibility rather than
// duplicating it, so these prove equivalence rather than re-asserting
// hardcoded expected reasons -- the per-opening tests above already cover
// correctness of the underlying rules.
describe('checkEligibilityForOpportunity', () => {
  const expectMatchesCheckEligibility = (volunteerId: string, opportunityId: string) => {
    const bulkResults = checkEligibilityForOpportunity(volunteerId, opportunityId);

    const expectedOpeningIds = fixtures.openings
      .filter((o) => fixtures.shifts.some((s) => s.id === o.shiftId && s.opportunityId === opportunityId))
      .map((o) => o.id)
      .sort();

    expect(bulkResults.map((r) => r.openingId).sort()).toEqual(expectedOpeningIds);

    for (const result of bulkResults) {
      const individual = checkEligibility(volunteerId, result.openingId);
      expectResult(result, individual);
    }
  };

  it('matches checkEligibility for every opening under opp-meals (5 shifts, capacity/waiver/schedule mix)', () => {
    expectMatchesCheckEligibility('vol-002', 'opp-meals');
  });

  it('matches checkEligibility for every opening under opp-warehouse (schedule conflict + qualification rules)', () => {
    expectMatchesCheckEligibility('vol-004', 'opp-warehouse');
  });

  it('matches checkEligibility for every opening under opp-kitchen (group restriction)', () => {
    expectMatchesCheckEligibility('vol-003', 'opp-kitchen');
  });

  it('throws for an unknown opportunity', () => {
    expect(() => checkEligibilityForOpportunity('vol-001', 'bogus-opp')).toThrow();
  });

  it('throws for an unknown volunteer', () => {
    expect(() => checkEligibilityForOpportunity('bogus-vol', 'opp-meals')).toThrow();
  });
});
