import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createToken, hashPassword, hashToken, verifyPassword } from '../src/authService.js';

describe('пароли', () => {
  it('подтверждает верный пароль и отвергает неверный', () => {
    const stored = hashPassword('secret123');
    assert.equal(verifyPassword('secret123', stored), true);
    assert.equal(verifyPassword('secret124', stored), false);
  });

  it('не хранит пароль в открытом виде и солит каждый хеш', () => {
    const first = hashPassword('secret123');
    const second = hashPassword('secret123');
    assert.equal(first.includes('secret123'), false);
    assert.notEqual(first, second);
  });

  it('не падает на повреждённом хеше', () => {
    assert.equal(verifyPassword('secret123', 'мусор'), false);
  });
});

describe('ключи доступа', () => {
  it('выдаёт каждый раз новый ключ', () => {
    assert.notEqual(createToken(), createToken());
  });

  it('хеширует ключ одинаково и необратимо', () => {
    const token = createToken();
    assert.equal(hashToken(token), hashToken(token));
    assert.equal(hashToken(token).length, 64);
    assert.equal(hashToken(token).includes(token), false);
  });
});
