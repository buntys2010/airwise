/**
 * How thick the smog looks on screen, from 0.04 (clear) to 1 (thick). It drives the page sky, the sun and the smog layer on the room.
 *
 * It is relative to YOUR exposure: the starting haze comes from today's air (so even moderate air shows visible smog),
 * and applying fixes thins it in proportion to how much of your exposure is left. An absolute scale made moderate days
 * start thin and barely move, which hid the one moment the interface is built around.
 */
export const HAZE_MIN = 0.04;

export function hazeLevel(nowPm: number, baseMeanPm: number, planMeanPm: number): number {
  const ambient = Math.min(1, Math.max(0.45, 0.45 + nowPm / 300)); // 0.45 on a clean day, 1 at 165 µg/m³ and above
  const remaining = baseMeanPm > 0 ? Math.min(1, Math.max(0, planMeanPm / baseMeanPm)) : 1;
  const haze = ambient * (0.15 + 0.85 * remaining); // with nothing left to remove, 15% of the smog still shows
  return Math.min(1, Math.max(HAZE_MIN, haze));
}
