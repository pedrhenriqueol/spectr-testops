import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatePercentiles, validateContractSchema } from '../src/engine/contracts.js';

test('nearest-rank percentiles keep input order and handle empty and single samples', () => {
  const samples = [400, 100, 300, 200];
  assert.deepEqual(calculatePercentiles(samples), { p50: 200, p90: 400, p95: 400, p99: 400, min: 100, max: 400, avg: 250 });
  assert.deepEqual(samples, [400, 100, 300, 200]);
  assert.equal(calculatePercentiles([]).p95, 0);
  assert.equal(calculatePercentiles([42]).p99, 42);
});

test('nested JSON contracts reject missing fields, wrong item types and boolean false schema', () => {
  const schema = { type: 'object', required: ['entries'], properties: { entries: { type: 'array', items: { type: 'object', required: ['amount'], properties: { amount: { type: 'integer' } } } } } };
  assert.equal(validateContractSchema({ entries: [{ amount: 10 }] }, schema).valid, true);
  assert.equal(validateContractSchema({ entries: [{ amount: '10' }] }, schema).valid, false);
  assert.equal(validateContractSchema({ entries: [{}] }, schema).valid, false);
  assert.equal(validateContractSchema({}, false).valid, false);
  assert.equal(validateContractSchema(false, { type: 'boolean' }).valid, true);
});
