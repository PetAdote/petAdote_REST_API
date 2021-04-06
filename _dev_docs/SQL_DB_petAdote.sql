# DROP DATABASE db_petAdote;

CREATE DATABASE db_petAdote
	DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;
    
	# Ao dar suporte completo à caracteres UNICODE (utf8mb4) - cada caractere consumirá 4 bytes,
    # enquanto no (utf8) cada caractere consome 3 bytes.
    
    # Então devemos nos atentar ao fato de que, um TINYTEXT em (utf8) suporta 85 caracteres. (3x85 = 255 bytes).
	# Enquanto um TINYTEXT em (utf8mb4) agora suportará 63 caracteres. (4x63 = 252 bytes).
    
    # O mesmo vale para os outros campos. Atente-se à quantidade máxima de bytes suportados por eles.

USE db_petAdote;

# Configuração do SGBD para o suporte total a caracteres UNICODE, mais informações na documentação do dia [13.02.2021].
SET collation_connection = 'utf8mb4_unicode_ci';
SHOW VARIABLES WHERE Variable_name LIKE '%character%' OR Variable_name LIKE 'collation%';

#######################
# Criação das Tabelas #
#######################

# Tabela de cadastro de um Cliente (Aplicações que utilizarão a REST API) #

CREATE TABLE tbl_cliente (
	cod_cliente INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    tipo_cliente ENUM('Comum', 'Pet Adote') NOT NULL DEFAULT 'Comum',
    senha VARCHAR(100) NOT NULL,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    data_modificacao DATETIME NOT NULL DEFAULT NOW()
);

# Tabelas para cadastro de um perfil inicial de usuário (Perfil, Acessos, Endereços) #

CREATE TABLE tbl_usuario (
	cod_usuario INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    primeiro_nome VARCHAR(100) NOT NULL,
    sobrenome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(17) NOT NULL,
    data_nascimento DATE NOT NULL,
    descricao VARCHAR(255),
	foto_usuario VARCHAR(200) NOT NULL DEFAULT 'avatar_default.jpeg',
    banner_usuario VARCHAR(200) NOT NULL DEFAULT 'banner_default.jpeg',
    esta_ativo TINYINT UNSIGNED NOT NULL DEFAULT 0,
    ong_ativo TINYINT UNSIGNED NOT NULL DEFAULT 0,
    e_admin TINYINT UNSIGNED NOT NULL DEFAULT 0,
    qtd_seguidores INT UNSIGNED NOT NULL DEFAULT 0,
    qtd_seguidos INT UNSIGNED NOT NULL DEFAULT 0,
    qtd_denuncias INT UNSIGNED NOT NULL DEFAULT 0,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    data_modificacao DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cod_usuario)
);

CREATE TABLE tbl_conta_local (
	email VARCHAR(255) NOT NULL UNIQUE,
	cod_usuario INT UNSIGNED NOT NULL UNIQUE,
    senha VARCHAR(100) NOT NULL,
    # email_recuperacao VARCHAR(255) NOT NULL,
    PRIMARY KEY (email),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

DROP TABLE tbl_conta_local;

CREATE TABLE tbl_conta_facebook (
	cod_facebook VARCHAR(255) NOT NULL UNIQUE,
	cod_usuario INT UNSIGNED NOT NULL UNIQUE,
    PRIMARY KEY (cod_facebook),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_conta_google (
	cod_google VARCHAR(255) NOT NULL UNIQUE,
	cod_usuario INT UNSIGNED NOT NULL UNIQUE,
    PRIMARY KEY (cod_google),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_end_usuario (
	cod_end_usuario INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_usuario INT UNSIGNED NOT NULL UNIQUE,
    cep VARCHAR(9) NOT NULL,
    logradouro VARCHAR(100) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    latitude VARCHAR(100),
    longitude VARCHAR(100),
    PRIMARY KEY (cod_end_usuario),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

# Fim dos cadastros básicos para criação do perfil de um novo usuário #
#---------------------------------------------------------------------#

# Tabelas para cadastro dos pets dos usuários (Animais, Albuns e Fotos) #

CREATE TABLE tbl_animal (
	cod_animal INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_dono INT UNSIGNED NOT NULL,
    cod_dono_antigo INT UNSIGNED,
    estado_adocao ENUM('Sob proteção', 'Em anúncio', 'Em processo adotivo', 'Adotado') NOT NULL DEFAULT 'Sob proteção',
    nome VARCHAR(100) NOT NULL,
    foto_atual VARCHAR(200) NOT NULL DEFAULT 'default_unknown_pet.jpeg',
    data_nascimento DATE NOT NULL,
    especie ENUM('Cão', 'Gato', 'Outros') NOT NULL,
    raca VARCHAR(20) NOT NULL,
    genero ENUM('M', 'F') NOT NULL,
    porte ENUM('P', 'M', 'G') NOT NULL,
    esta_castrado TINYINT UNSIGNED NOT NULL,
    esta_vacinado TINYINT UNSIGNED NOT NULL,
    detalhes_comportamento VARCHAR(255) NOT NULL,
    detalhes_saude VARCHAR(255) NOT NULL,
    historia TEXT,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    data_modificacao DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cod_animal),
    FOREIGN KEY (cod_dono) REFERENCES tbl_usuario(cod_usuario),
    FOREIGN KEY (cod_dono_antigo) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_album_animal (
	cod_album_animal INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_animal INT UNSIGNED UNIQUE NOT NULL,	# Unique pois ao criar o animal, o álbum dele será criado também.
    titulo_album VARCHAR(100) NOT NULL,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cod_album_animal),
    FOREIGN KEY (cod_animal) REFERENCES tbl_animal(cod_animal)
);

CREATE TABLE tbl_foto_animal (
	cod_foto_animal INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_animal INT UNSIGNED NOT NULL,
    cod_album_animal INT UNSIGNED NOT NULL,
    foto VARCHAR(200) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cod_foto_animal),
    FOREIGN KEY (cod_animal) REFERENCES tbl_animal(cod_animal),
    FOREIGN KEY (cod_album_animal) REFERENCES tbl_album_animal(cod_album_animal)
);

# Fim das tabelas de cadastro de pets #
#-------------------------------------#

# Tabelas para as publicações dos usuários (Anúncios, Postagens e Momentos) #

CREATE TABLE tbl_anuncio (
	cod_anuncio INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_animal INT UNSIGNED NOT NULL UNIQUE,	# Unique pois o animal poderá ser anúnciado uma única vez até ser adotado para evitar SPAM.
    cod_usuario INT UNSIGNED NOT NULL,			# Não é UNIQUE pois o usuário poderá anúnciar mais de 1 animal.
    cod_foto_animal INT UNSIGNED NOT NULL UNIQUE,		# Unique para restringir o uso em múltiplos anúncios
    qtd_visualizacao INT UNSIGNED NOT NULL DEFAULT 0,
    qtd_avaliacoes INT UNSIGNED NOT NULL DEFAULT 0,
    estado_adocao ENUM('Me adote!', 'Fui adotado!') NOT NULL DEFAULT 'Me adote!',
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cod_anuncio),
    FOREIGN KEY (cod_animal) REFERENCES tbl_animal(cod_animal),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario),
    FOREIGN KEY (cod_foto_animal) REFERENCES tbl_foto_animal(cod_foto_animal)
);

CREATE TABLE tbl_momento (
	cod_momento INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_usuario INT UNSIGNED NOT NULL,
    cod_foto_animal INT UNSIGNED UNIQUE,		# UNIQUE para evitar SPAM da mesma foto.
    descricao VARCHAR(255),
    qtd_visualizacao INT UNSIGNED NOT NULL DEFAULT 0,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cod_momento),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario),
    FOREIGN KEY (cod_foto_animal) REFERENCES tbl_foto_animal(cod_foto_animal)
);

CREATE TABLE tbl_postagem (
	cod_postagem INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_usuario INT UNSIGNED NOT NULL,
    conteudo_texto TEXT NOT NULL,
    qtd_visualizacao INT UNSIGNED NOT NULL DEFAULT 0,
    qtd_avaliacoes INT UNSIGNED NOT NULL DEFAULT 0,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    data_modificacao DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cod_postagem),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_foto_postagem (
	cod_foto_postagem INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_postagem INT UNSIGNED NOT NULL,
    cod_foto_animal INT UNSIGNED NOT NULL,
    PRIMARY KEY (cod_foto_postagem),
    FOREIGN KEY (cod_postagem) REFERENCES tbl_postagem(cod_postagem),
    FOREIGN KEY (cod_foto_animal) REFERENCES tbl_foto_animal(cod_foto_animal)
);

# Fim das tabelas de publicações dos usuários #
#---------------------------------------------#

# Tabelas para os aspectos sociais entre usuários 									            #
# (Avaliações de Postagens e Anúncios, Lista de Anúncios Favoritos, Candidaturas de Adoção, ... #
#  Seguidas, Chat, Denúncias e Bloqueios)                                                       #

CREATE TABLE tbl_avaliacao_postagem (
	cod_avaliacaoPostagem INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_postagem INT UNSIGNED NOT NULL,
    cod_usuario INT UNSIGNED NOT NULL,
    PRIMARY KEY (cod_avaliacaoPostagem),
    FOREIGN KEY (cod_postagem) REFERENCES tbl_postagem(cod_postagem),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_avaliacao_anuncio (
	cod_avaliacaoAnuncio INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_anuncio INT UNSIGNED NOT NULL,
    cod_usuario INT UNSIGNED NOT NULL,
    PRIMARY KEY (cod_avaliacaoAnuncio),
    FOREIGN KEY (cod_anuncio) REFERENCES tbl_anuncio(cod_anuncio),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_anuncio_favorito (
	cod_anuncioFav INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_anuncio INT UNSIGNED NOT NULL,
    cod_usuario INT UNSIGNED NOT NULL,
    PRIMARY KEY (cod_anuncioFav),
    FOREIGN KEY (cod_anuncio) REFERENCES tbl_anuncio(cod_anuncio),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_candidatura (
	cod_candidatura INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_anuncio INT UNSIGNED NOT NULL,
    cod_usuario INT UNSIGNED NOT NULL,
    data_candidatura DATETIME NOT NULL DEFAULT NOW(),
    estado_candidatura ENUM('Em avaliação', 'Candidatura aceita', 'Candidatura rejeitada') NOT NULL DEFAULT 'Em avaliação',
    PRIMARY KEY (cod_candidatura),
    FOREIGN KEY (cod_anuncio) REFERENCES tbl_anuncio(cod_anuncio),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_seguida (
	cod_seguida INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    seguidor INT UNSIGNED NOT NULL,
    seguido INT UNSIGNED NOT NULL,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cod_seguida),
    FOREIGN KEY (seguidor) REFERENCES tbl_usuario(cod_usuario),
    FOREIGN KEY (seguido) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_conversa (
	cod_conversa INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_usuario01 INT UNSIGNED NOT NULL,
    cod_usuario02 INT UNSIGNED NOT NULL,
	PRIMARY KEY (cod_conversa),
    FOREIGN KEY (cod_usuario01) REFERENCES tbl_usuario(cod_usuario),
    FOREIGN KEY (cod_usuario02) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_resposta (
	cod_resposta INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_conversa INT UNSIGNED NOT NULL,
    cod_usuario INT UNSIGNED NOT NULL,
    resposta TEXT NOT NULL,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    data_visualizacao DATETIME,
    PRIMARY KEY (cod_resposta),
    FOREIGN KEY (cod_conversa) REFERENCES tbl_conversa(cod_conversa),
    FOREIGN KEY (cod_usuario) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_anexo_resposta (
	cod_anexo_resposta INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    cod_resposta INT UNSIGNED NOT NULL,
    nome_unico_anexo VARCHAR(200) NOT NULL UNIQUE,
    PRIMARY KEY (cod_anexo_resposta),
    FOREIGN KEY (cod_resposta) REFERENCES tbl_resposta(cod_resposta)
);

CREATE TABLE tbl_denuncia (
	cod_denuncia INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    denunciante INT UNSIGNED NOT NULL,
    denunciado INT UNSIGNED NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    data_criacao DATETIME NOT NULL DEFAULT NOW(),
    esta_fechada TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (cod_denuncia),
    FOREIGN KEY (denunciante) REFERENCES tbl_usuario(cod_usuario),
    FOREIGN KEY (denunciado) REFERENCES tbl_usuario(cod_usuario)
);

CREATE TABLE tbl_bloqueio (
	cod_bloqueio INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    bloqueante INT UNSIGNED NOT NULL,
    bloqueado INT UNSIGNED NOT NULL,
    PRIMARY KEY (cod_bloqueio),
    FOREIGN KEY (bloqueante) REFERENCES tbl_usuario(cod_usuario),
    FOREIGN KEY (bloqueado) REFERENCES tbl_usuario(cod_usuario)
);

# Fim das tabelas de aspectos sociais entre usuários #
#----------------------------------------------------#


###################
# Querys de Teste #
###################

SELECT * FROM tbl_usuario;

SELECT * FROM tbl_conta_local;
SELECT * FROM tbl_conta_facebook;
SELECT * FROM tbl_conta_google;

SELECT * FROM tbl_end_usuario;

SELECT * FROM tbl_bloqueio;

SELECT * FROM tbl_cliente;

# Traz os pets de usuários que estão com a conta ativa.
SELECT 
	*
FROM tbl_animal ta
	INNER JOIN tbl_usuario tu
		ON ta.cod_dono = tu.cod_usuario
WHERE tu.esta_ativo = 1;

# Traz as fotos do álbum dos pets dos usuários que estão com a conta ativa.
SELECT 
	taa.titulo_album AS ALBUM,
	tfa.nome_unico_foto AS FOTO_PET,
    tfa.descricao AS FOTO_DESCRICAO,
    ta.nome AS NOME_PET,
    ta.idade AS IDADE,
    ta.especie AS ESPECIE,
	concat(tu.primeiro_nome,' ', tu.sobrenome ) AS DONO,
    tu.cod_usuario AS ID_DONO,
    tu.esta_ativo AS USUARIO_ATIVO
FROM tbl_foto_animal tfa
	INNER JOIN tbl_album_animal taa
		ON tfa.cod_animal = taa.cod_animal
	INNER JOIN tbl_animal ta
		ON taa.cod_animal = ta.cod_animal
	INNER JOIN tbl_usuario tu
		ON ta.cod_dono = tu.cod_usuario
WHERE tu.esta_ativo = 1;
    
# Traz todos os animais.
SELECT * FROM tbl_animal;

# Traz todos os álbums.
SELECT * FROM tbl_album_animal;

# Traz todas as fotos.
SELECT * FROM tbl_foto_animal;
	

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE tbl_usuario;
TRUNCATE tbl_conta_local;
TRUNCATE tbl_conta_facebook;
TRUNCATE tbl_conta_google;
TRUNCATE tbl_end_usuario;
TRUNCATE tbl_bloqueio;
SET FOREIGN_KEY_CHECKS = 1;

SELECT 	pu.*,
		al.*,
        eu.*
FROM tbl_perfil_usuario pu
	INNER JOIN tbl_acesso_local al
		ON pu.cod_perfil = al.cod_perfil
	INNER JOIN tbl_acesso_facebook af
	INNER JOIN tbl_end_usuario eu
		ON pu.cod_perfil = eu.cod_perfil;
        
SELECT cidade, count(cidade) FROM tbl_end_usuario
GROUP BY cidade
ORDER BY count(cidade) DESC
LIMIT 1;

#---------------------------------------------------------------------------------------------#
# Clientes #

INSERT INTO tbl_cliente
	(nome, senha, tipo_cliente)
VALUES
	('Pet Adote Web','123', 'Pet Adote'),
    ('Pet Adote Mobile', '123', 'Pet Adote'),
    ('Pet Shop 01', '123', 'Comum');

#---------------------------------------------------------------------------------------------#
# Usuário Local #

INSERT INTO tbl_usuario
	(primeiro_nome, sobrenome, cpf, telefone, data_nascimento, descricao)
VALUES
	('Alfino', 'Testeiro', '409.538.178-73', '(11) 9 5142-9364', '2021-02-18', 'Bugs são meus pets favoritos!');

# Aqui o Sistema deve pegar o cod_perfil do usuário e salvar imediatamente.

INSERT INTO tbl_conta_local
	(email, cod_usuario, senha) 	#Em 'cod_perfil' o sistema entregará o ID do perfil criado acima, para o acesso atual.
VALUES
	('alfino@testeiro.com', 1, '123');
    
INSERT INTO tbl_end_usuario
	(cod_usuario, cep, logradouro, bairro, cidade, estado)
VALUES
	(1, '08151-610', 'Rua dos testes', 'Testelandia', 'Testecity', 'State of Testes');
    
#---------------------------------------------------------------------------------------------#
# Usuário Social Facebook #

INSERT INTO tbl_usuario
	(primeiro_nome, sobrenome, cpf, telefone, data_nascimento, descricao)
VALUES
	('Beidou', 'Hokuto', '152.456.777-20', '(11) 9 1347-7865', '2001-08-13', 'Peixes são os melhores!');

INSERT INTO tbl_conta_facebook
	(cod_facebook, cod_usuario)
VALUES
	('12365478', 2);
    
INSERT INTO tbl_end_usuario
	(cod_usuario, cep, logradouro, bairro, cidade, estado)
VALUES
	(2, '16197-321', 'Rua dos Sete Mares', 'Cruxlandia', 'Liyue', 'Liyue');

#---------------------------------------------------------------------------------------------#
# Usuário Social Google #

INSERT INTO tbl_usuario
	(primeiro_nome, sobrenome, cpf, telefone, data_nascimento, descricao)
VALUES
	('Ganyu', 'Qixing', '324.102.453-44', '(11) 9 6859-1044', '2005-03-20', 'Todos os animais são fantásticos.');

INSERT INTO tbl_conta_google
	(cod_google, cod_usuario)
VALUES
	('6489878', 3);

INSERT INTO tbl_end_usuario
	(cod_usuario, cep, logradouro, bairro, cidade, estado)
VALUES
	(3, '16300-265', 'Pavilhão de Liyue', 'Moraxville', 'Liyue', 'Liyue');
    
#---------------------------------------------------------------------------------------------#
# Pets dos usuários #

# SET FOREIGN_KEY_CHECKS = 0;
# TRUNCATE tbl_animal;
# TRUNCATE tbl_album_animal;
# TRUNCATE tbl_foto_animal;
# SET FOREIGN_KEY_CHECKS = 1;

DESCRIBE tbl_animal;

INSERT INTO tbl_animal
	(cod_dono, nome, data_nascimento, especie, raca, 
    genero, porte, esta_castrado, esta_vacinado,
    detalhes_comportamento,
    detalhes_saude,
    historia)
VALUES
	(1, 'Lucky', '2021-01-05', 'Cão', 'comum',
    'F', 'P', '0', '0',
    'Comportamento calmo',
    'Não apresentou nenhum problema de saúde',
    'Abandonaram ele na esquina da rua de casa, não tenho como cuidar dele por muito tempo.');
    
INSERT INTO tbl_animal
	(cod_dono, nome, data_nascimento, especie, raca, 
    genero, porte, esta_castrado, esta_vacinado,
    detalhes_comportamento,
    detalhes_saude,
    historia)
VALUES
	(1, 'Lila', '2021-03-04', 'Gato', 'comum',
    'F', 'P', '0', '0',
    'Ela é super calminha',
    'Não tem problemas de saúde',
    'É filhote da gata aqui de casa, mas não temos como cuidar dela também :(');
    
INSERT INTO tbl_animal
	(cod_dono, cod_dono_antigo, nome, data_nascimento, especie, raca, 
    genero, porte, esta_castrado, esta_vacinado,
    detalhes_comportamento,
    detalhes_saude,
    historia)
VALUES
	(1, 2, 'Xiquinho', '2020-04-04', 'Cão', 'comum',
    'M', 'M', '1', '1',
    'Xiquinha é um companheiro e tanto!',
    'Nenhum problema de saúde até hoje.',
    'Adotei ele de um usuário aqui do Pet Adote quando era um dog pequenininho, mas vou ter que sair do país e não posso levar ele imediatamente. Preciso de alguém pra cuidar dele pelo menos temporáriamente.');
    
INSERT INTO tbl_animal
	(cod_dono, nome, data_nascimento, especie, raca, 
    genero, porte, esta_castrado, esta_vacinado,
    detalhes_comportamento,
    detalhes_saude,
    historia)
VALUES
	(3, 'Cinzento', '2020-11-04', 'Gato', 'comum',
    'M', 'P', '0', '0',
    'O cinzento é bem quieto',
    'Não tem problemas de saúde',
    'Chegou aqui do nada, ficou por uns dias, e no fim tá aqui já faz 5 meses. Mas preciso de alguém pra cuidar dele de verdade.');
    
#---------------------------------------------------------------------------------------------#
# Álbum dos Pets dos usuários #

DESCRIBE tbl_album_animal;

INSERT INTO tbl_album_animal
	(cod_animal, titulo_album)
VALUES
	(1, 'Álbum do Lucky');
    
INSERT INTO tbl_album_animal
	(cod_animal, titulo_album)
VALUES
	(2, 'Álbum da Lila');
    
INSERT INTO tbl_album_animal
	(cod_animal, titulo_album)
VALUES
	(3, 'Álbum do Xiquinho');
    
INSERT INTO tbl_album_animal
	(cod_animal, titulo_album)
VALUES
	(4, 'Álbum do Cinzento');
    
#---------------------------------------------------------------------------------------------#
# Fotos dos Pets dos usuários #

DESCRIBE tbl_foto_animal;

INSERT INTO tbl_foto_animal
	(cod_animal, cod_album_animal, foto, descricao)
VALUES
	(1, 1, 'luckychegou.jpeg', 'Foto de quando acolhemos o Lucky.');
    
INSERT INTO tbl_foto_animal
	(cod_animal, cod_album_animal, foto, descricao)
VALUES
	(1, 1, 'luckyfeliz.jpeg', 'Foto do Lucky feliz por ter sido acolhido.');
    
INSERT INTO tbl_foto_animal
	(cod_animal, cod_album_animal, foto, descricao)
VALUES
	(2, 2, 'lilabricando.jpeg', 'Foto da Lila correndo em circulos tentando pegar a própria calda.');
    
INSERT INTO tbl_foto_animal
	(cod_animal, cod_album_animal, foto, descricao)
VALUES
	(2, 2, 'lilameow.jpeg', 'Foto do Lila miando, tinha acabado de acordar e estava pedindo comida.');
    
INSERT INTO tbl_foto_animal
	(cod_animal, cod_album_animal, foto, descricao)
VALUES
	(3, 3, 'xiquinho_filhote.jpeg', 'Olha só esse doguinho quando chegou, Xiquinho cabia numa mão só.');

INSERT INTO tbl_foto_animal
	(cod_animal, cod_album_animal, foto, descricao)
VALUES
	(3, 3, 'xiquinho_crescido.jpeg', 'Xiquinho ficou grandão e hoje em dia se tornou esse doguinho companheiro!');
    
INSERT INTO tbl_foto_animal
	(cod_animal, cod_album_animal, foto, descricao)
VALUES
	(4, 4, 'o_grande_cinzento.jpeg', 'O Cinzento deu um pulo na câmera quando eu tirei essa foto, pareceu que ele ficou gigante.');
	
    
#---------------------------------------------------------------------------------------------#
# Bloqueio entre usuários #

INSERT INTO tbl_bloqueio
	(bloqueante, bloqueado)
VALUES
	(1, 3),
	(3, 1);
    
# TRUNCATE TABLE tbl_bloqueio;

