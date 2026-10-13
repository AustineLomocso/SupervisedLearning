/**
 * Sorts task codes numerically, so "1.2" comes before "1.10".
 * @param {string} a
 * @param {string} b
 */
export function compareTaskCodes(a, b) {
  const [aMajor, aMinor] = a.split('.').map(Number)
  const [bMajor, bMinor] = b.split('.').map(Number)
  return aMajor - bMajor || aMinor - bMinor
}
