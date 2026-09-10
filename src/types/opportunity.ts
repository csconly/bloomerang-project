export type QualificationRuleType = 'HAS_ANY' | 'HAS_ALL' | 'DOES_NOT_HAVE_ALL';

export type QualificationRule = {
  id: string;
  type: QualificationRuleType;
  qualificationIds: string[];
  isActive: boolean;
};

export type Opportunity = {
  id: string;
  organizationId: string;
  name: string;
  city: string;
  requiredWaiverId: string | null;
  restrictedToGroupIds: string[];
  qualificationRules: QualificationRule[];
};
