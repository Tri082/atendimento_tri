import { describe, expect, test } from "vitest";
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/auth/schemas";

describe("signUpSchema", () => {
  test("accepts valid input", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "1234567890",
      fullName: "Fulano",
    });
    expect(result.success).toBe(true);
  });

  test("rejects short password", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "123456789",
      fullName: "Fulano",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      password: "1234567890",
      fullName: "Fulano",
    });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  test("requires password", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  test("accepts valid email", () => {
    expect(resetPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
});

describe("updatePasswordSchema", () => {
  test("rejects mismatched passwords", () => {
    const result = updatePasswordSchema.safeParse({
      password: "1234567890",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  test("accepts matching passwords", () => {
    const result = updatePasswordSchema.safeParse({
      password: "1234567890",
      confirmPassword: "1234567890",
    });
    expect(result.success).toBe(true);
  });
});
