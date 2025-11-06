import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

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
  const { userId, name, action, startDate, endDate, deadline, taskId } = await req.json();

  if (!userId || !name || !action)
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );

  try {
    const client = await clientPromise;
    const db = client.db();
    const tasks = db.collection("tasks");

    await tasks.createIndex({ deleteAt: 1 }, { expireAfterSeconds: 0 });
    const now = new Date();

    let filter: any = {};
    let updateData: any = {};

    switch (action) {
      case "pending":
        const insertTask = {
          userId,
          name,
          status: "pending",
          totalTime: 0,
          lastStart: null,
          createdAt: now,
        };
        const { insertedId } = await tasks.insertOne(insertTask);
        return NextResponse.json({ taskId: insertedId, task: insertTask });

      case "start":
        if (!taskId)
          return NextResponse.json({ message: "taskId required" }, { status: 400 });

        filter = { _id: new ObjectId(taskId) };
        updateData = {
          status: "in-progress",
          lastStart: now,
          ...(startDate && { startDate: new Date(startDate) }),
        };
        await tasks.updateOne(filter, { $set: updateData });
        break;

      case "stop":
        if (!taskId)
          return NextResponse.json({ message: "taskId required" }, { status: 400 });

        const existingStop = await tasks.findOne({ _id: new ObjectId(taskId) });
        if (existingStop?.lastStart) {
          const elapsed = now.getTime() - new Date(existingStop.lastStart).getTime();
          await tasks.updateOne(
            { _id: new ObjectId(taskId) },
            {
              $inc: { totalTime: elapsed },
              $set: { lastStart: null, status: "paused" },
            }
          );
        }
        break;

      case "complete":
        if (!taskId)
          return NextResponse.json({ message: "taskId required" }, { status: 400 });

        const existingComplete = await tasks.findOne({ _id: new ObjectId(taskId) });
        let total = existingComplete?.totalTime || 0;
        if (existingComplete?.lastStart)
          total += now.getTime() - new Date(existingComplete.lastStart).getTime();

        const endDateObj = endDate ? new Date(endDate) : now;
        const deleteAfter45Days = new Date(endDateObj);
        deleteAfter45Days.setDate(deleteAfter45Days.getDate() + 45);

        await tasks.updateOne(
          { _id: new ObjectId(taskId) },
          {
            $set: {
              status: "completed",
              totalTime: total,
              lastStart: null,
              endDate: endDateObj,
              deleteAt: deleteAfter45Days,
            },
          }
        );
        break;

      case "set-deadline":
        if (!taskId || !deadline)
          return NextResponse.json(
            { message: "taskId and deadline required" },
            { status: 400 }
          );

        await tasks.updateOne(
          { _id: new ObjectId(taskId) },
          { $set: { deadline: new Date(deadline) } }
        );
        break;

      default:
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        );
    }

    const updated = await tasks.findOne(filter);
    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: String(error) },
      { status: 500 }
    );
  }
}




