const BLOCKED: ReadonlySet<string> = new Set(['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS', 'CLASSPATH'])

export function cleanJavaEnvironment(): Record<string, string> {
  const clean: Record<string, string> = {}
  for (const [name, value] of Object.entries(process.env)) if (value !== undefined && !BLOCKED.has(name)) clean[name] = value
  return clean
}