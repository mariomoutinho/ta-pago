import { expect, it } from 'vitest';
import { formatRest, remainingRest } from '../../shared/rest-timer';
it('calcula o intervalo pelo prazo real e não pela quantidade de ticks', () => {
  expect(remainingRest(10000, 0)).toBe(10);
  expect(remainingRest(10000, 1250)).toBe(9);
  expect(remainingRest(10000, 9999)).toBe(1);
  expect(remainingRest(10000, 10000)).toBe(0);
  expect(remainingRest(10000, 20000)).toBe(0);
  expect(formatRest(90)).toBe('1:30');
  expect(formatRest(0)).toBe('0:00');
});
