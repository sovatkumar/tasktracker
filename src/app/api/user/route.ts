import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/mongodb";
import { authorize } from "@/app/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email already in use" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.collection("users").insertOne({
      name,
      email,
      role,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "User created", userId: result.insertedId, name, email, role },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!authorize(req, "admin")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const client = await clientPromise;
    const db = client.db();

    const users = await db.collection("users").find().toArray();
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!authorize(req, "admin")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }
    const userDeleteResult = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(userId) });

    if (userDeleteResult.deletedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    const taskDeleteResult = await db
      .collection("tasks")
      .deleteMany({ userId: userId });

    return NextResponse.json(
      { message: "User and related tasks deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!authorize(req, "admin")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, name, email, role, password } = body;

    if (!userId || !name || !email || !role) {
      return NextResponse.json(
        { message: "name, email, and role are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const existingUser = await db.collection("users").findOne({
      email,
      _id: { $ne: new ObjectId(userId) },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email already exists. Please use a different email." },
        { status: 409 }
      );
    }

    const updateData: any = { name, email, role };
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { message: "No changes were made." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "User updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error updating user:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

