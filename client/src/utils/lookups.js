/**
 * Centralized lookup data for dropdown reuse across forms.
 * No more hard-coded ministry / tier / status strings scattered in 15 places.
 */

export const MINISTRIES = [
  'Ministry of Foreign Affairs',
  'Ministry of Finance',
  'Ministry of Home Affairs',
  'Ministry of Federal Affairs and General Administration',
  'Ministry of Education, Science and Technology',
  'Ministry of Health and Population',
  'Ministry of Physical Infrastructure and Transport',
  'Ministry of Agriculture and Livestock Development',
  'Ministry of Industry, Commerce and Supplies',
  'Ministry of Labour, Employment and Social Security',
  'Ministry of Culture, Tourism and Civil Aviation',
  'Ministry of Forests and Environment',
  'Ministry of Energy, Water Resources and Irrigation',
  'Ministry of Communications and Information Technology',
  'Ministry of Urban Development',
  'Ministry of Water Supply',
  'Ministry of Law, Justice and Parliamentary Affairs',
  'Ministry of Defence',
  'Ministry of Land Management, Cooperatives and Poverty Alleviation',
  'Ministry of Youth and Sports',
  'Ministry of Women, Children and Senior Citizens'
];

export const DISTRICT_TIERS = [
  { value: 'A', label: 'Tier A — Urban (Kathmandu, Pokhara)' },
  { value: 'B', label: 'Tier B — Semi-accessible (hill districts)' },
  { value: 'C', label: 'Tier C — Remote (high-altitude, limited access)' },
  { value: 'D', label: 'Tier D — Extreme hardship (Humla, Mugu, Dolpa)' },
  { value: 'Specialist', label: 'Specialist (technical roles)' }
];

export const GRIEVANCE_TYPES = [
  { value: 'exam-score', label: 'Exam score dispute' },
  { value: 'result-dispute', label: 'Result dispute' },
  { value: 'placement-issue', label: 'Placement issue' },
  { value: 'technical-issue', label: 'Technical / system issue' },
  { value: 'other', label: 'Other' }
];

export const GRIEVANCE_STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under-review', label: 'Under review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' }
];

export const EXEMPTION_TYPES = [
  { value: 'medical', label: 'Medical condition' },
  { value: 'disability', label: 'Disability' },
  { value: 'sole-caregiver', label: 'Sole caregiver' },
  { value: 'spouse-remote-post', label: 'Spouse in remote posting' },
  { value: 'child-education', label: 'Child special education needs' }
];

export const APPEAL_TYPES = [
  { value: 'score-challenge', label: 'Score challenge' },
  { value: 'exemption-claim', label: 'Exemption claim' },
  { value: 'posting-request', label: 'Posting request' },
  { value: 'other', label: 'Other' }
];

export const EMERGENCY_TYPES = [
  { value: 'security-threat', label: 'Security threat' },
  { value: 'serious-misconduct', label: 'Serious misconduct' },
  { value: 'medical-evacuation', label: 'Medical evacuation' },
  { value: 'family-emergency', label: 'Family emergency' },
  { value: 'policy-crisis', label: 'Policy crisis' },
  { value: 'other', label: 'Other' }
];

export const DEGREE_LEVELS = [
  'SLC/SEE', '+2/PCL', 'Bachelor', 'Master', 'MPhil', 'PhD'
];

export const PAYMENT_METHODS = [
  { value: 'eSewa', label: 'eSewa' },
  { value: 'Khalti', label: 'Khalti' },
  { value: 'FonePay', label: 'FonePay' },
  { value: 'ConnectIPS', label: 'ConnectIPS' },
  { value: 'Bank', label: 'Bank Transfer' }
];

export const GENDERS = ['Male', 'Female', 'Other'];

export const PROVINCES = [
  'Province No. 1',
  'Madhesh',
  'Bagmati',
  'Gandaki',
  'Lumbini',
  'Karnali',
  'Sudurpaschim'
];
