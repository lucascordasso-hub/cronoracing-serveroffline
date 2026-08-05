require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 1. CONEXÃO COM O BANCO DE DADOS (MySQL)
// ==========================================
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(conn => {
        console.log("✅ Conectado ao MySQL com sucesso!");
        conn.release();
    })
    .catch(err => console.error("❌ Erro ao conectar no MySQL:", err.message));

// ==========================================
// 2. MIDDLEWARE: O SEGURANÇA DO CRACHÁ (JWT)
// ==========================================
function verificarToken(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ erro: "Acesso Negado: Cadê o crachá?" });

    const token = header.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (erro, usuarioDecodificado) => {
        if (erro) return res.status(403).json({ erro: "Crachá inválido ou vencido." });
        req.usuario = usuarioDecodificado;
        next();
    });
}

// ==========================================
// 3. MÓDULO DE AUTENTICAÇÃO (LOGIN)
// ==========================================
app.post('/api/login', async (req, res) => {
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

// ==========================================
// 4. MÓDULO DE USUÁRIOS E PERMISSÕES
// ==========================================
app.get('/api/usuarios/lista', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT id, nome, email FROM usuarios ORDER BY nome');
        res.json(linhas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar usuários" }); }
});

app.get('/api/usuarios', verificarToken, async (req, res) => {
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

app.post('/api/usuarios', verificarToken, async (req, res) => {
    try {
        const senhaHash = await bcrypt.hash('123456', 10);
        await pool.execute(
            'INSERT INTO usuarios (email, senha_hash, nome, permissoes) VALUES (?, ?, ?, ?)',
            [req.body.email_usuario, senhaHash, 'Novo Usuário', JSON.stringify(req.body.permissoes)]
        );
        res.status(201).json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao criar usuário. Email já existe?" }); }
});

app.put('/api/usuarios/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('UPDATE usuarios SET permissoes=? WHERE id=?', [JSON.stringify(req.body.permissoes), req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao atualizar permissões." }); }
});

app.delete('/api/usuarios/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM usuarios WHERE id=?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao remover usuário." }); }
});

// ==========================================
// 5. MÓDULO DE EVENTOS
// ==========================================
app.get('/api/eventos', verificarToken, async (req, res) => {
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
                tipo: ev.tipo,
                responsavel: ev.respCrono,
                diretor: ev.diretor,
                acesso: { dono: req.usuario.is_dono === 1, permissoes: req.usuario.permissoes }
            };
        });
        res.json(eventosFormatados);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar eventos" }); }
});

app.post('/api/eventos', verificarToken, async (req, res) => {
    const ev = req.body;
    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        const [resultEv] = await conn.execute(
            `INSERT INTO eventos (descricao, local, respCrono, diretor, dataInicio, horario, cidade, estado, tipo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [ev.descricao, ev.local, ev.respCrono || null, ev.diretor || null, ev.dataInicio, ev.horario || null, ev.cidade, ev.estado, ev.tipo]
        );
        
        const novoIdEvento = resultEv.insertId;
        const permissoes = JSON.stringify({ configuracoes: true, cadastrar_usuarios: true, mudar_evento: true, cadastrar_evento: true, entrega_kits: true, importacao_csv: true, inscricoes: true, transferencia: true, relatorios: true, apagar_base: true });
        
        await conn.execute(`UPDATE usuarios SET is_dono = 1, permissoes = ? WHERE id = ?`, [permissoes, req.usuario.id]);
        await conn.commit();
        conn.release();

        res.status(201).json({ mensagem: "Evento criado", id: novoIdEvento });
    } catch (error) { res.status(500).json({ erro: "Erro ao salvar evento" }); }
});

app.put('/api/eventos/:id', verificarToken, async (req, res) => {
    const ev = req.body;
    try {
        await pool.execute(
            `UPDATE eventos SET descricao = ?, local = ?, respCrono = ?, diretor = ?, dataInicio = ?, horario = ?, cidade = ?, estado = ?, tipo = ? WHERE id = ?`,
            [ev.descricao, ev.local, ev.respCrono || null, ev.diretor || null, ev.dataInicio, ev.horario || null, ev.cidade, ev.estado, ev.tipo, req.params.id]
        );
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao atualizar evento" }); }
});

app.delete('/api/eventos/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM eventos WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir evento" }); }
});

// ==========================================
// 6. MÓDULO DE ONDAS
// ==========================================
app.get('/api/ondas/:idEvento', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM ondas WHERE evento_id = ?', [req.params.idEvento]);
        const ondas = linhas.map(o => ({
            id: o.id.toString(), id_corrida: o.evento_id, descricao: o.descricao,
            tmv: o.tmp, tml: o.tml, voltas: o.voltas, distancia: o.metragem
        }));
        res.json(ondas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar ondas" }); }
});

app.post('/api/ondas', verificarToken, async (req, res) => {
    const o = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO ondas (evento_id, descricao, tmp, tml, voltas, metragem) VALUES (?, ?, ?, ?, ?, ?)',
            [o.id_corrida, o.descricao, o.tmv, o.tml, o.voltas, o.distancia]
        );
        res.status(201).json({ id: result.insertId, mensagem: "Onda criada" });
    } catch (error) { res.status(500).json({ erro: "Erro ao criar onda" }); }
});

app.put('/api/ondas/:id', verificarToken, async (req, res) => {
    const o = req.body;
    try {
        await pool.execute(
            'UPDATE ondas SET descricao=?, tmp=?, tml=?, voltas=?, metragem=? WHERE id=?',
            [o.descricao, o.tmv, o.tml, o.voltas, o.distancia, req.params.id]
        );
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao atualizar onda." }); }
});

app.delete('/api/ondas/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM ondas WHERE id=?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir onda." }); }
});

// ==========================================
// 7. MÓDULO DE CATEGORIAS
// ==========================================
app.get('/api/categorias/:idEvento', verificarToken, async (req, res) => {
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

app.post('/api/categorias', verificarToken, async (req, res) => {
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

app.put('/api/categorias/:id', verificarToken, async (req, res) => {
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

app.delete('/api/categorias/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM categorias WHERE id=?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir categoria." }); }
});

// ==========================================
// 8. MÓDULO DE ATLETAS (COMPETICAO E KITS)
// ==========================================
app.get('/api/atletas/:idEvento', verificarToken, async (req, res) => {
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

app.post('/api/atletas', verificarToken, async (req, res) => {
    const a = req.body;
    try {
        const partesData = a.nascimento.split('/');
        const nascimento_sql = partesData.length === 3 ? `${partesData[2]}-${partesData[1]}-${partesData[0]}` : null;

        const [result] = await pool.execute(
            `INSERT INTO competicao 
            (evento_id, onda_id, categoria_id, numero, nome, tag, equipe, competitivo, nascimento, sexo, cpf, email, cidade, estado, telefone, camiseta_tamanho, camiseta_nome, kit_id, retirou_kit, usuario_log, datahora_log)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                a.id_corrida, a.id_onda, a.id_categoria, a.numero_peito || null, a.nome, 
                a.numero_tag || null, a.equipe || null, a.competitivo ? 1 : 0, nascimento_sql, 
                a.sexo, a.cpf, a.email || null, a.cidade || null, a.estado || null, 
                a.telefone || null, a.tamanho_camiseta || null, a.nome_camiseta || null, 
                a.kit_id || null, 0, req.usuario.id
            ]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) { res.status(500).json({ erro: "Erro ao salvar atleta" }); }
});

// ==========================================
// ROTA: EXCLUIR UM ÚNICO ATLETA
// ==========================================
app.delete('/api/atletas/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM competicao WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true, mensagem: "Atleta excluído." });
    } catch (error) {
        console.error("🚨 Erro ao excluir atleta:", error);
        res.status(500).json({ erro: "Erro ao excluir atleta." });
    }
});

// ==========================================
// ROTA: ATUALIZAR ATLETA (PUT) - TRATAMENTO SEGURO
// ==========================================
app.put('/api/atletas/:id', verificarToken, async (req, res) => {
    const a = req.body;
    try {
        // Tratamento seguro para data de nascimento (DD/MM/YYYY para YYYY-MM-DD)
        let nascimento_sql = null;
        if (a.nascimento && typeof a.nascimento === 'string' && a.nascimento.includes('/')) {
            const partesData = a.nascimento.split('/');
            if (partesData.length === 3) {
                nascimento_sql = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
            }
        } else if (a.nascimento && a.nascimento.includes('-')) {
            nascimento_sql = a.nascimento; // Já está em YYYY-MM-DD
        }

        await pool.execute(
            `UPDATE competicao SET 
                onda_id = ?, categoria_id = ?, numero = ?, nome = ?, tag = ?, 
                equipe = ?, competitivo = ?, nascimento = ?, sexo = ?, cpf = ?, 
                email = ?, cidade = ?, estado = ?, telefone = ?, 
                camiseta_tamanho = ?, camiseta_nome = ?, kit_id = ?, 
                usuario_log = ?, datahora_log = NOW()
             WHERE id = ?`,
            [
                a.id_onda || null, 
                a.id_categoria || null, 
                a.numero_peito || null, 
                a.nome || null, 
                a.numero_tag || null,
                a.equipe || null, 
                a.competitivo ? 1 : 0, 
                nascimento_sql, 
                a.sexo || null, 
                a.cpf || null,
                a.email || null, 
                a.cidade || null, 
                a.estado || null, 
                a.telefone || null,
                a.tamanho_camiseta || null, 
                a.nome_camiseta || null, 
                a.kit_id || null,
                req.usuario.id, 
                req.params.id
            ]
        );
        res.json({ sucesso: true, mensagem: "Atleta atualizado com sucesso!" });
    } catch (error) {
        console.error("🚨 ERRO NO UPDATE DO ATLETA:", error);
        res.status(500).json({ erro: "Erro ao atualizar atleta no banco de dados.", detalhe: error.message });
    }
});

app.post('/api/atletas/sincronizar', verificarToken, async (req, res) => {
    const { kits } = req.body;
    if (!kits || kits.length === 0) return res.status(400).send("Fila vazia");

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        for (let kit of kits) {
            await conn.execute(
                'UPDATE competicao SET retirou_kit = 1, usuario_log = ?, datahora_log = NOW() WHERE id = ?',
                [req.usuario.id, kit.id]
            );
        }
        await conn.commit();
        conn.release();
        
        res.json({ sucesso: true, processados: kits.length });
    } catch (error) { res.status(500).json({ erro: "Erro na sincronização." }); }
});

// ==========================================
// ROTA: IMPORTAÇÃO DE ATLETAS EM LOTE (CSV)
// ==========================================
app.post('/api/atletas/lote', verificarToken, async (req, res) => {
    const { atletas } = req.body;
    if (!atletas || atletas.length === 0) return res.json({ sucesso: true, processados: 0, atletas: [] });

    let conn; 
    
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction(); 

        for (let a of atletas) {
            try {
                const partesData = a.dados.nascimento.split('/');
                const nascimento_sql = partesData.length === 3 ? `${partesData[2]}-${partesData[1]}-${partesData[0]}` : null;

                if (a.idExistente) {
                    await conn.execute(
                        `UPDATE competicao SET 
                            onda_id = ?, categoria_id = ?, numero = ?, nome = ?, tag = ?, 
                            equipe = ?, competitivo = ?, nascimento = ?, sexo = ?, cpf = ?, 
                            email = ?, cidade = ?, estado = ?, telefone = ?, 
                            camiseta_tamanho = ?, camiseta_nome = ?, kit_id = ?, 
                            usuario_log = ?, datahora_log = NOW()
                         WHERE id = ?`,
                        [
                            a.dados.id_onda, a.dados.id_categoria, a.dados.numero_peito || null, a.dados.nome, a.dados.numero_tag || null,
                            a.dados.equipe || null, a.dados.competitivo ? 1 : 0, nascimento_sql, a.dados.sexo, a.dados.cpf,
                            a.dados.email || null, a.dados.cidade || null, a.dados.estado || null, a.dados.telefone || null,
                            a.dados.tamanho_camiseta || null, a.dados.nome_camiseta || null, a.dados.kit_id || null,
                            req.usuario.id, a.idExistente
                        ]
                    );
                } else {
                    const [result] = await conn.execute(
                        `INSERT INTO competicao 
                        (evento_id, onda_id, categoria_id, numero, nome, tag, equipe, competitivo, nascimento, sexo, cpf, email, cidade, estado, telefone, camiseta_tamanho, camiseta_nome, kit_id, retirou_kit, usuario_log, datahora_log)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            a.dados.id_corrida, a.dados.id_onda, a.dados.id_categoria, a.dados.numero_peito || null, a.dados.nome, 
                            a.dados.numero_tag || null, a.dados.equipe || null, a.dados.competitivo ? 1 : 0, nascimento_sql, 
                            a.dados.sexo, a.dados.cpf, a.dados.email || null, a.dados.cidade || null, a.dados.estado || null, 
                            a.dados.telefone || null, a.dados.tamanho_camiseta || null, a.dados.nome_camiseta || null, 
                            a.dados.kit_id || null, 0, req.usuario.id
                        ]
                    );
                    a.idGerado = result.insertId;
                }
            } catch (errInLoop) {
                // BLINDAGEM MÁXIMA: Se esse atleta específico der erro de duplicidade, pula ele e salva o resto!
                if (errInLoop.code === 'ER_DUP_ENTRY') {
                    console.warn(`⚠️ MySQL barrou duplicata para o atleta: ${a.dados.nome}`);
                    a.ignorado = true; 
                    continue;
                } else {
                    throw errInLoop; // Se for erro de sintaxe ou queda do banco, explode o lote e cancela
                }
            }
        }

        await conn.commit();
        
        // Remove os ignorados para o Front-end não tentar atualizar a tabela com fantasmas
        const atletasProcessados = atletas.filter(a => !a.ignorado);
        
        res.json({ sucesso: true, processados: atletasProcessados.length, atletas: atletasProcessados });
        
    } catch (error) {
        if (conn) await conn.rollback(); 
        console.error("🚨 Erro SQL na importação em lote:", error); 
        res.status(500).json({ erro: "Erro ao processar lote: " + error.message });
    } finally {
        if (conn) conn.release(); 
    }
});

// ==========================================
// ROTA: APAGAR TODA A BASE DE ATLETAS DE UM EVENTO
// ==========================================
app.delete('/api/atletas/evento/:idEvento', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM competicao WHERE evento_id = ?', [req.params.idEvento]);
        res.json({ sucesso: true });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao limpar base de atletas." });
    }
});

// ==========================================
// 9. MÓDULO DE CATÁLOGOS GLOBAIS (Tamanhos, Brindes, Kits)
// ==========================================
app.get('/api/tamanhos', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM tamanhos_camiseta ORDER BY id');
        res.json(linhas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar tamanhos." }); }
});
app.post('/api/tamanhos', verificarToken, async (req, res) => {
    try {
        const [result] = await pool.execute('INSERT INTO tamanhos_camiseta (descricao) VALUES (?)', [req.body.descricao]);
        res.status(201).json({ id: result.insertId, descricao: req.body.descricao });
    } catch (error) { res.status(500).json({ erro: "Erro ao salvar tamanho." }); }
});
app.delete('/api/tamanhos/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM tamanhos_camiseta WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir tamanho." }); }
});

app.get('/api/brindes', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM brindes ORDER BY descricao');
        res.json(linhas);
    } catch (error) { res.status(500).json({ erro: "Erro ao buscar brindes." }); }
});
app.post('/api/brindes', verificarToken, async (req, res) => {
    try {
        const [result] = await pool.execute('INSERT INTO brindes (descricao) VALUES (?)', [req.body.descricao]);
        res.status(201).json({ id: result.insertId, descricao: req.body.descricao });
    } catch (error) { res.status(500).json({ erro: "Erro ao salvar brinde." }); }
});
app.delete('/api/brindes/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM brindes WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir brinde." }); }
});

app.get('/api/kits', verificarToken, async (req, res) => {
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
app.post('/api/kits', verificarToken, async (req, res) => {
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
app.delete('/api/kits/:id', verificarToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM kits WHERE id = ?', [req.params.id]);
        res.json({ sucesso: true });
    } catch (error) { res.status(500).json({ erro: "Erro ao excluir kit." }); }
});

// ==========================================
// 10. MÓDULO DE LINKS ÚTEIS
// ==========================================
app.get('/api/links/:idEvento', verificarToken, async (req, res) => {
    try {
        const [linhas] = await pool.execute('SELECT * FROM links WHERE evento_id=?', [req.params.idEvento]);
        res.json(linhas);
    } catch (error) { res.json([]); }
});

// ==========================================
// LIGA O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CronoRacing rodando blindado na porta ${PORT}`);
});