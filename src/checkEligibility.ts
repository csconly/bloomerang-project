import type { EligibilityResult, ReasonCode, Fixtures } from './types/index';

// Rule 1 only for now: shift and opening status. Other rules land in later steps.
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

  if (!shift.isPublished) reasons.push('SHIFT_NOT_PUBLISHED');
  if (!shift.isActive) reasons.push('SHIFT_INACTIVE');
  if (!opening.isActive) reasons.push('OPENING_INACTIVE');

  return {
    status: reasons.length > 0 ? 'BLOCKED' : 'ELIGIBLE',
    reasons,
  };
};
