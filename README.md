# codex-statusline

Status companion for OpenAI Codex CLI: shows model, context estimate, git branch, directory, and session ID in your terminal.

## Requirements

- Node.js >= 18
- OpenAI Codex CLI installed and configured

## Installation

Install the hooks into `~/.codex` with a single command:

```bash
npx codex-statusline@latest install
```

This merges the required hooks into `~/.codex/hooks.json`, configures `~/.codex/config.toml`, and copies the runtime files into `~/.codex/codex-statusline`. After installation, start a new Codex session to see a status summary at the top.

To display the same status in tmux, print the tmux snippet:

```bash
codex-statusline tmux-config
```

Add the printed line to `~/.tmux.conf`, then reload tmux:

```bash
tmux source ~/.tmux.conf
```

If you do not install the package globally, prefix commands with `npx codex-statusline@latest`.

## Usage

**Verify installation:**

```bash
npx codex-statusline@latest doctor
```

**Show current status as plain text:**

```bash
npx codex-statusline@latest render --plain
```

**Tmux status bar:**

Run `codex-statusline tmux-config` to get a ready-to-paste snippet. Example output:

```text
set-option -g status-right "#(node '~/.codex/codex-statusline/bin/codex-statusline.cjs' render --plain)"
```

The command prints the resolved install path for your machine.

## Upgrade

```bash
npx codex-statusline@latest upgrade
```

The upgrade command checks the installed version against the npm registry, downloads the latest release, and replaces the installed copy atomically. It is safe to run during an active Codex session because running hooks keep using the files already loaded by their process.

When an update is available, output looks like this:

```text
Installed version: 0.1.0
Latest version:    0.1.1
Downloading... done
Installed to ~/.codex/codex-statusline
Upgrade complete.
```

When the installed copy is current, it prints:

```text
codex-statusline is already up-to-date (0.1.0)
```

## Limitations

- **Token estimate**: The context field is an estimate derived from hook payload data, not from the OpenAI account API. It may differ from the actual token count.
- **Session ID**: The session ID is truncated to 8 characters for display. It is not the full UUID.
- **No PR context**: Pull request information is not shown in v1.
- **Weekly reset timer**: OpenAI does not expose account reset times through the Codex hook API, so this tool does not display them.

## Uninstall

```bash
npx codex-statusline@latest uninstall
```

Uninstall removes only the hooks and config entries added by codex-statusline. Third-party hooks, including memsearch and GSD hooks, are preserved.

## Development

```bash
npm test
node bin/codex-statusline.cjs render --plain
node bin/codex-statusline.cjs doctor
```

## License

MIT
