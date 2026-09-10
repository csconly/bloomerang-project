import type { EligibilityResult, ReasonCode, Fixtures } from './types/index';

// Rules 1-2 for now: shift/opening status, capacity. Other rules land in later steps.
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

  const reasons: ReasonCode[] = [];
  let waitlistEligible = false;

  if (!shift.isPublished) reasons.push('SHIFT_NOT_PUBLISHED');
  if (!shift.isActive) reasons.push('SHIFT_INACTIVE');
  if (!opening.isActive) reasons.push('OPENING_INACTIVE');

  const existingSignup = fixtures.signups.find(
    (s) => s.volunteerId === volunteerId && s.openingId === openingId
  );

  if (existingSignup) {
    reasons.push('ALREADY_SIGNED_UP');
  } else {
    const confirmedCount = fixtures.signups.filter(
      (s) => s.openingId === openingId && s.state === 'CONFIRMED'
    ).length;

    if (confirmedCount >= opening.maxVolunteers) {
      const waitlistedCount = fixtures.signups.filter(
        (s) => s.openingId === openingId && s.state === 'WAITLISTED'
      ).length;

      if (opening.waitlistMax === 0) {
        reasons.push('AT_CAPACITY');
      } else if (waitlistedCount < opening.waitlistMax) {
        waitlistEligible = true;
      } else {
        reasons.push('WAITLIST_FULL');
      }
    }
  }

  const status = reasons.length > 0 ? 'BLOCKED' : waitlistEligible ? 'WAITLIST' : 'ELIGIBLE';

  return { status, reasons };
};
