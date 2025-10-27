import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Safe validation middleware that does not mutate immutable request props (like req.query).
 */
export const validate = (schema: ZodSchema<any>, location: "body" | "query" = "body") => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse input
      const parsed = schema.parse(req[location]);

      // Only replace mutable parts
      if (location === "body") {
        req.body = parsed;
      } else if (location === "query") {
        // clone validated values instead of assigning to req.query directly
        Object.assign(req.query, parsed);
      }

      next();
    } catch (err: any) {
      return res.status(400).json({
        error: "Validation error",
        issues: err?.issues || err.message,
      });
    }
  };
};
