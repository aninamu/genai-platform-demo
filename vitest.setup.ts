import { afterEach } from "vitest";
import { resetTraceStoreForTests } from "@/lib/gateway/trace-store";

afterEach(() => {
  resetTraceStoreForTests();
});
