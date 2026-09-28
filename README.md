# ASLBot

ASLBot is a small multi-bot team app from [Agile Solution Labs](https://github.com/jaylfronteras). Bots, group chats, sections, routines, memory, files, web search, and MCP stay. The only model providers are OpenAI-compatible endpoints: paste a base URL and an API key.

It is a stripped fork of [JLFBot](https://github.com/jaylfronteras/JLFBot), which is itself a fork of [OpenMausBot](https://github.com/milind-soni/OpenMausBot). See [NOTICE](NOTICE). JLFBot remains the full build (CLI engines and computer use). ASLBot does not include those.

## What you get

- A sidebar of bots and rooms, each opening into one ongoing chat.
- Any number of OpenAI-compatible providers. You name each one and fill in a base URL, an API key, and models. Each bot picks a provider and model and can switch later.
- Group chats, sections, routines, memory, files, web fetch, and MCP.
- Data in `~/.aslbot` on port `8899`, so it can run next to JLFBot.

## Run

```bash
pnpm install
pnpm dev
```

The first launch asks for one provider. Add more under Settings → Engines. Keys stay in `~/.aslbot`.

## Package

```bash
pnpm package:linux
pnpm package:win
pnpm package:mac
```

The Windows installer is `ASLBot-<version>-setup.exe`. Packaging does not require Docker or Podman.

## License

Apache-2.0. Copyright notices for OpenMausBot, JLFBot, and ASLBot are in [NOTICE](NOTICE).
