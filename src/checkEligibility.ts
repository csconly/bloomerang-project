import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  EligibilityResult,
  EligibilityStatus,
  ReasonCode,
  Fixtures,
  QualificationRule,
  Volunteer,
  Opening,
  Opportunity,
  Shift,
} from './types/index';

// Stands in for a database read. A real implementation would query one here
// instead -- checkEligibility's signature wouldn't need to change either way.
const fixtures: Fixtures = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/fixtures.json'), 'utf-8')
);

// DOES_NOT_HAVE_ALL passes when the volunteer holds NONE of the listed
// qualifications. The spec's rule table says "not all", but its own worked
// example (Fern/warehouse) only makes sense under "none" -- see DECISIONS.
const passesQualificationRule = (volunteer: Volunteer, rule: QualificationRule): boolean => {
  const held = new Set(volunteer.qualificationIds);
  if (rule.type === 'HAS_ANY') return rule.qualificationIds.some((id) => held.has(id));
  if (rule.type === 'HAS_ALL') return rule.qualificationIds.every((id) => held.has(id));
  return rule.qualificationIds.every((id) => !held.has(id));
};

// Touching endpoints don't overlap (a shift ending at 12:00 and another
// starting at 12:00 is fine).
const shiftsOverlap = (a: Shift, b: Shift): boolean =>
  new Date(a.startsAt) < new Date(b.endsAt) && new Date(b.startsAt) < new Date(a.endsAt);

const addUnique = (reasons: ReasonCode[], code: ReasonCode) => {
  if (!reasons.includes(code)) reasons.push(code);
};

type OpportunityLevelResult = {
  reasons: ReasonCode[];
  groupBlocked: boolean;
};

// Rules 3-5: qualifications, waiver, group restriction. Depends only on the
// volunteer and the opportunity -- identical for every opening under it, so
// checkEligibilityForOpportunity computes this once and reuses it.
const getOpportunityLevelReasons = (
  volunteer: Volunteer,
  opportunity: Opportunity
): OpportunityLevelResult => {
  const reasons: ReasonCode[] = [];
  let groupBlocked = false;

  for (const rule of opportunity.qualificationRules) {
    if (!rule.isActive) continue;
    if (!passesQualificationRule(volunteer, rule)) {
      addUnique(reasons, rule.type === 'DOES_NOT_HAVE_ALL' ? 'DISALLOWED_QUALIFICATION' : 'MISSING_QUALIFICATION');
    }
  }

  if (opportunity.requiredWaiverId) {
    const waiver = fixtures.waivers.find((w) => w.id === opportunity.requiredWaiverId);
    if (!waiver) throw new Error(`Unknown waiver: ${opportunity.requiredWaiverId}`);

    const hasCurrentSignature = volunteer.signedWaivers.some(
      (sw) => sw.waiverId === waiver.id && sw.version === waiver.currentVersion
    );
    if (!hasCurrentSignature) addUnique(reasons, 'WAIVER_REQUIRED');
  }

  // Group membership is confidential: this never adds a reason code, only
  // forces BLOCKED. Other rules' reasons still surface normally -- see DECISIONS.
  if (opportunity.restrictedToGroupIds.length > 0) {
    const isMember = opportunity.restrictedToGroupIds.some((groupId) =>
      volunteer.groupIds.includes(groupId)
    );
    if (!isMember) groupBlocked = true;
  }

  return { reasons, groupBlocked };
};

type OpeningLevelResult = {
  reasons: ReasonCode[];
  waitlistEligible: boolean;
};

// Rules 1, 2, 6: shift/opening status, capacity, schedule conflict. Genuinely
// varies per opening, so this always runs once per opening either way.
const getOpeningLevelReasons = (
  volunteerId: string,
  opening: Opening,
  shift: Shift
): OpeningLevelResult => {
  const reasons: ReasonCode[] = [];
  let waitlistEligible = false;

  if (!shift.isPublished) addUnique(reasons, 'SHIFT_NOT_PUBLISHED');
  if (!shift.isActive) addUnique(reasons, 'SHIFT_INACTIVE');
  if (!opening.isActive) addUnique(reasons, 'OPENING_INACTIVE');

  const existingSignup = fixtures.signups.find(
    (s) => s.volunteerId === volunteerId && s.openingId === opening.id
  );

  if (existingSignup) {
    addUnique(reasons, 'ALREADY_SIGNED_UP');
  } else {
    const confirmedCount = fixtures.signups.filter(
      (s) => s.openingId === opening.id && s.state === 'CONFIRMED'
    ).length;

    if (confirmedCount >= opening.maxVolunteers) {
      const waitlistedCount = fixtures.signups.filter(
        (s) => s.openingId === opening.id && s.state === 'WAITLISTED'
      ).length;

      if (opening.waitlistMax === 0) {
        addUnique(reasons, 'AT_CAPACITY');
      } else if (waitlistedCount < opening.waitlistMax) {
        waitlistEligible = true;
      } else {
        addUnique(reasons, 'WAITLIST_FULL');
      }
    }
  }

  // A confirmed signup on this exact shift (whichever opening) is the same
  // time slot, not a separate commitment -- only compare against genuinely
  // different shifts.
  const hasScheduleConflict = fixtures.signups
    .filter((s) => s.volunteerId === volunteerId && s.state === 'CONFIRMED')
    .some((s) => {
      const otherOpening = fixtures.openings.find((o) => o.id === s.openingId);
      if (!otherOpening) throw new Error(`Unknown opening: ${s.openingId}`);

      const otherShift = fixtures.shifts.find((sh) => sh.id === otherOpening.shiftId);
      if (!otherShift) throw new Error(`Unknown shift: ${otherOpening.shiftId}`);

      return otherShift.id !== shift.id && shiftsOverlap(shift, otherShift);
    });

  if (hasScheduleConflict) addUnique(reasons, 'SCHEDULE_CONFLICT');

  return { reasons, waitlistEligible };
};

const combine = (
  opportunityLevel: OpportunityLevelResult,
  openingLevel: OpeningLevelResult
): EligibilityResult => {
  const reasons: ReasonCode[] = [...opportunityLevel.reasons];
  for (const code of openingLevel.reasons) addUnique(reasons, code);

  const status: EligibilityStatus =
    reasons.length > 0 || opportunityLevel.groupBlocked
      ? 'BLOCKED'
      : openingLevel.waitlistEligible
        ? 'WAITLIST'
        : 'ELIGIBLE';

  return { status, reasons };
};

// All 6 rules: shift/opening status, capacity, qualifications, waiver, group restriction, schedule conflict.
export const checkEligibility = (volunteerId: string, openingId: string): EligibilityResult => {
  const volunteer = fixtures.volunteers.find((v) => v.id === volunteerId);
  if (!volunteer) throw new Error(`Unknown volunteer: ${volunteerId}`);

  const opening = fixtures.openings.find((o) => o.id === openingId);
  if (!opening) throw new Error(`Unknown opening: ${openingId}`);

  const shift = fixtures.shifts.find((s) => s.id === opening.shiftId);
  if (!shift) throw new Error(`Unknown shift: ${opening.shiftId}`);

  const opportunity = fixtures.opportunities.find((o) => o.id === shift.opportunityId);
  if (!opportunity) throw new Error(`Unknown opportunity: ${shift.opportunityId}`);

  const opportunityLevel = getOpportunityLevelReasons(volunteer, opportunity);
  const openingLevel = getOpeningLevelReasons(volunteerId, opening, shift);

  return combine(opportunityLevel, openingLevel);
};

export type OpeningEligibility = {
  openingId: string;
  status: EligibilityStatus;
  reasons: ReasonCode[];
};

// Nice-to-have: check every opening under one opportunity for a volunteer in
// one call. The opportunity-level rules (quals, waiver, group) are computed
// once here instead of once per opening -- see the shared helpers above.
export const checkEligibilityForOpportunity = (
  volunteerId: string,
  opportunityId: string
): OpeningEligibility[] => {
  const volunteer = fixtures.volunteers.find((v) => v.id === volunteerId);
  if (!volunteer) throw new Error(`Unknown volunteer: ${volunteerId}`);

  const opportunity = fixtures.opportunities.find((o) => o.id === opportunityId);
  if (!opportunity) throw new Error(`Unknown opportunity: ${opportunityId}`);

  const opportunityLevel = getOpportunityLevelReasons(volunteer, opportunity);

  const shifts = fixtures.shifts.filter((s) => s.opportunityId === opportunityId);
  const openings = fixtures.openings.filter((o) => shifts.some((s) => s.id === o.shiftId));

  return openings.map((opening) => {
    const shift = shifts.find((s) => s.id === opening.shiftId);
    if (!shift) throw new Error(`Unknown shift: ${opening.shiftId}`);

    const openingLevel = getOpeningLevelReasons(volunteerId, opening, shift);
    const { status, reasons } = combine(opportunityLevel, openingLevel);

    return { openingId: opening.id, status, reasons };
  });
};
