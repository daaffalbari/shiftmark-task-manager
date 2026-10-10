import { expect, test } from 'bun:test';
import { createTaskSchema, editTaskSchema, changeStatusSchema, loginSchema } from './contracts';

test('task titles are trimmed, required, bounded and strict', () => {
  expect(createTaskSchema.parse({ title: '  Prepare invoice  ' })).toEqual({ title: 'Prepare invoice', description: '', assigneeId: null });
  for (const input of [{ title: ' ' }, { title: 'a'.repeat(121) }, { title: 'Task', ownerId: 2 }]) {
    expect(createTaskSchema.safeParse(input).success).toBe(false);
  }
});

test('task details and version are validated without accepting supplied actor or creator', () => {
  const input = { title: 'Task', description: 'Details', assigneeId: 2, version: 1 };
  expect(editTaskSchema.parse(input)).toEqual(input);
  for (const body of [{ ...input, version: 0 }, { ...input, description: 'x'.repeat(2001) }, { ...input, assigneeId: '2' }, { ...input, actorId: 1 }, { ...input, creatorId: 1 }]) {
    expect(editTaskSchema.safeParse(body).success).toBe(false);
  }
});

test('status and login payloads reject unknown fields and values', () => {
  expect(changeStatusSchema.safeParse({ status: 'unknown' }).success).toBe(false);
  expect(changeStatusSchema.safeParse({ status: 'pending', actorId: 1 }).success).toBe(false);
  expect(loginSchema.safeParse({ email: 'invalid', password: 'test' }).success).toBe(false);
});
