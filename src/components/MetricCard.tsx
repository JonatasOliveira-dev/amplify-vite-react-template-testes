
import { ResponsiveContainer, LineChart, Line } from "recharts";

type Registers = {
  TEMP: number | null;
  VOLTAGE: number | null;
  CURRENT: number | null;
  FREQUENCY: number | null;
  POWER: number | null;
};

type DeviceReading = {
  device: string;
  timestamp: number; // unix seconds
  registers: Registers;
};

type Props = {
  title: string;
  value?: number | null;          // ✅ aqui
  valueText?: string;             // pra “DISPOSITIVO”
  unit?: string;
  accent: "blue" | "green" | "purple" | "cyan"| "orange" | "yellow";
  data?: DeviceReading[];         // histórico (para sparkline)
  dataKey?: keyof Registers;      // qual variável plotar no sparkline
  hideSparkline?: boolean;
};


export default function MetricCard({
  title,
  value,
  valueText,
  unit = "",
  accent,
  data = [],
  dataKey,
  hideSparkline,
}: Props) {
  const formatted = valueText ?? (typeof value === "number" ? value.toFixed(2) : "0.00");

  const spark =
    !hideSparkline && dataKey
      ? data
          .map((d) => ({
            t: d.timestamp,
            v: d.registers?.[dataKey] ?? null,
          }))
          .filter((p) => typeof p.v === "number")
      : [];

  return (
    <div className="ap-metric">
      <div className="ap-metricTop">
        <div className="ap-metricTitle">{title}</div>
        <div className={`ap-metricIcon ${accent}`} />
      </div>

      <div className={`ap-metricValue ${valueText ? "text" : ""}`}>
        {formatted} <span className="ap-unit">{unit}</span>
      </div>

      {!hideSparkline && spark.length >= 2 ? (
        <div style={{ height: 34, marginTop: 6, opacity: 0.95 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="ap-progress" style={{ marginTop: 10 }}>
          <div className={`ap-progressBar ${accent}`} />
        </div>
      )}
    </div>
  );
}
