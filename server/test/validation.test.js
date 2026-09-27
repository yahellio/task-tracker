import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '../src/domain.js';
import { parseCredentials, parseCriteria, parseRole, parseTaskInput } from '../src/validation.js';

describe('разбор задачи', () => {
  it('обрезает пробелы и подставляет значения по умолчанию', () => {
    assert.deepEqual(parseTaskInput({ title: '  Задача  ' }), {
      title: 'Задача',
      description: '',
      status: 'todo',
      dueDate: null
    });
  });

  it('отвергает тело неверного типа', () => {
    assert.throws(() => parseTaskInput([1, 2]), ValidationError);
    assert.throws(() => parseTaskInput(null), ValidationError);
  });

  it('возвращает ошибки по полям', () => {
    try {
      parseTaskInput({ title: '', status: 'nope' });
      assert.fail('ожидалась ошибка');
    } catch (error) {
      assert.equal(error.status, 422);
      assert.deepEqual(Object.keys(error.fields).sort(), ['status', 'title']);
    }
  });
});

describe('разбор параметров списка', () => {
  it('пропускает только известные значения', () => {
    assert.deepEqual(parseCriteria({ status: 'done', sort: 'title', search: ' деплой ' }), {
      status: 'done',
      sort: 'title',
      search: 'деплой'
    });
  });

  it('заменяет неизвестные значения умолчаниями', () => {
    assert.deepEqual(parseCriteria({ status: 'DROP TABLE', sort: 'id' }), {
      status: 'all',
      sort: 'dueDate',
      search: ''
    });
  });
});

describe('разбор учётных данных', () => {
  it('приводит адрес к нижнему регистру', () => {
    assert.deepEqual(parseCredentials({ email: '  User@Example.COM ', password: 'secret123' }), {
      email: 'user@example.com',
      password: 'secret123'
    });
  });

  it('не обрезает пробелы внутри пароля', () => {
    assert.equal(parseCredentials({ email: 'a@b.co', password: ' пароль с пробелами ' }).password, ' пароль с пробелами ');
  });

  it('сообщает об ошибках адреса и пароля', () => {
    try {
      parseCredentials({ email: 'нет-адреса', password: '123' });
      assert.fail('ожидалась ошибка');
    } catch (error) {
      assert.deepEqual(Object.keys(error.fields).sort(), ['email', 'password']);
    }
  });
});

describe('разбор роли', () => {
  it('принимает известные роли', () => {
    assert.equal(parseRole({ role: 'manager' }), 'manager');
  });

  it('отвергает неизвестную роль', () => {
    assert.throws(() => parseRole({ role: 'root' }), ValidationError);
  });
});
