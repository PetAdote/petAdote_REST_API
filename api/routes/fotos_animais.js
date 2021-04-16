// Importações.
const express = require('express');
const router = express.Router();

    // Conexões.
        const database = require('../../configs/database').connection;

    // Models.
        const Animal = require('../models/Animal');
        const AlbumAnimal = require('../models/AlbumAnimal');
        const FotoAnimal = require('../models/FotoAnimal');

        const Usuario = require('../models/Usuario');
        const Bloqueio = require('../models/Bloqueio');

    // Utilidades.
        const { Op } = require('sequelize');

        const fs = require('fs');

        const path = require('path');

        const uuid = require('uuid');       // 'uuid' para criar os nomes únicos dos arquivos.

        const moment = require('moment');   // 'moment' para manipular dados de tempo de forma mais flexível.

        const multer = require('multer');   // 'multer' para receber dados via POST de um formulário com encode 'multipart/form-data' (XMLHttpRequest).

        const sharp = require('sharp');     // 'sharp' para processar imagens.

        const mv = require('mv');           // 'mv' para mover arquivos de forma segura.

    // Helpers.
        const checkUserBlockList = require('../../helpers/check_user_BlockList');

// Rotas.



router.get('/', async (req, res, next) => {
    /* 10 Formas de capturar os dados das fotos dos animais.
     01. Lista todas as fotos dos álbuns dos animais.    (Apps/Admins)
     02. Lista todas as fotos ativas dos álbuns dos animais.    (Apps/Admins)
     03. Lista todas as fotos inativas dos álbuns dos animais.    (Apps/Admins)
     04. Lista todas as fotos ativas dos álbuns de animais cujo dono está ativo.     (Apps/Admins/Usuarios)
     05. Lista todas as fotos inativas dos álbuns de animais cujo dono está ativo.   (Apps/Admins)
     06. Lista todas as fotos ativas dos álbuns de animais cujo dono está inativo.   (Apps/Admins)
     07. Lista todas as fotos inativas dos álbuns de animais cujo dono está inativo.     (Apps/Admins)
     08. Lista todas as fotos ativas de um álbum específico.  (Apps/Admins/Usuarios)
     09. Lista todas as fotos inativas de um álbum específico.  (Apps/Admins)
     10. Exibe os dados de uma foto específica.  (Apps/Admins/Usuarios - Restrições de uso mais específicas)
    */

     // Início da Verificação dos Parâmetros da Rota.
        // As verificações dos parâmetros desta rota acontecem nas configurações das opções de busca.
    // Fim da verificação dos parâmetros da Rota.

    // Início das Restrições de acesso à rota.

        // Apenas aplicações Pet Adote e Usuários das aplicações Pet Adote poderão acessar a listagem dos dados das fotos dos animais dos usuários.
        // Além disso, usuários só podem visualizar animais de usuários ativos e que não peretncem à usuários que estão em sua lista de bloqueios.
            if (!req.dadosAuthToken){   

                // Se em algum caso não identificado, a requisição de uma aplicação chegou aqui e não apresentou suas credenciais JWT, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });

            }

        // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
            if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }
        
        // Capturando os dados do usuário, se o requisitante for o usuário de uma aplicação Pet Adote.
            let { usuario } = req.dadosAuthToken;

        // Se o usuário da aplicação estiver requisitando qualquer rota além de "getAllActive=1", "getAllFromUser" ou "getOne". Não permita o acesso.

            // * Substitua isso por uma lista de queries permitidas.

            if (usuario && !( (req.query.getAllActive == 1 & req.query.activeOwner == 1) || req.query.getAllFromAlbum || req.query.getOne)){
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }

    // Fim das Restrições de acesso à rota.

    // Início da configuração das possíveis operações de busca.

        let operacao = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).

        switch (Object.entries(req.query).length){
            case 0:
                operacao = 'getAll';

                break;
            case 1:
                if (req.query?.page) { operacao = 'getAll' };

                if (req.query?.getOne) { operacao = 'getOne'; };

                if (req.query?.getAllActive == '1') { operacao = 'getAllActive' };
                if (req.query?.getAllActive == '0') { operacao = 'getAllNotActive' };

                if (req.query?.getAllActiveFromAlbum) { operacao = 'getAllActiveFromAlbum'; };
                if (req.query?.getAllNotActiveFromAlbum) { operacao = 'getAllNotActiveFromAlbum'; };

                break;
            case 2:
                if (req.query?.page && req.query?.limit) { operacao = 'getAll' };

                if (req.query?.getAllActive == '1' && req.query?.page) { operacao = 'getAllActive' };
                if (req.query?.getAllActive == '0' && req.query?.page) { operacao = 'getAllNotActive' };

                if (req.query?.getAllActive == '1' && req.query?.activeOwner == '1') { operacao = 'getAllActive_With_ActiveOwner'};
                if (req.query?.getAllActive == '1' && req.query?.activeOwner == '0') { operacao = 'getAllActive_Without_ActiveOwner'};

                if (req.query?.getAllActive == '0' && req.query?.activeOwner == '1') { operacao = 'getAllNotActive_With_ActiveOwner'};
                if (req.query?.getAllActive == '0' && req.query?.activeOwner == '0') { operacao = 'getAllNotActive_Without_ActiveOwner'};

                if (req.query?.getAllActiveFromAlbum && req.query?.page) { operacao = 'getAllActiveFromAlbum'; };
                if (req.query?.getAllNotActiveFromAlbum && req.query?.page) { operacao = 'getAllNotActiveFromAlbum'; };

                break;
            case 3:
                if (req.query?.getAllActive == '1' && req.query?.page && req.query?.limit) { operacao = 'getAllActive' };
                if (req.query?.getAllActive == '0' && req.query?.page && req.query?.limit) { operacao = 'getAllNotActive' };

                if (req.query?.getAllActive == '1' && req.query?.activeOwner == '1' && req.query?.page) { operacao = 'getAllActive_With_ActiveOwner'};
                if (req.query?.getAllActive == '1' && req.query?.activeOwner == '0' && req.query?.page) { operacao = 'getAllActive_Without_ActiveOwner'};

                if (req.query?.getAllActive == '0' && req.query?.activeOwner == '1' && req.query?.page) { operacao = 'getAllNotActive_With_ActiveOwner'};
                if (req.query?.getAllActive == '0' && req.query?.activeOwner == '0' && req.query?.page) { operacao = 'getAllNotActive_Without_ActiveOwner'};

                if (req.query?.getAllActiveFromAlbum && req.query?.page && req.query?.limit) { operacao = 'getAllActiveFromAlbum'; };
                if (req.query?.getAllNotActiveFromAlbum && req.query?.page && req.query?.limit) { operacao = 'getAllNotActiveFromAlbum'; };

                break;
            case 4:

                if (req.query?.getAllActive == '1' && req.query?.activeOwner == '1' && req.query?.page && req.query?.limit) { operacao = 'getAllActive_With_ActiveOwner'};
                if (req.query?.getAllActive == '1' && req.query?.activeOwner == '0' && req.query?.page && req.query?.limit) { operacao = 'getAllActive_Without_ActiveOwner'};

                if (req.query?.getAllActive == '0' && req.query?.activeOwner == '1' && req.query?.page && req.query?.limit) { operacao = 'getAllNotActive_With_ActiveOwner'};
                if (req.query?.getAllActive == '0' && req.query?.activeOwner == '0' && req.query?.page && req.query?.limit) { operacao = 'getAllNotActive_Without_ActiveOwner'};
                break;
            default:
                break;
        }

    // Fim da configuração das possíveis operações de busca.

    // Início da Validação dos parâmetros.

        if (req.query?.getOne){
            if (!String(req.query.getOne).match(/^[^?/]+\.jpeg+$/g)){     // Se "getOne" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O UID da foto não parece válida.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        if (req.query?.getAllFromAlbum){
            if (String(req.query.getAllFromAlbum).match(/[^\d]+/g)){     // Se "getAllFromAlbum" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID do Álbum deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        // Se "page" ou "limit" forem menores que 1, ou for um número real. Entregue BAD_REQUEST.
        if (req.query.page){
            if (Number(req.query.page) < 1 || req.query.page != Number.parseInt(req.query.page)) {
                return res.status(400).json({
                    mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                    code: 'BAD_REQUEST'
                });
            }
        }

        if (req.query.limit){
            if (Number(req.query.limit) < 1 || req.query.limit != Number.parseInt(req.query.limit)) {
                return res.status(400).json({
                    mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                    code: 'BAD_REQUEST'
                });
            }
        }

    // Fim da Validação dos parâmetros.

    // Início da Normalização dos parâmetros.

        req.query.page = Number(req.query.page);    // Se o valor para a página do sistema de páginação for recebido como String, torne-o um Number.
        req.query.limit = Number(req.query.limit);  // Se o valor para o limite de entrega de dados do sistema de páginação for recebido como String, torne-o um Number.

        req.query.getAllFromAlbum = String(req.query.getAllFromAlbum);
        req.query.getOne = String(req.query.getOne);

    // Fim da Normalização dos parâmetros.

    // Início do processo de listagem das fotos dos álbuns de animais cadastrados.

        // Início das configurações de paginação.
            let requestedPage = req.query.page || 1;        // Página por padrão será a primeira.
            let paginationLimit = req.query.limit || 10;     // Limite padrão de dados por página = 10;

            let paginationOffset = (requestedPage - 1) * paginationLimit;   // Define o índice de partida para coleta dos dados.
        // Fim das configuração de paginação.

        if (!operacao){
            return res.status(400).json({
                mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                code: 'BAD_REQUEST'
            });
        }

        if (operacao == 'getAll'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            FotoAnimal.findAndCountAll({
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhuma foto foi encontrada.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_fotos = resultArr.count;

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos dos álbuns de animais cadastrados.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {
                        foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        
                        fotos.push(foto);
                    });
                    
                // Fim da construção do objeto enviado na resposta.

                return res.status(200).json({
                    mensagem: 'Lista de todas as fotos dos álbuns de animais cadastrados.',
                    total_fotos,
                    total_paginas,
                    fotos,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos dos álbuns dos animais cadastrados.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos dos álbuns dos animais cadastrados. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAllActive'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            FotoAnimal.findAndCountAll({
                where: {
                    ativo: 1
                },
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhuma foto ativa foi encontrada.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_fotos = resultArr.count;

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos ativas dos álbuns de animais cadastrados.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {
                        foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        
                        fotos.push(foto);
                    });
                    
                // Fim da construção do objeto enviado na resposta.

                return res.status(200).json({
                    mensagem: 'Lista de todas as fotos ativas dos álbuns de animais cadastrados.',
                    total_fotos,
                    total_paginas,
                    fotos,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos ativas dos álbuns dos animais cadastrados.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos ativas dos álbuns dos animais cadastrados. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAllNotActive'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            FotoAnimal.findAndCountAll({
                where: {
                    ativo: 0
                },
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhuma foto inativa foi encontrada.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_fotos = resultArr.count;

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=0&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=0&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos inativas dos álbuns de animais cadastrados.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {
                        foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        
                        fotos.push(foto);
                    });
                    
                // Fim da construção do objeto enviado na resposta.

                return res.status(200).json({
                    mensagem: 'Lista de todas as fotos inativas dos álbuns de animais cadastrados.',
                    total_fotos,
                    total_paginas,
                    fotos,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos inativas dos álbuns dos animais cadastrados.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos inativas dos álbuns dos animais cadastrados. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAllActive_With_ActiveOwner'){

            // Chamada livre para usuários.
            // Entregará dados sobre fotos ativas de usuários ativos.
            // Útil para listagem geral de fotos de animais.

            FotoAnimal.findAndCountAll({
                include: [{
                    model: AlbumAnimal,
                    include: [{
                        model: Animal,
                        include: [{
                            model: Usuario,
                            as: 'dono'
                        }]
                    }]
                }],
                where: {
                    ativo: 1,
                   '$AlbumAnimal.Animal.dono.esta_ativo$': 1
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum álbum de animais dos usuários ativos possui fotos ativas.'
                    });
                }

                // return res.status(200).json({
                //     resultArr
                // });

                // Início da construção do objeto enviado na resposta.

                    // Início da verificação da lista de bloqueios e cálculo da quantidade de fotos de animais que não serão exibidas.
                        let listaBloqueios = undefined;

                        let qtdFotosBloqueadas = undefined;

                        if (usuario?.e_admin == 0) { 

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            qtdFotosBloqueadas = await FotoAnimal.count({
                                include: [{
                                    model: AlbumAnimal,
                                    include: [{
                                        model: Animal,
                                        include: [{
                                            model: Usuario,
                                            as: 'dono'
                                        }]
                                    }]
                                }],
                                where: {
                                    ativo: 1,
                                    '$AlbumAnimal.Animal.cod_dono$': listaBloqueios,
                                    '$AlbumAnimal.Animal.dono.esta_ativo$': 1
                                },
                                // limit: paginationLimit,
                                // offset: paginationOffset,
                                // nest: true,
                                // raw: true
                            })

                        };

                    // Fim da verificação da lista de bloqueios e calculo da quantidade de fotos de animais que não serão exibidas.

                    let total_fotos = resultArr.count - (qtdFotosBloqueadas || 0); // Se "qtdFotosBloqueadas" estiver como NULL ou UNDEFINED, atribua zero à operação.

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos ativas dos álbuns de animais dos usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {

                        // Início da adição de atributos extras ao objeto.
                            foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        // Fim da adição de atributos extras ao objeto.

                        if (usuario){
                            // Se o requisitante for um usuário...
                            if (!listaBloqueios.includes(foto.AlbumAnimal.Animal.cod_dono)){
                                // E o dono do animal não estiver na lista de bloqueios do usuário (Bloqueado/Bloqueante)...

                                // Removendo estruturas que agora são desnecessárias.
                                    delete foto.AlbumAnimal;
                                // --------------------------------------------------

                                fotos.push(foto);
                            }
                        } else {
                            // Se o requisitante for uma aplicação...

                            // Removendo estruturas que agora são desnecessárias.
                                delete foto.AlbumAnimal;
                            // --------------------------------------------------

                            fotos.push(foto);
                        }
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de fotos ativas dos álbuns de animais dos usuários ativos.',
                        total_fotos,
                        total_paginas,
                        fotos,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos ativas dos álbuns de animais dos usuários ativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos ativas dos álbuns de animais dos usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAllActive_Without_ActiveOwner'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            FotoAnimal.findAndCountAll({
                include: [{
                    model: AlbumAnimal,
                    include: [{
                        model: Animal,
                        include: [{
                            model: Usuario,
                            as: 'dono'
                        }]
                    }]
                }],
                where: {
                    ativo: 1,
                   '$AlbumAnimal.Animal.dono.esta_ativo$': 0
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum álbum de animais dos usuários inativos possui fotos ativas.'
                    });
                }

                // return res.status(200).json({
                //     resultArr
                // });

                // Início da construção do objeto enviado na resposta.

                    let total_fotos = resultArr.count;

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=0&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=0&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos ativas dos álbuns de animais dos usuários inativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {

                        // Início da adição de atributos extras ao objeto.
                            foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        // Fim da adição de atributos extras ao objeto.

                        // Removendo estruturas que agora são desnecessárias.
                            delete foto.AlbumAnimal;
                        // --------------------------------------------------

                        fotos.push(foto);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de fotos ativas dos álbuns de animais dos usuários inativos.',
                        total_fotos,
                        total_paginas,
                        fotos,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos ativas dos álbuns de animais dos usuários inativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos ativas dos álbuns de animais dos usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAllNotActive_With_ActiveOwner'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            FotoAnimal.findAndCountAll({
                include: [{
                    model: AlbumAnimal,
                    include: [{
                        model: Animal,
                        include: [{
                            model: Usuario,
                            as: 'dono'
                        }]
                    }]
                }],
                where: {
                    ativo: 0,
                    '$AlbumAnimal.Animal.dono.esta_ativo$': 1
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum álbum de animais dos usuários ativos possui fotos inativas.'
                    });
                }

                // return res.status(200).json({
                //     resultArr
                // });

                // Início da construção do objeto enviado na resposta.

                    let total_fotos = resultArr.count;

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=0&activeOwner=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=0&activeOwner=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos inativas dos álbuns de animais dos usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {

                        // Início da adição de atributos extras ao objeto.
                            foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        // Fim da adição de atributos extras ao objeto.

                        // Removendo estruturas que agora são desnecessárias.
                            delete foto.AlbumAnimal;
                        // --------------------------------------------------

                        fotos.push(foto);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de fotos ativas dos álbuns de animais dos usuários inativos.',
                        total_fotos,
                        total_paginas,
                        fotos,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos ativas dos álbuns de animais dos usuários inativos.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos ativas dos álbuns de animais dos usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAllNotActive_Without_ActiveOwner'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            FotoAnimal.findAndCountAll({
                include: [{
                    model: AlbumAnimal,
                    include: [{
                        model: Animal,
                        include: [{
                            model: Usuario,
                            as: 'dono'
                        }]
                    }]
                }],
                where: {
                    ativo: 0,
                    '$AlbumAnimal.Animal.dono.esta_ativo$': 0
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum álbum de animais dos usuários inativos possui fotos inativas.'
                    });
                }

                // return res.status(200).json({
                //     resultArr
                // });

                // Início da construção do objeto enviado na resposta.

                    let total_fotos = resultArr.count;

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=0&activeOwner=0&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=0&activeOwner=0&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos inativas dos álbuns de animais dos usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {

                        // Início da adição de atributos extras ao objeto.
                            foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        // Fim da adição de atributos extras ao objeto.

                        // Removendo estruturas que agora são desnecessárias.
                            delete foto.AlbumAnimal;
                        // --------------------------------------------------

                        fotos.push(foto);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de fotos inativas dos álbuns de animais dos usuários inativos.',
                        total_fotos,
                        total_paginas,
                        fotos,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos inativas dos álbuns de animais dos usuários inativos.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos inativas dos álbuns de animais dos usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAllActiveFromAlbum'){

            // Chamada livre para usuários.
            // Entregará dados sobre fotos ativas dos álbuns do usuário.
            // Útil para listagem das fotos dos animais do usuário no perfil dos usuários.

            let cod_album = req.query.getAllActiveFromAlbum;

            FotoAnimal.findAndCountAll({
                include: [{
                    model: AlbumAnimal,
                    include: [{
                        model: Animal
                    }]
                }],
                where: {
                    cod_album: cod_album,
                    ativo: 1
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhuma foto ativa foi encontrada no álbum requisitado.'
                    });
                }

                // return res.status(200).json({
                //     resultArr
                // });

                // Início da construção do objeto enviado na resposta.

                    // Início da verificação da lista de bloqueios do usuário requisitante.
                        let listaBloqueios = undefined;

                        let qtdAlbunsBloqueados = undefined;

                        if (usuario?.e_admin == 0) { 

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            qtdAlbunsBloqueados = await AlbumAnimal.count({
                                include: [{
                                    model: Animal
                                }],
                                where: {
                                    cod_album: cod_album,
                                    '$Animal.cod_dono$': listaBloqueios,
                                },
                                // limit: paginationLimit,
                                // offset: paginationOffset,
                                // nest: true,
                                // raw: true
                            });

                            if (qtdAlbunsBloqueados > 0){
                                // Se a verificação bloqueou o álbum, então o requisitante está bloqueado.
                                return res.status(401).json({
                                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                });
                            }

                        };

                    // Fim da verificação da lista de bloqueios do usuário requisitante.

                    let total_fotos = resultArr.count;

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActiveFromAlbum=${cod_album}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActiveFromAlbum=${cod_album}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos ativas do álbum.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {

                        // Início da adição de atributos extras ao objeto.
                            foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        // Fim da adição de atributos extras ao objeto.

                        // Removendo estruturas que agora são desnecessárias.
                            delete foto.AlbumAnimal;
                        // --------------------------------------------------

                        fotos.push(foto);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de fotos ativas do álbum.',
                        total_fotos,
                        total_paginas,
                        fotos,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos ativas de um álbum específico.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos ativas de um álbum específico. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

            
        }

        if (operacao == 'getAllNotActiveFromAlbum'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------
            
            let cod_album = req.query.getAllNotActiveFromAlbum;

            FotoAnimal.findAndCountAll({
                include: [{
                    model: AlbumAnimal,
                    include: [{
                        model: Animal
                    }]
                }],
                where: {
                    cod_album: cod_album,
                    ativo: 0
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhuma foto inativa foi encontrada no álbum requisitado.'
                    });
                }

                // return res.status(200).json({
                //     resultArr
                // });

                // Início da construção do objeto enviado na resposta.

                    let total_fotos = resultArr.count;

                    let total_paginas = Math.ceil(total_fotos / paginationLimit);

                    let fotos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllNotActiveFromAlbum=${cod_album}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllNotActiveFromAlbum=${cod_album}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de fotos inativas do álbum.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((foto) => {

                        // Início da adição de atributos extras ao objeto.
                            foto.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${foto.uid_foto}`;
                        // Fim da adição de atributos extras ao objeto.

                        // Removendo estruturas que agora são desnecessárias.
                            delete foto.AlbumAnimal;
                        // --------------------------------------------------

                        fotos.push(foto);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de fotos inativas do álbum.',
                        total_fotos,
                        total_paginas,
                        fotos,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as fotos inativas de um álbum específico.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar as fotos inativas de um álbum específico. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getOne'){

            // Chamada livre para usuários.
            // Entregará dados específicos sobre uma foto dos álbuns de animais dos usuários.
            // Útil para exibir detalhes sobre as fotos dos animais.

            let uid_foto = req.query.getOne;

            FotoAnimal.findOne({
                include: [{
                    model: AlbumAnimal,
                    include: [{
                        model: Animal,
                        include: [{
                            model: Usuario,
                            as: 'dono'
                        }]
                    }]
                }],
                where: {
                    uid_foto: uid_foto
                },
                nest: true,
                raw: true
            })
            .then( async (result) => {

                if (!result) {
                    return res.status(404).json({
                        mensagem: 'Nenhuma foto com este UID foi encontrada.',
                        code: 'RESOURCE_NOT_FOUND',
                        lista_fotos: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=1`
                    });
                }

                // Início da verificação do estado de ativação do dono do recurso.
                    if (usuario?.e_admin == 0 && result.AlbumAnimal.Animal.dono.esta_ativo == 0){
                        // Se o dono do recurso estiver inativo, dados relativos à ele não podem ser encontrados por outros usuários.
                        return res.status(404).json({
                            mensagem: 'Nenhuma foto com este UID foi encontrada.',
                            code: 'RESOURCE_NOT_FOUND',
                            lista_fotos: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=1`
                        });
                    }
                // Fim da verificação do estado de ativação do dono do recurso.

                // Início da verificação da lista de bloqueios do usuário requisitante.
                    let listaBloqueios = undefined;

                    if (usuario?.e_admin == 0) { 

                        try {
                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            if (result.AlbumAnimal?.Animal){
                                if (listaBloqueios.includes(result.AlbumAnimal.Animal?.cod_dono)){
                                    return res.status(401).json({
                                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                    });
                                }
                            }

                        } catch (error) {
                            console.error('Algo inesperado aconteceu ao exibir dados sobre a foto.', error);
        
                            let customErr = new Error('Algo inesperado aconteceu ao exibir dados sobre a foto. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR'
                    
                            return next( customErr );
                        }

                    };

                // Fim da verificação da lista de bloqueios do usuário requisitante.

                // Início da construção do objeto enviado na resposta.
                    
                    // Removendo estruturas que agora são desnecessárias.
                        delete result.AlbumAnimal;
                    // --------------------------------------------------

                    // Início da adição de atributos extras ao objeto.
                        result.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${result.uid_foto}`;
                    // Fim da adição de atributos extras ao objeto.

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Exibindo os dados da foto do álbum do animal.',
                        foto_animal: result
                    });

                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao exibir os dados da foto do álbum do animal.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao exibir os dados da foto do álbum do animal. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

    // Fim do processo de listagem das fotos dos álbuns de animais cadastrados.

});

router.post('/', async (req, res, next) => {

});

router.patch('/', async (req, res, next) => {

});

// Exportações.
module.exports = router;