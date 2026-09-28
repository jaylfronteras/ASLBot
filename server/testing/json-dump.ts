// Reading a JSON file another process is writing.
//
// The fake CLIs write their dumps with a plain writeFileSync from a separate
// process, so a test that waits only for the file to EXIST can read it while it
// is still half-written — on Windows that surfaced as "SyntaxError: Unexpected
// end of JSON input" (main run 36383705578). Poll on a successful parse instead.
import { existsSync, readFileSync } from "node:fs";

/** The parsed file, or undefined while it is missing or not yet complete. */
export function readCompleteJson(path: string): { value: any } | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return { value: JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    return undefined;
  }
}
