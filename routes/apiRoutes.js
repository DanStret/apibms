const express = require('express');
const router = express.Router();
const connection = require('../config/db');

router.get('/system-status/:systemId', (req, res) => {
  const systemId = req.params.systemId;

  const query = `
    SELECT name, color, status, type
FROM (
    -- Últimos datos únicos de señales (signals)
    SELECT s1.name, s1.color, s1.status, 'signal' AS type
    FROM signals s1
    INNER JOIN (
        SELECT name, MAX(updated_at) AS latest_update
        FROM signals
        WHERE system_id = 1
        GROUP BY name
    ) s2
    ON s1.name = s2.name AND s1.updated_at = s2.latest_update
    WHERE s1.system_id = 1

    UNION ALL

    -- Últimos datos únicos de estados (statuses)
    SELECT st1.name, st1.color, st1.active AS status, 'state' AS type
    FROM statuses st1
    INNER JOIN (
        SELECT name, MAX(updated_at) AS latest_update
        FROM statuses
        WHERE system_id = 1
        GROUP BY name
    ) st2
    ON st1.name = st2.name AND st1.updated_at = st2.latest_update
    WHERE st1.system_id = 1

    UNION ALL

    -- Últimos datos del selector (selectors)
    SELECT mode AS name, NULL AS color, NULL AS status, 'selector' AS type
    FROM (
        SELECT mode, updated_at
        FROM selectors
        WHERE system_id = 1
        ORDER BY updated_at DESC
        LIMIT 1
    ) latest_selector
) AS combined
ORDER BY type, name;

  `;

  connection.query(query, [systemId, systemId, systemId, systemId, systemId], (err, results) => {
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

    const selector = results.find(item => item.type === 'selector') || { name: "MANUAL" };

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
