// Arquivo: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const SysTray = require('systray2').default; // Biblioteca para o Tray Icon

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
// CONFIGURAÇÃO DO FRONTEND
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// REGISTRO DOS MÓDULOS DE ROTAS
// ==========================================
app.use('/api', rotasUsuarios);
app.use('/api', rotasEventos);
app.use('/api', rotasAtletas);
app.use('/api', rotasCatalogos);

// ==========================================
// TRATAMENTO DE ROTA NÃO ENCONTRADA (404)
// ==========================================
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const PORT = process.env.PORT || 3000;

// ==========================================
// CONTROLE DO SERVIDOR (INICIAR / PARAR)
// ==========================================
let serverInstancia = null;

function iniciarServidor() {
    if (!serverInstancia) {
        serverInstancia = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor CronoRacing rodando blindado e organizado na porta ${PORT}`);
        });
    }
}

function pararServidor() {
    if (serverInstancia) {
        serverInstancia.close(() => {
            console.log('🛑 Servidor CronoRacing parado.');
        });
        serverInstancia = null;
    }
}

// ==========================================
// CONFIGURAÇÃO DO TRAY ICON (BARRA DE TAREFAS)
// ==========================================
// Tenta ler o ícone. Se não tiver, usa o padrão do Windows
let iconData = "";
try {
    // IMPORTANTE: Coloque um arquivo "icone.ico" dentro da pasta "public"
    iconData = fs.readFileSync(path.join(__dirname, 'public', 'icone.ico'), { encoding: 'base64' });
} catch (e) {
    console.log("Aviso: 'icone.ico' não encontrado na pasta public. O tray ficará com um ícone padrão.");
}

// Criação dos menus do Tray
const itemIniciar = {
    title: "▶ Iniciar Servidor",
    tooltip: "Inicia o recebimento de dados",
    checked: false,
    enabled: false // Começa desabilitado pois já inicia rodando
};

const itemParar = {
    title: "⏸ Parar Servidor",
    tooltip: "Pausa o recebimento de dados",
    checked: false,
    enabled: true
};

const itemSair = {
    title: "❌ Encerrar CronoRacing",
    tooltip: "Fecha completamente o backend",
    checked: false,
    enabled: true
};

const systray = new SysTray({
    menu: {
        icon: iconData,
        title: "CronoRacing",
        tooltip: "CronoRacing ManagerKit",
        items: [
            itemIniciar,
            itemParar,
            SysTray.separator,
            itemSair
        ]
    },
    debug: false,
    copyDir: true // Essencial para quando criarmos o executável/instalador
});

// Ações do clique nos botões do Tray
systray.onClick(action => {
    if (action.seq_id === itemIniciar.seq_id) {
        iniciarServidor();
        // Atualiza a interface (habilita Parar, desabilita Iniciar)
        systray.sendAction({ type: 'update-item', item: { ...itemIniciar, enabled: false }, seq_id: itemIniciar.seq_id });
        systray.sendAction({ type: 'update-item', item: { ...itemParar, enabled: true }, seq_id: itemParar.seq_id });
        
    } else if (action.seq_id === itemParar.seq_id) {
        pararServidor();
        // Atualiza a interface (habilita Iniciar, desabilita Parar)
        systray.sendAction({ type: 'update-item', item: { ...itemIniciar, enabled: true }, seq_id: itemIniciar.seq_id });
        systray.sendAction({ type: 'update-item', item: { ...itemParar, enabled: false }, seq_id: itemParar.seq_id });
        
    } else if (action.seq_id === itemSair.seq_id) {
        pararServidor();
        systray.kill();
        process.exit(0); // Mata o processo do Node
    }
});

// Inicialização automática
systray.ready().then(() => {
    console.log("Tray Icon iniciado perto do relógio.");
}).catch(err => {
    console.error("Erro ao iniciar Tray Icon:", err);
});

// Inicia o backend logo ao abrir
iniciarServidor();