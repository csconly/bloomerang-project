import type { Organization } from './organization';
import type { Qualification } from './qualification';
import type { Group } from './group';
import type { Waiver } from './waiver';
import type { Volunteer } from './volunteer';
import type { Opportunity } from './opportunity';
import type { Shift } from './shift';
import type { Opening } from './opening';
import type { Signup } from './signup';

export type Fixtures = {
  organizations: Organization[];
  qualifications: Qualification[];
  groups: Group[];
  waivers: Waiver[];
  volunteers: Volunteer[];
  opportunities: Opportunity[];
  shifts: Shift[];
  openings: Opening[];
  signups: Signup[];
};
