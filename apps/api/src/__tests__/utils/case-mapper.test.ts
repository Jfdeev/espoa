import { describe, it, expect } from "vitest";
import {
  toCamelObject,
  toSnakeObject,
  normalizePayload,
} from "../../utils/case-mapper";

describe("toCamelObject", () => {
  it("converts snake_case keys to camelCase", () => {
    expect(toCamelObject({ foo_bar: 1, baz_qux: 2 })).toEqual({
      fooBar: 1,
      bazQux: 2,
    });
  });

  it("leaves already-camelCase keys unchanged", () => {
    expect(toCamelObject({ fooBar: 1 })).toEqual({ fooBar: 1 });
  });

  it("handles multiple underscores in sequence", () => {
    expect(toCamelObject({ updated_at_time: "x" })).toEqual({
      updatedAtTime: "x",
    });
  });

  it("preserves non-string values", () => {
    expect(toCamelObject({ some_value: null, other_value: 0 })).toEqual({
      someValue: null,
      otherValue: 0,
    });
  });
});

describe("toSnakeObject", () => {
  it("converts camelCase keys to snake_case", () => {
    expect(toSnakeObject({ fooBar: 1, bazQux: 2 })).toEqual({
      foo_bar: 1,
      baz_qux: 2,
    });
  });

  it("leaves already-snake_case keys unchanged", () => {
    expect(toSnakeObject({ foo_bar: 1 })).toEqual({ foo_bar: 1 });
  });

  it("handles consecutive uppercase letters", () => {
    const result = toSnakeObject({ updatedAt: "x" });
    expect(result).toEqual({ updated_at: "x" });
  });
});

describe("normalizePayload", () => {
  it("converts string updatedAt to Date", () => {
    const result = normalizePayload({ updatedAt: "2024-01-01T00:00:00.000Z" });
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect((result.updatedAt as Date).toISOString()).toBe(
      "2024-01-01T00:00:00.000Z"
    );
  });

  it("converts string deletedAt to Date", () => {
    const result = normalizePayload({ deletedAt: "2024-06-15T12:00:00.000Z" });
    expect(result.deletedAt).toBeInstanceOf(Date);
  });

  it("leaves non-date fields unchanged", () => {
    const result = normalizePayload({ nome: "João", valor: 100 });
    expect(result).toEqual({ nome: "João", valor: 100 });
  });

  it("does not convert already-Date updatedAt", () => {
    const date = new Date("2024-01-01");
    const result = normalizePayload({ updatedAt: date } as any);
    expect(result.updatedAt).toBe(date);
  });

  it("handles empty object", () => {
    expect(normalizePayload({})).toEqual({});
  });
});
