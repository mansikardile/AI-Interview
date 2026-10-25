import { describe, expect, it, vi } from "vitest";
import { clearLocalSessionData } from "@/lib/session-privacy";

describe("session deletion browser cleanup", () => {
  it("clears only this session's draft and pending metadata", () => {
    const records = new Map([
      ["interviewiq:draft:owned:q1", "answer"],
      ["interviewiq:draft:owned:q2", "answer2"],
      ["interviewiq:pending-monitoring:owned", "[]"],
      ["interviewiq:draft:other:q1", "keep"],
      ["interviewiq:pending-monitoring:other", "keep"],
      ["unrelated", "keep"],
    ]);
    const storage = {
      get length() {
        return records.size;
      },
      key: (i: number) => [...records.keys()][i] ?? null,
      removeItem: (key: string) => {
        records.delete(key);
      },
    };
    expect(clearLocalSessionData("owned", storage)).toBe(true);
    expect([...records.keys()]).toEqual([
      "interviewiq:draft:other:q1",
      "interviewiq:pending-monitoring:other",
      "unrelated",
    ]);
  });
  it("reports inaccessible storage without throwing", () => {
    expect(
      clearLocalSessionData("owned", {
        length: 1,
        key: vi.fn(() => {
          throw new Error("blocked");
        }),
        removeItem: vi.fn(),
      }),
    ).toBe(false);
  });
});
