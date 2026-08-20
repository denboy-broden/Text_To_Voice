import type { MiddlewareHandler } from "hono";

type ValidatorRule = {
  type: "string" | "number" | "array" | "enum" | "boolean";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  values?: readonly string[];
};

export type ValidationSchema = Record<string, ValidatorRule>;

class ValidationError extends Error {
  public code = "VALIDATION_ERROR";
  public status = 400;
  public details: Record<string, string>;

  constructor(details: Record<string, string>) {
    super("Request validation failed");
    this.details = details;
  }
}

function validateField(
  value: unknown,
  rule: ValidatorRule,
  field: string,
): string | null {
  if (value === undefined || value === null || value === "") {
    if (rule.required) return `${field} is required`;
    return null;
  }

  switch (rule.type) {
    case "string": {
      if (typeof value !== "string") return `${field} must be a string`;
      if (rule.minLength !== undefined && value.length < rule.minLength)
        return `${field} must be at least ${rule.minLength} characters`;
      if (rule.maxLength !== undefined && value.length > rule.maxLength)
        return `${field} must be at most ${rule.maxLength} characters`;
      break;
    }
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value))
        return `${field} must be a number`;
      break;
    }
    case "array": {
      if (!Array.isArray(value)) return `${field} must be an array`;
      if (rule.minItems !== undefined && value.length < rule.minItems)
        return `${field} must have at least ${rule.minItems} items`;
      if (rule.maxItems !== undefined && value.length > rule.maxItems)
        return `${field} must have at most ${rule.maxItems} items`;
      break;
    }
    case "enum": {
      if (typeof value !== "string") return `${field} must be a string`;
      if (rule.values && !rule.values.includes(value))
        return `${field} must be one of: ${rule.values.join(", ")}`;
      break;
    }
    case "boolean": {
      if (typeof value !== "boolean") return `${field} must be a boolean`;
      break;
    }
  }

  return null;
}

export function validate(schema: ValidationSchema): MiddlewareHandler {
  return async (c, next) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error: "Invalid JSON body",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const errors: Record<string, string> = {};

    for (const [field, rule] of Object.entries(schema)) {
      const error = validateField(body[field], rule, field);
      if (error) {
        errors[field] = error;
      }
    }

    if (Object.keys(errors).length > 0) {
      return c.json(
        {
          error: "Request validation failed",
          code: "VALIDATION_ERROR",
          details: errors,
        },
        400,
      );
    }

    await next();
  };
}
