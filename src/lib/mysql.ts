import mysql from "mysql2/promise";

export const mysqlHost =
  process.env.MYSQL_HOST ?? process.env.NEXT_PUBLIC_MYSQL_HOST ?? "localhost";
export const mysqlPort = Number(process.env.MYSQL_PORT ?? 3306);
export const mysqlDatabase =
  process.env.MYSQL_DATABASE ?? process.env.NEXT_PUBLIC_MYSQL_DATABASE ?? "";
export const mysqlUser =
  process.env.MYSQL_USER ?? process.env.NEXT_PUBLIC_MYSQL_USER ?? "";
const mysqlPassword =
  process.env.MYSQL_PASSWORD ?? process.env.NEXT_PUBLIC_MYSQL_PASSWORD ?? "";

export const isMysqlConfigured =
  mysqlDatabase.length > 0 &&
  mysqlUser.length > 0 &&
  mysqlHost.length > 0;

let pool: mysql.Pool | null = null;

export function getMysqlPool(): mysql.Pool | null {
  if (!isMysqlConfigured) return null;
  if (!pool) {
    pool = mysql.createPool({
      host: mysqlHost,
      port: mysqlPort,
      database: mysqlDatabase,
      user: mysqlUser,
      password: mysqlPassword,
      connectionLimit: 5,
      connectTimeout: 10000,
      waitForConnections: true,
      // Azure Database for MySQL enforces TLS connections.
      ssl:
        process.env.MYSQL_SSL === "false"
          ? undefined
          : /azure\.com$/.test(mysqlHost) || process.env.MYSQL_SSL === "true"
            ? { rejectUnauthorized: false }
            : undefined,
      // Report matched rows (not just changed rows) so "affectedRows > 0"
      // stays true when an UPDATE sets a column to its current value.
      flags: ["FOUND_ROWS"],
    });
  }
  return pool;
}

export async function query<T>(
  sql: string,
  params?: unknown[],
): Promise<T> {
  const client = getMysqlPool();
  if (!client) {
    throw new Error("Database is not configured.");
  }
  const [rows] = await client.execute(sql, params as never);
  return rows as T;
}

export async function exec(
  sql: string,
  params?: unknown[],
): Promise<mysql.ResultSetHeader> {
  const client = getMysqlPool();
  if (!client) {
    throw new Error("Database is not configured.");
  }
  const [result] = await client.execute<mysql.ResultSetHeader>(
    sql,
    params as never,
  );
  return result;
}

/**
 * Run a set of statements in a single MySQL transaction — all succeed or
 * all roll back. The connection is row-locked work's own (use
 * `SELECT ... FOR UPDATE` inside for concurrent-safety).
 */
export async function withTransaction<T>(
  work: (connection: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const client = getMysqlPool();
  if (!client) {
    throw new Error("Database is not configured.");
  }
  const connection = await client.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      /* connection already broken */
    }
    throw error;
  } finally {
    connection.release();
  }
}

export function parseDate(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? raw : new Date(parsed).toISOString();
  }
  return String(raw ?? "");
}

/**
 * Normalize a JSON column value. mysql2 auto-parses JSON columns into
 * objects/arrays, but values may also arrive as strings (raw drivers,
 * legacy rows), so accept both and never throw.
 */
export function parseJsonColumn<T = unknown>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
