/** Remove only this session's app-owned data in this browser tab. Never clear all storage. */
export function clearLocalSessionData(
  sessionId: string,
  storage?: Pick<Storage, "length" | "key" | "removeItem">,
): boolean {
  try {
    const target = storage ?? window.sessionStorage;
    const keys = Array.from({ length: target.length }, (_, index) => target.key(index));
    for (const key of keys) {
      if (
        key === `interviewiq:pending-monitoring:${sessionId}` ||
        key?.startsWith(`interviewiq:draft:${sessionId}:`)
      )
        target.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}
