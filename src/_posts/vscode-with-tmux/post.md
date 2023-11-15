---
title: 'Quick Tip: Use tmux as a Development Process Manager'
date: 2023-11-15
---

In large development projects, it's common to spin up various services. For instance, in my project,
I'm working with Next.js, an API backend, cloudflared tunnel, Stripe webhooks proxy, and a database.
While solutions like `docker-compose up -d` offers an elegant solution with isolated docker instances per service and a UI to navigate logs, not all projects can or should use Docker.

<img alt="Screenshot of my tmux setup" src="/blog/vscode-with-tmux-2.png" class="full-bleed" />

For projects not using Docker, a common practice involves process managers that multiplex logs into
a single stream, as seen with Turbo Repo. However, I've found a more effective approach in my
current project: a shell script that bootstraps a `tmux` session with named tabs. This setup fits
neatly into a two-terminal layout in VSCode—one terminal for the `tmux` development processes and
another for a standard shell, as shown in the screenshot above.

Tmux wouldn't work well for production but in development it offers a light-touch and DX friendly
approach to quickly spinning up and managing processes.

This is the current iteration of my tmux `start-dev.sh` script (don't forget to `chmod +x`!)

```bash
#!/bin/bash

# Start a new tmux session and create the first window (tab)
tmux new-session -d -s acme -n sqld 'sqld -l 127.0.0.1:3030 --disable-namespaces'

# Set mouse support and increase scrollback buffer for this session
tmux set -t acme mouse on
tmux set -t acme history-limit 10000

# Create additional windows (tabs) for other commands
tmux new-window -t acme -n tunnel 'cloudflared tunnel --config ~/.cloudflared/acme.yaml run --protocol http2'
tmux new-window -t acme -n next 'pnpm run --filter next dev'
tmux new-window -t acme -n api 'pnpm run --filter api dev'
tmux new-window -t acme -n stripe 'stripe listen --forward-to localhost:3090/stripe/webhook'

# Select the 'next' tab as default
tmux select-window -t acme:next

# Attach to the tmux session
tmux attach-session -t acme
```

I've named each tab for straightforward navigation. Simply hit `Ctrl-b` and use the arrow keys, `p`
for the previous tab, `n` for the next, or directly select using the number pad. This approach with
tmux offers a practical, efficient method for managing multiple processes - with neither
multiplexing or a sprawl of VSCode terminal tabs that quickly get out of hand. It maximizes your
screen space, maintains organization, and provides immediate access to the tools and information you
need as a developer.

Give tmux a try in your VSCode setup for a more streamlined and organized development experience.

Konnor Rogers at EvilMartians [pointed me](https://twitter.com/rogerskonnor/status/1724883649214943406?s=61&t=88ywUl4-i8eT8uocFVzA0A) to [Overmind](https://github.com/DarthSim/overmind) - a tmux based solution that uses Procfiles familiar to Ruby people to bootstratp the development session. Very neat.
