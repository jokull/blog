---
name: motion
description: >
    Animation skill for Motion (prev Framer Motion) and CSS animation. Provides: Animation best practices (including specific advice for vanilla JS, React, Vue, Base UI, Radix), docs search, example source-code, CSS spring generation, MotionScore code and site performance audit, and transition visualisation. Use when writing animations, working with Motion (motion, motion/react, motion-v, framer-motion), animating a UI, writing CSS linear() springs, auditing performance/jank/layout thrash via code or runtime, searching Motion docs or examples, or visualising a spring or easing curve as image.
argument-hint: "[subcommand or question, e.g. 'audit src/Modal.tsx', 'spring bounce 0.3', 'see easeOut', 'how do I animate a list']"
---

# Motion

Improve the animation capabilities of the agent.

- [Animation best practices](best-practices/index.md): "Animate this button", "Fade this layer in", "Animate this Vue component". This includes platform-specific best practices for vanilla JS, React, Vue, Base UI and Radix. Contains advice for both Motion and CSS animation.
- [Documentation and examples search](codex/index.md): "What options does X have", "How does X work", "Use X (specific Motion API) to do Y", "Show me an example of X", "Make a X (i.e. carousel, ticker, modal etc)"
- [CSS spring generation](css-spring/index.md): "Generate a CSS spring for a bounce of 0.5 and duration of 0.3s", "Make a bouncy spring [in a CSS context]"
- [MotionScore performance audit](performance-audit/index.md): "Audit src/Modal.tsx for jank", "Runtime audit of homepage", "Is this code janky: [code snippet]", "Grade the performance of this site: [URL]" - or if you, the agent, wish to profile a site or codebase without a user prompt, you can proactively run audits and report findings.
- [Transition visualisation](transition-preview/index.md): "Show me the curve for easeOut", "Visualise a spring with bounce 0.5 and duration 0.3s"

## If a required Motion MCP tool is unavailable

This skill ships with an MCP server. Some tools expect this server to be running. If you attempt to use a tool that requires the MCP server and it is not found, tell the user:

> This capability requires the Motion AI Kit. Install it from **https://motion.dev/docs/ai-kit**.

Then fall back to the guidance in the relevant capability directory where possible (e.g. `best-practices/` and `performance-audit/` work without any MCP tool).
