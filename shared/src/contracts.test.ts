import { expect, test } from 'bun:test';
import { createTaskSchema, editTaskSchema, changeStatusSchema, deleteTaskSchema } from './contracts';

test('task titles are trimmed, required, bounded and strict', () => {
  expect(createTaskSchema.parse({ title: '  Prepare invoice  ', actorId: 1 })).toEqual({ title: 'Prepare invoice', description: '', assigneeId: null, actorId: 1 });
  for (const input of [{ title: ' ' }, { title: 'a'.repeat(121) }, { title: 'Task', ownerId: 2 }]) {
    expect(createTaskSchema.safeParse({ actorId: 1, ...input }).success).toBe(false);
  }
});

test('task details, selected actor and version are validated without accepting a supplied creator', () => {
  const input = { title: 'Task', description: 'Details', assigneeId: 2, actorId: 1, version: 1 };
  expect(editTaskSchema.parse(input)).toEqual(input);
  for (const body of [{ ...input, version: 0 }, { ...input, description: 'x'.repeat(2001) }, { ...input, assigneeId: '2' }, { ...input, creatorId: 1 }]) {
    expect(editTaskSchema.safeParse(body).success).toBe(false);
  }
});

test('every mutation requires a valid numeric actor ID', () => {
  const cases = [
    { schema: createTaskSchema, body: { title: 'Task' } },
    { schema: editTaskSchema, body: { title: 'Task', description: '', assigneeId: null, version: 1 } },
    { schema: changeStatusSchema, body: { status: 'pending' } },
    { schema: deleteTaskSchema, body: {} },
  ];
  for (const { schema, body } of cases) {
    expect(schema.safeParse({ ...body, actorId: 2 }).success).toBe(true);
    for (const actorId of [undefined, null, 0, -1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1]) {
      expect(schema.safeParse({ ...body, actorId }).success).toBe(false);
    }
  }
});

test('status and deletion payloads reject unknown fields and values', () => {
  expect(changeStatusSchema.safeParse({ status: 'unknown', actorId: 1 }).success).toBe(false);
  expect(changeStatusSchema.safeParse({ status: 'pending', actorId: 1, ownerId: 2 }).success).toBe(false);
  expect(deleteTaskSchema.safeParse({ actorId: 1, title: 'Task' }).success).toBe(false);
});
