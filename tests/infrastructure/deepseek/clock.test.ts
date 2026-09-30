import { describe, expect, it } from "vitest";
import { realClock } from "@infrastructure/deepseek/clock.js";

describe("realClock", () => {
  it("sleep résout après le délai demandé", async () => {
    const start = Date.now();
    await realClock.sleep(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });

  it("sleep(0) résout sans blocage", async () => {
    await realClock.sleep(0);
    expect(true).toBe(true);
  });
});