const express = require('express');
const router = express.Router();
const connection = require('../config/db');

// Ruta para obtener el estado del LED
router.get('/led-status', (req, res) => {
  connection.query(
    'SELECT color FROM indicadores ORDER BY timestamp DESC LIMIT 1', 
    (error, results) => {
      if (error) return res.status(500).json({ error: "Error en la base de datos" });
      res.json({ color: results.length > 0 ? results[0].color : "rojo" });
    }
  );
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
