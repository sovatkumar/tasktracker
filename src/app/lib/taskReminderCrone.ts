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
  status: string;

  sentRemindersCount?: number;
  sent1hr?: boolean;
  sent30min?: boolean;
  sentMissed?: boolean;

  reminder0?: Date;
  reminder1?: Date;
  reminder2?: Date;

  createdAt?: Date;

  userId?: string | ObjectId;
  assignedUsers?: (string | ObjectId)[];
}

async function getUsers(userIds: (string | ObjectId)[]) {
  const client = await clientPromise;
  const db = client.db();

  const ids = userIds.map((id) =>
    typeof id === "string" ? new ObjectId(id) : id
  );

  return db.collection<User>("users").find({ _id: { $in: ids } }).toArray();
}

export function startTaskReminderCron() {
  console.log("Starting Task Reminder Cron...");

  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    console.log(
      `\n[CRON RUN] ${now.toLocaleString()} - Checking tasks for reminders...`
    );

    const client = await clientPromise;
    const db = client.db();

    const tasks: any = await db.collection<Task>("tasks").find().toArray();

    for (const task of tasks) {
      if (task.status === "completed") continue;

      const deadline = new Date(task.deadline);
      const timeLeftMs = deadline.getTime() - now.getTime();
      const timeLeftMinutes = timeLeftMs / 1000 / 60;
      const timeLeftHours = timeLeftMs / 1000 / 60 / 60;

      const sentCount = task.sentRemindersCount ?? 0;

      const users = await getUsers([
        ...(task.userId ? [task.userId] : []),
        ...(task.assignedUsers || []),
      ]);

      const sendToAll = async (subject: string, message: string) => {
        for (const usr of users) {
          console.log(
            `[SEND EMAIL] ${subject} → ${usr.email} | Task: "${task.name}"`
          );
          await sendEmail(usr.email, subject, {
            title: subject,
            message,
          });
        }
      };

      console.log(
        `\n[TASK CHECK] ${task.name}\nDeadline: ${deadline.toLocaleString()}\nTime Left: ${timeLeftHours.toFixed(
          2
        )} hours`
      );

      // ---------------------------------------
      // MISSED DEADLINE
      // ---------------------------------------
      if (timeLeftMs <= 0 && !task.sentMissed) {
        console.log(`[MISSED DEADLINE] Sending missed email...`);
        await sendToAll(
          "Missed Task Deadline",
          `You missed the deadline for <strong>${task.name}</strong>.`
        );

        await db
          .collection("tasks")
          .updateOne({ _id: task._id }, { $set: { sentMissed: true } });

        continue;
      }

      // ---------------------------------------
      // 1 HOUR REMINDER
      // ---------------------------------------
      if (timeLeftMinutes <= 60 && timeLeftMinutes > 30 && !task.sent1hr) {
        console.log(`[1 HOUR REMINDER] Sending 1hr before email...`);

        await sendToAll(
          "1 Hour Remaining",
          `Only <strong>1 hour</strong> left for task <strong>${task.name}</strong>!`
        );

        await db
          .collection("tasks")
          .updateOne({ _id: task._id }, { $set: { sent1hr: true } });
      }

      // ---------------------------------------
      // 30 MIN REMINDER
      // ---------------------------------------
      if (timeLeftMinutes <= 30 && timeLeftMinutes > 0 && !task.sent30min) {
        console.log(`[30 MIN REMINDER] Sending 30min before email...`);

        await sendToAll(
          "30 Minutes Remaining",
          `Only <strong>30 minutes</strong> left for task <strong>${task.name}</strong>!`
        );

        await db
          .collection("tasks")
          .updateOne({ _id: task._id }, { $set: { sent30min: true } });
      }

      // ---------------------------------------
      // SPACED REMINDERS (8–8–8 hours or dynamic)
      // ---------------------------------------
      if (timeLeftMinutes > 60 && sentCount < 3) {
        let gapHours;

        if (timeLeftHours >= 24) {
          gapHours = 8;
          console.log(`[REMINDER] Using fixed 8-hour gap (deadline > 24h).`);
        } else {
          const remaining = 3 - sentCount;
          gapHours = timeLeftHours / remaining;
          console.log(
            `[REMINDER] Dynamic gap: ${gapHours.toFixed(
              2
            )} hours (deadline < 24h).`
          );
        }

        const lastReminder =
          task[`reminder${sentCount}`] || task.createdAt || task.deadline;

        const hoursSinceLast =
          (now.getTime() - new Date(lastReminder).getTime()) / 1000 / 60 / 60;

        console.log(
          `[REMINDER CHECK] Hours since last reminder: ${hoursSinceLast.toFixed(
            2
          )} / Required gap: ${gapHours}`
        );

        const nextReminderTime = new Date(
          new Date(lastReminder).getTime() + gapHours * 3600 * 1000
        );

        console.log(
          `[NEXT REMINDER EXPECTED] ${nextReminderTime.toLocaleString()}`
        );

        if (hoursSinceLast >= gapHours) {
          console.log(
            `[SENDING REMINDER] Sending reminder #${sentCount + 1} of 3`
          );

          await sendToAll(
            "Task Deadline Reminder",
            `Reminder ${sentCount + 1} of 3: Task <strong>${
              task.name
            }</strong> is due at <strong>${deadline.toLocaleString()}</strong>.`
          );

          await db.collection("tasks").updateOne(
            { _id: task._id },
            {
              $set: {
                [`reminder${sentCount}`]: now,
                sentRemindersCount: sentCount + 1,
              },
            }
          );
        }
      }
    }
  });
}
