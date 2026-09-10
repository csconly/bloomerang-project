import type { EligibilityResult, ReasonCode, Fixtures, QualificationRule, Volunteer } from './types/index';

// DOES_NOT_HAVE_ALL passes when the volunteer holds NONE of the listed
// qualifications. The spec's rule table says "not all", but its own worked
// example (Fern/warehouse) only makes sense under "none" -- see DECISIONS.
const passesQualificationRule = (volunteer: Volunteer, rule: QualificationRule): boolean => {
  const held = new Set(volunteer.qualificationIds);
  if (rule.type === 'HAS_ANY') return rule.qualificationIds.some((id) => held.has(id));
  if (rule.type === 'HAS_ALL') return rule.qualificationIds.every((id) => held.has(id));
  return rule.qualificationIds.every((id) => !held.has(id));
};

// Rules 1-5 for now: shift/opening status, capacity, qualifications, waiver, group restriction. Other rules land in later steps.
export const checkEligibility = (
  volunteerId: string,
  openingId: string,
  fixtures: Fixtures
): EligibilityResult => {
  const volunteer = fixtures.volunteers.find((v) => v.id === volunteerId);
  if (!volunteer) throw new Error(`Unknown volunteer: ${volunteerId}`);

  const opening = fixtures.openings.find((o) => o.id === openingId);
  if (!opening) throw new Error(`Unknown opening: ${openingId}`);

  const shift = fixtures.shifts.find((s) => s.id === opening.shiftId);
  if (!shift) throw new Error(`Unknown shift: ${opening.shiftId}`);

  const opportunity = fixtures.opportunities.find((o) => o.id === shift.opportunityId);
  if (!opportunity) throw new Error(`Unknown opportunity: ${shift.opportunityId}`);

  const reasons: ReasonCode[] = [];
  const addReason = (code: ReasonCode) => {
    if (!reasons.includes(code)) reasons.push(code);
  };
  let waitlistEligible = false;
  let groupBlocked = false;

  if (!shift.isPublished) addReason('SHIFT_NOT_PUBLISHED');
  if (!shift.isActive) addReason('SHIFT_INACTIVE');
  if (!opening.isActive) addReason('OPENING_INACTIVE');

  const existingSignup = fixtures.signups.find(
    (s) => s.volunteerId === volunteerId && s.openingId === openingId
  );

  if (existingSignup) {
    addReason('ALREADY_SIGNED_UP');
  } else {
    const confirmedCount = fixtures.signups.filter(
      (s) => s.openingId === openingId && s.state === 'CONFIRMED'
    ).length;

    if (confirmedCount >= opening.maxVolunteers) {
      const waitlistedCount = fixtures.signups.filter(
        (s) => s.openingId === openingId && s.state === 'WAITLISTED'
      ).length;

      if (opening.waitlistMax === 0) {
        addReason('AT_CAPACITY');
      } else if (waitlistedCount < opening.waitlistMax) {
        waitlistEligible = true;
      } else {
        addReason('WAITLIST_FULL');
      }
    }
  }

  for (const rule of opportunity.qualificationRules) {
    if (!rule.isActive) continue;
    if (!passesQualificationRule(volunteer, rule)) {
      addReason(rule.type === 'DOES_NOT_HAVE_ALL' ? 'DISALLOWED_QUALIFICATION' : 'MISSING_QUALIFICATION');
    }
  }

  if (opportunity.requiredWaiverId) {
    const waiver = fixtures.waivers.find((w) => w.id === opportunity.requiredWaiverId);
    if (!waiver) throw new Error(`Unknown waiver: ${opportunity.requiredWaiverId}`);

    const hasCurrentSignature = volunteer.signedWaivers.some(
      (sw) => sw.waiverId === waiver.id && sw.version === waiver.currentVersion
    );
    if (!hasCurrentSignature) addReason('WAIVER_REQUIRED');
  }

  // Group membership is confidential: this never adds a reason code, only
  // forces BLOCKED. Other rules' reasons still surface normally -- see DECISIONS.
  if (opportunity.restrictedToGroupIds.length > 0) {
    const isMember = opportunity.restrictedToGroupIds.some((groupId) =>
      volunteer.groupIds.includes(groupId)
    );
    if (!isMember) groupBlocked = true;
  }

  const status = reasons.length > 0 || groupBlocked ? 'BLOCKED' : waitlistEligible ? 'WAITLIST' : 'ELIGIBLE';

  return { status, reasons };
};
