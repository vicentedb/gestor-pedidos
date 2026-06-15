import React, { useState } from 'react';
import './App.css';
import Pedidos from './components/Pedidos';
import Devoluciones from './components/Devoluciones';
import Estadisticas from './components/Estadisticas';
import Configuracion from './components/Configuracion';

function App() {
  const [seccion, setSeccion] = useState('pedidos');

  const nav = [
    { id: 'pedidos',       icon: '📦', label: 'Pedidos' },
    { id: 'devoluciones',  icon: '🔄', label: 'Devoluciones' },
    { id: 'estadisticas',  icon: '📊', label: 'Estadísticas' },
    { id: 'configuracion', icon: '⚙️', label: 'Configuración' },
  ];

  const renderSeccion = () => {
    switch (seccion) {
      case 'pedidos':       return <Pedidos />;
      case 'devoluciones':  return <Devoluciones />;
      case 'estadisticas':  return <Estadisticas />;
      case 'configuracion': return <Configuracion />;
      default:              return <Pedidos />;
    }
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>📦 Gestor Pedidos</h1>
          <p>E-Commerce Manager</p>
        </div>
        <ul>
          {nav.map(item => (
            <li
              key={item.id}
              className={seccion === item.id ? 'active' : ''}
              onClick={() => setSeccion(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>
      <main className="contenido">
        {renderSeccion()}
      </main>
    </div>
  );
}

export default App;
