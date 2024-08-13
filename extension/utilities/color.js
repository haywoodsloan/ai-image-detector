import interpolate from 'color-interpolate';

const IndicatorColors = ['#00C176', '#88C100', '#FABE28', '#FF8A00', '#FF003C'];
const IndicatorColorMap = interpolate(IndicatorColors);

export const DefaultIndicatorColor = '#858585';

/**
 * @param {number} aiScore
 */
export function getIndicatorColor(aiScore) {
  return IndicatorColorMap(aiScore);
}
