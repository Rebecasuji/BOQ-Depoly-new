import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { hashPassword } from "./auth";
import bcryptjs from "bcryptjs";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
    this.seedDemoUsers();
  }

  private seedDemoUsers(): void {
    // eslint-disable-next-line no-console
    console.log("[storage] Initializing with demo users...");
    
    const demoUsers: Array<InsertUser> = [
      { username: "admin@example.com", password: "DemoPass123!", role: "admin" },
      { username: "software@example.com", password: "DemoPass123!", role: "software_team" },
      { username: "purchase@example.com", password: "DemoPass123!", role: "purchase_team" },
      { username: "user@example.com", password: "DemoPass123!", role: "user" },
      { username: "supplier@example.com", password: "DemoPass123!", role: "supplier" },
    ];

    // Use sync password hashing for demo seed
    let seededCount = 0;
    for (const u of demoUsers) {
      try {
        const existing = Array.from(this.users.values()).find(
          (user) => user.username === u.username
        );
        if (!existing) {
          const salt = bcryptjs.genSaltSync(10);
          const hashedPassword = bcryptjs.hashSync(u.password, salt);
          const id = randomUUID();
          const user: User = {
            id,
            username: u.username,
            password: hashedPassword,
            role: u.role || "user",
          };
          this.users.set(id, user);
          seededCount++;
          // eslint-disable-next-line no-console
          console.log(`[storage] Seeded user: ${u.username} (role: ${u.role})`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[storage] Failed to seed ${u.username}:`, err);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[storage] Demo users initialized. Seeded ${seededCount} users.`);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await hashPassword(insertUser.password);
    const user: User = {
      id,
      username: insertUser.username,
      password: hashedPassword,
      role: insertUser.role || "user",
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
