import { z } from 'zod';

const id = z.string().min(1);
// Person ids are joined with '-' to form couple ids, so '-' (and anything exotic) is excluded.
const personId = z.string().regex(/^[a-z0-9_]+$/, { message: 'person id must match [a-z0-9_]+' });

const clueBase = { id, title: z.string().min(1) };

export const clueSchema = z.discriminatedUnion('kind', [
  z.object({ ...clueBase, kind: z.literal('letter'), text: z.string(), background: z.string().optional() }),
  z.object({ ...clueBase, kind: z.literal('newspaper'), text: z.string(), background: z.string().optional() }),
  z.object({ ...clueBase, kind: z.literal('photo'), src: z.string().min(1), description: z.string().optional() }),
  z.object({ ...clueBase, kind: z.literal('audio'), src: z.string().min(1), transcript: z.string(), description: z.string().optional() }),
  z.object({ ...clueBase, kind: z.literal('video'), src: z.string().min(1), transcript: z.string(), description: z.string().optional() }),
]);

export const coupleSchema = z.object({
  id,
  type: z.enum(['married', 'divorced', 'partners']),
  members: z.tuple([id, id]),
  children: z.array(id),
});

export const tutorialStepSchema = z.object({
  text: z.string().min(1),
  highlight: z.string().optional(),
  until: z.string().min(1),
});

export const levelSchema = z.object({
  id,
  title: z.string().min(1),
  people: z.array(z.object({ id: personId, name: z.string().min(1), born: z.number().int().optional(), died: z.number().int().optional() })).min(1),
  solution: z.object({
    couples: z.array(coupleSchema),
    links: z.array(z.never()).max(0, { message: 'links must be empty in phase 1' }),
  }),
  clues: z.array(clueSchema),
  tutorial: z.array(tutorialStepSchema).optional(),
});

export const levelIndexSchema = z.array(z.object({ id, tutorial: z.boolean() }));
