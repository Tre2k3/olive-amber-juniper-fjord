/** Keep gameplay running when browser storage is blocked or full. */
export function createSaveWriter(write: (value: string) => void) {
  let lastAttempt: string | undefined;
  let warned = false;
  return (snapshot: unknown) => {
    const value = JSON.stringify(snapshot);
    if (value === lastAttempt) return;
    lastAttempt = value;
    try {
      write(value);
    } catch (error) {
      if (!warned) {
        console.warn("Progress cannot be saved in this browser session.", error);
        warned = true;
      }
    }
  };
}
