import React, { useState, useEffect, useCallback } from 'react';

const CONFIG_KEY = 'shopify_config';
const PEDIDOS_KEY = 'pedidos_cache';

const ESTADOS = ['pendiente', 'procesando', 'enviado', 'entregado', 'devuelto', 'cancelado'];

function badge(estado) {
  return <span className={`badge badge-${estado}`}>{estado}</span>;
}

function formatFecha(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoneda(val, moneda = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda }).format(val || 0);
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [estadoEditar, setEstadoEditar] = useState('');
  const [notaEditar, setNotaEditar] = useState('');
  const [config, setConfig] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoPedido, setNuevoPedido] = useState({
    numero: '', cliente: '', email: '', producto: '',
    total: '', estado: 'pendiente', fecha: new Date().toISOString().split('T')[0], notas: ''
  });

  useEffect(() => {
    const cfg = localStorage.getItem(CONFIG_KEY);
    if (cfg) setConfig(JSON.parse(cfg));
    const cached = localStorage.getItem(PEDIDOS_KEY);
    if (cached) setPedidos(JSON.parse(cached));
  }, []);

  const sincronizarShopify = useCallback(async () => {
    if (!config?.shop || !config?.token) {
      setError('Configura primero las credenciales de Shopify en ⚙️ Configuración');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const shop = config.shop.replace('https://', '').replace('/', '');
      const url = `https://${shop}/admin/api/2024-01/orders.json?limit=250&status=any`;
      const res = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': config.token }
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const mapped = data.orders.map(o => ({
        id: String(o.id),
        numero: o.order_number,
        cliente: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || o.email || 'Sin cliente',
        email: o.email || '',
        producto: o.line_items?.map(i => i.name).join(', ') || '—',
        total: parseFloat(o.total_price || 0),
        estado: mapEstado(o.fulfillment_status, o.financial_status, o.cancelled_at),
        fecha: o.created_at,
        notas: o.note || '',
        shopifyId: o.id,
      }));
      setPedidos(mapped);
      localStorage.setItem(PEDIDOS_KEY, JSON.stringify(mapped));
    } catch (e) {
      setError('Error al sincronizar: ' + e.message);
    }
    setCargando(false);
  }, [config]);

  function mapEstado(fulfillment, financial, cancelled) {
    if (cancelled) return 'cancelado';
    if (fulfillment === 'fulfilled') return 'entregado';
    if (fulfillment === 'partial') return 'enviado';
    if (financial === 'refunded') return 'devuelto';
    if (financial === 'paid') return 'procesando';
    return 'pendiente';
  }

  const pedidosFiltrados = pedidos.filter(p => {
    const matchEstado = !filtroEstado || p.estado === filtroEstado;
    const q = filtroBusqueda.toLowerCase();
    const matchBusqueda = !q || String(p.numero).includes(q) || p.cliente.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    return matchEstado && matchBusqueda;
  });

  const actualizarEstado = (id, nuevoEstado, nota) => {
    const actualizados = pedidos.map(p =>
      p.id === id ? { ...p, estado: nuevoEstado, notas: nota } : p
    );
    setPedidos(actualizados);
    localStorage.setItem(PEDIDOS_KEY, JSON.stringify(actualizados));
    setModalEditar(false);
    setPedidoSeleccionado(null);
  };

  const agregarPedidoManual = () => {
    const p = {
      ...nuevoPedido,
      id: 'manual_' + Date.now(),
      total: parseFloat(nuevoPedido.total) || 0,
    };
    const actualizados = [p, ...pedidos];
    setPedidos(actualizados);
    localStorage.setItem(PEDIDOS_KEY, JSON.stringify(actualizados));
    setModalNuevo(false);
    setNuevoPedido({ numero: '', cliente: '', email: '', producto: '', total: '', estado: 'pendiente', fecha: new Date().toISOString().split('T')[0], notas: '' });
  };

  const eliminarPedido = (id) => {
    if (!window.confirm('¿Eliminar este pedido del gestor?')) return;
    const actualizados = pedidos.filter(p => p.id !== id);
    setPedidos(actualizados);
    localStorage.setItem(PEDIDOS_KEY, JSON.stringify(actualizados));
  };

  const exportarCSV = () => {
    const headers = ['Número', 'Cliente', 'Email', 'Producto', 'Total', 'Estado', 'Fecha', 'Notas'];
    const moneda = config?.moneda || 'EUR';
    const filas = pedidosFiltrados.map(p => [
      p.numero, p.cliente, p.email, `"${p.producto}"`,
      formatMoneda(p.total, moneda), p.estado, formatFecha(p.fecha), `"${p.notas}"`
    ]);
    const csv = [headers, ...filas].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const moneda = config?.moneda || 'EUR';
  const totalVentas = pedidosFiltrados.reduce((s, p) => s + (p.total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>📦 Pedidos</h2>
          <p>{pedidos.length} pedidos en total · {pedidosFiltrados.length} mostrados</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setModalNuevo(true)}>+ Manual</button>
          <button className="btn btn-secondary btn-sm" onClick={exportarCSV}>⬇ CSV</button>
          <button className="btn btn-primary btn-sm" onClick={sincronizarShopify} disabled={cargando}>
            {cargando ? '⏳ Sincronizando...' : '🔄 Sincronizar Shopify'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}

        {!config && (
          <div className="alert alert-warning">
            ⚠️ No hay configuración de Shopify. Ve a ⚙️ Configuración para añadir tus credenciales.
            También puedes añadir pedidos manualmente con el botón "+ Manual".
          </div>
        )}

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card">
            <div className="label">Total pedidos</div>
            <div className="value">{pedidosFiltrados.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Facturación</div>
            <div className="value" style={{ fontSize: '1.3rem' }}>{formatMoneda(totalVentas, moneda)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Pendientes</div>
            <div className="value" style={{ color: '#fbbf24' }}>
              {pedidosFiltrados.filter(p => p.estado === 'pendiente').length}
            </div>
          </div>
        </div>

        <div className="filtros">
          <input
            placeholder="🔍 Buscar por nº, cliente o email..."
            value={filtroBusqueda}
            onChange={e => setFiltroBusqueda(e.target.value)}
            style={{ minWidth: '260px' }}
          />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
          {(filtroEstado || filtroBusqueda) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFiltroEstado(''); setFiltroBusqueda(''); }}>
              ✕ Limpiar
            </button>
          )}
        </div>

        {pedidosFiltrados.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>{pedidos.length === 0 ? 'Sin pedidos. Sincroniza Shopify o añade uno manualmente.' : 'No hay pedidos con estos filtros.'}</p>
          </div>
        ) : (
          <div className="tabla-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: '#60a5fa', fontWeight: 600 }}>#{p.numero}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.cliente}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{p.email}</div>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.producto}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoneda(p.total, moneda)}</td>
                    <td>{badge(p.estado)}</td>
                    <td>{formatFecha(p.fecha)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setPedidoSeleccionado(p); setEstadoEditar(p.estado); setNotaEditar(p.notas || ''); setModalEditar(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => eliminarPedido(p.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalEditar && pedidoSeleccionado && (
        <div className="modal-overlay" onClick={() => setModalEditar(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>✏️ Editar pedido #{pedidoSeleccionado.numero}</h3>
            <div className="form-group">
              <label>Cliente</label>
              <input type="text" value={pedidoSeleccionado.cliente} disabled style={{ opacity: 0.5 }} />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={estadoEditar} onChange={e => setEstadoEditar(e.target.value)}>
                {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Notas internas</label>
              <textarea value={notaEditar} onChange={e => setNotaEditar(e.target.value)} placeholder="Observaciones sobre este pedido..." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalEditar(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => actualizarEstado(pedidoSeleccionado.id, estadoEditar, notaEditar)}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modalNuevo && (
        <div className="modal-overlay" onClick={() => setModalNuevo(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>➕ Nuevo pedido manual</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Número de pedido</label>
                <input type="text" placeholder="1001" value={nuevoPedido.numero} onChange={e => setNuevoPedido({ ...nuevoPedido, numero: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input type="date" value={nuevoPedido.fecha} onChange={e => setNuevoPedido({ ...nuevoPedido, fecha: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cliente</label>
                <input type="text" placeholder="Nombre apellido" value={nuevoPedido.cliente} onChange={e => setNuevoPedido({ ...nuevoPedido, cliente: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="cliente@email.com" value={nuevoPedido.email} onChange={e => setNuevoPedido({ ...nuevoPedido, email: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Producto(s)</label>
              <input type="text" placeholder="Nombre del producto" value={nuevoPedido.producto} onChange={e => setNuevoPedido({ ...nuevoPedido, producto: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Total ({moneda})</label>
                <input type="number" placeholder="0.00" value={nuevoPedido.total} onChange={e => setNuevoPedido({ ...nuevoPedido, total: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={nuevoPedido.estado} onChange={e => setNuevoPedido({ ...nuevoPedido, estado: e.target.value })}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Notas</label>
              <textarea placeholder="Observaciones..." value={nuevoPedido.notas} onChange={e => setNuevoPedido({ ...nuevoPedido, notas: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalNuevo(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={agregarPedidoManual}>Añadir pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
