import clientPromise from "./src/app/lib/mongodb";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";
dotenv.config();

const name = "Admin";
const email = "admin@gmail.com";
const password = "Admin@123";
const role = "admin";

async function createAdminUser() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      console.log("Admin user already exists:", email);
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.collection("users").insertOne({
      name,
      email,
      role,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("✅ Admin user created with id:", result.insertedId);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}
createAdminUser();
