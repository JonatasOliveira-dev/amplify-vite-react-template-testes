import { useEffect, useMemo, useRef, useState } from "react";
import logo from "./assets/logo.png";
import "./App.css";

import { generateClient } from "aws-amplify/api";
import { latestDadosParque, dadosParqueByPeriod } from "./graphql/queries";

import MetricCard from "./components/MetricCard";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const client = generateClient();

// --- TIPAGENS ---
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

type AppProps = {
  signOut?: (data?: unknown) => void;
};

// --- CONSTANTES ---
const AVAILABLE_DEVICES = ["B1", "B2", "B3"] as const;

type RangeKey = "1D" | "7D" | "30D" | "ALL";

// Segundos para subtrair do "agora" em cada opção
const RANGE_SECONDS: Record<Exclude<RangeKey, "ALL">, number> = {
  "1D": 86400,
  "7D": 604800,
  "30D": 2592000,
};

type VisibleMap = Record<keyof Registers, boolean>;

// --- FUNÇÕES AUXILIARES ---
function formatDateTimeFromUnixSeconds(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}

function formatTick(tsSeconds: number, range: RangeKey) {
  const d = new Date(tsSeconds * 1000);
  if (range === "1D") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString();
}

export default function App({ signOut }: AppProps) {
  // Estado do Dispositivo selecionado
  const [device, setDevice] = useState("B2");

  // Estados de Dados
  const [latest, setLatest] = useState<DeviceReading | null>(null);
  const [history, setHistory] = useState<DeviceReading[]>([]);

  // Controles da Interface
  const [range, setRange] = useState<RangeKey>("1D");
  const [visible, setVisible] = useState<VisibleMap>({
    TEMP: true,
    VOLTAGE: false,
    CURRENT: true,
    FREQUENCY: false,
    POWER: false,
  });

  // Estados de Carregamento e Erro
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  const POLL_MS = 10_000;

  // 1. BUSCAR HISTÓRICO
  async function fetchHistory(selectedDevice: string, selectedRange: RangeKey) {
    setLoading(true);
    setErrMsg(null);
    try {
      const now = Math.floor(Date.now() / 1000);
      let from = now - 86400;

      if (selectedRange === "ALL") {
        from = 1704067200;
      } else {
        from = now - RANGE_SECONDS[selectedRange];
      }

      let allItems: any[] = [];
      let nextToken: string | null | undefined = null;
      let safetyCounter = 0; 

      do {
        const res: any = await client.graphql({
          query: dadosParqueByPeriod,
          variables: {
            device: selectedDevice,
            from: from,
            to: now,
            limit: 1000,
            nextToken: nextToken
          },
          authMode: "userPool",
        });

        const data = res?.data?.dadosParqueByPeriod;
        const items = data?.items || [];
        
        allItems = [...allItems, ...items];
        nextToken = data?.nextToken;
        safetyCounter++;

        if (safetyCounter > 20) {
            console.warn("Limite de segurança atingido (20k pontos).");
            break;
        }

      } while (nextToken);

      console.log(`[Histórico] Total carregado: ${allItems.length} pontos.`);
      
      const normalizedHistory: DeviceReading[] = allItems.map((item: any) => ({
        device: selectedDevice,
        timestamp: item.timestamp,
        registers: {
          TEMP: item.registers?.TEMP ?? null,
          VOLTAGE: item.registers?.VOLTAGE ?? null,
          CURRENT: item.registers?.CURRENT ?? null,
          FREQUENCY: item.registers?.FREQUENCY ?? null,
          POWER: item.registers?.POWER ?? null,
        }
      }));

      normalizedHistory.sort((a, b) => a.timestamp - b.timestamp);
      setHistory(normalizedHistory);

      if (normalizedHistory.length > 0) {
        lastTsRef.current = normalizedHistory[normalizedHistory.length - 1].timestamp;
      }

    } catch (error: any) {
      console.error("Erro ao buscar histórico:", error);
      setErrMsg("Erro ao carregar histórico. Verifique o console.");
    } finally {
      setLoading(false);
    }
  }

  // 2. POLLING (LATEST)
  async function fetchLatest(selectedDevice: string) {
    const requestId = ++requestIdRef.current;
    
    try {
      const res = await client.graphql({
        query: latestDadosParque,
        variables: { device: selectedDevice },
        authMode: "userPool",
      });

      if (requestId !== requestIdRef.current) return;

      const data = (res as any)?.data?.latestDadosParque as DeviceReading | null;

      if (!data) return;

      const normalized: DeviceReading = {
        device: data.device,
        timestamp: data.timestamp,
        registers: {
          TEMP: data.registers?.TEMP ?? null,
          VOLTAGE: data.registers?.VOLTAGE ?? null,
          CURRENT: data.registers?.CURRENT ?? null,
          FREQUENCY: data.registers?.FREQUENCY ?? null,
          POWER: data.registers?.POWER ?? null,
        },
      };

      setLatest(normalized);

      if (lastTsRef.current !== normalized.timestamp) {
        lastTsRef.current = normalized.timestamp;

        setHistory((prev) => {
          const next = [...prev, normalized];
          if (next.length > 5000) next.shift(); 
          return next;
        });
      }
    } catch (e: any) {
      console.error("Erro no polling latest:", e);
    }
  }

  // EFEITOS
  useEffect(() => {
    setHistory([]); 
    setLatest(null);
    lastTsRef.current = null;
    fetchHistory(device, range);
  }, [device, range]);

  useEffect(() => {
    fetchLatest(device);
    const id = window.setInterval(() => {
      fetchLatest(device);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [device]);

  const status = useMemo(() => {
    const temp = latest?.registers?.TEMP ?? 0;
    if (temp >= 50) return { label: "ALERTA", tone: "warn" as const };
    return { label: "ONLINE", tone: "ok" as const };
  }, [latest]);

  const chartData = useMemo(() => {
    return history.map((p) => ({
      timestamp: p.timestamp,
      TEMP: p.registers.TEMP ?? null,
      VOLTAGE: p.registers.VOLTAGE ?? null,
      CURRENT: p.registers.CURRENT ?? null,
      FREQUENCY: p.registers.FREQUENCY ?? null,
      POWER: p.registers.POWER ?? null,
    }));
  }, [history]);

  function toggleVisible(key: keyof Registers) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // --- RENDERIZAÇÃO ---
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
            <span className="ap-pillText">
              {loading ? "CARREGANDO..." : status.label}
            </span>
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
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 8,
              background: "rgba(255,0,0,0.08)",
              color: "#ffcccc",
              border: "1px solid #ff000033"
            }}
          >
            <b>Aviso:</b> {errMsg}
          </div>
        )}

        <div style={{ marginBottom: 10, opacity: 0.75, fontSize: 12 }}>
          Última leitura:{" "}
          {latest ? formatDateTimeFromUnixSeconds(latest.timestamp) : "--"}
        </div>

        {/* CARDS */}
        <section className="ap-grid3">
          <MetricCard
            title="TEMPERATURA"
            value={latest?.registers.TEMP ?? null}
            unit="°C"
            accent="orange"
            data={history}
            dataKey="TEMP"
          />
          <MetricCard
            title="TENSÃO"
            value={latest?.registers.VOLTAGE ?? null}
            unit="V"
            accent="yellow"
            data={history}
            dataKey="VOLTAGE"
          />
          <MetricCard
            title="CORRENTE"
            value={latest?.registers.CURRENT ?? null}
            unit="A"
            accent="green"
            data={history}
            dataKey="CURRENT"
          />
        </section>

        <section className="ap-grid3" style={{ marginTop: 14 }}>
          <MetricCard
            title="FREQUÊNCIA"
            value={latest?.registers.FREQUENCY ?? null}
            unit="Hz"
            accent="purple"
            data={history}
            dataKey="FREQUENCY"
          />
          <MetricCard
            title="POTÊNCIA"
            value={latest?.registers.POWER ?? null}
            unit="W"
            accent="blue"
            data={history}
            dataKey="POWER"
          />
          <MetricCard
            title="DISPOSITIVO"
            valueText={device}
            accent="cyan"
            hideSparkline
          />
        </section>

        {/* --- CONTROLES MODIFICADOS AQUI (Tirei os Checkboxes) --- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 24,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          {/* SELETOR DE PERÍODO */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["1D", "7D", "30D", "ALL"] as RangeKey[]).map((k) => (
              <button
                key={k}
                className="ap-chip"
                onClick={() => setRange(k)}
                aria-pressed={range === k}
              >
                {k === "ALL" ? "Tudo" : k}
              </button>
            ))}
          </div>

          {/* SELETOR DE DADOS (NOVO VISUAL - Tags Coloridas) */}
          <div className="ap-toggles-container">
            {[
              { key: "TEMP", label: "Temperatura" },
              { key: "VOLTAGE", label: "Tensão" },
              { key: "CURRENT", label: "Corrente" },
              { key: "FREQUENCY", label: "Frequência" },
              { key: "POWER", label: "Potência" },
            ].map((item) => {
              const k = item.key as keyof Registers;
              const isActive = visible[k];

              return (
                <div
                  key={k}
                  /* Aplica a classe "active" e o nome da chave (TEMP, VOLTAGE) para o CSS pintar a cor certa */
                  className={`ap-toggle-chip ${k} ${isActive ? "active" : ""}`}
                  onClick={() => toggleVisible(k)}
                >
                  <div className="ap-toggle-dot" style={{ opacity: isActive ? 1 : 0.2 }} />
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* GRÁFICO */}
        <section
          style={{
            height: 360,
            marginTop: 12,
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            Série temporal ({range === "ALL" ? "Histórico Completo" : range})
          </div>

          {chartData.length < 2 ? (
            <div style={{ opacity: 0.7, padding: 12 }}>
              {loading ? "Carregando dados..." : "Ainda sem pontos suficientes para o gráfico…"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v: any) => formatTick(Number(v), range)}
                  minTickGap={30}
                  stroke="rgba(255,255,255,0.5)"
                />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1730", border: "1px solid #333" }}
                  labelFormatter={(label: any) =>
                    `Tempo: ${formatDateTimeFromUnixSeconds(Number(label))}`
                  }
                />
                <Legend />

                {visible.TEMP && (
                  <Line type="monotone" dataKey="TEMP" name="Temperatura" dot={false} strokeWidth={2} stroke="#f97316" />
                )}
                {visible.VOLTAGE && (
                  <Line type="monotone" dataKey="VOLTAGE" name="Tensão" dot={false} strokeWidth={2} stroke="#eab308" />
                )}
                {visible.CURRENT && (
                  <Line type="monotone" dataKey="CURRENT" name="Corrente" dot={false} strokeWidth={2} stroke="#4ade80" />
                )}
                {visible.FREQUENCY && (
                  <Line type="monotone" dataKey="FREQUENCY" name="Frequência" dot={false} strokeWidth={2} stroke="#a78bfa" />
                )}
                {visible.POWER && (
                  <Line type="monotone" dataKey="POWER" name="Potência" dot={false} strokeWidth={2} stroke="#60a5fa" />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        <footer style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
          Atualiza a cada {POLL_MS / 1000}s • Pontos carregados: {history.length}
        </footer>
      </main>
    </div>
  );
}