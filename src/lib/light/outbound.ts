export function programSendsAllowed(program: { demo?: boolean; textingMode?: string } | null | undefined) {
  if (!program || program.demo) return false;
  if (program.textingMode === "off") return false;
  return true;
}
