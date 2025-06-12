import { db } from "./db";
import { users, userSessions } from "@shared/schema";
import { AuthService } from "./auth";
import { eq } from "drizzle-orm";

export async function seedUsers() {
  console.log("🌱 Seeding user accounts...");

  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
    
    if (existingAdmin.length === 0) {
      // Create admin user
      const adminPassword = await AuthService.hashPassword("admin123");
      const adminUser = await db.insert(users).values({
        username: "admin",
        email: "admin@example.com",
        password: adminPassword,
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
        isActive: true,
        emailVerified: true,
      }).returning();

      console.log("✅ Created admin user (username: admin, password: admin123)");

      // Create manager user
      const managerPassword = await AuthService.hashPassword("manager123");
      const managerUser = await db.insert(users).values({
        username: "manager",
        email: "manager@example.com", 
        password: managerPassword,
        firstName: "John",
        lastName: "Manager",
        role: "manager",
        isActive: true,
        emailVerified: true,
      }).returning();

      console.log("✅ Created manager user (username: manager, password: manager123)");

      // Create regular user
      const userPassword = await AuthService.hashPassword("user123");
      const regularUser = await db.insert(users).values({
        username: "user",
        email: "user@example.com",
        password: userPassword,
        firstName: "Jane",
        lastName: "User", 
        role: "user",
        isActive: true,
        emailVerified: false,
      }).returning();

      console.log("✅ Created regular user (username: user, password: user123)");

      return {
        admin: adminUser[0],
        manager: managerUser[0], 
        user: regularUser[0]
      };
    } else {
      console.log("ℹ️ User accounts already exist, skipping user seeding");
      return null;
    }
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  }
}