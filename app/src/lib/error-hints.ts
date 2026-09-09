/** Parse raw mqtt.js / Node connection errors into a user-facing hint. */
import {
  DEFAULT_PROTOCOL_VERSION,
  PROTOCOL_VERSIONS,
  type Protocol,
  type ProtocolVersion,
} from "@shared/schema";
import { getProtocol, PROTOCOLS } from "@/features/connection/forms/protocols";

export interface ParsedError {
  /** Short headline — what went wrong. */
  title: string;
  /** Longer description with actionable advice. */
  hint: string;
}

export interface ParseContext {
  protocol?: Protocol;
  protocolVersion?: ProtocolVersion;
  host?: string;
  port?: number;
}

type HintFn = (ctx: Required<ParseContext> & { alternative: ProtocolVersion; available: ProtocolVersion[] }) => string;
type HintInput = string | HintFn;

const PATTERNS: Array<{ test: RegExp; title: string; hint: HintInput }> = [
  {
    test: /ECONNREFUSED|connect ECONNREFUSED/i,
    title: "Connection refused",
    hint: (ctx) =>
      `The broker at ${ctx.protocol}://${ctx.host}:${ctx.port} rejected the TCP connection. Check that the host and port are correct, the broker is running, and no firewall is blocking ${ctx.port}.`,
  },
  {
    test: /ENOTFOUND|getaddrinfo ENOTFOUND/i,
    title: "Host not found",
    hint: (ctx) => `Hostname "${ctx.host}" could not be resolved. Verify the host field is spelled correctly and your DNS can resolve it.`,
  },
  {
    test: /ETIMEDOUT|connect ETIMEDOUT/i,
    title: "Connection timed out",
    hint: (ctx) =>
      `The broker at ${ctx.protocol}://${ctx.host}:${ctx.port} did not respond within the connect timeout. The host may be unreachable, or port ${ctx.port} is filtered by a firewall.`,
  },
  {
    test: /ECONNRESET|socket hang up/i,
    title: "Connection reset",
    hint: (ctx) => {
      const expected = ctx.protocol === "mqtts" || ctx.protocol === "wss" ? "TLS" : "non-TLS";
      const altProto: Protocol = ctx.protocol === "mqtt" ? "mqtts" : ctx.protocol === "mqtts" ? "mqtt" : ctx.protocol === "ws" ? "wss" : "ws";
      const altPort = getProtocol(altProto)?.port ?? 1883;
      const altHost = ctx.host || "broker";
      return `The broker at ${ctx.protocol}://${ctx.host}:${ctx.port} closed the connection abruptly. Often a TLS mismatch (using ${ctx.protocol}:// on a ${expected === "TLS" ? "non-TLS" : "TLS"}-only port) or unsupported MQTT version ${ctx.protocolVersion} (available for ${ctx.protocol}: ${ctx.available.join(", ")} → try ${ctx.alternative}). Verify port ${ctx.port} matches ${ctx.protocol} (default ${getProtocol(ctx.protocol)?.port}) or try ${altProto}://${altHost}:${altPort}.`;
    },
  },
  {
    test: /certificate|self.?(signed|cert)|UNABLE_TO_VERIFY|CERT/i,
    title: "TLS certificate error",
    hint: (ctx) => {
      const isTls = ctx.protocol === "mqtts" || ctx.protocol === "wss";
      const insecureAlt: Protocol = isTls ? (ctx.protocol === "wss" ? "ws" : "mqtt") : ctx.protocol;
      const altPort = getProtocol(insecureAlt)?.port ?? 1883;
      const host = ctx.host || "broker";
      if (isTls) {
        return `The broker certificate for ${ctx.protocol}://${host}:${ctx.port} could not be verified. If you trust this broker, try ${insecureAlt}://${host}:${altPort} (non-TLS) or install the broker CA certificate.`;
      }
      return `The broker certificate for ${host}:${ctx.port} could not be verified. Install the broker CA certificate or switch to ${insecureAlt}://${host}:${altPort} with TLS (mqtts/wss).`;
    },
  },
  {
    test: /EPROTO|protocol error|bad protocol/i,
    title: "Protocol mismatch",
    hint: (ctx) =>
      `The broker does not support MQTT ${ctx.protocolVersion} over ${ctx.protocol}. For ${ctx.protocol} available: ${ctx.available.join(", ")}. Try ${ctx.alternative} ${ctx.alternative === DEFAULT_PROTOCOL_VERSION ? "(most widely supported)" : "(alternative)"} in Advanced → Protocol Version.`,
  },
  {
    test: /not authorized|bad user name|auth|unauthorized/i,
    title: "Authentication failed",
    hint: "The broker rejected the credentials. Verify the username and password are correct for this broker.",
  },
  {
    test: /identifier rejected|client id|ClientID/i,
    title: "Client ID rejected",
    hint: "The broker rejected the client ID. Some brokers require a non-empty, unique client ID — try setting one in the General tab.",
  },
  {
    test: /quota|exceed|too many|max/i,
    title: "Broker limit reached",
    hint: "The broker refused the connection because a limit was reached (too many connections, etc.). Try again later or contact the broker admin.",
  },
];

function resolveContext(ctx: ParseContext = {}): Required<ParseContext> & { alternative: ProtocolVersion; available: ProtocolVersion[] } {
  const protocol = (ctx.protocol ?? "mqtt") as Protocol;
  const protocolVersion = (ctx.protocolVersion ?? DEFAULT_PROTOCOL_VERSION) as ProtocolVersion;
  const host = ctx.host?.trim() || "broker";
  const port = ctx.port ?? getProtocol(protocol)?.port ?? 1883;
  const available = (getProtocol(protocol)?.versions as ProtocolVersion[] | undefined) ?? ([...PROTOCOL_VERSIONS] as ProtocolVersion[]);
  // Pick alternative intelligently: prefer the most widely supported vs modern pair
  let alternative: ProtocolVersion | undefined;
  if (protocolVersion === DEFAULT_PROTOCOL_VERSION) {
    // On 3.1.1 (default), suggest modern 5.0 if available
    alternative = available.find((v) => v === "5.0") ?? available.find((v) => v !== protocolVersion);
  } else if (protocolVersion === "5.0") {
    // On 5.0, suggest default 3.1.1 if available for this protocol
    alternative = available.find((v) => v === DEFAULT_PROTOCOL_VERSION) ?? available.find((v) => v !== protocolVersion);
  } else {
    // Legacy 3.1 → suggest default
    alternative = available.find((v) => v === DEFAULT_PROTOCOL_VERSION) ?? available.find((v) => v !== protocolVersion);
  }
  alternative ??= (PROTOCOL_VERSIONS.find((v) => v !== protocolVersion) as ProtocolVersion | undefined) ?? DEFAULT_PROTOCOL_VERSION;
  return { protocol, protocolVersion, host, port, alternative: alternative as ProtocolVersion, available };
}

/** Parse a raw error string into a title + actionable hint. Dynamically uses per-protocol versions. */
export function parseError(raw?: string, ctx: ParseContext = {}): ParsedError {
  const resolved = resolveContext(ctx);
  if (!raw) {
    return {
      title: "Connection failed",
      hint: `No error detail was provided for ${resolved.protocol}://${resolved.host}:${resolved.port} (MQTT ${resolved.protocolVersion}). Try ${resolved.alternative} (available for ${resolved.protocol}: ${resolved.available.join(", ")}).`,
    };
  }
  for (const p of PATTERNS) {
    if (p.test.test(raw)) {
      const hint = typeof p.hint === "function" ? p.hint(resolved) : p.hint;
      return { title: p.title, hint };
    }
  }
  // Fallback: surface raw error with dynamic per-protocol guidance.
  return {
    title: "Connection failed",
    hint: `${raw} — verify ${resolved.protocol}://${resolved.host}:${resolved.port} (MQTT ${resolved.protocolVersion}; available for ${resolved.protocol}: ${resolved.available.join(", ")} → try ${resolved.alternative}) and credentials.`,
  };
}

// Re-export for discoverability
export { PROTOCOL_VERSIONS, DEFAULT_PROTOCOL_VERSION };
export const AVAILABLE_PROTOCOLS = PROTOCOLS.map((p) => p.value);
