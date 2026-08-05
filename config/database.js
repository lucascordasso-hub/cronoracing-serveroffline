// Arquivo: config/database.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testa a conexão ao iniciar
pool.getConnection()
    .then(conn => {
        console.log("✅ Conectado ao MySQL com sucesso!");
        conn.release();
    })
    .catch(err => console.error("❌ Erro ao conectar no MySQL:", err.message));

module.exports = pool;