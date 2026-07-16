export type ProtocolDef = {
  label: string;
  value: string;
  port: number;
  versions: string[];
};

export const PROTOCOLS: ProtocolDef[] = [
  { label: "MQTT", value: "mqtt", port: 1883, versions: ["3.1.1", "5.0"] },
  { label: "MQTTS", value: "mqtts", port: 8883, versions: ["3.1.1", "5.0"] },
  { label: "WSS", value: "wss", port: 443, versions: ["3.1.1", "5.0"] },
];

export function getProtocol(value: string) {
  return PROTOCOLS.find((protocol) => protocol.value === value);
}
