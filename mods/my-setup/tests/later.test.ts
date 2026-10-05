import { expect, mock, test } from 'claude-code/testing'

test('later list: add, list, done', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  const added = await $.tool.call({ tool: 'mcp__my-setup__later_add', item: 'לסדר את מסך הניקוד' } as never)
  expect(added.deny).toBeUndefined()

  const listed = await $.tool.call({ tool: 'mcp__my-setup__later_list' } as never)
  expect(String(listed.result)).toContain('1. לסדר את מסך הניקוד')

  await $.tool.call({ tool: 'mcp__my-setup__later_done', number: 1 } as never)
  const after = await $.tool.call({ tool: 'mcp__my-setup__later_list' } as never)
  expect(String(after.result)).toContain('הרשימה ריקה')
})

test('system prompt gets the personal instructions', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'base', scope: 'shared' }] }))
  const { sections } = await $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] })
  const mine = sections.find(s => s.id === 'my-setup:instructions')
  expect(mine?.text).toContain('my-setup:reviewer')
  expect(mine?.text).toContain('RTL')
})

