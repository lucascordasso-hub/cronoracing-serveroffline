// Arquivo: routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const verificarToken = require('../middlewares/auth');

// ROTA DE LOGIN
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });

    try {
        const [linhas] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        const usuario = linhas[0];

        if (!usuario) return res.status(401).json({ erro: "Usuário não encontrado ou senha inválida." });

        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) return res.status(401).json({ erro: "Usuário não encontrado ou senha inválida." });

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nome: usuario.nome, is_dono: usuario.is_dono },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            mensagem: "Login realizado com sucesso!",
            token: token,
            usuario: {
                email: usuario.email,
                nome: usuario.nome,
                is_dono: usuario.is_dono,
                permissoes: typeof usuario.permissoes === 'string' ? JSON.parse(usuario.permissoes) : usuario.permissoes
            }
        });
    } catch (error) {
        console.error("Erro no Login:", error);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// LISTAGEM DE USUÁRIOS
router.get('/usuarios/lista', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT id, nome, email FROM usuarios ORDER BY nome');
        res.json(linhas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar usuários" }); }
});

router.get('/usuarios', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT id, email, nome, is_dono, permissoes FROM usuarios');
        const usuarios = linhas.map(u => ({
            id: u.id.toString(),
            email_usuario: u.email,
            dono: u.is_dono === 1,
            permissoes: typeof u.permissoes === 'string' ? JSON.parse(u.permissoes) : (u.permissoes || {})
        }));
        res.json(usuarios);
    } catch (error) { res.status(500).json({ erro: "Erro ao listar usuários." }); }
});

router.post('/usuarios', verificarToken, async (req, res) => {
    try {
        const senhaHash = await bcrypt.hash('123456', 10);
        await pool.execute(
            'INSERT INTO usuarios (email, senha_hash, nome, permissoes) VALUES (?, ?, ?, ?)',
            [req.body.email_usuario, senhaHash, 'Novo Usuário', JSON.stringify(req.body.permissoes)]
        );
        res.status(201).json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao criar usuário. Email já existe?" }); }
});

router.put('/usuarios/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('UPDATE usuarios SET permissoes=? WHERE id=?', [JSON.stringify(req.body.permissoes), req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao atualizar permissões." }); }
});

router.delete('/usuarios/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM usuarios WHERE id=?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao remover usuário." }); }
});

module.exports = router;