import { expect, mock, test } from 'claude-code/testing'

test('final answer ends with the meter', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 30, window: 100, percent: 30 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 40 }],
    },
  }) as never)
  on('turn.step', async function* () {
    yield { kind: 'text', index: 0, text: 'שלום' }
    yield { kind: 'stop', stopReason: 'end_turn', usage: null }
    return { turnId: 't', index: 0, answer: '', toolUses: [] } as never
  })

  let text = ''
  for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1 })) {
    if (chunk.kind === 'text') text += chunk.text
  }
  expect(text).toContain('שלום')
  expect(text).toContain('🧠 שיחה')
  expect(text).toContain('70%')
  expect(text).toContain('60%')
})

test('tool-use steps and subagents get no meter', async ($, on) => {
  mock.clock(on, { now: 0 })
  on('turn.step', async function* () {
    yield { kind: 'text', index: 0, text: 'x' }
    yield { kind: 'stop', stopReason: 'tool_use', usage: null }
    return { turnId: 't', index: 0, answer: '', toolUses: [] } as never
  })
  let text = ''
  for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1 })) {
    if (chunk.kind === 'text') text += chunk.text
  }
  expect(text).toBe('x')
})
