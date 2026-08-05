// Arquivo: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importação das Rotas
const rotasUsuarios = require('./routes/usuarios');
const rotasEventos = require('./routes/eventos');
const rotasAtletas = require('./routes/atletas');
const rotasCatalogos = require('./routes/catalogos');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// REGISTRO DOS MÓDULOS DE ROTAS NA RAIZ ORIGINAL
// ==========================================
// Todos usam "/api" como base, exatamente como o frontend espera
app.use('/api', rotasUsuarios);
app.use('/api', rotasEventos);
app.use('/api', rotasAtletas);
app.use('/api', rotasCatalogos);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CronoRacing rodando blindado e organizado na porta ${PORT}`);
});