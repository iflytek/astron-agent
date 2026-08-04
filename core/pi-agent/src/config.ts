export interface RuntimeConfig {
  port: number;
  internalSecret: string;
  maxRunMs: number;
  maxWaitSeconds: number;
  repeatToolCallLimit: number;
}

type RuntimeEnvironment = Record<string, string | undefined>;

function positiveNumber(
  environment: RuntimeEnvironment,
  name: string,
  fallback: number,
): number {
  const raw = environment[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

export function loadRuntimeConfig(
  environment: RuntimeEnvironment = process.env,
): RuntimeConfig {
  const internalSecret = environment.PI_AGENT_INTERNAL_SECRET?.trim();
  if (!internalSecret) {
    throw new Error("PI_AGENT_INTERNAL_SECRET is required");
  }
  const insecureDevelopmentSecretAllowed =
    environment.NODE_ENV === "development" &&
    environment.PI_AGENT_ALLOW_INSECURE_DEVELOPMENT_SECRET === "true";
  if (
    internalSecret === "change-me-in-production" &&
    !insecureDevelopmentSecretAllowed
  ) {
    throw new Error(
      "PI_AGENT_INTERNAL_SECRET must not use the published placeholder",
    );
  }

  return {
    port: positiveNumber(environment, "PI_AGENT_PORT", 8090),
    internalSecret,
    maxRunMs: positiveNumber(environment, "PI_AGENT_MAX_RUN_MS", 1_500_000),
    maxWaitSeconds: positiveNumber(
      environment,
      "PI_AGENT_MAX_WAIT_SECONDS",
      120,
    ),
    repeatToolCallLimit: positiveNumber(
      environment,
      "PI_AGENT_REPEAT_TOOL_CALL_LIMIT",
      8,
    ),
  };
}
