import { ZodObject } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodObject<any>, target: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const parseTarget = (target === "body" ? req.body : target === "query" ? req.query : req.params) as any;
    const result = schema.safeParse(parseTarget);
    if (!result.success) {
      return res.status(400).json({ error: "Validation error", issues: result.error.format() });
    }
    // overwrite validated object
    if (target === "body") req.body = result.data;
    else if (target === "query") req.query = result.data as any;
    else req.params = result.data as any;
    return next();
  };
