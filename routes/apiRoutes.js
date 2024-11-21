const express = require('express');
const router = express.Router();
const connection = require('../config/db');

// Ruta para obtener el estado del LED
app.get('/system-status/:systemId', (req, res) => {
  const systemId = req.params.systemId;

  const query = `
    SELECT name, color, status, type
    FROM (
      SELECT name, color, status, 'signal' AS type
      FROM signals
      WHERE system_id = ?
      UNION ALL
      SELECT name, color, active AS status, 'state' AS type
      FROM statuses
      WHERE system_id = ?
      UNION ALL
      SELECT mode AS name, NULL AS color, NULL AS status, 'selector' AS type
      FROM selectors
      WHERE system_id = ?
    ) AS combined
    ORDER BY type, name;
  `;

  connection.query(query, [systemId, systemId, systemId], (err, results) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }

    // Separar datos en categorías
    const signals = results.filter(item => item.type === 'signal').map(item => ({
      name: item.name,
      color: item.color,
      status: item.status
    }));

    const states = results.filter(item => item.type === 'state').map(item => ({
      name: item.name,
      color: item.color,
      status: item.status
    }));

    const selector = results.find(item => item.type === 'selector') || { name: "AUTOMATICO" };

    res.json({ signals, states, selector });
  });
});

// Ruta para cambiar el modo del selector
app.post('/toggle-selector', (req, res) => {
  const { mode } = req.body;

  const query = `
    UPDATE selectors SET mode = ?
    WHERE system_id = 1;  -- Cambiar según el ID del sistema
  `;

  connection.query(query, [mode], (err) => {
    if (err) {
      console.error('Error actualizando el modo del selector:', err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }

    res.json({ message: 'Modo actualizado correctamente' });
  });
});
// Ruta para enviar comandos desde el frontend
router.post('/send-command', (req, res) => {
  const { dispositivo, comando, estado } = req.body;
  const query = `INSERT INTO control_comandos (dispositivo, comando, estado) VALUES (?, ?, ?)`;
  connection.query(query, [dispositivo, comando, estado], (error) => {
    if (error) return res.status(500).json({ error: "Error al guardar el comando" });
    res.status(201).json({ message: "Comando guardado correctamente" });
  });
});

// Ruta para obtener el estado de varios dispositivos
router.get('/device-status', (req, res) => {
  const dispositivos = ['Variador', 'Rele 1', 'Ramp', 'Reverse'];
  const promises = dispositivos.map((dispositivo) =>
    new Promise((resolve, reject) => {
      connection.query(
        'SELECT estado FROM control_comandos WHERE dispositivo = ? ORDER BY timestamp DESC LIMIT 1',
        [dispositivo],
        (error, results) => {
          if (error) return reject(error);
          resolve({ dispositivo, estado: results.length > 0 ? results[0].estado : 'OFF' });
        }
      );
    })
  );
  Promise.all(promises).then(results => res.json(results)).catch(() => res.status(500).json({ error: 'Error en la base de datos' }));
});

// Ruta para obtener indicadores
router.get('/indicadores', (req, res) => {
  connection.query(
    'SELECT tensionMotor, tensionDC, corriente, potencia, frecuencia, temperatura, ia, av FROM prezurizacion ORDER BY timestamp DESC LIMIT 1',
    (error, results) => {
      if (error) return res.status(500).json({ error: "Error en la base de datos" });
      res.json(results.length > 0 ? results[0] : { tensionMotor: 0, tensionDC: 0, corriente: 0, potencia: 0, frecuencia: 0, temperatura: 0, ia: 0, av: 0 });
    }
  );
});

module.exports = router;
