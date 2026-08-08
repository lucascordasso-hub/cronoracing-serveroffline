// Arquivo: routes/eventos.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const verificarToken = require('../middlewares/auth');

// ==========================================
// EVENTOS
// ==========================================
router.get('/eventos', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM eventos');
        const eventosFormatados = linhas.map(ev => {
            let dataFormatada = ev.dataInicio ? new Date(ev.dataInicio).toISOString().split('T')[0] : "";
            return {
                id: ev.id.toString(), 
                nome: ev.descricao, 
                data: dataFormatada,
                horario: ev.horario, 
                cidade: ev.cidade, 
                estado: ev.estado,
                local: ev.local, 
                tipo_evento: ev.tipo_evento, 
                prefixo_tag: ev.prefixo_tag, 
                responsavel: ev.respCrono, 
                diretor: ev.diretor,
                acesso: { dono: req.usuario.is_dono === 1, permissoes: req.usuario.permissoes }
            };
        });
        res.json(eventosFormatados);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar eventos" }); }
});

router.post('/eventos', verificarToken, async (req, res) => {
    const ev = req.body;
    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        const [resultEv] = await conn.execute(
            `INSERT INTO eventos (descricao, local, respCrono, diretor, dataInicio, horario, cidade, estado, tipo_evento, prefixo_tag) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [ev.descricao, ev.local, ev.respCrono || null, ev.diretor || null, ev.dataInicio, ev.horario || null, ev.cidade, ev.estado, ev.tipo_evento || null, ev.prefixo_tag || null]
        );
        
        const novoIdEvento = resultEv.insertId;
        const permissoes = JSON.stringify({ configuracoes: true, cadastrar_usuarios: true, mudar_evento: true, cadastrar_evento: true, entrega_kits: true, importacao_csv: true, inscricoes: true, transferencia: true, relatorios: true, apagar_base: true });
        
        await conn.execute(`UPDATE usuarios SET is_dono = 1, permissoes = ? WHERE id = ?`, [permissoes, req.usuario.id]);
        await conn.commit();
        conn.release();

        res.status(201).json({ mensagem: "Evento criado", id: novoIdEvento });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ erro: "Erro ao salvar evento" }); 
    }
});

router.put('/eventos/:id', verificarToken, async (req, res) => {
    const ev = req.body;
    try {
        await pool.execute(
            `UPDATE eventos SET descricao = ?, local = ?, respCrono = ?, diretor = ?, dataInicio = ?, horario = ?, cidade = ?, estado = ?, tipo_evento = ?, prefixo_tag = ? WHERE id = ?`,
            [ev.descricao, ev.local, ev.respCrono || null, ev.diretor || null, ev.dataInicio, ev.horario || null, ev.cidade, ev.estado, ev.tipo_evento || null, ev.prefixo_tag || null, req.params.id]
        );
        res.json({ sucesso: true });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ erro: "Erro ao atualizar evento" }); 
    }
});

router.delete('/eventos/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM eventos WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir evento" }); }
});


// ==========================================
// ONDAS
// ==========================================
router.get('/ondas/:idEvento', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM ondas WHERE evento_id = ?', [req.params.idEvento]);
        const ondas = linhas.map(o => ({
            id: o.id.toString(), 
            id_corrida: o.evento_id, 
            descricao: o.descricao,
            tmv: o.tmp, 
            tml: o.tml, 
            voltas: o.voltas, 
            distancia: o.metragem,
            qtdePodioGeral: o.qtdePodioGeral,
            qtdePodioCat: o.qtdePodioCat,
            semClassificacao: o.semClassificacao === 1
        }));
        res.json(ondas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar ondas" }); }
});

router.post('/ondas', verificarToken, async (req, res) => {
    const o = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO ondas (evento_id, descricao, tmp, tml, voltas, metragem, qtdePodioGeral, qtdePodioCat, semClassificacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [o.id_corrida, o.descricao, o.tmv, o.tml, o.voltas, o.distancia, o.qtdePodioGeral || 5, o.qtdePodioCat || 3, o.semClassificacao]
        );
        res.status(201).json({ id: result.insertId, mensagem: "Onda criada" });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ erro: "Erro ao criar onda" }); 
    }
});

router.put('/ondas/:id', verificarToken, async (req, res) => {
    const o = req.body;
    try {
        await pool.execute(
            'UPDATE ondas SET descricao=?, tmp=?, tml=?, voltas=?, metragem=?, qtdePodioGeral=?, qtdePodioCat=?, semClassificacao=? WHERE id=?',
            [o.descricao, o.tmv, o.tml, o.voltas, o.distancia, o.qtdePodioGeral || 5, o.qtdePodioCat || 3, o.semClassificacao, req.params.id]
        );
        res.json({ sucesso: true });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ erro: "Erro ao atualizar onda." }); 
    }
});

router.delete('/ondas/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM ondas WHERE id=?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir onda." }); }
});

// ==========================================
// CATEGORIAS
// ==========================================
router.get('/categorias/:idEvento', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute(
            'SELECT c.* FROM categorias c JOIN ondas o ON c.onda_id = o.id WHERE o.evento_id = ?', 
            [req.params.idEvento]
        );
        const categorias = linhas.map(c => ({
            id: c.id.toString(), id_onda: c.onda_id.toString(), nome: c.nome,
            idade_minima: c.idade_min, idade_maxima: c.idade_max,
            sexo: c.sexo === 'MASC' ? 'M' : (c.sexo === 'FEM' ? 'F' : c.sexo),
            especial: c.especial === 1
        }));
        res.json(categorias);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar categorias" }); }
});

router.post('/categorias', verificarToken, async (req, res) => {
    const categorias = Array.isArray(req.body) ? req.body : [req.body];
    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        
        for (let c of categorias) {
            const sexoSql = c.sexo === 'M' ? 'MASC' : (c.sexo === 'F' ? 'FEM' : c.sexo);
            await conn.execute(
                'INSERT INTO categorias (nome, idade_min, idade_max, sexo, especial, onda_id) VALUES (?, ?, ?, ?, ?, ?)',
                [c.nome, c.idade_minima, c.idade_maxima, sexoSql, c.especial ? 1 : 0, c.id_onda]
            );
        }
        await conn.commit();
        conn.release();
        res.status(201).json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao salvar categorias." }); }
});

router.put('/categorias/:id', verificarToken, async (req, res) => {
    const c = req.body;
    try {
        const sexoSql = c.sexo === 'M' ? 'MASC' : (c.sexo === 'F' ? 'FEM' : c.sexo);
        await pool.execute(
            'UPDATE categorias SET nome=?, idade_min=?, idade_max=?, sexo=?, especial=?, onda_id=? WHERE id=?',
            [c.nome, c.idade_minima, c.idade_maxima, sexoSql, c.especial ? 1 : 0, c.id_onda, req.params.id]
        );
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao atualizar categoria." }); }
});

router.delete('/categorias/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM categorias WHERE id=?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir categoria." }); }
});

module.exports = router;