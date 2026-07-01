import { afterEach, describe, expect, test, vi } from "vitest";
import { acquireSemaphore, _resetSemaphoreForTests } from "@/lib/agent/trigger";

afterEach(() => {
  _resetSemaphoreForTests();
});

describe("acquireSemaphore", () => {
  test("permite até MAX_CONCURRENT em paralelo", async () => {
    const releases: Array<() => void> = [];
    for (let i = 0; i < 10; i++) {
      const release = await acquireSemaphore();
      releases.push(release);
    }
    // 10 in flight — próximo deve aguardar
    let acquired11 = false;
    const promise = acquireSemaphore().then(() => {
      acquired11 = true;
    });
    // micro-tick
    await new Promise((r) => setTimeout(r, 10));
    expect(acquired11).toBe(false);

    // libera 1
    releases[0]?.();
    await promise;
    expect(acquired11).toBe(true);

    // cleanup
    for (let i = 1; i < releases.length; i++) releases[i]?.();
  });
});
