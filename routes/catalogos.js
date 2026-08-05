// Arquivo: routes/catalogos.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const verificarToken = require('../middlewares/auth');

// ==========================================
// TAMANHOS DE CAMISETA
// ==========================================
router.get('/tamanhos', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM tamanhos_camiseta ORDER BY id');
        res.json(linhas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar tamanhos." }); }
});

router.post('/tamanhos', verificarToken, async (req, res) => {
    try {
        const [result] = await pool.execute('INSERT INTO tamanhos_camiseta (descricao) VALUES (?)', [req.body.descricao]);
        res.status(201).json({ id: result.insertId, descricao: req.body.descricao });
    } catch (error) { res.status(500).json({ erro: "Erro ao salvar tamanho." }); }
});

router.delete('/tamanhos/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM tamanhos_camiseta WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir tamanho." }); }
});

// ==========================================
// BRINDES
// ==========================================
router.get('/brindes', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM brindes ORDER BY descricao');
        res.json(linhas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar brindes." }); }
});

router.post('/brindes', verificarToken, async (req, res) => {
    try {
        const [result] = await pool.execute('INSERT INTO brindes (descricao) VALUES (?)', [req.body.descricao]);
        res.status(201).json({ id: result.insertId, descricao: req.body.descricao });
    } catch (error) { res.status(500).json({ erro: "Erro ao salvar brinde." }); }
});

router.delete('/brindes/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM brindes WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir brinde." }); }
});

// ==========================================
// KITS
// ==========================================
router.get('/kits', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM kits ORDER BY nome');
        const kits = linhas.map(k => ({
            ...k,
            tem_numero: k.tem_numero === 1,
            tem_tag: k.tem_tag === 1,
            tem_camiseta: k.tem_camiseta === 1,
            brindes_inclusos: typeof k.brindes_inclusos === 'string' ? JSON.parse(k.brindes_inclusos) : (k.brindes_inclusos || [])
        }));
        res.json(kits);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar kits." }); }
});

router.post('/kits', verificarToken, async (req, res) => {
    const { nome, tem_numero, tem_tag, tem_camiseta, brindes_inclusos } = req.body;
    try {
        const jsonBrindes = JSON.stringify(brindes_inclusos || []);
        const [result] = await pool.execute(
            'INSERT INTO kits (nome, tem_numero, tem_tag, tem_camiseta, brindes_inclusos) VALUES (?, ?, ?, ?, ?)',
            [nome, tem_numero ? 1 : 0, tem_tag ? 1 : 0, tem_camiseta ? 1 : 0, jsonBrindes]
        );
        res.status(201).json({ id: result.insertId, mensagem: "Kit salvo com sucesso!" });
    } catch (error) { res.status(500).json({ erro: "Erro ao salvar kit." }); }
});

router.delete('/kits/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM kits WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir kit." }); }
});

// ==========================================
// LINKS ÚTEIS
// ==========================================
router.get('/links/:idEvento', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM links WHERE evento_id=?', [req.params.idEvento]);
        res.json(linhas);
    } catch (error) { res.json([]); }
});

module.exports = router;