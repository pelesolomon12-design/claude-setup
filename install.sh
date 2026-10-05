#!/usr/bin/env bash
# Installs the personal Claude Code mods into this machine/container.
# Usage (e.g. in a cloud environment's setup script):
#   curl -fsSL https://raw.githubusercontent.com/pelesolomon12-design/claude-setup/main/install.sh | bash
set -euo pipefail

main() {
  local repo="${CLAUDE_SETUP_REPO:-https://github.com/pelesolomon12-design/claude-setup.git}"
  local dest="$HOME/.claude/claude-setup"

  for cmd in git python3; do
    command -v "$cmd" >/dev/null || { echo "claude-setup: '$cmd' is required but not installed" >&2; exit 1; }
  done

  if [ -d "$dest/.git" ]; then
    if git -C "$dest" fetch --depth 1 --quiet "$repo" main; then
      git -C "$dest" reset --hard --quiet FETCH_HEAD
    else
      echo "claude-setup: update failed, keeping the installed copy" >&2
    fi
  else
    git clone --depth 1 --quiet "$repo" "$dest.new"
    rm -rf "$HOME/.claude/claude-setup"
    mv "$dest.new" "$dest"
  fi

  local dirs
  dirs="$(find "$dest/mods" -mindepth 1 -maxdepth 1 -type d | sort | paste -sd: -)"

  python3 - "$HOME/.claude/settings.json" "$dirs" <<'PY'
import json, os, sys

path, ours = sys.argv[1], [d for d in sys.argv[2].split(":") if d]
os.makedirs(os.path.dirname(path), exist_ok=True)
try:
    with open(path, encoding="utf-8") as f:
        settings = json.load(f)
except FileNotFoundError:
    settings = {}
except json.JSONDecodeError as err:
    sys.exit(f"claude-setup: {path} is not valid JSON ({err}); left untouched")

if not isinstance(settings, dict):
    sys.exit(f"claude-setup: {path} is not a JSON object; left untouched")
env = settings.setdefault("env", {})
if not isinstance(env, dict):
    sys.exit(f"claude-setup: 'env' in {path} is not an object; left untouched")

existing = [d for d in str(env.get("CLAUDE_CODE_PLUGIN_DIRS", "")).split(":") if d]
env["CLAUDE_CODE_PLUGIN_DIRS"] = ":".join(dict.fromkeys(existing + ours))

tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump(settings, f, indent=2, ensure_ascii=False)
os.replace(tmp, path)
PY

  echo "claude-setup: loaded mods from $dirs"
}

main "$@"
