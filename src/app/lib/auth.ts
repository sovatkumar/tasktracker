import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const SECRET: any = process.env.JWT_SECRET;

export function authorize(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded; // return full user info
  } catch (err) {
    return null;
  }
}
