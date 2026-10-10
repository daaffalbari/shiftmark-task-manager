import { expect, test } from 'bun:test';
import { createTaskSchema, changeStatusSchema, loginSchema } from './contracts';

test('task titles are trimmed, required, bounded and strict', () => {
  expect(createTaskSchema.parse({ title: '  Prepare invoice  ' })).toEqual({ title: 'Prepare invoice' });
  for (const input of [{ title: ' ' }, { title: 'a'.repeat(121) }, { title: 'Task', ownerId: 2 }]) {
    expect(createTaskSchema.safeParse(input).success).toBe(false);
  }
});

test('status and login payloads reject unknown fields and values', () => {
  expect(changeStatusSchema.safeParse({ status: 'unknown' }).success).toBe(false);
  expect(changeStatusSchema.safeParse({ status: 'pending', actorId: 1 }).success).toBe(false);
  expect(loginSchema.safeParse({ email: 'invalid', password: 'test' }).success).toBe(false);
});
