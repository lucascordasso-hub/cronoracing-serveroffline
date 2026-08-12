CREATE DATABASE IF NOT EXISTS `cronoracing` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE `cronoracing`;

-- Estrutura da tabela `brindes`
CREATE TABLE IF NOT EXISTS `brindes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `descricao` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `categorias`
CREATE TABLE IF NOT EXISTS `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `idade_min` int DEFAULT '0',
  `idade_max` int DEFAULT '99',
  `sexo` varchar(10) DEFAULT 'MASC',
  `especial` tinyint(1) DEFAULT '0',
  `onda_id` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `competicao`
CREATE TABLE IF NOT EXISTS `competicao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evento_id` int NOT NULL,
  `onda_id` int NOT NULL,
  `numero` varchar(20) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `tag` varchar(100) NOT NULL,
  `categoria_id` int NOT NULL,
  `equipe` varchar(100) DEFAULT NULL,
  `kit_id` int DEFAULT NULL,
  `pedido` int DEFAULT NULL,
  `cliente` varchar(50) DEFAULT NULL,
  `competitivo` tinyint(1) NOT NULL DEFAULT '1',
  `nascimento` date NOT NULL,
  `sexo` varchar(45) NOT NULL,
  `cpf` varchar(45) NOT NULL,
  `email` varchar(45) DEFAULT NULL,
  `cidade` varchar(45) DEFAULT NULL,
  `estado` varchar(45) DEFAULT NULL,
  `telefone` varchar(45) DEFAULT NULL,
  `camiseta_tamanho` varchar(45) DEFAULT NULL,
  `camiseta_nome` varchar(45) DEFAULT NULL,
  `retirou_kit` tinyint(1) NOT NULL DEFAULT '0',
  `usuario_log` int NOT NULL,
  `datahora_log` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `correcoes`
CREATE TABLE IF NOT EXISTS `correcoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evento_id` int NOT NULL,
  `onda_id` int NOT NULL,
  `epc` varchar(6) NOT NULL,
  `volta` int DEFAULT NULL,
  `liquido` time(3) DEFAULT NULL,
  `bruto` time(3) DEFAULT NULL,
  `obs` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `cronometragem`
CREATE TABLE IF NOT EXISTS `cronometragem` (
  `id` int NOT NULL AUTO_INCREMENT,
  `posicao` int DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `volta` int DEFAULT NULL,
  `eventoId` int DEFAULT NULL,
  `ondaId` int DEFAULT NULL,
  `categoriaId` int DEFAULT NULL,
  `idAtleta` int DEFAULT NULL,
  `epcAtleta` varchar(100) DEFAULT NULL,
  `numAtleta` int DEFAULT NULL,
  `nomeAtleta` varchar(255) DEFAULT NULL,
  `tempoBruto` time(3) DEFAULT NULL,
  `tempoLiquido` time(3) DEFAULT NULL,
  `difPrimeiro` varchar(10) DEFAULT NULL,
  `difAnterior` varchar(10) DEFAULT NULL,
  `pace` varchar(50) DEFAULT NULL,
  `bandeira` varchar(50) DEFAULT NULL,
  `horario` time(3) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `eventos`
CREATE TABLE IF NOT EXISTS `eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `descricao` varchar(100) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL,
  `local` varchar(100) DEFAULT NULL,
  `dataInicio` date DEFAULT NULL,
  `tipo` varchar(100) DEFAULT NULL,
  `diretor` int DEFAULT NULL,
  `respCrono` int DEFAULT NULL,
  `horario` time DEFAULT NULL,
  `tipo_evento` varchar(50) DEFAULT 'Corrida de Rua',
  `prefixo_tag` varchar(50) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `kits`
CREATE TABLE IF NOT EXISTS `kits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `tem_numero` tinyint(1) DEFAULT '0',
  `tem_tag` tinyint(1) DEFAULT '0',
  `tem_camiseta` tinyint(1) DEFAULT '0',
  `brindes_inclusos` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `links`
CREATE TABLE IF NOT EXISTS `links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evento_id` int NOT NULL,
  `nome` varchar(100) NOT NULL,
  `url` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `ondas`
CREATE TABLE IF NOT EXISTS `ondas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `descricao` varchar(100) NOT NULL,
  `duracao` time DEFAULT NULL,
  `tmp` time NOT NULL,
  `tml` time NOT NULL,
  `voltas` int NOT NULL,
  `evento_id` int DEFAULT NULL,
  `metragem` int NOT NULL DEFAULT '0',
  `qtdePodioGeral` int NOT NULL DEFAULT '5',
  `qtdePodioCat` int NOT NULL DEFAULT '5',
  `semClassificacao` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `tamanhos_camiseta`
CREATE TABLE IF NOT EXISTS `tamanhos_camiseta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `descricao` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estrutura da tabela `usuarios`
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `is_dono` tinyint(1) DEFAULT '0',
  `permissoes` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ==========================================
-- INJEÇÃO DE DADOS PADRÃO (Primeira Instalação)
-- ==========================================

-- O Usuário Admin NÃO precisa ser injetado aqui. 
-- O Backend Node.js criará o Admin Supremo automaticamente no primeiro login!

-- Inserção do Evento Teste
INSERT IGNORE INTO `eventos` (`id`, `descricao`, `cidade`, `estado`, `local`, `dataInicio`, `diretor`, `respCrono`, `horario`, `tipo_evento`, `prefixo_tag`) 
VALUES (
  1, 
  'Evento Teste', 
  'São Paulo', 
  'SP', 
  'Avenida Paulista', 
  '2026-08-01', 
  1, 
  1, 
  '07:00:00', 
  'Corrida de Rua/Trail Run/Maratona', 
  ''
);