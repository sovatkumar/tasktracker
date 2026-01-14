import clientPromise from "@/app/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { message: "Billing name is required (min 3 chars)" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const exists = await db
      .collection("billingID")
      .findOne({ name: name.trim() });

    if (exists) {
      return NextResponse.json(
        { message: "Billing name already exists" },
        { status: 409 }
      );
    }

    const result = await db.collection("billingID").insertOne({
      name: name.trim(),
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        message: "Billing created successfully",
        billingId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create billing error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

/* ---------------- GET ALL BILLING IDs ---------------- */

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const billingIDs = await db
      .collection("billingID")
      .find({}, { projection: { name: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      { billingIDs },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get billing IDs error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
