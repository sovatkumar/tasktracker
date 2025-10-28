import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../lib/mongodb";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId)
    return NextResponse.json({ message: "User ID missing" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();
  const tasks = await db.collection("tasks").find({ userId }).toArray();
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const { userId, name, action, startDate, endDate } = await req.json();

  if (!userId || !name || !action)
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );

  const client = await clientPromise;
  const db = client.db();
  const tasks = db.collection("tasks");

  const existing = await tasks.findOne({ userId, name });

  let updateData: any = {};
  let now = new Date();

  switch (action) {
    case "pending":
      await tasks.updateOne(
        { userId, name },
        {
          $setOnInsert: {
            userId,
            name,
            status: "pending",
            totalTime: 0,
            lastStart: null,
            createdAt: now,
          },
        },
        { upsert: true }
      );
      break;

    case "start":
      updateData = {
        status: "in-progress",
        lastStart: now,
      };
      if (!existing?.startDate) updateData.startDate = startDate || now;
      await tasks.updateOne({ userId, name }, { $set: updateData });
      break;

    case "stop":
      if (existing?.lastStart) {
        const elapsed = now.getTime() - new Date(existing.lastStart).getTime();
        await tasks.updateOne(
          { userId, name },
          {
            $inc: { totalTime: elapsed },
            $set: { lastStart: null, status: "paused" },
          }
        );
      }
      break;

    case "complete":
      let total = existing?.totalTime || 0;
      if (existing?.lastStart) {
        total += now.getTime() - new Date(existing.lastStart).getTime();
      }
      await tasks.updateOne(
        { userId, name },
        {
          $set: {
            status: "completed",
            totalTime: total,
            lastStart: null,
            endDate: endDate || now,
          },
        }
      );
      break;

    default:
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  const updated = await tasks.findOne({ userId, name });
  return NextResponse.json({ task: updated });
}
