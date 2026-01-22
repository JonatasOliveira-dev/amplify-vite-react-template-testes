import { useEffect, useMemo, useRef, useState } from "react";
import logo from "./assets/logo.png";
import "./App.css";

import { generateClient } from "aws-amplify/api";
import { latestDadosParque } from "./graphql/queries";


const client = generateClient();

type DeviceReading = {
  device: string;
  timestamp: number;
  registers: {
    TEMP: number;
    VOLTAGE: number;
    CURRENT: number;
    FREQUENCY: number;
    POWER: number;
  };
};

type AppProps = {
  signOut?: (data?: unknown) => void;
};

const AVAILABLE_DEVICES = ["B1", "B2", "B3"];

export default function App({ signOut }: AppProps) {
  const [device, setDevice] = useState("B2");

  const [current, setCurrent] = useState<DeviceReading>({
    device: "B2",
    timestamp: Math.floor(Date.now() / 1000),
    registers: {
      TEMP: 0,
      VOLTAGE: 0,
      CURRENT: 0,
      FREQUENCY: 0,
      POWER: 0,
    },
  });

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // evita corrida quando troca device rápido
  const requestIdRef = useRef(0);

  async function fetchLatest(selectedDevice: string) {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setErrMsg(null);

    try {
      const res = await client.graphql({
        query: latestDadosParque,
        variables: { device: selectedDevice },
        authMode: "userPool", // ✅ garante Cognito User Pool
      });

      // se chegou uma resposta antiga, ignora
      if (requestId !== requestIdRef.current) return;

      const data = (res as any)?.data?.latestDadosParque as DeviceReading | null;

      if (!data) {
        setErrMsg(`Nenhum dado encontrado para o device ${selectedDevice}.`);
        return;
      }

      setCurrent({
        device: data.device,
        timestamp: data.timestamp,
        registers: {
          TEMP: data.registers?.TEMP ?? 0,
          VOLTAGE: data.registers?.VOLTAGE ?? 0,
          CURRENT: data.registers?.CURRENT ?? 0,
          FREQUENCY: data.registers?.FREQUENCY ?? 0,
          POWER: data.registers?.POWER ?? 0,
        },
      });
    } catch (e: any) {
      if (requestId !== requestIdRef.current) return;
      console.error("Erro ao buscar latestDadosParque:", e);
      setErrMsg(e?.errors?.[0]?.message ?? e?.message ?? "Erro desconhecido");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  // ✅ Atualiza imediatamente ao trocar device + faz polling a cada 10s
  useEffect(() => {
    fetchLatest(device);

    const id = window.setInterval(() => {
      fetchLatest(device);
    }, 10_000);

    return () => window.clearInterval(id);
  }, [device]);

  const status = useMemo(() => {
    if (current.registers.TEMP >= 32) {
      return { label: "ALERTA", tone: "warn" as const };
    }
    return { label: "ONLINE", tone: "ok" as const };
  }, [current.registers.TEMP]);

  return (
    <div className="ap-page">
      <header className="ap-topbar">
        <div className="ap-brand">
          <img className="ap-logo" src={logo} alt="Aquapower" />
          <span className="ap-brandText">AQUAPOWER</span>
        </div>

        <div className="ap-actions">
          <select
            className="ap-select"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
          >
            {AVAILABLE_DEVICES.map((d) => (
              <option key={d} value={d}>
                Dispositivo {d}
              </option>
            ))}
          </select>

          <div className={`ap-pill ${status.tone}`}>
            <span className="ap-pillDot" />
            <span className="ap-pillText">{loading ? "ATUALIZANDO" : status.label}</span>
          </div>

          {signOut && (
            <button className="ap-signout" onClick={() => signOut()}>
              Sair
            </button>
          )}
        </div>
      </header>

      <main className="ap-container">
        {errMsg && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "rgba(255,0,0,0.08)" }}>
            <b>Erro:</b> {errMsg}
          </div>
        )}

        <section className="ap-grid3">
          <MetricCard
            title="TEMPERATURA"
            value={current.registers.TEMP.toFixed(1)}
            unit="°C"
            accent="blue"
          />
          <MetricCard
            title="TENSÃO"
            value={current.registers.VOLTAGE.toFixed(1)}
            unit="V"
            accent="cyan"
          />
          <MetricCard
            title="CORRENTE"
            value={current.registers.CURRENT.toFixed(2)}
            unit="A"
            accent="green"
          />
        </section>

        <section className="ap-grid3">
          <MetricCard
            title="FREQUÊNCIA"
            value={current.registers.FREQUENCY.toFixed(1)}
            unit="Hz"
            accent="purple"
          />
          <MetricCard
            title="POTÊNCIA"
            value={current.registers.POWER.toFixed(1)}
            unit="W"
            accent="blue"
          />
          <MetricCard
            title="DISPOSITIVO"
            value={current.device}
            unit=""
            accent="cyan"
            isText
          />
        </section>

        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          Última leitura (timestamp): {current.timestamp}
        </div>
      </main>
    </div>
  );
}

function MetricCard(props: {
  title: string;
  value: string;
  unit: string;
  accent: "blue" | "green" | "purple" | "cyan";
  isText?: boolean;
}) {
  return (
    <div className="ap-metric">
      <div className="ap-metricTop">
        <div className="ap-metricTitle">{props.title}</div>
        <div className={`ap-metricIcon ${props.accent}`} />
      </div>

      <div className={`ap-metricValue ${props.isText ? "text" : ""}`}>
        {props.value} <span className="ap-unit">{props.unit}</span>
      </div>

      <div className="ap-progress">
        <div className={`ap-progressBar ${props.accent}`} />
      </div>
    </div>
  );
}
