import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../lib/mongodb";

// 🔹 Fetch Tasks
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const search = req.nextUrl.searchParams.get("search");

  if (!userId)
    return NextResponse.json({ message: "User ID missing" }, { status: 400 });

  try {
    const client = await clientPromise;
    const db = client.db();
    const query: any = { userId };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.$or = [
        { startDate: { $gte: start, $lte: end } },
        { endDate: { $gte: start, $lte: end } },
      ];
    }

    const tasks = await db
      .collection("tasks")
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { userId, name, action, startDate, endDate, deadline } = await req.json();

  if (!userId || !name || !action)
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );

  try {
    const client = await clientPromise;
    const db = client.db();
    const tasks = db.collection("tasks");

    const existing = await tasks.findOne({ userId, name });
    let updateData: any = {};
    const now = new Date();

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
        updateData = { status: "in-progress", lastStart: now };
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

      case "set-deadline":
        if (!deadline) {
          return NextResponse.json(
            { message: "Deadline date required" },
            { status: 400 }
          );
        }
        await tasks.updateOne(
          { userId, name },
          { $set: { deadline: new Date(deadline) } }
        );
        break;

      default:
        return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const updated = await tasks.findOne({ userId, name });
    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: String(error) },
      { status: 500 }
    );
  }
}
