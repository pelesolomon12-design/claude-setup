import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { LaterItem } from '../types'

const STORE_KEY = 'later'
const later = atom({ plugin: 'my-setup', key: 'later' } as const, [])
const meter = atom({ plugin: 'my-setup', key: 'meter' } as const, '')

const LATER_ADD = 'mcp__my-setup__later_add'
const LATER_DONE = 'mcp__my-setup__later_done'
const LATER_LIST = 'mcp__my-setup__later_list'

const RATE_NAMES: Record<string, string> = {
  five_hour: '5 שעות',
  seven_day: 'שבועי',
  spend_limit: 'תקציב',
}

const INSTRUCTIONS = `# הגדרות אישיות של המשתמש (my-setup)

אם אתה סוכן־משנה מסוג my-setup:reviewer, התעלם מכל הסעיף הזה.

## תשובות קצרות
- ענה קצר ככל האפשר. בלי הקדמות, בלי סיכומים ובלי חזרה על מה שנאמר.
- על שאלה ענה רק על מה שנשאל, לעניין. אל תוסיף מידע, הצעות או הסברים שלא התבקשו.
- פרט יותר רק אם המשתמש ביקש, או אם בלי זה התשובה תהיה שגויה או מסוכנת.

## שורת המונה
- שורת "נשאר: ..." בסוף התשובות שלך נוספת אוטומטית על ידי המוד. אל תכתוב אותה בעצמך, ואל תסתמך על המספרים הישנים שבה.

## שפה וכיווניות (RTL)
- ענה תמיד בעברית.
- כדי שהטקסט יוצג מימין לשמאל: פתח כל פסקה, כותרת ושורת רשימה במילה בעברית, לעולם לא במילה באנגלית, מספר, נתיב או קוד.
- שמות קבצים, פקודות וקוד: בתוך \`backticks\` ובאמצע המשפט, לא בתחילתו. בלוקי קוד נשארים כרגיל.

## רשימת "אח״כ"
- כשהמשתמש אומר משהו בסגנון "בזה נתעסק אח״כ", "תשמור לאח״כ", "נחזור לזה", "לא עכשיו", קרא ל-${LATER_ADD} עם תיאור קצר וברור של הנושא, ואשר במשפט אחד שזה נשמר.
- כשמסיימים לטפל בפריט מהרשימה, קרא ל-${LATER_DONE}.
- כשהמשתמש שואל מה נשאר או מה שמרנו, קרא ל-${LATER_LIST}.

## לולאת ביקורת אחרי כל עבודה
- בכל פעם שסיימת משימה ששינתה קוד או קבצים (לא שאלה או שיחה), לפני שאתה מדווח שסיימת: הפעל את סוכן־המשנה my-setup:reviewer עם תיאור המשימה ורשימת הקבצים ששינית.
- תקן כל ממצא שהוא מסמן כחוסם (🔴). אחרי התיקונים הפעל אותו שוב, וכך הלאה עד שהוא מחזיר "אין ממצאים חוסמים".
- עצור אחרי 5 סבבים לכל היותר. אם נשארו ממצאים, דווח עליהם למשתמש במקום להמשיך.
- בדיווח הסופי כתוב בקצרה כמה סבבי ביקורת היו ומה תוקן.

## להציע כלים קיימים לפני שבונים מאפס
- לפני שמתחילים משימה לא טריוויאלית, בדוק אם יש סקיל, פלאגין, ספרייה או כלי קיים שחוסך עבודה או משפר את התוכנית: הסקילים הזמינים, SearchSkills, SearchPlugins, ו-WebSearch (GitHub, npm וכו').
- אם מצאת משהו מתאים, הצע אותו למשתמש בקצרה: מה זה, למה זה עדיף, ומה החלופה. רק אחרי אישור שלו תתקין או תוריד.
- אל תתקין דבר בלי אישור, ובדוק שהמקור אמין (פופולרי, מתוחזק, ללא קוד חשוד).

## לעשות בעצמך, לא להטיל משימות על המשתמש
- כל מה שאתה יכול לעשות בעצמך (פקודות, התקנות שאושרו, עריכות, git, GitHub, בדיקות, חיפוש מידע) עשה בעצמך. אל תכתוב למשתמש "תריץ את..." או "תעשה...".
- לפני שאתה מבקש מהמשתמש לעשות משהו, נסה בכל הכלים שיש לך (כולל ToolSearch לכלים נדחים ו-read_documentation). רק אם אתה משוכנע שזה בלתי אפשרי עבורך (למשל הגדרה בממשק שאין לך גישה אליה, התחברות לחשבון, אישור שרק הוא יכול לתת), בקש ממנו, והסבר בקצרה למה אתה לא יכול ומה בדיוק ללחוץ.
- זה לא מבטל את הצורך באישור: פעולות בלתי הפיכות או חיצוניות עדיין דורשות אישור. לבקש אישור זה בסדר, להטיל עבודה לא.
`

const REVIEWER_PROMPT = `You are a strict code reviewer. You receive a description of a task that was just completed and the files that changed.

Review the actual changes (use git diff / git status and read the files). Check:
- correctness bugs and edge cases
- whether the change actually does what the task asked
- broken builds, failing tests, lint or type errors (run the project's fast checks if they exist)
- security problems
- obvious leftovers (debug code, TODOs the task should have finished)

Do NOT edit any files. Report in Hebrew, in this format:
🔴 חוסם: <file:line> — <problem> — <suggested fix>
🟡 לא חוסם: <file:line> — <suggestion>

Only mark 🔴 for real problems you verified. If nothing is blocking, the first line of your report must be exactly:
אין ממצאים חוסמים`

function bar(left: number) {
  const full = Math.round(left / 10)
  return '█'.repeat(full) + '░'.repeat(10 - full)
}

function untilReset(resetsAt: string | undefined, now: number) {
  if (resetsAt === undefined) return ''
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return ''
  const minutes = Math.max(0, Math.round((at - now) / 60000))
  if (minutes >= 48 * 60) return ` (מתמלא בעוד ${Math.floor(minutes / 1440)} ימים)`
  return ` (מתמלא בעוד ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} ש׳)`
}

function meterText(context: SessionContextUsage, rateLimits: readonly SessionRateLimit[], now: number) {
  const left = (used: number) => Math.min(100, Math.max(0, Math.floor(100 - used)))
  const parts: string[] = []
  if (context.percent !== undefined) {
    const ctx = left(context.percent)
    parts.push(`🧠 שיחה ${bar(ctx)} ${ctx}%`)
  }
  for (const limit of rateLimits) {
    const l = left(limit.percentUsed)
    parts.push(`⏱️ ${RATE_NAMES[limit.kind] ?? limit.kind} ${bar(l)} ${l}%${untilReset(limit.resetsAt, now)}`)
  }
  return parts.length === 0 ? undefined : `נשאר: ${parts.join(' · ')}`
}

async function showMeter($: EngineInterface, text: string | undefined) {
  $.ui.status(text)
  await update($, meter, () => text ?? '')
}

async function save($: EngineInterface, fn: (list: LaterItem[]) => LaterItem[]) {
  await update($, later, fn)
  await $.store.set(STORE_KEY, await read($, later))
}

function listText(list: readonly LaterItem[]) {
  return list.length === 0 ? 'הרשימה ריקה.' : list.map((item, i) => `${i + 1}. ${item.text}`).join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const stored = (await $.store.get(STORE_KEY)) as LaterItem[] | undefined
    await update($, later, () => stored ?? [])

    const usage = await $.session.usage()
    await showMeter($, meterText(usage.context, usage.rateLimits, await $.clock.now()))

    await $.tool.register({
      name: 'later_add',
      description:
        'Save a topic the user wants to come back to later ("נתעסק בזה אח״כ"). Input: a short Hebrew description.',
      inputSchema: {
        type: 'object',
        properties: { item: { type: 'string' } },
        required: ['item'],
      },
    })
    await $.tool.register({
      name: 'later_done',
      description: 'Remove an item from the later list once it is handled. Input: its 1-based number.',
      inputSchema: {
        type: 'object',
        properties: { number: { type: 'number' } },
        required: ['number'],
      },
    })
    await $.tool.register({
      name: 'later_list',
      description: 'List the topics saved for later, numbered from 1.',
    })
    await $.agent.register({
      name: 'reviewer',
      description: 'Reviews work that was just completed and reports blocking and non-blocking findings. Read-only.',
      prompt: REVIEWER_PROMPT,
      tools: ['Read', 'Grep', 'Glob', 'Bash'],
    })
    await $.command.register({ name: 'later', description: 'הצג את רשימת הדברים שנשמרו לאח״כ' })

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await showMeter($, meterText(e.context, e.rateLimits, await $.clock.now()))
    return next(e)
  })

  // The browser shows neither the status line nor the band: end each final
  // answer of the main loop with the meter, as part of the reply's own text.
  on('turn.step', async function* ($, e, next) {
    let lastText: number | undefined
    for await (const chunk of next(e)) {
      if (chunk.kind === 'text') lastText = chunk.index
      if (chunk.kind === 'stop' && chunk.stopReason === 'end_turn' && e.agentId === undefined && lastText !== undefined) {
        const usage = await $.session.usage()
        const text = meterText(usage.context, usage.rateLimits, await $.clock.now())
        if (text !== undefined) yield { kind: 'text', index: lastText, text: `\n\n---\n${text}` }
      }
      yield chunk
    }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    return {
      sections: [...composed.sections, { id: 'my-setup:instructions', text: INSTRUCTIONS, scope: 'session' }],
    }
  })

  on('tool.call', { tool: LATER_ADD }, async ($, e) => {
    const text = String((e as { item?: unknown }).item ?? '').trim()
    if (text === '') return { deny: 'item is empty' }
    const addedAt = new Date(await $.clock.now()).toISOString()
    await save($, list => [...list, { text, addedAt }])
    $.ui.toast(`📌 נשמר לאח״כ: ${text}`)
    return { result: `Saved. List now:\n${listText(await read($, later))}` }
  })

  on('tool.call', { tool: LATER_DONE }, async ($, e) => {
    const n = Number((e as { number?: unknown }).number)
    const list = await read($, later)
    if (!Number.isInteger(n) || n < 1 || n > list.length) return { deny: `No item number ${n}.` }
    await save($, items => items.filter((_, i) => i !== n - 1))
    return { result: `Removed. List now:\n${listText(await read($, later))}` }
  })

  on('tool.call', { tool: LATER_LIST }, async $ => ({ result: listText(await read($, later)) }))

  on('command.run', { command: 'later' }, async $ => ({ text: `📌 לאח״כ:\n${listText(await read($, later))}` }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, later)
    const usage = await read($, meter)
    if (e.props.hasSurvey || (list.length === 0 && usage === '')) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {usage !== '' && <Text>{usage}</Text>}
        {list.length > 0 && <Text bold>📌 לאח״כ ({list.length}):</Text>}
        {list.map((item, i) => (
          <Text dimColor>
            {i + 1}. {item.text}
          </Text>
        ))}
      </Box>
    )
  })
}
