import cron from "node-cron";
import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import { sendEmail } from "./sendEmail";

interface User {
  _id: ObjectId;
  name: string;
  email: string;
}

interface UserReminder {
  sent1hr?: boolean;
  sent30min?: boolean;
  sentMissed?: boolean;
  sentRemindersCount?: number;
  reminder0?: Date | null;
  reminder1?: Date | null;
  reminder2?: Date | null;
  createdAt?: any;
}

interface Task {
  _id: ObjectId;
  name: string;
  deadline: string;
  userId?: string | ObjectId;
  assignedUsers?: (string | ObjectId)[];
  status: string;
  createdAt: any;
  reminders?: Record<string, UserReminder>;
}

async function getAllTasks(): Promise<Task[]> {
  const client = await clientPromise;
  const db = client.db();
  console.log("[DB] Fetching tasks for reminders...");
  // Only fetch tasks with a deadline and not completed
  return db
    .collection<Task>("tasks")
    .find({
      deadline: { $exists: true },
      status: { $ne: "completed" },
    })
    .toArray();
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
const sendTaskEmail = async (
  usr: User,
  task: Task,
  subject: string,
  messageBody: string
) => {
  console.log(`[SEND EMAIL] → ${usr.email} | Subject: ${subject}`);

  await sendEmail(usr.email, subject, {
    title: subject,
    message: `Hello ${usr.name}, ${messageBody} "<strong>${
      task.name
    }</strong>" which is due at <strong>${new Date(
      task.deadline
    ).toLocaleString()}</strong>.`,
  });
};
export function startTaskReminderCron() {
  console.log("Starting Task Reminder Cron...");

  cron.schedule("*/1 * * * *", async () => {
    try {
      const now = new Date();
      console.log(`[CRON] Triggered at: ${now.toLocaleString()}`);

      const tasks = await getAllTasks();

      for (const task of tasks) {
        if (task.status === "completed") continue;

        const deadline = new Date(task.deadline);
        const timeLeftMs = deadline.getTime() - now.getTime();
        const timeLeftMinutes = timeLeftMs / 1000 / 60;
        const timeLeftHours = timeLeftMs / 1000 / 60 / 60;
        const userIdsSet = new Set<string>();
        if (task.userId) userIdsSet.add(task.userId.toString());
        task.assignedUsers?.forEach((u) => userIdsSet.add(u.toString()));

        const userIds = Array.from(userIdsSet);

        console.log(
          `[TASK USERS] Task "${task.name}" has users: ${userIds.join(", ")}`
        );

        if (!task.reminders) task.reminders = {};

        for (const userId of userIds) {
          const usr = await getUserById(userId);
          if (!usr) continue;

          if (!task.reminders[userId]) {
            task.reminders[userId] = {
              sent1hr: false,
              sent30min: false,
              sentMissed: false,
              sentRemindersCount: 0,
              reminder0: null,
              reminder1: null,
              reminder2: null,
            };
          }

          const r: any = task.reminders[userId];

          let nextReminderIn: string | null = null;

          if (timeLeftMs <= 0 && !r.sentMissed) {
            await sendTaskEmail(
              usr,
              task,
              "Task Deadline Missed",
              "you missed the deadline for task"
            );
            r.sentMissed = true;
          }

          if (timeLeftMinutes <= 60 && timeLeftMinutes > 30 && !r.sent1hr) {
            await sendTaskEmail(
              usr,
              task,
              "1 Hour Remaining",
              "only 1 hour left for task"
            );
            r.sent1hr = true;
          }

          if (timeLeftMinutes <= 30 && timeLeftMinutes > 0 && !r.sent30min) {
            await sendTaskEmail(
              usr,
              task,
              "30 Minutes Remaining",
              "only 30 minutes left for task"
            );
            r.sent30min = true;
          }

          if (timeLeftHours > 1 && r.sentRemindersCount! < 3) {
            let gapHours = 1;
            if (timeLeftHours >= 24) gapHours = 8;
            else if (timeLeftHours >= 3) gapHours = 3;

            const lastKey = `reminder${r.sentRemindersCount}`;
            const lastReminder = r[lastKey] || task.createdAt;
            const hoursSinceLast =
              (now.getTime() - new Date(lastReminder).getTime()) /
              1000 /
              60 /
              60;

            if (hoursSinceLast >= gapHours) {
              await sendTaskEmail(
                usr,
                task,
                "Task Deadline Reminder",
                `Reminder ${r.sentRemindersCount! + 1} of 3 for task`
              );

              r[lastKey] = now;
              r.sentRemindersCount!++;
            }
          }
        }

        const client = await clientPromise;
        const db = client.db();
        await db
          .collection("tasks")
          .updateOne(
            { _id: task._id },
            { $set: { reminders: task.reminders } }
          );
      }

      console.log(`[CRON] Cycle finished at: ${new Date().toLocaleString()}`);
    } catch (err) {
      console.error("[CRON] Error:", err);
    }
  });
}
