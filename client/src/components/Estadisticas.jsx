import React, { useState, useEffect } from 'react';

const PEDIDOS_KEY = 'pedidos_cache';
const DEVOLUCIONES_KEY = 'devoluciones_cache';
const CONFIG_KEY = 'shopify_config';

function formatMoneda(val, moneda = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda }).format(val || 0);
}

function formatFecha(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Estadisticas() {
  const [pedidos, setPedidos] = useState([]);
  const [devoluciones, setDevoluciones] = useState([]);
  const [config, setConfig] = useState(null);
  const [periodo, setPeriodo] = useState('30');

  useEffect(() => {
    const cfg = localStorage.getItem(CONFIG_KEY);
    if (cfg) setConfig(JSON.parse(cfg));
    const peds = localStorage.getItem(PEDIDOS_KEY);
    if (peds) setPedidos(JSON.parse(peds));
    const devs = localStorage.getItem(DEVOLUCIONES_KEY);
    if (devs) setDevoluciones(JSON.parse(devs));
  }, []);

  const moneda = config?.moneda || 'EUR';

  const pedidosFiltrados = pedidos.filter(p => {
    if (periodo === 'todo') return true;
    const dias = parseInt(periodo);
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    return new Date(p.fecha) >= desde;
  });

  const totalVentas = pedidosFiltrados.reduce((s, p) => s + (parseFloat(p.total) || 0), 0);
  const totalPedidos = pedidosFiltrados.length;
  const ticketMedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;
  const totalReembolsado = devoluciones
    .filter(d => d.estado === 'reembolsada')
    .reduce((s, d) => s + (parseFloat(d.importe) || 0), 0);

  const porEstado = ['pendiente', 'procesando', 'enviado', 'entregado', 'devuelto', 'cancelado'].map(estado => ({
    estado,
    count: pedidosFiltrados.filter(p => p.estado === estado).length,
    total: pedidosFiltrados.filter(p => p.estado === estado).reduce((s, p) => s + (parseFloat(p.total) || 0), 0),
  }));

  const porMes = () => {
    const meses = {};
    pedidosFiltrados.forEach(p => {
      if (!p.fecha) return;
      const key = new Date(p.fecha).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      if (!meses[key]) meses[key] = { count: 0, total: 0 };
      meses[key].count++;
      meses[key].total += parseFloat(p.total) || 0;
    });
    return Object.entries(meses).slice(-6);
  };

  const motivosDev = () => {
    const map = {};
    devoluciones.forEach(d => {
      map[d.motivo] = (map[d.motivo] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const top5Clientes = () => {
    const map = {};
    pedidosFiltrados.forEach(p => {
      if (!p.cliente || p.cliente === 'Sin cliente') return;
      if (!map[p.cliente]) map[p.cliente] = { count: 0, total: 0 };
      map[p.cliente].count++;
      map[p.cliente].total += parseFloat(p.total) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  };

  const maxEstado = Math.max(...porEstado.map(e => e.count), 1);
  const meses = porMes();
  const maxMes = Math.max(...meses.map(([, v]) => v.total), 1);

  const coloresEstado = {
    pendiente: '#fbbf24', procesando: '#60a5fa', enviado: '#a5b4fc',
    entregado: '#86efac', devuelto: '#fda4af', cancelado: '#6b7280'
  };

  if (pedidos.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div><h2>📊 Estadísticas</h2><p>Resumen de tu negocio</p></div>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <div className="icon">📊</div>
            <p>Sin datos. Sincroniza pedidos desde Shopify o añade pedidos manualmente.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>📊 Estadísticas</h2>
          <p>Resumen de rendimiento de tu tienda</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Periodo:</span>
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            style={{ background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', padding: '6px 10px', borderRadius: '6px', fontSize: '0.825rem' }}
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="todo">Todo</option>
          </select>
        </div>
      </div>

      <div className="page-body">

        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Facturación</div>
            <div className="value" style={{ fontSize: '1.4rem' }}>{formatMoneda(totalVentas, moneda)}</div>
            <div className="sub">{totalPedidos} pedidos</div>
          </div>
          <div className="stat-card">
            <div className="label">Ticket medio</div>
            <div className="value" style={{ fontSize: '1.4rem' }}>{formatMoneda(ticketMedio, moneda)}</div>
            <div className="sub">por pedido</div>
          </div>
          <div className="stat-card">
            <div className="label">Entregados</div>
            <div className="value" style={{ color: '#86efac' }}>
              {pedidosFiltrados.filter(p => p.estado === 'entregado').length}
            </div>
            <div className="sub">
              {totalPedidos > 0 ? Math.round(pedidosFiltrados.filter(p => p.estado === 'entregado').length / totalPedidos * 100) : 0}% del total
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Total reembolsado</div>
            <div className="value" style={{ fontSize: '1.2rem', color: '#fda4af' }}>{formatMoneda(totalReembolsado, moneda)}</div>
            <div className="sub">{devoluciones.filter(d => d.estado === 'reembolsada').length} devoluciones</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          <div className="card">
            <h3 style={{ color: '#f9fafb', fontSize: '0.9rem', marginBottom: '16px' }}>📦 Pedidos por estado</h3>
            {porEstado.map(({ estado, count, total }) => (
              <div key={estado} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                  <span style={{ color: coloresEstado[estado], textTransform: 'capitalize' }}>{estado}</span>
                  <span style={{ color: '#9ca3af' }}>{count} · {formatMoneda(total, moneda)}</span>
                </div>
                <div style={{ background: '#111827', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(count / maxEstado) * 100}%`,
                    height: '100%',
                    background: coloresEstado[estado],
                    borderRadius: '4px',
                    transition: 'width 0.4s'
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ color: '#f9fafb', fontSize: '0.9rem', marginBottom: '16px' }}>📅 Ventas por mes</h3>
            {meses.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.825rem' }}>Sin datos en el periodo seleccionado</p>
            ) : (
              meses.map(([mes, val]) => (
                <div key={mes} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#e5e7eb' }}>{mes}</span>
                    <span style={{ color: '#9ca3af' }}>{val.count} pedidos · {formatMoneda(val.total, moneda)}</span>
                  </div>
                  <div style={{ background: '#111827', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(val.total / maxMes) * 100}%`,
                      height: '100%',
                      background: '#2563eb',
                      borderRadius: '4px',
                      transition: 'width 0.4s'
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          <div className="card">
            <h3 style={{ color: '#f9fafb', fontSize: '0.9rem', marginBottom: '16px' }}>👥 Top 5 clientes</h3>
            {top5Clientes().length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.825rem' }}>Sin datos</p>
            ) : (
              <table style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: '#6b7280', paddingBottom: '8px' }}>Cliente</th>
                    <th style={{ textAlign: 'right', color: '#6b7280', paddingBottom: '8px' }}>Pedidos</th>
                    <th style={{ textAlign: 'right', color: '#6b7280', paddingBottom: '8px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Clientes().map(([cliente, data], i) => (
                    <tr key={cliente}>
                      <td style={{ padding: '6px 0', color: '#e5e7eb' }}>
                        <span style={{ color: '#60a5fa', marginRight: '6px' }}>#{i + 1}</span>{cliente}
                      </td>
                      <td style={{ textAlign: 'right', color: '#9ca3af' }}>{data.count}</td>
                      <td style={{ textAlign: 'right', color: '#86efac', fontWeight: 600 }}>{formatMoneda(data.total, moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ color: '#f9fafb', fontSize: '0.9rem', marginBottom: '16px' }}>🔄 Motivos de devolución</h3>
            {motivosDev().length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.825rem' }}>Sin devoluciones registradas</p>
            ) : (
              motivosDev().map(([motivo, count]) => (
                <div key={motivo} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937', fontSize: '0.8rem' }}>
                  <span style={{ color: '#e5e7eb' }}>{motivo}</span>
                  <span style={{ color: '#fda4af', fontWeight: 600 }}>{count}</span>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
