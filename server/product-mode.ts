// ASLBot's product server registers only OpenAI-compatible providers.
// The inherited ASLBot suite still boots CLI engines and computer tools when
// this process is a vitest worker (ASLBOT_TEST_ENGINES=1). The desktop app
// and packaged server never set that variable.

export function legacyTestEngines(): boolean {
  return process.env.ASLBOT_TEST_ENGINES === "1";
}
