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
  lastReminder?: Date | null;
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
  console.log("[DB] Fetching tasks for reminders......");
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
    ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</strong>.`,
  });
};

export function startTaskReminderCron() {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const now = new Date();
      const tasks = await getAllTasks();

      for (const task of tasks) {
        if (task.status === "completed") continue;

        const deadline = new Date(task.deadline);
        const timeLeftMs = deadline.getTime() - now.getTime();
        const timeLeftHours = timeLeftMs / 1000 / 60 / 60;

        const userIdsSet = new Set<string>();
        if (task.userId) userIdsSet.add(task.userId.toString());
        task.assignedUsers?.forEach((u) => userIdsSet.add(u.toString()));
        const userIds = Array.from(userIdsSet);

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
              lastReminder: null,
              createdAt: task.createdAt,
            };
          }

          const r: any = task.reminders[userId];

          // Missed deadline email
          if (timeLeftMs < 0 && !r.sentMissed) {
            await sendTaskEmail(
              usr,
              task,
              "Task Deadline Missed",
              "you missed the deadline for task"
            );
            r.sentMissed = true;
          }

          // 1 hour remaining
          if (timeLeftHours <= 1.01 && timeLeftHours > 0 && !r.sent1hr) {
            await sendTaskEmail(
              usr,
              task,
              "1 Hour Remaining",
              "only 1 hour left for task"
            );
            r.sent1hr = true;
          }

          // 30 minutes remaining
          if (timeLeftHours <= 0.5 && timeLeftHours > 0 && !r.sent30min) {
            await sendTaskEmail(
              usr,
              task,
              "30 Minutes Remaining",
              "only 30 minutes left for task"
            );
            r.sent30min = true;
          }

          // Next reminders (periodic)
          if (timeLeftHours > 1 && r.sentRemindersCount! < 3) {
            const taskDurationHours =
              (deadline.getTime() - new Date(task.createdAt).getTime()) /
              1000 /
              60 /
              60;

            let gapHours = 1;
            if (taskDurationHours >= 24) gapHours = 8;
            else if (taskDurationHours >= 3) gapHours = 3;

            const lastReminderTime = r.lastReminder
              ? new Date(r.lastReminder)
              : new Date(task.createdAt);

            const nextReminderTime = new Date(
              lastReminderTime.getTime() + gapHours * 60 * 60 * 1000
            );

            console.log(
              `[NEXT REMINDER] Task: "${task.name}" for ${
                usr.name
              } | createdAt: ${new Date(task.createdAt).toLocaleString(
                "en-IN",
                {
                  timeZone: "Asia/Kolkata",
                }
              )} | lastReminder: ${lastReminderTime.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })} | nextReminder: ${nextReminderTime.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })} | gapHours: ${gapHours}`
            );

            // Only send next reminder if nextReminderTime is before deadline
            if (nextReminderTime < deadline && now >= nextReminderTime) {
              await sendTaskEmail(
                usr,
                task,
                "Task Due Reminder",
                `Task due is near in more than ${gapHours} hours for task`
              );
              r.lastReminder = now;
              r.sentRemindersCount!++;
            } else if (nextReminderTime >= deadline) {
              console.log(
                `[SKIP REMINDER] Task: "${task.name}" for ${
                  usr.name
                } | nextReminder ${nextReminderTime.toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })} exceeds deadline ${deadline.toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}`
              );
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
    } catch (err) {
      console.error("[CRON] Error:", err);
    }
  });
}
