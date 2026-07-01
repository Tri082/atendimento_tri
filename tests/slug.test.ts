import { describe, expect, test } from "vitest";
import { isValidSlug, slugify } from "@/lib/orgs/slug";

describe("slugify", () => {
  test("lowercases", () => {
    expect(slugify("Minha Empresa")).toBe("minha-empresa");
  });

  test("strips accents", () => {
    expect(slugify("Açaí Tropical")).toBe("acai-tropical");
  });

  test("collapses multiple spaces", () => {
    expect(slugify("Hello    World")).toBe("hello-world");
  });

  test("strips invalid characters", () => {
    expect(slugify("Foo@Bar!Baz")).toBe("foobarbaz");
  });

  test("trims to 40 chars", () => {
    expect(slugify("a".repeat(50))).toHaveLength(40);
  });

  test("empty input returns empty", () => {
    expect(slugify("")).toBe("");
  });
});

describe("isValidSlug", () => {
  test.each(["foo", "foo-bar", "abc123", "minha-empresa-teste"])("valid: %s", (s) => {
    expect(isValidSlug(s)).toBe(true);
  });

  test.each([
    "ab",
    "-foo",
    "foo-",
    "Foo",
    "foo bar",
    "foo_bar",
    "a".repeat(41),
  ])("invalid: %s", (s) => {
    expect(isValidSlug(s)).toBe(false);
  });
});
