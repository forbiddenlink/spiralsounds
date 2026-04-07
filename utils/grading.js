/**
 * Goldmine Grading Standard for Vinyl Records
 * Industry standard grading system for record condition
 */

/**
 * @typedef {Object} GradeDefinition
 * @property {string} code - Short code (M, NM, VG+, etc.)
 * @property {string} label - Full label (Mint, Near Mint, etc.)
 * @property {string} discogsLabel - Discogs API label format
 * @property {string} description - Human-readable description
 * @property {number} valueMultiplier - Price multiplier relative to base value
 */

/** @type {Record<string, GradeDefinition>} */
export const GRADES = {
  M: {
    code: 'M',
    label: 'Mint',
    discogsLabel: 'Mint (M)',
    description: 'Perfect, unplayed condition. Still sealed or opened but never played.',
    valueMultiplier: 1.0
  },
  NM: {
    code: 'NM',
    label: 'Near Mint',
    discogsLabel: 'Near Mint (NM or M-)',
    description: 'Nearly perfect. May have been played but shows no signs of wear.',
    valueMultiplier: 0.9
  },
  'VG+': {
    code: 'VG+',
    label: 'Very Good Plus',
    discogsLabel: 'Very Good Plus (VG+)',
    description: 'Shows some signs of play. Light surface marks but plays without distortion.',
    valueMultiplier: 0.7
  },
  VG: {
    code: 'VG',
    label: 'Very Good',
    discogsLabel: 'Very Good (VG)',
    description: 'Surface noise evident. Light scratches affect playback. Still enjoyable.',
    valueMultiplier: 0.5
  },
  'G+': {
    code: 'G+',
    label: 'Good Plus',
    discogsLabel: 'Good Plus (G+)',
    description: 'Significant surface noise and scratches. Playable but noticeable degradation.',
    valueMultiplier: 0.25
  },
  G: {
    code: 'G',
    label: 'Good',
    discogsLabel: 'Good (G)',
    description: 'Heavy wear and scratches. May skip or have significant distortion.',
    valueMultiplier: 0.15
  },
  F: {
    code: 'F',
    label: 'Fair',
    discogsLabel: 'Fair (F)',
    description: 'Damaged. Major playback issues. Suitable only for casual listening.',
    valueMultiplier: 0.1
  },
  P: {
    code: 'P',
    label: 'Poor',
    discogsLabel: 'Poor (P)',
    description: 'Barely playable or unplayable. Cracked, warped, or severely damaged.',
    valueMultiplier: 0.05
  }
}

/**
 * Grade ordering from best to worst
 */
export const GRADE_ORDER = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P']

/**
 * Sleeve condition grades (may differ from record)
 */
export const SLEEVE_GRADES = {
  M: {
    code: 'M',
    label: 'Mint',
    description: 'Perfect sleeve. No wear, seam splits, or writing.'
  },
  NM: {
    code: 'NM',
    label: 'Near Mint',
    description: 'Nearly perfect. Minimal signs of handling.'
  },
  'VG+': {
    code: 'VG+',
    label: 'Very Good Plus',
    description: 'Minor wear. Slight ring wear or corner bumps.'
  },
  VG: {
    code: 'VG',
    label: 'Very Good',
    description: 'Obvious wear. Ring wear, seam wear, or writing.'
  },
  G: {
    code: 'G',
    label: 'Good',
    description: 'Heavy wear. Seam splits, tears, or significant damage.'
  },
  F: {
    code: 'F',
    label: 'Fair',
    description: 'Very damaged but intact.'
  },
  P: {
    code: 'P',
    label: 'Poor',
    description: 'Severely damaged or incomplete.'
  },
  GENERIC: {
    code: 'GENERIC',
    label: 'Generic',
    description: 'Not original sleeve. Plain or replacement sleeve.'
  },
  NONE: {
    code: 'NONE',
    label: 'No Sleeve',
    description: 'Record has no sleeve.'
  }
}

/**
 * Get grade definition by code
 * @param {string} code - Grade code
 * @returns {GradeDefinition | undefined}
 */
export function getGrade(code) {
  return GRADES[code.toUpperCase()]
}

/**
 * Get all grades as array for dropdowns
 * @returns {GradeDefinition[]}
 */
export function getAllGrades() {
  return GRADE_ORDER.map(code => GRADES[code])
}

/**
 * Get all sleeve grades as array
 * @returns {Array}
 */
export function getAllSleeveGrades() {
  return Object.values(SLEEVE_GRADES)
}

/**
 * Calculate adjusted price based on grade
 * @param {number} basePrice - Base price (typically NM value)
 * @param {string} gradeCode - Grade code
 * @returns {number}
 */
export function calculateGradedPrice(basePrice, gradeCode) {
  const grade = getGrade(gradeCode)
  if (!grade) return basePrice
  return Math.round(basePrice * grade.valueMultiplier * 100) / 100
}

/**
 * Compare two grades
 * @param {string} gradeA - First grade code
 * @param {string} gradeB - Second grade code
 * @returns {number} - Negative if A is better, positive if B is better, 0 if equal
 */
export function compareGrades(gradeA, gradeB) {
  const indexA = GRADE_ORDER.indexOf(gradeA.toUpperCase())
  const indexB = GRADE_ORDER.indexOf(gradeB.toUpperCase())

  if (indexA === -1 || indexB === -1) {
    throw new Error(`Invalid grade code: ${indexA === -1 ? gradeA : gradeB}`)
  }

  return indexA - indexB
}

/**
 * Check if a grade is playable (G or better)
 * @param {string} gradeCode - Grade code
 * @returns {boolean}
 */
export function isPlayable(gradeCode) {
  const index = GRADE_ORDER.indexOf(gradeCode.toUpperCase())
  return index !== -1 && index <= GRADE_ORDER.indexOf('G')
}

/**
 * Check if a grade is collectible quality (VG+ or better)
 * @param {string} gradeCode - Grade code
 * @returns {boolean}
 */
export function isCollectible(gradeCode) {
  const index = GRADE_ORDER.indexOf(gradeCode.toUpperCase())
  return index !== -1 && index <= GRADE_ORDER.indexOf('VG+')
}

/**
 * Map Discogs condition label to our grade code
 * @param {string} discogsLabel - Discogs condition label
 * @returns {string | null}
 */
export function discogsLabelToGrade(discogsLabel) {
  for (const grade of Object.values(GRADES)) {
    if (grade.discogsLabel === discogsLabel) {
      return grade.code
    }
  }
  return null
}

/**
 * Get Discogs label from our grade code
 * @param {string} gradeCode - Grade code
 * @returns {string | null}
 */
export function gradeToDiscogsLabel(gradeCode) {
  const grade = getGrade(gradeCode)
  return grade?.discogsLabel ?? null
}

export default {
  GRADES,
  GRADE_ORDER,
  SLEEVE_GRADES,
  getGrade,
  getAllGrades,
  getAllSleeveGrades,
  calculateGradedPrice,
  compareGrades,
  isPlayable,
  isCollectible,
  discogsLabelToGrade,
  gradeToDiscogsLabel
}
