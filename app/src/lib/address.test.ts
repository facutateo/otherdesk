import { describe, expect, it } from "vitest";
import { formatId, parseAddress, spokenId } from "./address";

describe("address", () => {
  it("formats ids in groups of 3", () => {
    expect(formatId("123456789")).toBe("123 456 789");
    expect(formatId("1234567890")).toBe("123 456 789 0");
  });
  it("speaks ids digit by digit", () => {
    expect(spokenId("123456789")).toBe("1 2 3, 4 5 6, 7 8 9");
  });
  it("parses pasted ids with spaces or dashes", () => {
    expect(parseAddress(" 123 456-789 ")).toEqual({ kind: "id", id: "123456789" });
  });
  it("parses aliases case-insensitively", () => {
    expect(parseAddress("Laptop01@Acme")).toEqual({ kind: "alias", alias: "laptop01@acme" });
  });
  it("rejects garbage and short ids", () => {
    expect(parseAddress("12345")).toBeNull();
    expect(parseAddress("12a 456 789")).toBeNull();
    expect(parseAddress("bad alias@x")).toBeNull();
  });
});
