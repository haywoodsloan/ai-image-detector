import interpolate from 'color-interpolate';
import memoize from 'memoize';

export const IndicatorColors = [
  '#00C176',
  '#88C100',
  '#FABE28',
  '#FF8A00',
  '#FF003C',
];

export const DefaultIndicatorColor = '#858585';
export const PrimaryColor = '#0085dd';

export const RealIndicatorColor = IndicatorColors.at(0);
export const AiIndicatorColor = IndicatorColors.at(-1);

const IndicatorColorMap = interpolate(IndicatorColors);
export const getIndicatorColor = memoize((/** @type {number} */ aiScore) => {
  return IndicatorColorMap(aiScore);
});
