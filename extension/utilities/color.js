import interpolate from 'color-interpolate';
import memoize from 'memoize';

const IndicatorColors = ['#00C176', '#88C100', '#FABE28', '#FF8A00', '#FF003C'];
const IndicatorColorMap = interpolate(IndicatorColors);

export const getIndicatorColor = memoize((/** @type {number} */ aiScore) => {
  return IndicatorColorMap(aiScore);
});
