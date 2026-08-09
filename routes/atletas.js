// Arquivo: routes/atletas.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const verificarToken = require('../middlewares/auth');

router.get('/atletas/:idEvento', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM competicao WHERE evento_id = ?', [req.params.idEvento]);
        const atletas = linhas.map(a => ({
            id: a.id.toString(), id_corrida: a.evento_id, id_onda: a.onda_id.toString(),
            id_categoria: a.categoria_id.toString(), numero_peito: a.numero, nome: a.nome,
            numero_tag: a.tag, equipe: a.equipe, competitivo: a.competitivo === 1,
            nascimento: a.nascimento ? new Date(a.nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : "",
            sexo: a.sexo, cpf: a.cpf, email: a.email, cidade: a.cidade, estado: a.estado,
            telefone: a.telefone, tamanho_camiseta: a.camiseta_tamanho, nome_camiseta: a.camiseta_nome,
            kit_id: a.kit_id, retirou_kit: a.retirou_kit === 1
        }));
        res.json(atletas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar atletas" }); }
});

router.post('/atletas', verificarToken, async (req, res) => {
    const a = req.body;
    try {
        let nascimento_sql = "2000-01-01"; // Fallback seguro
        if (a.nascimento && typeof a.nascimento === 'string' && a.nascimento.includes('/')) {
            const partesData = a.nascimento.split('/');
            if (partesData.length === 3) nascimento_sql = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
        } else if (a.nascimento && a.nascimento.includes('-')) {
            nascimento_sql = a.nascimento;
        }

        const [result] = await pool.execute(
            `INSERT INTO competicao 
            (evento_id, onda_id, categoria_id, numero, nome, tag, equipe, competitivo, nascimento, sexo, cpf, email, cidade, estado, telefone, camiseta_tamanho, camiseta_nome, kit_id, retirou_kit, usuario_log, datahora_log)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                a.id_corrida, a.id_onda, a.id_categoria, 
                a.numero_peito || "", 
                a.nome, 
                a.numero_tag || "",   
                a.equipe || "",       
                a.competitivo ? 1 : 0, nascimento_sql, 
                a.sexo, a.cpf, a.email || null, a.cidade || null, a.estado || null, 
                a.telefone || null, a.tamanho_camiseta || null, a.nome_camiseta || null, 
                a.kit_id || null, a.retirou_kit ? 1 : 0, req.usuario.id
            ]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ erro: "Erro ao salvar atleta" }); 
    }
});

router.put('/atletas/:id', verificarToken, async (req, res) => {
    const a = req.body;
    try {
        let nascimento_sql = "2000-01-01";
        if (a.nascimento && typeof a.nascimento === 'string' && a.nascimento.includes('/')) {
            const partesData = a.nascimento.split('/');
            if (partesData.length === 3) nascimento_sql = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
        } else if (a.nascimento && a.nascimento.includes('-')) {
            nascimento_sql = a.nascimento;
        }

        await pool.execute(
            `UPDATE competicao SET 
                onda_id = ?, categoria_id = ?, numero = ?, nome = ?, tag = ?, 
                equipe = ?, competitivo = ?, nascimento = ?, sexo = ?, cpf = ?, 
                email = ?, cidade = ?, estado = ?, telefone = ?, 
                camiseta_tamanho = ?, camiseta_nome = ?, kit_id = ?, 
                retirou_kit = ?, usuario_log = ?, datahora_log = NOW()
             WHERE id = ?`,
            [
                a.id_onda || null, a.id_categoria || null, 
                a.numero_peito || "", 
                a.nome || null, 
                a.numero_tag || "",
                a.equipe || "", 
                a.competitivo ? 1 : 0, nascimento_sql, a.sexo || null, a.cpf || null,
                a.email || null, a.cidade || null, a.estado || null, a.telefone || null,
                a.tamanho_camiseta || null, a.nome_camiseta || null, a.kit_id || null,
                a.retirou_kit ? 1 : 0, req.usuario.id, req.params.id
            ]
        );
        res.json({ sucesso: true, mensagem: "Atleta atualizado com sucesso!" });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ erro: "Erro ao atualizar atleta." }); 
    }
});

router.delete('/atletas/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM competicao WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true, mensagem: "Atleta excluído." });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir atleta." }); }
});

router.post('/atletas/sincronizar', verificarToken, async (req, res) => {
    const { kits } = req.body;
    if (!kits || kits.length === 0) return res.status(400).send("Fila vazia");

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        for (let kit of kits) {
            await conn.execute('UPDATE competicao SET retirou_kit = 1, usuario_log = ?, datahora_log = NOW() WHERE id = ?', [req.usuario.id, kit.id]);
        }
        await conn.commit();
        conn.release();
        
        res.json({ sucesso: true, processados: kits.length });
    } catch (error) { res.status(500).json({ erro: "Erro na sincronização." }); }
});

router.post('/atletas/lote', verificarToken, async (req, res) => {
    const { atletas } = req.body;
    if (!atletas || atletas.length === 0) return res.json({ sucesso: true, processados: 0, atletas: [] });

    let conn; 
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction(); 

        for (let a of atletas) {
            try {
                let nascimento_sql = "2000-01-01"; 
                if (a.dados.nascimento && typeof a.dados.nascimento === 'string' && a.dados.nascimento.includes('/')) {
                    const partesData = a.dados.nascimento.split('/');
                    if (partesData.length === 3) {
                        nascimento_sql = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
                    }
                }

                const isCompetitivo = (a.dados.competitivo === true || a.dados.competitivo === 1 || a.dados.competitivo === "1" || a.dados.competitivo === "true") ? 1 : 0;
                const isRetirouKit = (a.dados.retirou_kit === true || a.dados.retirou_kit === 1 || a.dados.retirou_kit === "1" || a.dados.retirou_kit === "true") ? 1 : 0;

                if (a.idExistente) {
                    await conn.execute(
                        `UPDATE competicao SET 
                            onda_id = ?, categoria_id = ?, numero = ?, nome = ?, tag = ?, 
                            equipe = ?, competitivo = ?, nascimento = ?, sexo = ?, cpf = ?, 
                            email = ?, cidade = ?, estado = ?, telefone = ?, 
                            camiseta_tamanho = ?, camiseta_nome = ?, kit_id = ?, 
                            retirou_kit = ?, usuario_log = ?, datahora_log = NOW()
                         WHERE id = ?`,
                        [
                            a.dados.id_onda, a.dados.id_categoria, 
                            a.dados.numero_peito || "", 
                            a.dados.nome, 
                            a.dados.numero_tag || "",
                            a.dados.equipe || "", 
                            isCompetitivo, nascimento_sql, a.dados.sexo, a.dados.cpf,
                            a.dados.email || null, a.dados.cidade || null, a.dados.estado || null, a.dados.telefone || null,
                            a.dados.tamanho_camiseta || null, a.dados.nome_camiseta || null, a.dados.kit_id || null,
                            isRetirouKit, req.usuario.id, a.idExistente
                        ]
                    );
                } else {
                    const [result] = await conn.execute(
                        `INSERT INTO competicao 
                        (evento_id, onda_id, categoria_id, numero, nome, tag, equipe, competitivo, nascimento, sexo, cpf, email, cidade, estado, telefone, camiseta_tamanho, camiseta_nome, kit_id, retirou_kit, usuario_log, datahora_log)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            a.dados.id_corrida, a.dados.id_onda, a.dados.id_categoria, 
                            a.dados.numero_peito || "", 
                            a.dados.nome, 
                            a.dados.numero_tag || "", 
                            a.dados.equipe || "", 
                            isCompetitivo, nascimento_sql, 
                            a.dados.sexo, a.dados.cpf, a.dados.email || null, a.dados.cidade || null, a.dados.estado || null, 
                            a.dados.telefone || null, a.dados.tamanho_camiseta || null, a.dados.nome_camiseta || null, 
                            a.dados.kit_id || null, isRetirouKit, req.usuario.id
                        ]
                    );
                    a.idGerado = result.insertId;
                }
            } catch (errInLoop) {
                if (errInLoop.code === 'ER_DUP_ENTRY') {
                    console.warn(`⚠️ MySQL barrou duplicata para: ${a.dados.nome}`);
                    a.ignorado = true; 
                    continue;
                } else {
                    console.error("Erro SQL na linha:", errInLoop);
                    throw errInLoop;
                }
            }
        }
        await conn.commit();
        const atletasProcessados = atletas.filter(a => !a.ignorado);
        res.json({ sucesso: true, processados: atletasProcessados.length, atletas: atletasProcessados });
    } catch (error) {
        if (conn) await conn.rollback(); 
        console.error("🚨 Erro SQL na importação em lote:", error); 
        res.status(500).json({ erro: "MySQL rejeitou a inserção: " + (error.sqlMessage || error.message) });
    } finally {
        if (conn) conn.release(); 
    }
});

router.delete('/atletas/evento/:idEvento', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM competicao WHERE evento_id = ?', [req.params.idEvento]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao limpar base." }); }
});

module.exports = router;