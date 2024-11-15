// server.js
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json()); // Necesario para leer JSON en el body de las peticiones
app.use('/api', apiRoutes); // Prefijo /api para todas las rutas

app.listen(port, '0.0.0.0', () => {
  console.log(`API ejecutándose en el puerto ${port}`);
});
