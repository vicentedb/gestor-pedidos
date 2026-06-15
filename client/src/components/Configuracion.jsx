import React, { useState, useEffect } from 'react';

const CONFIG_KEY = 'shopify_config';

function Configuracion() {
  const [config, setConfig] = useState({
    shop: '',
    token: '',
    moneda: 'EUR',
    nombreTienda: '',
  });
  const [guardado, setGuardado] = useState(false);
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mostrarToken, setMostrarToken] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const guardar = () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    setGuardado(true);
    setResultado(null);
    setTimeout(() => setGuardado(false), 3000);
  };

  const probarConexion = async () => {
    if (!config.shop || !config.token) {
      setResultado({ ok: false, msg: 'Rellena el dominio y el token antes de probar.' });
      return;
    }
    setProbando(true);
    setResultado(null);
    try {
      const shop = config.shop.replace('https://', '').replace('/', '');
      const url = `https://${shop}/admin/api/2024-01/shop.json`;
      const res = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': config.token,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setResultado({ ok: true, msg: `✅ Conexión exitosa con "${data.shop?.name || shop}"` });
      } else {
        setResultado({ ok: false, msg: `❌ Error ${res.status}: Token inválido o dominio incorrecto.` });
      }
    } catch (e) {
      setResultado({ ok: false, msg: '❌ No se pudo conectar. Revisa el dominio.' });
    }
    setProbando(false);
  };

  const limpiar = () => {
    if (window.confirm('¿Eliminar la configuración guardada?')) {
      localStorage.removeItem(CONFIG_KEY);
      setConfig({ shop: '', token: '', moneda: 'EUR', nombreTienda: '' });
      setResultado(null);
    }
  };

  const configGuardada = !!localStorage.getItem(CONFIG_KEY);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>⚙️ Configuración</h2>
          <p>Credenciales de Shopify y ajustes generales</p>
        </div>
      </div>

      <div className="page-body">

        {configGuardada && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            ✅ Configuración guardada en este dispositivo
          </div>
        )}

        <div className="card">
          <h3 style={{ color: '#f9fafb', marginBottom: '6px', fontSize: '0.95rem' }}>🔑 Conexión Shopify</h3>
          <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '20px' }}>
            Necesitas una <strong style={{ color: '#93c5fd' }}>Custom App</strong> en tu panel Shopify →
            Settings → Apps → Develop apps → Create app → Admin API access token
          </p>

          <div className="form-group">
            <label>Nombre de tu tienda (para mostrar)</label>
            <input
              type="text"
              placeholder="Mi Tienda Online"
              value={config.nombreTienda}
              onChange={e => setConfig({ ...config, nombreTienda: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Dominio Shopify</label>
            <input
              type="text"
              placeholder="mi-tienda.myshopify.com"
              value={config.shop}
              onChange={e => setConfig({ ...config, shop: e.target.value })}
            />
            <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Sin https:// ni barra final</span>
          </div>

          <div className="form-group">
            <label>Admin API Access Token</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={mostrarToken ? 'text' : 'password'}
                placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                value={config.token}
                onChange={e => setConfig({ ...config, token: e.target.value })}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setMostrarToken(!mostrarToken)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {mostrarToken ? '🙈 Ocultar' : '👁️ Ver'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Moneda</label>
            <select
              value={config.moneda}
              onChange={e => setConfig({ ...config, moneda: e.target.value })}
              style={{ maxWidth: '160px' }}
            >
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
              <option value="GBP">GBP £</option>
              <option value="MXN">MXN $</option>
            </select>
          </div>

          {resultado && (
            <div className={`alert ${resultado.ok ? 'alert-success' : 'alert-error'}`}>
              {resultado.msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button className="btn btn-primary" onClick={guardar}>
              💾 Guardar configuración
            </button>
            <button className="btn btn-secondary" onClick={probarConexion} disabled={probando}>
              {probando ? '⏳ Probando...' : '🔌 Probar conexión'}
            </button>
            {configGuardada && (
              <button className="btn btn-danger btn-sm" onClick={limpiar} style={{ marginLeft: 'auto' }}>
                🗑️ Limpiar
              </button>
            )}
          </div>

          {guardado && (
            <div className="alert alert-success" style={{ marginTop: '14px' }}>
              ✅ Configuración guardada correctamente
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ color: '#f9fafb', marginBottom: '12px', fontSize: '0.95rem' }}>📋 Cómo obtener el token</h3>
          <ol style={{ paddingLeft: '18px', color: '#9ca3af', fontSize: '0.825rem', lineHeight: '2' }}>
            <li>Entra en tu panel Shopify → <strong style={{ color: '#e5e7eb' }}>Settings</strong></li>
            <li>Ve a <strong style={{ color: '#e5e7eb' }}>Apps and sales channels</strong></li>
            <li>Haz clic en <strong style={{ color: '#e5e7eb' }}>Develop apps</strong></li>
            <li>Crea una nueva app → ponle nombre (ej: "Gestor Pedidos")</li>
            <li>En <strong style={{ color: '#e5e7eb' }}>Configuration</strong> → Admin API → activa permisos: <strong style={{ color: '#60a5fa' }}>read_orders, write_orders, read_customers</strong></li>
            <li>En <strong style={{ color: '#e5e7eb' }}>API credentials</strong> → Install app → copia el <strong style={{ color: '#60a5fa' }}>Admin API access token</strong></li>
          </ol>
        </div>

      </div>
    </div>
  );
}

export default Configuracion;
