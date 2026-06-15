import React, { useState, useEffect } from 'react';

const DEVOLUCIONES_KEY = 'devoluciones_cache';
const PEDIDOS_KEY = 'pedidos_cache';
const CONFIG_KEY = 'shopify_config';

const ESTADOS_DEV = ['solicitada', 'aprobada', 'recibida', 'reembolsada', 'rechazada'];
const MOTIVOS = ['Producto defectuoso', 'No era lo esperado', 'Talla incorrecta', 'Llegó tarde', 'Error en el pedido', 'Otro'];

function badge(estado) {
  const colores = {
    solicitada: 'badge-pendiente',
    aprobada:   'badge-procesando',
    recibida:   'badge-enviado',
    reembolsada:'badge-entregado',
    rechazada:  'badge-cancelado',
  };
  return <span className={`badge ${colores[estado] || 'badge-cancelado'}`}>{estado}</span>;
}

function formatFecha(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoneda(val, moneda = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda }).format(val || 0);
}

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [config, setConfig] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [devSeleccionada, setDevSeleccionada] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [nueva, setNueva] = useState({
    numeroPedido: '', cliente: '', producto: '', importe: '',
    motivo: 'Producto defectuoso', estado: 'solicitada',
    fecha: new Date().toISOString().split('T')[0], notas: ''
  });

  useEffect(() => {
    const cfg = localStorage.getItem(CONFIG_KEY);
    if (cfg) setConfig(JSON.parse(cfg));
    const devs = localStorage.getItem(DEVOLUCIONES_KEY);
    if (devs) setDevoluciones(JSON.parse(devs));
    const peds = localStorage.getItem(PEDIDOS_KEY);
    if (peds) setPedidos(JSON.parse(peds));
  }, []);

  const guardar = (lista) => {
    setDevoluciones(lista);
    localStorage.setItem(DEVOLUCIONES_KEY, JSON.stringify(lista));
  };

  const agregarDevolucion = () => {
    const d = { ...nueva, id: 'dev_' + Date.now() };
    guardar([d, ...devoluciones]);
    setModalNuevo(false);
    setNueva({ numeroPedido: '', cliente: '', producto: '', importe: '', motivo: 'Producto defectuoso', estado: 'solicitada', fecha: new Date().toISOString().split('T')[0], notas: '' });
  };

  const actualizarDevolucion = (id, campos) => {
    guardar(devoluciones.map(d => d.id === id ? { ...d, ...campos } : d));
    setModalEditar(false);
    setDevSeleccionada(null);
  };

  const eliminar = (id) => {
    if (!window.confirm('¿Eliminar esta devolución?')) return;
    guardar(devoluciones.filter(d => d.id !== id));
  };

  const seleccionarPedido = (num) => {
    const p = pedidos.find(p => String(p.numero) === String(num));
    if (p) {
      setNueva(prev => ({
        ...prev,
        numeroPedido: p.numero,
        cliente: p.cliente,
        producto: p.producto,
        importe: p.total,
      }));
    } else {
      setNueva(prev => ({ ...prev, numeroPedido: num }));
    }
  };

  const exportarCSV = () => {
    const moneda = config?.moneda || 'EUR';
    const headers = ['ID', 'Pedido', 'Cliente', 'Producto', 'Importe', 'Motivo', 'Estado', 'Fecha', 'Notas'];
    const filas = devFiltradas.map(d => [
      d.id, d.numeroPedido, d.cliente, `"${d.producto}"`,
      formatMoneda(d.importe, moneda), d.motivo, d.estado, formatFecha(d.fecha), `"${d.notas}"`
    ]);
    const csv = [headers, ...filas].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `devoluciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const moneda = config?.moneda || 'EUR';
  const devFiltradas = devoluciones.filter(d => !filtroEstado || d.estado === filtroEstado);
  const totalReembolsado = devoluciones.filter(d => d.estado === 'reembolsada').reduce((s, d) => s + parseFloat(d.importe || 0), 0);
  const pendientes = devoluciones.filter(d => ['solicitada', 'aprobada', 'recibida'].includes(d.estado)).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🔄 Devoluciones</h2>
          <p>{devoluciones.length} devoluciones · {pendientes} pendientes de resolver</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={exportarCSV}>⬇ CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalNuevo(true)}>+ Nueva devolución</button>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat-card">
            <div className="label">Total devoluciones</div>
            <div className="value">{devoluciones.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Pendientes</div>
            <div className="value" style={{ color: '#fbbf24' }}>{pendientes}</div>
          </div>
          <div className="stat-card">
            <div className="label">Reembolsadas</div>
            <div className="value" style={{ color: '#86efac' }}>{devoluciones.filter(d => d.estado === 'reembolsada').length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total reembolsado</div>
            <div className="value" style={{ fontSize: '1.2rem', color: '#fda4af' }}>{formatMoneda(totalReembolsado, moneda)}</div>
          </div>
        </div>

        <div className="filtros">
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS_DEV.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
          {filtroEstado && (
            <button className="btn btn-secondary btn-sm" onClick={() => setFiltroEstado('')}>✕ Limpiar</button>
          )}
        </div>

        {devFiltradas.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔄</div>
            <p>{devoluciones.length === 0 ? 'Sin devoluciones registradas. Pulsa "+ Nueva devolución" para añadir.' : 'No hay devoluciones con este filtro.'}</p>
          </div>
        ) : (
          <div className="tabla-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Importe</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {devFiltradas.map(d => (
                  <tr key={d.id}>
                    <td style={{ color: '#60a5fa', fontWeight: 600 }}>#{d.numeroPedido}</td>
                    <td>{d.cliente}</td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.producto}</td>
                    <td style={{ color: '#fda4af', fontWeight: 600 }}>{formatMoneda(d.importe, moneda)}</td>
                    <td style={{ fontSize: '0.78rem' }}>{d.motivo}</td>
                    <td>{badge(d.estado)}</td>
                    <td>{formatFecha(d.fecha)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setDevSeleccionada(d); setModalEditar(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => eliminar(d.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalNuevo && (
        <div className="modal-overlay" onClick={() => setModalNuevo(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🔄 Nueva devolución</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Número de pedido</label>
                <input type="text" placeholder="1001" value={nueva.numeroPedido}
                  onChange={e => seleccionarPedido(e.target.value)} />
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Si existe en pedidos, se autocompleta</span>
              </div>
              <div className="form-group">
                <label>Fecha solicitud</label>
                <input type="date" value={nueva.fecha} onChange={e => setNueva({ ...nueva, fecha: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cliente</label>
                <input type="text" placeholder="Nombre cliente" value={nueva.cliente} onChange={e => setNueva({ ...nueva, cliente: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Importe a devolver ({moneda})</label>
                <input type="number" placeholder="0.00" value={nueva.importe} onChange={e => setNueva({ ...nueva, importe: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Producto</label>
              <input type="text" placeholder="Nombre del producto" value={nueva.producto} onChange={e => setNueva({ ...nueva, producto: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Motivo</label>
                <select value={nueva.motivo} onChange={e => setNueva({ ...nueva, motivo: e.target.value })}>
                  {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={nueva.estado} onChange={e => setNueva({ ...nueva, estado: e.target.value })}>
                  {ESTADOS_DEV.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Notas</label>
              <textarea placeholder="Observaciones..." value={nueva.notas} onChange={e => setNueva({ ...nueva, notas: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalNuevo(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={agregarDevolucion}>Registrar devolución</button>
            </div>
          </div>
        </div>
      )}

      {modalEditar && devSeleccionada && (
        <div className="modal-overlay" onClick={() => setModalEditar(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>✏️ Editar devolución #{devSeleccionada.numeroPedido}</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Motivo</label>
                <select value={devSeleccionada.motivo}
                  onChange={e => setDevSeleccionada({ ...devSeleccionada, motivo: e.target.value })}>
                  {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={devSeleccionada.estado}
                  onChange={e => setDevSeleccionada({ ...devSeleccionada, estado: e.target.value })}>
                  {ESTADOS_DEV.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Importe ({moneda})</label>
              <input type="number" value={devSeleccionada.importe}
                onChange={e => setDevSeleccionada({ ...devSeleccionada, importe: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Notas</label>
              <textarea value={devSeleccionada.notas || ''}
                onChange={e => setDevSeleccionada({ ...devSeleccionada, notas: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalEditar(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => actualizarDevolucion(devSeleccionada.id, devSeleccionada)}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
