import { describe, expect, it } from "vitest";
import {
  buildConnectionString,
  parseDatabaseUrl,
  validateDbConfig,
} from "./dbConfig";

describe("parseDatabaseUrl", () => {
  it("parses a full connection string", () => {
    const cfg = parseDatabaseUrl(
      "postgresql://postgres:rahasia@db.example.com:5433/pos_db?sslmode=disable",
    );
    expect(cfg).toEqual({
      storageMode: "postgresql",
      host: "db.example.com",
      port: "5433",
      database: "pos_db",
      username: "postgres",
      password: "rahasia",
      ssl: false,
    });
  });

  it("defaults port to 5432 and username to postgres when omitted", () => {
    const cfg = parseDatabaseUrl("postgres:///pos_db");
    expect(cfg).toEqual({
      storageMode: "postgresql",
      host: "localhost",
      port: "5432",
      database: "pos_db",
      username: "postgres",
      password: "",
      ssl: false,
    });
  });

  it("treats sslmode=require as ssl true", () => {
    const cfg = parseDatabaseUrl("postgresql://u:p@h:5432/db?sslmode=require");
    expect(cfg?.ssl).toBe(true);
  });

  it("decodes url-encoded username and password", () => {
    const cfg = parseDatabaseUrl("postgresql://user%40name:p%40ss@h:5432/db");
    expect(cfg?.username).toBe("user@name");
    expect(cfg?.password).toBe("p@ss");
  });

  it("returns null for invalid or empty input", () => {
    expect(parseDatabaseUrl("")).toBeNull();
    expect(parseDatabaseUrl("not-a-url")).toBeNull();
    expect(parseDatabaseUrl(undefined as unknown as string)).toBeNull();
  });
});

describe("buildConnectionString", () => {
  it("builds a URL with sslmode=disable by default", () => {
    const url = buildConnectionString({
      storageMode: "postgresql",
      host: "localhost",
      port: "5432",
      database: "pos_db",
      username: "postgres",
      password: "rahasia",
      ssl: false,
    });
    expect(url).toBe(
      "postgresql://postgres:rahasia@localhost:5432/pos_db?sslmode=disable",
    );
  });

  it("uses sslmode=require when ssl is enabled", () => {
    const url = buildConnectionString({
      storageMode: "postgresql",
      host: "localhost",
      port: "5432",
      database: "pos_db",
      username: "postgres",
      password: "",
      ssl: true,
    });
    expect(url).toBe("postgresql://postgres@localhost:5432/pos_db?sslmode=require");
  });

  it("round-trips through parseDatabaseUrl", () => {
    const cfg = {
      storageMode: "postgresql" as const,
      host: "h",
      port: "5433",
      database: "db",
      username: "u",
      password: "p",
      ssl: false,
    };
    expect(parseDatabaseUrl(buildConnectionString(cfg))).toEqual(cfg);
  });
});

describe("validateDbConfig", () => {
  const base = {
    storageMode: "postgresql" as const,
    host: "localhost",
    port: "5432",
    database: "pos_db",
    username: "postgres",
    password: "",
    ssl: false,
  };

  it("returns no errors for a valid config", () => {
    expect(validateDbConfig(base)).toEqual([]);
  });

  it("flags missing host and database", () => {
    const errs = validateDbConfig({ ...base, host: "", database: "" });
    expect(errs).toContain("Host wajib diisi");
    expect(errs).toContain("Nama database wajib diisi");
  });

  it("flags non-numeric port", () => {
    const errs = validateDbConfig({ ...base, port: "abc" });
    expect(errs).toContain("Port harus angka (1–65535)");
  });

  it("accepts any port number in range", () => {
    expect(validateDbConfig({ ...base, port: "3000" })).toEqual([]);
  });
});