import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const SECRET: any = process.env.JWT_SECRET;

export function authorize(req: NextRequest, requiredRole: "admin" | "user") {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded: any = jwt.verify(token, SECRET);
    return decoded.role === requiredRole;
  } catch (err) {
    return false;
  }
}
