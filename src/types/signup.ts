export type SignupState = 'CONFIRMED' | 'WAITLISTED';

export type Signup = {
  volunteerId: string;
  openingId: string;
  state: SignupState;
};
