# claude-setup

ההגדרות האישיות שלי ל-Claude Code, נטענות בכל סשן.

## מה יש כאן
- `mods/my-setup`: עברית ו-RTL, מד "כמה נשאר", רשימת "אח״כ", לולאת ביקורת אחרי כל עבודה, הצעת סקילים קיימים, ועשייה עצמאית בלי להטיל משימות.
- `install.sh`: משכפל את הריפו ל-`~/.claude/claude-setup` ומפעיל את המודים דרך `CLAUDE_CODE_PLUGIN_DIRS`.

## הפעלה בסביבת ענן
בהגדרות הסביבה, תחת Setup script:

```bash
curl -fsSL https://raw.githubusercontent.com/pelesolomon12-design/claude-setup/main/install.sh | bash
```
