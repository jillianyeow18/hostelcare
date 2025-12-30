/**
 * Input Validation Utilities
 *
 * Comprehensive validation rules to ensure data integrity and security.
 * Prevents malicious input, enforces business rules, and improves UX.
 */

export const validators = {
  /**
   * Email validation - RFC 5322 compliant
   */
  email: (email: string): { valid: boolean; error?: string } => {
    if (!email || !email.trim()) {
      return { valid: false, error: "Email is required" };
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      return { valid: false, error: "Invalid email format" };
    }

    if (email.length > 254) {
      return { valid: false, error: "Email too long (max 254 characters)" };
    }

    return { valid: true };
  },

  /**
   * Phone validation - Malaysian format (+60)
   */
  phone: (phone: string): { valid: boolean; error?: string } => {
    if (!phone || !phone.trim()) {
      return { valid: false, error: "Phone number is required" };
    }

    const regex = /^\+60\d{7,14}$/;
    if (!regex.test(phone)) {
      return {
        valid: false,
        error:
          "Phone must start with +60 followed by 7-14 digits (e.g., +60123456789)",
      };
    }

    return { valid: true };
  },

  /**
   * Text length validation with detailed feedback
   */
  textLength: (
    text: string,
    min: number,
    max: number,
    fieldName: string = "Field"
  ): { valid: boolean; error?: string } => {
    if (!text || !text.trim()) {
      return { valid: false, error: `${fieldName} cannot be empty` };
    }

    const length = text.trim().length;

    if (length < min) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${min} characters (currently ${length})`,
      };
    }

    if (length > max) {
      return {
        valid: false,
        error: `${fieldName} must not exceed ${max} characters (currently ${length})`,
      };
    }

    return { valid: true };
  },

  /**
   * File validation utilities
   */
  file: {
    /**
     * Check if file is a valid image
     */
    isImage: (file: File): { valid: boolean; error?: string } => {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (!allowedTypes.includes(file.type.toLowerCase())) {
        return {
          valid: false,
          error: `Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed. Got: ${file.type}`,
        };
      }

      return { valid: true };
    },

    /**
     * Check file size
     */
    maxSize: (
      file: File,
      maxMB: number
    ): { valid: boolean; error?: string } => {
      const maxBytes = maxMB * 1024 * 1024;

      if (file.size > maxBytes) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        return {
          valid: false,
          error: `File too large. Max ${maxMB}MB allowed. File is ${sizeMB}MB`,
        };
      }

      return { valid: true };
    },

    /**
     * Validate multiple aspects of a file
     */
    validate: (
      file: File,
      maxMB: number = 5
    ): { valid: boolean; error?: string } => {
      const imageCheck = validators.file.isImage(file);
      if (!imageCheck.valid) return imageCheck;

      const sizeCheck = validators.file.maxSize(file, maxMB);
      if (!sizeCheck.valid) return sizeCheck;

      return { valid: true };
    },
  },

  /**
   * Prevent path traversal attacks in filenames
   */
  fileName: (name: string): { valid: boolean; error?: string } => {
    if (!name || !name.trim()) {
      return { valid: false, error: "Filename cannot be empty" };
    }

    // Check for path traversal patterns
    if (/[\/\\]|\.\./.test(name)) {
      return { valid: false, error: "Filename contains invalid characters" };
    }

    // Check for null bytes
    if (name.includes("\0")) {
      return { valid: false, error: "Filename contains invalid characters" };
    }

    return { valid: true };
  },

  /**
   * Validate urgency level
   */
  urgency: (level: string): { valid: boolean; error?: string } => {
    const allowed = ["low", "medium", "high", "urgent"];

    if (!allowed.includes(level.toLowerCase())) {
      return {
        valid: false,
        error: "Invalid urgency level. Must be: low, medium, high, or urgent",
      };
    }

    return { valid: true };
  },

  /**
   * Validate category
   */
  category: (cat: string): { valid: boolean; error?: string } => {
    const allowed = [
      "plumbing",
      "electrical",
      "cleaning",
      "furniture",
      "internet",
      "security",
      "other",
    ];

    if (!allowed.includes(cat.toLowerCase())) {
      return { valid: false, error: "Invalid category" };
    }

    return { valid: true };
  },

  /**
   * Validate student ID format
   */
  studentId: (id: string): { valid: boolean; error?: string } => {
    if (!id || !id.trim()) {
      return { valid: true }; // Optional field
    }

    // Typical format: A12345678 or similar
    const regex = /^[A-Z]\d{8}$/i;
    if (!regex.test(id)) {
      return { valid: false, error: "Student ID must be in format A12345678" };
    }

    return { valid: true };
  },

  /**
   * Validate room number
   */
  roomNumber: (room: string): { valid: boolean; error?: string } => {
    if (!room || !room.trim()) {
      return { valid: true }; // Optional field
    }

    // Allow various formats: 201, A-201, 2-01, etc.
    const regex = /^[A-Z]?-?\d{1,4}[A-Z]?$/i;
    if (!regex.test(room)) {
      return { valid: false, error: "Invalid room number format" };
    }

    return { valid: true };
  },

  /**
   * Password strength validation
   */
  password: (
    pwd: string
  ): {
    valid: boolean;
    error?: string;
    strength?: "weak" | "medium" | "strong";
  } => {
    if (!pwd || pwd.length < 6) {
      return { valid: false, error: "Password must be at least 6 characters" };
    }

    let strength: "weak" | "medium" | "strong" = "weak";

    // Check for complexity
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    const complexityScore = [hasLower, hasUpper, hasNumber, hasSpecial].filter(
      Boolean
    ).length;

    if (pwd.length >= 8 && complexityScore >= 3) {
      strength = "strong";
    } else if (pwd.length >= 6 && complexityScore >= 2) {
      strength = "medium";
    }

    return { valid: true, strength };
  },
};

/**
 * Batch validation helper
 */
export const validateFields = (
  fields: Array<{
    value: any;
    validator: (val: any) => { valid: boolean; error?: string };
    name: string;
  }>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  fields.forEach(({ value, validator, name }) => {
    const result = validator(value);
    if (!result.valid && result.error) {
      errors.push(`${name}: ${result.error}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
