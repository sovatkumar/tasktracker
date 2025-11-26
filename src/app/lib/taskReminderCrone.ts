import cron from "node-cron";
import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import { sendEmail } from "./sendEmail";

interface User {
  _id: ObjectId;
  name: string;
  email: string;
}

interface Task {
  _id: ObjectId;
  name: string;
  deadline: string;
  userId?: string | ObjectId; // single user
  assignedUsers?: (string | ObjectId)[]; // multiple users
  status: string;
}

async function getAllTasks(): Promise<Task[]> {
  const client = await clientPromise;
  const db = client.db();
  return db.collection<Task>("tasks").find().toArray();
}

async function getUserById(userId: string | ObjectId): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db();
  const query =
    typeof userId === "string"
      ? { _id: new ObjectId(userId) }
      : { _id: userId };

  return db.collection<User>("users").findOne(query);
}

const missedEmailsSent: Map<string, boolean> = new Map();

export function startTaskReminderCron() {
  console.log("Starting Task Reminder Cron...");

  cron.schedule("*/1 * * * *", async () => {
    try {
      const now = new Date();
      console.log(`[CRON] Triggered at: ${now.toLocaleString()}`);

      const tasks = await getAllTasks();

      for (const task of tasks) {
        const deadline = new Date(task.deadline);
        const userIds: (string | ObjectId)[] = [];

        // Handle userId stored as string or ObjectId
        if (task.userId) userIds.push(task.userId.toString());
        if (task.assignedUsers?.length)
          userIds.push(...task.assignedUsers.map((u) => u.toString()));

        for (const userId of userIds) {
          const usr = await getUserById(userId);
          if (!usr) continue;

          const key = `${task._id.toHexString()}_${usr._id.toHexString()}`;

          if (deadline.getTime() > now.getTime()) {
            console.log(
              `[REMINDER] Sending to: ${usr.name} <${usr.email}> | Task: "${
                task.name
              }" | Deadline: ${deadline.toLocaleString()}`
            );
            await sendEmail(usr.email, "Task Deadline Reminder", {
              title: "Upcoming Task Deadline",
              message: `Hello ${usr.name}, your task "<strong>${
                task.name
              }</strong>" is due at <strong>${deadline.toLocaleString()}</strong>.`,
            });
          }

          if (
            now.getTime() > deadline.getTime() &&
            !missedEmailsSent.has(key)
          ) {
            console.log(
              `[MISSED] Sending to: ${usr.name} <${usr.email}> | Task: "${task.name}"`
            );
            await sendEmail(usr.email, "Task Deadline Missed", {
              title: "Missed Task Deadline",
              message: `Hello ${
                usr.name
              }, you missed the deadline for task "<strong>${
                task.name
              }</strong>" which was at <strong>${deadline.toLocaleString()}</strong>.`,
            });
            missedEmailsSent.set(key, true);
          }
        }
      }

      console.log(`[CRON] Cycle finished at: ${new Date().toLocaleString()}`);
      console.log("------------------------------------------------\n");
    } catch (err) {
      console.error("[CRON] Error:", err);
    }
  });
}
