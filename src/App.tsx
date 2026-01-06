import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Reading = {
  ts: Date;
  temperature: number; // °C
  humidity: number; // %
};

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function App() {
  // Mock inicial
  const [current, setCurrent] = useState<Reading>(() => ({
    ts: new Date(),
    temperature: 25.2,
    humidity: 58,
  }));

  const [history, setHistory] = useState<Reading[]>(() => [current]);

  // Simula atualização “ao vivo” (pode desligar depois)
  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((prev) => {
        const next: Reading = {
          ts: new Date(),
          temperature: clamp(prev.temperature + rand(-0.4, 0.4), 18, 35),
          humidity: clamp(prev.humidity + rand(-1.2, 1.2), 30, 90),
        };
        setHistory((h) => [next, ...h].slice(0, 12));
        return next;
      });
    }, 2000);

    return () => clearInterval(id);
  }, []);

  const status = useMemo(() => {
    // Exemplo de status visual simples
    if (current.temperature > 30) return { label: "Atenção", tone: "warn" as const };
    return { label: "Online", tone: "ok" as const };
  }, [current.temperature]);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1 className="title">Aquapower Dashboard</h1>
          <p className="subtitle">Monitoramento de ambiente (mock)</p>
        </div>

        <div className={`status ${status.tone}`}>
          <span className="dot" />
          <span>{status.label}</span>
          <span className="sep">•</span>
          <span className="muted">{formatTime(current.ts)}</span>
        </div>
      </header>

      <section className="grid">
        <Card
          label="Temperatura"
          value={`${current.temperature.toFixed(1)}°C`}
          helper="Ambiente"
          footer={`Atualizado às ${formatTime(current.ts)}`}
        />

        <Card
          label="Umidade"
          value={`${Math.round(current.humidity)}%`}
          helper="Umidade relativa"
          footer={`Atualizado às ${formatTime(current.ts)}`}
        />
      </section>

      <section className="panel">
        <div className="panelHeader">
          <h2>Últimas leituras</h2>
          <button className="ghostBtn" onClick={() => setHistory([current])}>
            Limpar histórico
          </button>
        </div>

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Temperatura (°C)</th>
                <th>Umidade (%)</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr key={i}>
                  <td className="muted">{formatTime(r.ts)}</td>
                  <td>{r.temperature.toFixed(1)}</td>
                  <td>{Math.round(r.humidity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="footer">
        <span className="muted">UI demo • depois conectamos no backend (AppSync/DynamoDB)</span>
      </footer>
    </div>
  );
}

function Card(props: { label: string; value: string; helper: string; footer: string }) {
  return (
    <div className="card">
      <div className="cardTop">
        <div>
          <p className="cardLabel">{props.label}</p>
          <p className="cardHelper">{props.helper}</p>
        </div>
      </div>

      <div className="cardValue">{props.value}</div>

      <div className="cardFooter">{props.footer}</div>
    </div>
  );
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default App;
