# Suggested commands

Use Git Bash commands from `D:/Desktop/Inkforge` unless noted.

- `python ./.trellis/scripts/get_context.py`
- `python ./.trellis/scripts/get_context.py --mode phase`
- `python ./.trellis/scripts/task.py validate .trellis/tasks/<task>`
- `pnpm -C inkforge exec vue-tsc --noEmit`
- `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`
- `pnpm -C inkforge vitest run`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
- `pnpm -C inkforge dev --host 127.0.0.1 --port 3005` for local browser smoke when needed.