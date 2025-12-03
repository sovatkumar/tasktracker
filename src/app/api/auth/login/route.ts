import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import clientPromise, { getDB } from "../../../lib/mongodb";
const JWT_SECRET: any = process.env.JWT_SECRET;

export async function POST(req: any) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json(
      { message: "Email and password required" },
      { status: 400 }
    );
  }

  const masterDB = await getDB("timetrack");
  console.log("email", email);
  const tenantUser = await masterDB
    .collection("tenants")
    .findOne({ adminEmail: email });
  console.log(tenantUser, "tenantUsertenantUser");
  if (!tenantUser) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  const tenantDBName = tenantUser.dbName;
  const tenantDB = await getDB(tenantDBName);

  const user = await tenantDB.collection("users").findOne({ email });

  if (!user) {
    return Response.json(
      { message: "Invalid email or password" },
      { status: 401 }
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return Response.json(
      { message: "Invalid email or password" },
      { status: 401 }
    );
  }
  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      tenant: tenantDBName,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1d" }
  );

  return Response.json({
    success: true,
    token,
    role: user.role,
    tenant: tenantDBName,
  });
}
