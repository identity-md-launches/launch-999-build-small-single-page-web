import test from 'node:test';
import assert from 'node:assert/strict';
import { convertWei } from '../src/conversion.ts';

test('known unit boundaries, zero, and the smallest wei fraction', () => {
  for (const [wei, gwei, eth] of [
    ['0', '0', '0'],
    ['1', '0.000000001', '0.000000000000000001'],
    ['999999999', '0.999999999', '0.000000000999999999'],
    ['1000000000', '1', '0.000000001'],
    ['1000000000000000000', '1000000000', '1'],
    ['1000000000000000001', '1000000000.000000001', '1.000000000000000001'],
    ['9007199254740993', '9007199.254740993', '0.009007199254740993'],
  ]) assert.deepEqual(convertWei(wei), { state: 'valid', wei, gwei, eth });
});

test('trims outside whitespace, normalizes leading zeros, accepts proper comma groups', () => {
  assert.deepEqual(convertWei(' 001,000,000,000 \n'), convertWei('1000000000'));
  assert.deepEqual(convertWei('000'), convertWei('0'));
});

test('empty is distinct from zero; invalid input cannot reuse an earlier result', () => {
  assert.equal(convertWei(' \n ').state, 'empty');
  for (const input of ['-1', '+1', '1.0', '1e9', '0x10', '1 000', '1,00', '1,,000', 'NaN', '∞', '１２']) {
    const result = convertWei(input);
    assert.equal(result.state, 'invalid', input);
    assert.ok(result.error.length > 0);
    assert.equal(result.gwei, undefined);
  }
});

test('256-digit boundary is exact, and oversize input is rejected without truncation', () => {
  assert.equal(convertWei('9'.repeat(256)).state, 'valid');
  assert.equal(convertWei('9'.repeat(257)).state, 'invalid');
});

test('512 deterministic large inputs round-trip using an independent BigInt oracle', () => {
  let seed = 398473829n;
  for (let i = 0; i < 512; i++) {
    seed = (seed * 6364136223846793005n + 1442695040888963407n) % (1n << 256n);
    const result = convertWei(seed.toString());
    assert.equal(result.state, 'valid');
    for (const [unit, places] of [['gwei', 9], ['eth', 18]]) {
      const [whole, fraction = ''] = result[unit].split('.');
      assert.equal(BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, '0')), seed);
      assert.ok(fraction.length <= places);
      assert.ok(!fraction.endsWith('0'));
    }
  }
});
