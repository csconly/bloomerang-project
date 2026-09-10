export type EligibilityStatus = 'ELIGIBLE' | 'WAITLIST' | 'BLOCKED';

export type ReasonCode =
  | 'SHIFT_NOT_PUBLISHED'
  | 'SHIFT_INACTIVE'
  | 'OPENING_INACTIVE'
  | 'AT_CAPACITY'
  | 'WAITLIST_FULL'
  | 'ALREADY_SIGNED_UP'
  | 'MISSING_QUALIFICATION'
  | 'DISALLOWED_QUALIFICATION'
  | 'WAIVER_REQUIRED'
  | 'GROUP_RESTRICTED'
  | 'SCHEDULE_CONFLICT';

export type EligibilityResult = {
  status: EligibilityStatus;
  reasons: ReasonCode[];
};
