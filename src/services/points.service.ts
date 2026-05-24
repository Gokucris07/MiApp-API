export const calculatePoints = (amount: number, ptsPerPeso: number): number => {
  if (amount < 0) throw new Error('Monto inválido');
  return Math.floor(amount * ptsPerPeso);
};

export const calculateLevel = (
  lifetime: number,
  thresholds: { silver: number; gold: number }
): string => {
  if (lifetime >= thresholds.gold) return 'gold';
  if (lifetime >= thresholds.silver) return 'silver';
  return 'bronze';
};
