import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { authorize } from "../../../lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  if (!authorize(req, "admin")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const url = new URL(req.url);
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");

    const query: any = {};
    if (startParam && endParam) {
      const startDate = new Date(startParam);
      const endDate = new Date(endParam);
      query.startDate = { $gte: startDate };
      query.endDate = { $lte: endDate };
    }
    const tasks = await db
      .collection("tasks")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    const userIds = Array.from(new Set(tasks.map((t) => t.userId)));
    const users = await db
      .collection("users")
      .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const userMap: Record<string, string> = {};
    users.forEach((user: any) => {
      userMap[user._id.toString()] =
        user.name || user.email || user._id.toString();
    });

    const tasksWithUserName = tasks.map((task) => ({
      ...task,
      userName: userMap[task.userId] || task.userId,
    }));

    return NextResponse.json({ tasks: tasksWithUserName }, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
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
    const taskId = url.searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json(
        { message: "Task ID is required" },
        { status: 400 }
      );
    }
    await db.collection("tasks").deleteOne({ _id: new ObjectId(taskId) });
    return NextResponse.json({ message: "Task deleted" }, { status: 200 });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
