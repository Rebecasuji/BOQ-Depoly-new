import bcryptjs from "bcryptjs";

// Mimic the seeding logic
const testPassword = "DemoPass123!";
console.log(`\nTest password: ${testPassword}`);

// Seeding: sync hash
const salt = bcryptjs.genSaltSync(10);
const hashedDuringSeed = bcryptjs.hashSync(testPassword, salt);
console.log(`Hash created during seed: ${hashedDuringSeed}`);
console.log(`Hash length: ${hashedDuringSeed.length}`);

// Login: async compare
const matches = await bcryptjs.compare(testPassword, hashedDuringSeed);
console.log(`Comparison result: ${matches}`);

if (matches) {
  console.log("✓ SUCCESS: Password hashing and comparison work correctly");
} else {
  console.log("✗ FAILURE: Password comparison failed!");
}
