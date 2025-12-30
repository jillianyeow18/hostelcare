import DOMPurify from "dompurify";

/**
 * XSS Protection Utilities
 *
 * Sanitizes user input to prevent Cross-Site Scripting (XSS) attacks.
 * All user-generated content should be sanitized before rendering.
 */

export const sanitizeInput = {
  /**
   * Sanitize HTML content - allows basic formatting tags
   * Use for rich text content like descriptions, comments
   */
  html: (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        "b",
        "i",
        "em",
        "strong",
        "a",
        "p",
        "br",
        "ul",
        "ol",
        "li",
      ],
      ALLOWED_ATTR: ["href", "target", "rel"],
      ALLOW_DATA_ATTR: false,
    });
  },

  /**
   * Strip all HTML tags - returns plain text only
   * Use for titles, names, short text fields
   */
  text: (dirty: string): string => {
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
  },

  /**
   * Sanitize and enforce maximum length
   * Use for any text field with character limits
   */
  limitedText: (dirty: string, maxLength: number = 500): string => {
    const clean = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
    return clean.slice(0, maxLength).trim();
  },

  /**
   * Sanitize for URLs - only allows safe URL schemes
   * Use for user-provided URLs or links
   */
  url: (dirty: string): string => {
    const clean = DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [],
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
    return clean.trim();
  },

  /**
   * Sanitize comment/chat content with line breaks preserved
   * Use for comments, chat messages, activity feeds
   */
  comment: (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ["br", "p", "b", "i", "strong", "em"],
      ALLOWED_ATTR: [],
    });
  },
};

/**
 * Helper to check if content contains potentially dangerous HTML
 */
export const containsDangerousHTML = (input: string): boolean => {
  const dangerous = /<script|<iframe|javascript:|onerror=|onload=/i;
  return dangerous.test(input);
};
