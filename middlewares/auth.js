// Arquivo: middlewares/auth.js
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'senha_super_secreta_padrao_12345';

function verificarToken(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ erro: "Acesso Negado: Cadê o crachá?" });

    const token = header.split(' ')[1];
    
    jwt.verify(token, SECRET, (erro, usuarioDecodificado) => {
        if (erro) return res.status(403).json({ erro: "Crachá inválido ou vencido." });
        
        req.usuario = usuarioDecodificado; 
        next(); 
    });
}

module.exports = verificarToken;