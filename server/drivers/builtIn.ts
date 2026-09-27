// Product drivers. ASLBot speaks only OpenAI-compatible chat APIs.
import type { AnyProviderDriver } from "../contracts.ts";
import { OpenAICompatDriver } from "./openai-compat.ts";

export const PRODUCT_DRIVERS: readonly AnyProviderDriver[] = [OpenAICompatDriver];

/** @deprecated Use PRODUCT_DRIVERS. Kept for callers that still import this name. */
export const BUILT_IN_DRIVERS = PRODUCT_DRIVERS;
