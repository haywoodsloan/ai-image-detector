import interpolate from 'color-interpolate';

const IndicatorColors = ['lawngreen', 'greenyellow', 'gold', 'orange', 'red'];
const IndicatorColorMap = interpolate(IndicatorColors);

export const DefaultIndicatorColor = 'lightgrey'

/**
 * @param {number} aiScore
 */
export function getIndicatorColor(aiScore) {
  return IndicatorColorMap(aiScore);
}