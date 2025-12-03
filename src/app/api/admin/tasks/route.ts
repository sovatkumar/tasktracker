import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { authorize } from "../../../lib/auth";
import { ObjectId } from "mongodb";
import { sendEmail } from "@/app/lib/sendEmail";
export async function GET(req: NextRequest) {
  const user = authorize(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(user.tenantDB);
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
    const creatorIds = tasks.map((t) => t.userId);
    const assignedIds = tasks
      .flatMap((t) => t.assignedUsers || [])
      .map((id) => id.toString());
    const allUserIds = Array.from(new Set([...creatorIds, ...assignedIds]));
    const users = await db
      .collection("users")
      .find({
        _id: { $in: allUserIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    const userMap: Record<string, any> = {};
    users.forEach((user) => {
      userMap[user._id.toString()] = {
        _id: user._id.toString(),
        name: user.name || user.email || "Unknown",
      };
    });
    const tasksWithUsers = tasks.map((task) => {
      const firstAssignedUserId = task.assignedUsers?.[0]?.toString();
      return {
        ...task,
        userName:
          userMap[task.userId]?.name ||
          (firstAssignedUserId
            ? userMap[firstAssignedUserId]?.name
            : "Unknown"),
        assignedUsers: (task.assignedUsers || []).map((id: any) => {
          const uid = id.toString();
          return userMap[uid] || { _id: uid, name: "Unknown" };
        }),
      };
    });

    return NextResponse.json({ tasks: tasksWithUsers }, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const tenantDB = authorize(req);
  console.log(tenantDB, "reqFromTasl");
  const user = authorize(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(user.tenantDB);
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

export async function POST(req: NextRequest) {
  const user = authorize(req);

  try {
    const body = await req.json();
    const { name, assignedUsers, deadline, taskDetail } = body;

    if (!name || !assignedUsers || !deadline || !taskDetail) {
      return NextResponse.json(
        {
          message: "Name, assigned users,taskDetail, and deadline are required",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(user.tenantDB);

    const result = await db.collection("tasks").insertOne({
      name,
      taskDetail,
      assignedUsers: assignedUsers.map((id: string) => new ObjectId(id)),
      deadline: new Date(deadline),
      status: "pending",
      createdAt: new Date(),
    });

    const users = await db
      .collection("users")
      .find({
        _id: { $in: assignedUsers.map((id: string) => new ObjectId(id)) },
      })
      .project({ _id: 1, name: 1, email: 1 })
      .toArray();

    for (const user of users) {
      await sendEmail(user.email, `New Task Assigned: ${name}`, {
        title: "New Task Assigned",
        message: `Hello ${
          user.name
        },<br>You have been assigned a new task: "<strong>${name}</strong>"<br>
                  Deadline: <strong>${new Date(
                    deadline
                  ).toLocaleString()}</strong>`,
      });
    }

    const taskWithUsers = {
      _id: result.insertedId,
      name,
      assignedUsers: users.map((u) => ({ _id: u._id, name: u.name })),
      deadline,
      status: "pending",
    };

    return NextResponse.json(
      { message: "Task created and emails sent", task: taskWithUsers },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
