import { useEffect, useMemo, useState } from "react";
import logo from "./assets/logo.png";
import "./App.css";


type Tab = "dashboard" | "calibracao";

type EnvReading = {
  ts: Date;
  temperature: number; // °C
  humidity: number; // %
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function App(props: { signOut?: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [isDemo, setIsDemo] = useState(true);

  const [current, setCurrent] = useState<EnvReading>(() => ({
    ts: new Date(),
    temperature: 25.4,
    humidity: 58,
  }));
  const [history, setHistory] = useState<EnvReading[]>(() => [current]);

  // Mock “tempo real”
  useEffect(() => {
    if (!isDemo) return; // por enquanto, Live desliga mock
    const id = setInterval(() => {
      setCurrent((prev) => {
        const next: EnvReading = {
          ts: new Date(),
          temperature: clamp(prev.temperature + rand(-0.25, 0.25), 15, 40),
          humidity: clamp(prev.humidity + rand(-1.0, 1.0), 20, 95),
        };
        setHistory((h) => [next, ...h].slice(0, 40));
        return next;
      });
    }, 2000);

    return () => clearInterval(id);
  }, [isDemo]);

  const status = useMemo(() => {
    // regra simples de status (só visual)
    if (current.temperature >= 32) return { label: "ALERTA", tone: "warn" as const };
    return { label: "ONLINE", tone: "ok" as const };
  }, [current.temperature]);

  return (
    <div className="ap-page">
      {/* Topbar */}
      <header className="ap-topbar">
        <div className="ap-brand">
          <img className="ap-logo" src={logo} alt="Aquapower" />
          <span className="ap-brandText">AQUAPOWER</span>
        </div>

        <nav className="ap-tabs">
          <button
            className={`ap-tab ${tab === "dashboard" ? "isActive" : ""}`}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`ap-tab ${tab === "calibracao" ? "isActive" : ""}`}
            onClick={() => setTab("calibracao")}
          >
            Calibração
          </button>
        </nav>

        <div className="ap-actions">
          <div className={`ap-pill ${status.tone}`}>
            <span className="ap-pillDot" />
            <span className="ap-pillText">{status.label}</span>
            <span className="ap-pillSep">•</span>
            <span className="ap-pillMuted">{fmtTime(current.ts)}</span>
          </div>

          <button className="ap-linkBtn" onClick={() => setIsDemo((v) => !v)}>
            {isDemo ? "Demo" : "Live"}
          </button>

          {props.signOut ? (
            <button className="ap-ghostBtn" onClick={props.signOut}>
              Sair
            </button>
          ) : null}
        </div>
      </header>

      {/* Content */}
      <main className="ap-container">
        {tab === "dashboard" ? (
          <>
            <section className="ap-grid3">
              <MetricCard
                title="TEMPERATURA"
                value={current.temperature.toFixed(1)}
                unit="°C"
                hint="Leitura em tempo real"
                accent="blue"
              />
              <MetricCard
                title="UMIDADE"
                value={Math.round(current.humidity).toString()}
                unit="%"
                hint="Umidade relativa do ar"
                accent="green"
              />
              <MetricCard
                title="STATUS"
                value={status.label}
                unit=""
                hint={status.label === "ALERTA" ? "Temperatura alta" : "Dentro do esperado"}
                accent={status.label === "ALERTA" ? "purple" : "cyan"}
                isText
              />
            </section>

            <section className="ap-grid2">
              <div className="ap-card ap-cardTall">
                <div className="ap-cardHeader">
                  <h2>HISTÓRICO EM TEMPO REAL</h2>
                  <div className="ap-legend">
                    <span className="ap-dot blue" /> Temperatura
                    <span className="ap-dot green" /> Umidade
                  </div>
                </div>

                {/* Gráfico simples (placeholder visual, sem libs) */}
                <MiniChart history={history} />
              </div>

              <div className="ap-card ap-cardTall">
                <div className="ap-cardHeader">
                  <h2>ÚLTIMAS LEITURAS</h2>
                  <button className="ap-ghostBtn" onClick={() => setHistory([current])}>
                    Limpar
                  </button>
                </div>

                <div className="ap-tableWrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Temp (°C)</th>
                        <th>Umid (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 12).map((r, i) => (
                        <tr key={i}>
                          <td className="muted">{fmtTime(r.ts)}</td>
                          <td>{r.temperature.toFixed(1)}</td>
                          <td>{Math.round(r.humidity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="ap-footnote">
                  * Em “Live” vamos conectar no backend depois (AppSync/Dynamo/IoT).
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="ap-card ap-cardTall">
            <div className="ap-banner">
              <div className="ap-bannerIcon">⚙️</div>
              <div>
                <h2>Modo de Calibração</h2>
                <p>
                  Nesta primeira versão (UI), esta aba é apenas visual. Depois vamos ligar em comandos reais.
                </p>
              </div>
            </div>

            <div className="ap-grid2" style={{ marginTop: 14 }}>
              <div className="ap-card">
                <div className="ap-cardHeader">
                  <h2>Sensor Temperatura</h2>
                  <span className="ap-chip">ID: SENSOR_TEMP_01</span>
                </div>
                <div className="ap-kvRow">
                  <div className="ap-kv">
                    <div className="ap-kvLabel">LEITURA ATUAL</div>
                    <div className="ap-kvValue blue">{current.temperature.toFixed(1)} °C</div>
                  </div>
                </div>
                <div className="ap-form">
                  <label>Calibrar valor real</label>
                  <div className="ap-inputRow">
                    <input placeholder="Ex: 25.0" />
                    <button className="ap-disabledBtn" disabled>
                      Aplicar
                    </button>
                  </div>
                  <small className="muted">* Vamos habilitar quando conectar no backend.</small>
                </div>
              </div>

              <div className="ap-card">
                <div className="ap-cardHeader">
                  <h2>Sensor Umidade</h2>
                  <span className="ap-chip">ID: SENSOR_UMID_01</span>
                </div>
                <div className="ap-kvRow">
                  <div className="ap-kv">
                    <div className="ap-kvLabel">LEITURA ATUAL</div>
                    <div className="ap-kvValue green">{Math.round(current.humidity)} %</div>
                  </div>
                </div>
                <div className="ap-form">
                  <label>Calibrar valor real</label>
                  <div className="ap-inputRow">
                    <input placeholder="Ex: 60" />
                    <button className="ap-disabledBtn" disabled>
                      Aplicar
                    </button>
                  </div>
                  <small className="muted">* Vamos habilitar quando conectar no backend.</small>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MetricCard(props: {
  title: string;
  value: string;
  unit: string;
  hint: string;
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

      <div className="ap-metricHint">{props.hint}</div>
      <div className="ap-progress">
        <div className={`ap-progressBar ${props.accent}`} />
      </div>
    </div>
  );
}

function MiniChart({ history }: { history: EnvReading[] }) {
  // gráfico bem simples: só uma linha “bonita” pra UI (placeholder)
  const last = history.slice(0, 25).reverse();
  const temps = last.map((p) => p.temperature);
  const hums = last.map((p) => p.humidity);

  const tMin = Math.min(...temps, 0);
  const tMax = Math.max(...temps, 1);
  const hMin = Math.min(...hums, 0);
  const hMax = Math.max(...hums, 1);

  const W = 860;
  const H = 260;
  const pad = 18;

  const toPath = (arr: number[], min: number, max: number) => {
    const dx = (W - pad * 2) / Math.max(arr.length - 1, 1);
    const norm = (v: number) => {
      const t = (v - min) / (max - min || 1);
      return pad + (1 - t) * (H - pad * 2);
    };
    return arr
      .map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * dx} ${norm(v)}`)
      .join(" ");
  };

  const tempPath = toPath(temps, tMin, tMax);
  const humPath = toPath(hums, hMin, hMax);

  return (
    <div className="ap-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={tempPath} className="ap-line blue" />
        <path d={humPath} className="ap-line green" />
      </svg>
    </div>
  );
}
