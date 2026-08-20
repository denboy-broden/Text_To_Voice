import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  const timestamp = new Date().toISOString();
  const status = "status" in err ? (err.status as number) : 500;
  const code = "code" in err ? (err.code as string) : "INTERNAL_ERROR";
  const message = err.message || "Internal server error";

  console.error(`[${timestamp}] ${status} ${code}: ${message}`);
  if (status >= 500) {
    console.error(err.stack);
  }

  return c.json(
    {
      error: message,
      code,
      ...(status < 500 ? {} : { details: { timestamp } }),
    },
    status as any,
  );
};
