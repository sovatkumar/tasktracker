import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/app/lib/mongodb";

// POST: Create billing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, taskName, billingId, totalHours, status } = body;

    if (!userId || !taskName || !billingId || totalHours == null || !status) {
      return NextResponse.json(
        { message: "userId, taskName, billingId, totalHours, and status are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("billing").insertOne({
      userId: new ObjectId(userId),
      taskName,
      billingId,
      totalHours,
      status,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "Billing created", billingId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// GET: Fetch all billings
export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const billing = await db
      .collection("billing")
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            taskName: 1,
            billingId: 1,
            totalHours: 1,
            status: 1,
            createdAt: 1,
            createdBy: "$user.name",
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    return NextResponse.json({ billing }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// PUT: Update billing status by anyone
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { billingId, status } = body;

    if (!billingId || !status) {
      return NextResponse.json(
        { message: "billingId and status are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("billing").updateOne(
      { _id: new ObjectId(billingId) },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Billing not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Status updated" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
