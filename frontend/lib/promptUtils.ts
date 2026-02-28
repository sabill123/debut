/**
 * @N reference parsing utilities for image edit prompts.
 * Adapted from media-generator-hub's promptUtils pattern.
 *
 * Users reference member images with @1, @2, etc. in edit prompts.
 * @1 = first member image, @2 = second, etc. (1-based, stored as 0-based).
 */

/** Extract referenced image indices from prompt text. Returns 0-based indices. */
export function extractReferencedIndices(prompt: string): number[] {
  const pattern = /@(\d+)/g;
  const indices: Set<number> = new Set();

  let match;
  while ((match = pattern.exec(prompt)) !== null) {
    const num = parseInt(match[1], 10);
    if (num > 0) {
      indices.add(num - 1); // Convert to 0-based
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/** Validate that all @N references point to existing images. */
export function validatePromptReferences(
  prompt: string,
  imageCount: number
): { isValid: boolean; invalidRefs: number[] } {
  const referencedIndices = extractReferencedIndices(prompt);
  const invalidRefs = referencedIndices
    .filter((idx) => idx >= imageCount)
    .map((idx) => idx + 1); // Back to 1-based for display

  return {
    isValid: invalidRefs.length === 0,
    invalidRefs,
  };
}

/** Get autocomplete context when user types @. */
export function getAutocompleteContext(
  text: string,
  cursorPosition: number
): { shouldShow: boolean; triggerPosition: number; searchText: string } {
  let triggerPos = -1;

  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];
    if (char === "@") {
      triggerPos = i;
      break;
    }
    if (char === " " || char === "\n" || char === "\t") break;
    if (!/\d/.test(char)) break;
  }

  if (triggerPos === -1) {
    return { shouldShow: false, triggerPosition: -1, searchText: "" };
  }

  const searchText = text.slice(triggerPos + 1, cursorPosition);
  return { shouldShow: true, triggerPosition: triggerPos, searchText };
}

/** Insert a @N reference at the trigger position. */
export function insertReference(
  text: string,
  triggerPosition: number,
  cursorPosition: number,
  referenceNumber: number // 1-based
): { newText: string; newCursorPosition: number } {
  const before = text.slice(0, triggerPosition);
  const after = text.slice(cursorPosition);
  const reference = `@${referenceNumber} `;

  return {
    newText: before + reference + after,
    newCursorPosition: triggerPosition + reference.length,
  };
}
