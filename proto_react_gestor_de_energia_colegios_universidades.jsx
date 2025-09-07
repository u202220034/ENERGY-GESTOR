import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Bell, LineChart as LineIcon, Activity, Building2, PlugZap, Leaf } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Legend } from "recharts";

// -------------------------
// Types
// -------------------------
 type Consumo = {
  id: string;
  edificio: string;
  aula: string;
  dispositivo: string;
  fechaHora: string; // ISO
  consumoKWh: number;
};

 type Alerta = {
  id: string;
  tipoAlerta: string;
  descripcion: string;
  nivelCriticidad: "Alta" | "Media" | "Baja";
  fechaHora: string;
  estado: "Activa" | "Resuelta";
};

 type Recomendacion = {
  id: string;
  tipoRecomendacion: string;
  descripcion: string;
  ahorroEstimadoKWh: number;
  ahorroEstimadoCO2: number;
  aplicada?: boolean;
};

 type Simulacion = {
  id: string;
  escenario: string;
  ahorroDinero: number;
  ahorroCO2: number;
};

// -------------------------
// Mock data helpers
// -------------------------
const uid = () => Math.random().toString(36).slice(2);

const initialConsumos: Consumo[] = [
  { id: uid(), edificio: "A", aula: "101", dispositivo: "Luces", fechaHora: "2025-09-01T08:15:00Z", consumoKWh: 2.2 },
  { id: uid(), edificio: "A", aula: "101", dispositivo: "Aire Acond.", fechaHora: "2025-09-01T09:15:00Z", consumoKWh: 3.5 },
  { id: uid(), edificio: "B", aula: "Lab 301", dispositivo: "Computadoras", fechaHora: "2025-09-01T10:30:00Z", consumoKWh: 5.8 },
  { id: uid(), edificio: "Biblioteca", aula: "2do piso", dispositivo: "Iluminación", fechaHora: "2025-09-01T11:10:00Z", consumoKWh: 1.4 },
  { id: uid(), edificio: "Gimnasio", aula: "Sala cardio", dispositivo: "Aire Acond.", fechaHora: "2025-09-01T12:20:00Z", consumoKWh: 4.1 },
];

const initialAlertas: Alerta[] = [
  { id: uid(), tipoAlerta: "Uso fuera de horario", descripcion: "Luces encendidas Edif. A 101 a las 23:10", nivelCriticidad: "Alta", fechaHora: "2025-09-01T23:10:00Z", estado: "Activa" },
  { id: uid(), tipoAlerta: "Consumo anómalo", descripcion: "Aire Acond. Gimnasio +35%", nivelCriticidad: "Media", fechaHora: "2025-09-01T12:40:00Z", estado: "Activa" },
  { id: uid(), tipoAlerta: "Standby prolongado", descripcion: "PCs Lab 301 toda la noche", nivelCriticidad: "Alta", fechaHora: "2025-09-01T05:40:00Z", estado: "Activa" },
];

const initialRecs: Recomendacion[] = [
  { id: uid(), tipoRecomendacion: "Iluminación inteligente", descripcion: "Instalar sensores de presencia en Edif. A 1er piso", ahorroEstimadoKWh: 45, ahorroEstimadoCO2: 18 },
  { id: uid(), tipoRecomendacion: "Horario valle", descripcion: "Mover renderizado del Lab 301 a 1-5am", ahorroEstimadoKWh: 62, ahorroEstimadoCO2: 24 },
  { id: uid(), tipoRecomendacion: "Mantenimiento A/C", descripcion: "Mant. preventivo al A/C del Gimnasio", ahorroEstimadoKWh: 30, ahorroEstimadoCO2: 12 },
];

// -------------------------
// UI Helpers
// -------------------------
const KPI = ({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) => (
  <Card className="rounded-2xl shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const CritBadge = ({ level }: { level: Alerta["nivelCriticidad"] }) => {
  const color = level === "Alta" ? "destructive" : level === "Media" ? "secondary" : "default";
  return <Badge variant={color as any}>{level}</Badge>;
};

// -------------------------
// Main App
// -------------------------
export default function GestorEnergiaApp() {
  const [consumos, setConsumos] = useState<Consumo[]>(initialConsumos);
  const [alertas, setAlertas] = useState<Alerta[]>(initialAlertas);
  const [recs, setRecs] = useState<Recomendacion[]>(initialRecs);
  const [tab, setTab] = useState("dashboard");

  // Derived metrics
  const totalKWh = useMemo(() => consumos.reduce((a, c) => a + c.consumoKWh, 0), [consumos]);
  const costoEstimado = useMemo(() => totalKWh * 0.22, [totalKWh]); // tarifa referencial
  const co2 = useMemo(() => totalKWh * 0.4, [totalKWh]); // factor ficticio kgCO2/kWh

  // Chart data by building
  const porEdificio = useMemo(() => {
    const map: Record<string, number> = {};
    consumos.forEach(c => { map[c.edificio] = (map[c.edificio] || 0) + c.consumoKWh; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [consumos]);

  const porHora = useMemo(() => {
    const map: Record<string, number> = {};
    consumos.forEach(c => {
      const h = new Date(c.fechaHora).getHours().toString().padStart(2, "0");
      map[h] = (map[h] || 0) + c.consumoKWh;
    });
    return Array.from({ length: 24 }).map((_, i) => {
      const h = i.toString().padStart(2, "0");
      return { hora: h, kWh: +(map[h] || 0).toFixed(2) };
    });
  }, [consumos]);

  // Handlers
  const addConsumo = (c: Omit<Consumo, "id">) => setConsumos(prev => [...prev, { id: uid(), ...c }]);
  const toggleAlerta = (id: string) => setAlertas(prev => prev.map(a => a.id === id ? { ...a, estado: a.estado === "Activa" ? "Resuelta" : "Activa" } : a));
  const applyRec = (id: string) => setRecs(prev => prev.map(r => r.id === id ? { ...r, aplicada: true } : r));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlugZap className="h-6 w-6" />
          <h1 className="text-xl md:text-2xl font-bold">Gestor de Energía · Campus</h1>
          <Badge variant="outline" className="ml-2">Prototipo</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Leaf className="h-4 w-4" />
          <span>Demo sostenible</span>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 rounded-2xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="consumos">Consumos</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
          <TabsTrigger value="recs">Recomendaciones</TabsTrigger>
          <TabsTrigger value="simul">Simulaciones</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI title="Consumo total (kWh)" value={totalKWh.toFixed(2)} icon={<Activity className="h-4 w-4 text-slate-400" />} />
            <KPI title="Costo estimado (S/)" value={costoEstimado.toFixed(2)} icon={<LineIcon className="h-4 w-4 text-slate-400" />} />
            <KPI title="Huella CO₂ (kg)" value={co2.toFixed(1)} icon={<Leaf className="h-4 w-4 text-slate-400" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <Card className="rounded-2xl shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle>Consumo por hora</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={porHora}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="kWh" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Consumo por edificio</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porEdificio}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5"/> Alertas activas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {alertas.map(a => (
                  <li key={a.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5"/>
                      <div>
                        <div className="font-medium">{a.tipoAlerta}</div>
                        <div className="text-sm text-slate-500">{a.descripcion}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CritBadge level={a.nivelCriticidad} />
                      <Switch checked={a.estado === "Resuelta"} onCheckedChange={() => toggleAlerta(a.id)} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONSUMOS */}
        <TabsContent value="consumos" className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5"/> Registrar consumo</CardTitle>
            </CardHeader>
            <CardContent>
              <ConsumoForm onAdd={addConsumo} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Histórico de consumos</CardTitle>
            </CardHeader>
            <CardContent>
              <ConsumosTable data={consumos} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERTAS */}
        <TabsContent value="alertas" className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {alertas.map(a => (
                  <li key={a.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="max-w-xl">
                      <div className="font-medium">{a.tipoAlerta} <span className="text-xs text-slate-400">({new Date(a.fechaHora).toLocaleString()})</span></div>
                      <div className="text-sm text-slate-600">{a.descripcion}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CritBadge level={a.nivelCriticidad} />
                      <Badge variant={a.estado === "Activa" ? "destructive" : "default"}>{a.estado}</Badge>
                      <Button size="sm" variant="outline" onClick={() => toggleAlerta(a.id)}>
                        {a.estado === "Activa" ? "Marcar resuelta" : "Reabrir"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECOMENDACIONES */}
        <TabsContent value="recs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recs.map(r => (
              <Card key={r.id} className={`rounded-2xl shadow-sm ${r.aplicada ? "opacity-60" : ""}`}>
                <CardHeader>
                  <CardTitle>{r.tipoRecomendacion}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600">{r.descripcion}</p>
                  <div className="text-sm">
                    <span className="font-medium">Ahorro estimado:</span> {r.ahorroEstimadoKWh} kWh · {r.ahorroEstimadoCO2} kg CO₂
                  </div>
                  <Button disabled={r.aplicada} onClick={() => applyRec(r.id)}>{r.aplicada ? "Aplicada" : "Aplicar"}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SIMULACIONES */}
        <TabsContent value="simul" className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Simular ahorro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Simulador totalKWh={totalKWh} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <footer className="mt-10 text-center text-xs text-slate-400">
        Prototipo UI · Conectar a APIs CAP (REST) cuando estén listas.
      </footer>
    </div>
  );
}

// -------------------------
// Forms & Tables
// -------------------------
function ConsumoForm({ onAdd }: { onAdd: (c: Omit<Consumo, "id">) => void }) {
  const [edificio, setEdificio] = useState("");
  const [aula, setAula] = useState("");
  const [dispositivo, setDispositivo] = useState("");
  const [consumoKWh, setConsumoKWh] = useState("");

  const submit = () => {
    if (!edificio || !aula || !dispositivo || !consumoKWh) return;
    onAdd({ edificio, aula, dispositivo, fechaHora: new Date().toISOString(), consumoKWh: parseFloat(consumoKWh) });
    setEdificio(""); setAula(""); setDispositivo(""); setConsumoKWh("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <Label>Edificio</Label>
        <Input value={edificio} onChange={e => setEdificio(e.target.value)} placeholder="A / B / Biblioteca" />
      </div>
      <div>
        <Label>Aula</Label>
        <Input value={aula} onChange={e => setAula(e.target.value)} placeholder="101 / Lab 301" />
      </div>
      <div>
        <Label>Dispositivo</Label>
        <Input value={dispositivo} onChange={e => setDispositivo(e.target.value)} placeholder="Luces / A/C / PCs" />
      </div>
      <div>
        <Label>Consumo (kWh)</Label>
        <Input type="number" value={consumoKWh} onChange={e => setConsumoKWh(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button className="w-full" onClick={submit}>Agregar</Button>
      </div>
    </div>
  );
}

function ConsumosTable({ data }: { data: Consumo[] }) {
  const [filtroEdif, setFiltroEdif] = useState<string>("Todos");

  const edificios = useMemo(() => Array.from(new Set(data.map(d => d.edificio))), [data]);
  const filtrada = useMemo(() => filtroEdif === "Todos" ? data : data.filter(d => d.edificio === filtroEdif), [data, filtroEdif]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="w-64">
          <Label>Filtrar por edificio</Label>
          <Select value={filtroEdif} onValueChange={setFiltroEdif}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {edificios.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="p-3 text-left">Fecha/Hora</th>
              <th className="p-3 text-left">Edificio</th>
              <th className="p-3 text-left">Aula</th>
              <th className="p-3 text-left">Dispositivo</th>
              <th className="p-3 text-right">kWh</th>
            </tr>
          </thead>
          <tbody>
            {filtrada.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{new Date(c.fechaHora).toLocaleString()}</td>
                <td className="p-3">{c.edificio}</td>
                <td className="p-3">{c.aula}</td>
                <td className="p-3">{c.dispositivo}</td>
                <td className="p-3 text-right">{c.consumoKWh.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Simulador({ totalKWh }: { totalKWh: number }) {
  const [escenario, setEscenario] = useState<string>("Apagado inteligente");
  const [reduccion, setReduccion] = useState<number>(15); // %
  const ahorroKWh = useMemo(() => +(totalKWh * (reduccion/100)).toFixed(2), [totalKWh, reduccion]);
  const costo = ahorroKWh * 0.22; // S/
  const co2 = ahorroKWh * 0.4; // kg

  const chartData = [
    { name: "Actual", kWh: totalKWh },
    { name: "Escenario", kWh: Math.max(totalKWh - ahorroKWh, 0) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Escenario</Label>
          <Select value={escenario} onValueChange={setEscenario}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Apagado inteligente">Apagado inteligente</SelectItem>
              <SelectItem value="Horario valle">Horario valle</SelectItem>
              <SelectItem value="Mantenimiento A/C">Mantenimiento A/C</SelectItem>
              <SelectItem value="Sensores presencia">Sensores presencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Reducción estimada (%)</Label>
          <Input type="number" value={reduccion} onChange={e => setReduccion(parseFloat(e.target.value || "0"))} />
        </div>
        <div className="flex items-end">
          <div className="text-sm text-slate-600">Ajusta el % según el escenario.</div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="Ahorro (kWh)" value={ahorroKWh.toString()} />
        <KPI title="Ahorro (S/)" value={costo.toFixed(2)} />
        <KPI title="Ahorro CO₂ (kg)" value={co2.toFixed(1)} />
      </div>

      <div className="rounded-2xl border p-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="kWh" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
