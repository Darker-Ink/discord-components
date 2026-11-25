// Volume sliders are perceptual; media elements take amplitude. Above `max`, the curve continues in decibels.
export const amplitudeToPerceptual = (amplitude: number, max = 100) => {
  if (amplitude === 0) return 0;
  const ratio = amplitude / max;
  return (ratio < 1 ? Math.pow(ratio, 1 / 2.8) : (20 * Math.log10(ratio)) / 6 + 1) * max;
};

export const perceptualToAmplitude = (perceptual: number, max = 100) => {
  if (perceptual === 0) return 0;
  const ratio = perceptual / max;
  return (ratio < 1 ? Math.pow(ratio, 2.8) : Math.pow(10, ((ratio - 1) * 6) / 20)) * max;
};
