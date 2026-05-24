import { calculatePoints } from '../../src/services/points.service';
import { calculateLevel } from '../../src/services/points.service';

const thresholds = { silver: 300, gold: 700 };

describe('calculatePoints', () => {
  test('calcula puntos correctamente para $185.50 con tasa 0.10', () => {
    expect(calculatePoints(185.50, 0.10)).toBe(18);
  });

  test('siempre redondea hacia abajo', () => {
    expect(calculatePoints(99.99, 0.10)).toBe(9);
  });

  test('retorna 0 si el monto es 0', () => {
    expect(calculatePoints(0, 0.10)).toBe(0);
  });

  test('lanza error si el monto es negativo', () => {
    expect(() => calculatePoints(-50, 0.10)).toThrow('Monto inválido');
  });
});

describe('calculateLevel', () => {
  test('retorna bronze si lifetime < 300', () => {
    expect(calculateLevel(150, thresholds)).toBe('bronze');
  });

  test('retorna silver si lifetime está entre 300 y 699', () => {
    expect(calculateLevel(300, thresholds)).toBe('silver');
    expect(calculateLevel(699, thresholds)).toBe('silver');
  });

  test('retorna gold si lifetime >= 700', () => {
    expect(calculateLevel(700, thresholds)).toBe('gold');
  });

  test('exactamente en el umbral silver devuelve silver', () => {
    expect(calculateLevel(300, thresholds)).toBe('silver');
  });
});
