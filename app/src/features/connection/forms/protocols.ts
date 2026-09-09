import { PROTOCOL_VERSIONS, type ProtocolVersion } from "@shared/schema";

export type ProtocolDef = {
  label: string;
  value: string;
  port: number;
  versions: ProtocolVersion[];
};

/**
 * App only supports native MQTT (mqtt/mqtts) — ws/wss are WebSocket transports
 * that still carry the *same* MQTT packets. MQTT 3.1/3.1.1/5.0 negotiation
 * happens inside the CONNECT packet, not the transport, so wss would use
 * identical versions — but since the Electron build has no WebSocket broker
 * support, we expose only mqtt/mqtts. Keeping ws/wss in schema for DB compat
 * but hidden from UI; re-add them to this array to re-enable.
 */
export const PROTOCOLS: ProtocolDef[] = [
  { label: "MQTT", value: "mqtt", port: 1883, versions: [...PROTOCOL_VERSIONS] },
  { label: "MQTTS", value: "mqtts", port: 8883, versions: [...PROTOCOL_VERSIONS] },
];

export function getProtocol(value: string) {
  return PROTOCOLS.find((protocol) => protocol.value === value);
}
