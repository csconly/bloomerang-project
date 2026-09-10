export type SignedWaiver = {
  waiverId: string;
  version: number;
};

export type Volunteer = {
  id: string;
  name: string;
  qualificationIds: string[];
  signedWaivers: SignedWaiver[];
  groupIds: string[];
};
