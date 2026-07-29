/** Writes user-selected code locally, with a compatibility fallback for restricted browsers. */
export async function writeClipboard(value: string): Promise<void> {
  if (navigator.clipboard !== undefined) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back for browsers that expose Clipboard but deny direct writes.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  try {
    const copied = document.execCommand('copy');
    if (!copied) {
      throw new Error('COPY_FAILED');
    }
  } finally {
    textarea.remove();
  }
}
