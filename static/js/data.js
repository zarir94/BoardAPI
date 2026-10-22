/**
 * BoardAPI - Static Constants and Sample Fixtures
 */

export const BOARDS = [
  { value: 'barisal', label: 'Barisal' },
  { value: 'chittagong', label: 'Chittagong' },
  { value: 'comilla', label: 'Comilla' },
  { value: 'dhaka', label: 'Dhaka' },
  { value: 'dinajpur', label: 'Dinajpur' },
  { value: 'jessore', label: 'Jessore' },
  { value: 'madrasah', label: 'Madrasah' },
  { value: 'mymensingh', label: 'Mymensingh' },
  { value: 'rajshahi', label: 'Rajshahi' },
  { value: 'sylhet', label: 'Sylhet' },
  { value: 'tec', label: 'Technical (TEC)' }
];

export const EXAMS = [
  { value: 'ssc', label: 'SSC (Secondary School Certificate)' },
  { value: 'hsc', label: 'HSC (Higher Secondary Certificate)' },
  { value: 'jsc', label: 'JSC (Junior School Certificate)' },
  { value: 'dibs', label: 'DIBS (Diploma in Business Studies)' }
];

/**
 * Valid sample fixtures for /api/get-result
 */
export const SAMPLE_RESULTS = [
  // JSC Samples
  {
    exam: 'jsc',
    board: 'jessore',
    year: 2021,
    roll: 699943,
    reg: 2113209092
  },
  {
    exam: 'jsc',
    board: 'jessore',
    year: 2021,
    roll: 578585,
    reg: 2113163001
  },
  {
    exam: 'jsc',
    board: 'jessore',
    year: 2021,
    roll: 700478,
    reg: 2113207838
  },

  // SSC Samples
  {
    exam: 'ssc',
    board: 'jessore',
    year: 2026,
    roll: 406981,
    reg: 2313789002
  },
  {
    exam: 'ssc',
    board: 'jessore',
    year: 2026,
    roll: 100127,
    reg: 2313700510
  },
  {
    exam: 'ssc',
    board: 'jessore',
    year: 2025,
    roll: 639623,
    reg: 2213580703
  },
  {
    exam: 'ssc',
    board: 'jessore',
    year: 2024,
    roll: 137132,
    reg: 2113303210
  },
  {
    exam: 'ssc',
    board: 'jessore',
    year: 2024,
    roll: 410814,
    reg: 2113217748
  },
  {
    exam: 'ssc',
    board: 'jessore',
    year: 2025,
    roll: 617381,
    reg: 2213489227
  }
];

/**
 * Valid sample fixtures for /api/get-institutions
 * You can modify or add more items here!
 */
export const SAMPLE_INSTITUTIONS = [
  {
    board: 'jessore',
    exam: 'ssc',
    year: 2025,
    type: 'flat'
  },
  {
    board: 'dhaka',
    exam: 'ssc',
    year: '',
    type: 'nested'
  },
  {
    board: 'comilla',
    exam: 'hsc',
    year: 2024,
    type: 'flat'
  },
  {
    board: 'chittagong',
    exam: 'ssc',
    year: 2023,
    type: 'flat'
  }
];
