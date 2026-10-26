export function isDatabaseUnavailable(error: unknown) {
  const err = error as { code?: string; message?: string; name?: string };
  const code = err?.code ?? "";
  const message = `${err?.name ?? ""} ${err?.message ?? ""} ${String(error)}`;
  if (["P2021", "P2022", "P1001", "P1003", "P1017", "P1000"].includes(code)) return true;
  return /no such table|does not exist|Can't reach database|Unable to open|SQLITE_ERROR|SQLITE_CANTOPEN|ECONNREFUSED|PrismaClientInitializationError|Authentication failed|database server/i.test(
    message,
  );
}
