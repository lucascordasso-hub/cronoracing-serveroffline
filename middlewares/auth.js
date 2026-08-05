// Arquivo: middlewares/auth.js
const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ erro: "Acesso Negado: Cadê o crachá?" });

    const token = header.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (erro, usuarioDecodificado) => {
        if (erro) return res.status(403).json({ erro: "Crachá inválido ou vencido." });
        
        req.usuario = usuarioDecodificado; // Salva o usuário na requisição para a rota poder usar
        next(); // Deixa passar
    });
}

module.exports = verificarToken;