import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Role, Task, ValidationError, can, emailFieldError, passwordFieldError, taskFieldErrors } from '../src/domain.js';

const validTask = {
  id: 'a1',
  ownerId: 'u1',
  title: 'Задача',
  description: '',
  status: 'todo',
  dueDate: null
};

describe('права ролей', () => {
  it('пользователь видит только свои задачи и не управляет другими', () => {
    assert.equal(can(Role.USER, 'readAllTasks'), false);
    assert.equal(can(Role.USER, 'writeAllTasks'), false);
    assert.equal(can(Role.USER, 'manageUsers'), false);
  });

  it('менеджер читает и правит все задачи, но не удаляет чужие', () => {
    assert.equal(can(Role.MANAGER, 'readAllTasks'), true);
    assert.equal(can(Role.MANAGER, 'writeAllTasks'), true);
    assert.equal(can(Role.MANAGER, 'deleteAllTasks'), false);
    assert.equal(can(Role.MANAGER, 'manageUsers'), false);
  });

  it('администратор может всё', () => {
    assert.equal(can(Role.ADMIN, 'deleteAllTasks'), true);
    assert.equal(can(Role.ADMIN, 'manageUsers'), true);
  });

  it('неизвестная роль не получает прав', () => {
    assert.equal(can('root', 'manageUsers'), false);
  });
});

describe('правила задачи', () => {
  it('принимает корректные данные', () => {
    assert.deepEqual(taskFieldErrors({ title: 'Задача', description: '', status: 'todo', dueDate: '2026-01-01' }), {});
  });

  it('находит все ошибки сразу', () => {
    const errors = taskFieldErrors({ title: '', description: 'x'.repeat(2001), status: 'nope', dueDate: '2026-02-30' });
    assert.deepEqual(Object.keys(errors).sort(), ['description', 'dueDate', 'status', 'title']);
  });

  it('не допускает создание некорректной задачи', () => {
    assert.throws(() => Task.create({ ...validTask, title: '' }), ValidationError);
  });

  it('считает просроченной незавершённую задачу с прошедшим сроком', () => {
    const task = Task.create({ ...validTask, dueDate: '2020-01-01' });
    assert.equal(task.isOverdue('2026-01-01'), true);
    task.changeStatus('done');
    assert.equal(task.isOverdue('2026-01-01'), false);
  });

  it('не скрывает и не раскрывает лишнего в ответе API', () => {
    const task = Task.create({ ...validTask, ownerEmail: 'user@example.com' });
    task.attach({ id: 'f1', originalName: 'файл.txt', storageKey: 'secret.txt', mimeType: 'text/plain', size: 1 });
    const json = task.toJSON();
    assert.deepEqual(json.owner, { id: 'u1', email: 'user@example.com' });
    assert.equal(json.attachments[0].name, 'файл.txt');
    assert.equal('storageKey' in json.attachments[0], false);
  });
});

describe('правила учётных данных', () => {
  it('проверяет адрес электронной почты', () => {
    assert.equal(emailFieldError('user@example.com'), null);
    assert.notEqual(emailFieldError(''), null);
    assert.notEqual(emailFieldError('без-собаки'), null);
  });

  it('требует пароль не короче восьми символов', () => {
    assert.equal(passwordFieldError('12345678'), null);
    assert.notEqual(passwordFieldError('short'), null);
  });
});
