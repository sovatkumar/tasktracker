import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import { sendEmail } from "@/app/lib/sendEmail";

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

    const userObjectId = new ObjectId(userId);
    const query: any = {
      $or: [{ userId: userId }, { assignedUsers: { $in: [userObjectId] } }],
    };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.$and = [
        {
          $or: [
            { deadline: { $gte: start, $lte: end } },
            { createdAt: { $gte: start, $lte: end } },
          ],
        },
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
  const {
    userId,
    name,
    action,
    startDate,
    endDate,
    deadline,
    taskId,
    assignedUserIds,
  } = await req.json();

  if (!name || !action)
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );

  try {
    const client = await clientPromise;
    const db = client.db();
    const tasks = db.collection("tasks");
    const users = db.collection("users");

    await tasks.createIndex({ deleteAt: 1 }, { expireAfterSeconds: 0 });
    const now = new Date();

    let filter: any = {};
    let updateData: any = {};

    switch (action) {
      case "pending":
        if (!userId)
          return NextResponse.json(
            { message: "userId required for creating task" },
            { status: 400 }
          );

        const insertTask = {
          userId,
          name,
          status: "pending",
          totalTime: 0,
          lastStart: null,
          createdAt: now,
          dailyLogs: [],
          assignedUsers: assignedUserIds || [],
        };
        const { insertedId } = await tasks.insertOne(insertTask);
        console.log("Created new task:", insertTask);
        return NextResponse.json({ taskId: insertedId, task: insertTask });

      case "start":
        if (!taskId)
          return NextResponse.json(
            { message: "taskId required" },
            { status: 400 }
          );

        filter = { _id: new ObjectId(taskId) };
        const existingTask = await tasks.findOne(filter);
        updateData = { status: "in-progress", lastStart: now };

        if (!existingTask?.startDate) {
          updateData.startDate = startDate ? new Date(startDate) : now;
        }

        await tasks.updateOne(filter, { $set: updateData });
        console.log("Task started:", updateData);
        break;

      case "stop":
        if (!taskId)
          return NextResponse.json(
            { message: "taskId required" },
            { status: 400 }
          );

        const existingStop = await tasks.findOne({ _id: new ObjectId(taskId) });
        if (existingStop?.lastStart) {
          const elapsed =
            now.getTime() - new Date(existingStop.lastStart).getTime();
          const today = now.toISOString().split("T")[0];
          const dailyLogs = existingStop.dailyLogs || [];
          const logIndex = dailyLogs.findIndex(
            (log: any) => log.date === today
          );

          if (logIndex >= 0) dailyLogs[logIndex].timeSpent += elapsed;
          else dailyLogs.push({ date: today, timeSpent: elapsed });

          await tasks.updateOne(
            { _id: new ObjectId(taskId) },
            {
              $inc: { totalTime: elapsed },
              $set: { lastStart: null, status: "paused", dailyLogs },
            }
          );
        }
        break;

      case "complete":
        if (!taskId)
          return NextResponse.json(
            { message: "taskId required" },
            { status: 400 }
          );

        const existingComplete = await tasks.findOne({
          _id: new ObjectId(taskId),
        });

        let total = existingComplete?.totalTime || 0;
        let additional = 0;

        if (existingComplete?.lastStart) {
          additional =
            now.getTime() - new Date(existingComplete.lastStart).getTime();
        }

        total += additional;

        const endDateObj = endDate ? new Date(endDate) : now;
        const deleteAfter45Days = new Date(endDateObj);
        deleteAfter45Days.setDate(deleteAfter45Days.getDate() + 45);

        const todayComp = now.toISOString().split("T")[0];
        const dailyLogsComp = existingComplete?.dailyLogs || [];
        const compIndex = dailyLogsComp.findIndex(
          (log: any) => log.date === todayComp
        );

        if (compIndex >= 0) dailyLogsComp[compIndex].timeSpent += additional;
        else if (additional > 0)
          dailyLogsComp.push({ date: todayComp, timeSpent: additional });

        await tasks.updateOne(
          { _id: new ObjectId(taskId) },
          {
            $set: {
              status: "completed",
              totalTime: total,
              lastStart: null,
              endDate: endDateObj,
              deleteAt: deleteAfter45Days,
              dailyLogs: dailyLogsComp,
            },
          }
        );
        console.log("Task completed:", { total, dailyLogsComp });
        break;
      case "set-deadline":
        if (!taskId || !deadline)
          return NextResponse.json(
            { message: "taskId and deadline required" },
            { status: 400 }
          );

        const task = await tasks.findOne({ _id: new ObjectId(taskId) });

        if (!task)
          return NextResponse.json(
            { message: "Task not found" },
            { status: 404 }
          );

        console.log("Updating deadline for task:", task);

        const oldDeadline = task.deadline;
        const newDeadline = new Date(deadline);
        const updateFields: any = { deadline: newDeadline };
        if (
          assignedUserIds &&
          Array.isArray(assignedUserIds) &&
          assignedUserIds.length > 0
        ) {
          updateFields.assignedUsers = assignedUserIds.map(
            (id: string) => new ObjectId(id)
          );
        }

        await tasks.updateOne(
          { _id: new ObjectId(taskId) },
          { $set: updateFields }
        );

        console.log(
          "Task updated with new deadline and assigned users:",
          updateFields
        );
        const isUpdate = !!oldDeadline;

        let allUsers: any[] = [];
        if (task.userId) {
          const creator = await users.findOne({
            _id: new ObjectId(task.userId),
          });
          if (creator) allUsers.push(creator);
        }
        const assignedIds =
          updateFields.assignedUsers || task.assignedUsers || [];
        if (assignedIds.length > 0) {
          const assignedUsersList = await users
            .find({ _id: { $in: assignedIds } })
            .toArray();
          allUsers = [...allUsers, ...assignedUsersList];
        }
        const seen = new Set();
        allUsers = allUsers.filter((u) => {
          if (seen.has(u._id.toString())) return false;
          seen.add(u._id.toString());
          return true;
        });

        console.log(
          "Sending emails to users:",
          allUsers.map((u) => u.email)
        );

        for (const usr of allUsers) {
          await sendEmail(
            usr.email,
            isUpdate ? "Task Deadline Updated" : "New Task Deadline Added",
            {
              title: isUpdate ? "Task Deadline Updated" : "New Task Assigned",
              message: `Hello ${usr.name},<br><br>
                The task "<strong>${task.name}</strong>" has a new deadline:<br>
                <strong>${newDeadline.toLocaleString()}</strong>`,
            }
          );
        }
        break;

      default:
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        );
    }

    const updated = taskId
      ? await tasks.findOne({ _id: new ObjectId(taskId) })
      : null;

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: String(error) },
      { status: 500 }
    );
  }
}
