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

            if (usuario && !( (req.query.getAllActive == 1 & req.query.activeOwner == 1) || req.query.getAllActiveFromAlbum || req.query.getOne)){
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
                    mensagem: 'Requisição inválida - O UID da foto não parece ser válido.',
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

            // -----------------------------------------------------------------------------------------------------

            // Início da verificação da lista de bloqueios e cálculo da quantidade de dados que não serão exibidas.
                let listaBloqueios = undefined;

                if (usuario?.e_admin == 0) { 

                    listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                };

            // Fim da verificação da lista de bloqueios e cálculo da quantidade de dados que não serão exibidas.

            let query = {
                ativo: 1,
                '$AlbumAnimal.Animal.dono.esta_ativo$': 1
            }

            if (listaBloqueios?.length > 0){
                query['$AlbumAnimal.Animal.cod_dono$'] = {
                    [Op.notIn]: listaBloqueios
                }
            }

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
                where: query,
                order: [['data_criacao', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum álbum de animais dos usuários ativos possui fotos ativas.'
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    let total_fotos = resultArr.count;

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

                        fotos.push(foto);
                        
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
                order: [['data_criacao', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset,
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

                    let dono_recurso = result.AlbumAnimal.Animal.dono.cod_usuario;
                    let dono_ativo = result.AlbumAnimal.Animal.dono.esta_ativo;

                    if (usuario?.e_admin == 0 && usuario?.cod_usuario != dono_recurso){

                        if (dono_ativo == 0){

                            // Se o dono do recurso estiver inativo, dados relativos à ele não podem ser encontrados por outros usuários além do dono do recurso.
                            return res.status(404).json({
                                mensagem: 'Nenhuma foto com este UID foi encontrada.',
                                code: 'RESOURCE_NOT_FOUND',
                                lista_fotos: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=1`
                            });

                        }

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
                        foto: result
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

router.post('/:codAlbum', async (req, res, next) => {

    // Início da verificação do parâmetro de rota.

        if (String(req.params.codAlbum).match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Álbum deve conter apenas dígitos.",
                code: 'BAD_REQUEST'
            });
        }

    // Fim da verificação do parâmetro de rota.

    // Início das Restrições de acesso à rota.

        // Apenas Usuários poderão adicionar fotos aos álbuns dos animais cadastrados.
        // Além disso, o usuário deve ser um Administrador ou Dono do Recurso para realizar a adição de uma foto ao álbum do animal.
        if (!req.dadosAuthToken){   

            // Se em algum caso não identificado, a requisição de uma aplicação chegou aqui e não apresentou suas credenciais JWT, não permita o acesso.
            return res.status(401).json({
                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            });

        }

        // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
            if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
                return res.status(401).json({
                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }
        
        // Capturando os dados do usuário, se o requisitante for o usuário de uma aplicação Pet Adote.
            let { usuario } = req.dadosAuthToken;

        // Se o requisitante não for um usuário, não permita o acesso.
        if (!usuario){
            return res.status(401).json({
                mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            });
        };

    // Fim das Restrições de acesso à rota.

    // Capturando o código do álbum onde a foto será adicionada.
        const cod_album = req.params.codAlbum;
    // ---------------------------------------------------------

    // Início da verificação dos dados do álbum.

        let album = undefined;

        try {
            // Para adicionar uma foto ao álbum, o dono do animal deve estar ativo.
            album = await AlbumAnimal.findOne({
                include: [{
                    model: Animal,
                    include: [{
                        model: Usuario,
                        as: 'dono'
                    }]
                }],
                where: {
                    cod_album: cod_album,
                    '$Animal.estado_adocao$': ['Sob protecao', 'Em anuncio', 'Em processo adotivo'],
                    '$Animal.ativo$': 1,
                    '$Animal.dono.esta_ativo$': 1
                },
                nest: true,
                raw: true
            })
            .catch((error) => {
                throw new Error(error);
            });

        } catch (error) {

            console.error('Algo inesperado aconteceu ao buscar os dados do álbum onde a foto será adicionada.', error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do álbum onde a foto será adicionada. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'
    
            return next( customErr );

        };

        if (!album){
            // Se o álbum não foi encontrado, ele não existe ou o dono do animal que está vinculado ao álbum está inativo.
            return res.status(404).json({
                mensagem: 'O álbum não foi encontrado ou o animal não está apto a receber novas fotos.',
                code: 'RESOURCE_NOT_FOUND',
                lista_albuns: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllActive=1`,
            });
        }

    // Fim da verificação dos dados do álbum.

    // Início das restrições de uso da rota.

        if (usuario?.e_admin == 0 && album.Animal.cod_dono != usuario.cod_usuario){
            // Se o requisitante é um usuário que não é o dono do recurso ou um administrador...
            return res.status(401).json({
                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            });
        }

    // Fim das restrições de uso da rota.

    // Início da verificação de conteúdo do pacote de dados da requisição.
        if (!req.headers['content-type']){
            return res.status(400).json({
                mensagem: 'Dados não foram encontrados na requisição',
                code: 'INVALID_REQUEST_CONTENT'
            })
        }

        if (!req.headers['content-type'].includes('multipart/form-data')){
            // Se o content-type não for "multipart/form-data"...
            return res.status(400).json({
                mensagem: 'Requisição inválida - É necessário que o encoding de envio do arquivo seja multipart/form-data',
                code: 'INVALID_REQUEST_CONTENT'
            })
        };
    // Fim da verificação de conteúdo do pacote de dados da requisição.

    // Início do processo de inclusão de uma foto no álbum requisitado.

        if (req.headers['content-type'].includes('multipart/form-data')){

            // Início da verificação básica do tamanho do pacote de dados.
                if (Number(req.headers['content-length']) > (3 * 1024 * 1024)){
                    req.pause();
                    return res.status(413).json({
                        mensagem: 'O arquivo é grande demais. Suportamos arquivos de até 3mb.',
                        code: 'FILE_SIZE_TOO_LARGE'
                    });
                }
            // Fim da verificação básica do tamanho do pacote de dados.

            // Início das configurações do receptor de arquivos via encoding multipart/form-data.
                const multerStorage = multer.diskStorage({
                    destination: (req, file, cb) => {
                        cb(null, path.resolve(__dirname, '../uploads/tmp'))
                    },
                    filename: (req, file, cb) => {
                        cb(null, `${uuid.v4()}${path.extname(file.originalname)}`)
                    }
                });

                const uploadHandler = multer({
                    storage: multerStorage,
                    limits: {
                        fileSize: 3 * 1024 * 1024,  // Aceita imagens de até 3 MBs.
                        files: 1,
                        fields: 0
                    },
                    fileFilter: (req, file, cb) => {
                        let validMimes = [      
                            'image/jpeg',
                            'image/gif',
                            'image/png',
                            'image/bmp'
                        ];

                        if (!validMimes.includes(file.mimetype)){
                            req.pause();
                            res.status(406).json({
                                mensagem: 'Arquivo inválido, não aceitamos esse mimetype.',
                                code: 'INVALID_FILE_MIME'
                            })
                            return cb(null, false);
                        }
                        
                        cb(null, true);

                    }
                }).fields([
                    { name: 'foto', maxCount: 1 }
                ]); 
            // Fim das configurações do receptor de arquivos via encoding multipart/form-data.

            // Início da utilização do middleware em rota para gerenciar o arquivo recebido.
                return uploadHandler(req, res, async (error) => {

                    // Início do tratamento de erros conhecidos.
                        if (error instanceof multer.MulterError){
                            if (error.code === 'LIMIT_FILE_COUNT'){
                                return res.status(400).json({
                                    mensagem: 'Por favor envie um arquivo (imagem) por requisição.',
                                    code: error.code
                                })
                            }
        
                            if (error.code === 'LIMIT_FILE_SIZE'){
                                return res.status(413).json({
                                    mensagem: 'O arquivo é grande demais. Suportamos arquivos (imagens) de até 3mb.',
                                    code: error.code
                                })
                            }
        
                            if (error.code === 'LIMIT_UNEXPECTED_FILE'){
                                return res.status(400).json({
                                    mensagem: 'Campo inválido para o arquivo.',
                                    code: error.code
                                })
                            }
        
                            if (error.code === 'LIMIT_FIELD_COUNT'){
                                return res.status(400).json({
                                    mensagem: 'Envie apenas campos de arquivos, sem campos de texto.',
                                    code: error.code
                                })
                            }
        
                            console.error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário para o álbum do animal. - multerError:', error);
        
                            let customErr = new Error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';
        
                            return next( customErr );

                        }
                        
                        if (error) {
                            console.error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário para o álbum do animal. - commonError: ', error);
        
                            let customErr = new Error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';
        
                            return next( customErr );
                        }

                        if (Object.keys(req.files).length === 0){
                            return res.status(400).json({
                                mensagem: 'Campo de arquivo vazio detectado, por favor envie uma imagem.',
                                code: 'INVALID_FILE_INPUT'
                            })
                        }
                    // Fim do tratamento de erros conhecidos.

                    // Início do processamento do arquivo de imagem.
                        let sentFile_path = req.files.foto[0].path;

                        let newFile_name = `${uuid.v4()}-${moment().unix()}.jpeg`;
                        let newFile_path = path.resolve(__dirname, '../uploads/tmp/', newFile_name);
                        let newFile_dest = path.resolve(__dirname, '../uploads/images/usersAnimalPhotos/', newFile_name);

                        // console.log('Iniciando processamento da foto enviada pelo usuário...');

                        sharp(sentFile_path)
                        .resize({
                            width: 1000,
                            height: 1000,
                            fit: sharp.fit.cover
                        })
                        .jpeg({
                            quality: 80,
                            chromaSubsampling: '4:4:4'
                        })
                        .toFile(newFile_path, async (sharpError, info) => {
                            if (sharpError){
                                console.error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário.', sharpError);

                                let customErr = new Error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                                return next( customErr );
                            }


                            if (fs.existsSync(sentFile_path)){
                                fs.unlinkSync(sentFile_path);   // Remove o arquivo original enviado pelo usuário.
                            }
                            

                            try {

                                await database.transaction( async (transaction) => {

                                    // Início da atribuição de uma nova foto ao álbum do animal.

                                        let photoPrefix = undefined;

                                        switch(album.Animal.genero){
                                            // case 'M': 
                                            //         photoPrefix = 'Foto do';
                                            //     break;
                                            // case 'F':
                                            //         photoPrefix = 'Foto da';
                                            //     break;
                                            default: 
                                                    photoPrefix = 'Foto';
                                                break;
                                        }

                                        await FotoAnimal.create({
                                            uid_foto: newFile_name,
                                            cod_album: cod_album,
                                            nome: `${photoPrefix} ${album.Animal.nome}`
                                        }, {
                                            transaction
                                        });

                                        // Início da atualização do estado do Álbum do Animal.
                                            await AlbumAnimal.update({
                                                data_modificacao: new Date()
                                            }, {
                                                where: {
                                                    cod_album: cod_album
                                                },
                                                limit: 1,
                                                transaction
                                            })
                                        // Fim da atualização do estado do Álbum do Animal.

                                    // Fim da atribuição de uma nova foto ao álbum do animal.

                                    // Início da relocação da imagem tratada pelo Sharp para o diretório de imagens dos animais.
                                        mv(newFile_path, newFile_dest, (mvError) => {
                                            if (mvError){
                                                console.error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário.', mvError);

                                                let customErr = new Error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário. Entre em contato com o administrador.');
                                                customErr.status = 500;
                                                customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                                                throw customErr;
                                            }
                                        });
                                    // Fim da relocação da imagem tratada pelo Sharp para o diretório de imagens dos animais.

                                })
                                .catch((error) => {
                                    // Se qualquer erro acontecer no bloco acima, cairemos em CATCH do bloco TRY e faremos o rollback;
                                    throw new Error(error);
                                });
                                
                                // Se chegou aqui, o ORM da auto-commit...

                            } catch (error) {

                                // Se algum erro aconteceu durante o processo acima, o arquivo vai ficar em ".../tmp" e as alterações não serão aplicadas na database.

                                console.error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário.', error);

                                let customErr = new Error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                                return next( customErr );
                            }
                            
                            return res.status(200).json({
                                mensagem: 'A foto foi adicionada com sucesso ao álbum do animal.',
                                uid_foto: newFile_name,
                                animal: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${album.Animal.cod_animal}`,
                                album: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getOne=${cod_album}`,
                                download_foto: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${newFile_name}`
                            });

                        });

                    // Fim do processamento do arquivo de imagem.

                });

            // Fim da utilização do middleware em rota para gerenciar o arquivo recebido.

        }

    // Fim do processo de inclusão de uma foto no álbum requisitado.

});

router.patch('/:uidFoto', async (req, res, next) => {

    // Início da verificação do parâmetro de rota.

        if (!String(req.params.uidFoto).match(/^[^?/]+\.jpeg+$/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O UID da foto não parece ser válido.",
                code: 'BAD_REQUEST'
            });
        }

    // Fim da verificação do parâmetro de rota.

    // Início das Restrições de acesso à rota.

        // Apenas aplicações Pet Adote e seus usuários poderão alterar dados sobre as fotos dos álbuns dos animais cadastrados.
        // Além disso, o usuário deve ser um Administrador ou Dono do Recurso para alterar os dados de uma foto do álbum do animal.
        if (!req.dadosAuthToken){   

            // Se em algum caso não identificado, a requisição de uma aplicação chegou aqui e não apresentou suas credenciais JWT, não permita o acesso.
            return res.status(401).json({
                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            });

        }

        // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
            if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
                return res.status(401).json({
                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }
        
        // Capturando os dados do usuário, se o requisitante for o usuário de uma aplicação Pet Adote.
            let { usuario } = req.dadosAuthToken;

    // Fim das Restrições de acesso à rota.

    // Capturando o código da foto que terá seus dados alterados.
        const uid_foto = req.params.uidFoto;
    // ----------------------------------------------------------

    // Início da verificação dos dados da foto.

        let foto = undefined;

        try {
            // Para alterar os dados de uma foto, ela deve estar ativa e o dono do animal que possui a foto deve estar ativo. Isso é tratado mais adiante no código...
            foto = await FotoAnimal.findOne({
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
            .catch((error) => {
                throw new Error(error);
            });

        } catch (error) {

            console.error('Algo inesperado aconteceu ao buscar os dados da foto.', error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados da foto. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'

            return next( customErr );

        };

        if (!foto){
            // Se a foto não foi encontrada...
            return res.status(404).json({
                mensagem: 'Nenhuma foto com esse UID foi encontrada.',
                code: 'RESOURCE_NOT_FOUND',
                lista_fotos: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=1&page=1`,
            });
        }

    // Fim da verificação dos dados do álbum.

    // Início das restrições de uso da rota.

        if (usuario?.e_admin == 0){
            // Se o requisitante for um usuário comum...

            if (foto.ativo != 1 || foto.AlbumAnimal.Animal.dono.esta_ativo != 1){
                // Se a foto ou o dono do recurso estiverem inativos...
                return res.status(404).json({
                    mensagem: 'Nenhuma foto com esse UID foi encontrada.',
                    code: 'RESOURCE_NOT_FOUND',
                    lista_fotos: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=1&page=1`,
                });
            }

            if (foto.AlbumAnimal.Animal.cod_dono != usuario.cod_usuario){
                // Se o requisitante não for o dono do recurso...
                return res.status(401).json({
                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }

        }

    // Fim das restrições de uso da rota.

    // Início da verificação de conteúdo do pacote de dados da requisição.
        if (!req.headers['content-type']){
            return res.status(400).json({
                mensagem: 'Dados não foram encontrados na requisição',
                code: 'INVALID_REQUEST_CONTENT'
            })
        }
    // Fim da verificação de conteúdo do pacote de dados da requisição.

    // Início do processo de alterações nos campos comuns dos dados da foto do animal.

        // Início das restrições de envio de campos.

            let hasUnauthorizedField = false;

            let emptyFields = [];   // Se campos vazios forem detectados, envie (400 - INVALID_REQUEST_FIELDS)

            // Lista de campos permitidos.

                let allowedFields = [
                    'nome',
                    'descricao',
                    'ativo'
                ];

            // Fim da lista de campos permitidos.

            // Início da verificação de campos não permitidos.

                Object.entries(req.body).forEach((pair) => {
                    if (!allowedFields.includes(pair[0])){
                        hasUnauthorizedField = true;
                    };

                    if (String(pair[1]).length == 0){
                        emptyFields.push(String(pair[0]));
                    };
                });

                if (hasUnauthorizedField){
                    return res.status(400).json({
                        mensagem: 'Algum dos campos enviados é inválido.',
                        code: 'INVALID_REQUEST_FIELDS'
                    });
                }

                if (emptyFields.length > 0){
                    return res.status(400).json({
                        mensagem: `Campos vazios foram detectados.`,
                        code: 'INVALID_REQUEST_FIELDS',
                        campos_vazios: emptyFields
                    });
                }

            // Fim da verificação de campos não permitidos.

        // Fim das restrições de envio de campos.

        // Início da Normalização dos campos recebidos.

            Object.entries(req.body).forEach((pair) => {

                req.body[pair[0]] = String(pair[1]).trim();     // Remove espaços excessivos no início e no fim do valor.

                let partes = undefined;     // Será útil para tratar partes individuais de um valor.

                switch(pair[0]){
                    case 'nome':
                        // Deixando a primeira letra da string em caixa alta.
                        req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                        break;
                    case 'descricao':
                        // Deixando a primeira letra da string em caixa alta.
                        req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                        break;
                    default:
                        break;
                }

            });

        // Fim da Normalização dos campos recebidos.

        // Início da Validação dos Campos.

            // Validação Nome.
                if (req.body.nome?.length >= 0){

                    if (req.body.nome.match(/\s{2}|[^0-9A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){ // Se o RegEx encontrar algo, não permita continuar (O nome da foto pode possuir números)
                        return res.status(400).json({
                            mensagem: 'O nome da foto possui espaços excessivos ou caracteres inválidos.',
                            code: 'INVALID_INPUT_NOME'
                        });
                    }

                    if (req.body.nome.length === 0 || req.body.nome.length > 100){
                        return res.status(400).json({
                            mensagem: 'O nome da foto está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_LENGTH_NOME'
                        });
                    }

                }
            // ---------------

            // Validação Descrição.
                if (req.body.descricao?.length >= 0){

                    if (req.body.nome.length === 0 || req.body.nome.length > 100){
                        return res.status(400).json({
                            mensagem: 'A descrição da foto está vazia ou possui mais do que 255 caracteres.',
                            code: 'INVALID_LENGTH_DESCRICAO'
                        });
                    }

                }
            // --------------------

            // Validação Ativo.
                if (req.body.ativo?.length >= 0){

                    let allowedValues = [
                        '0'
                    ];

                    if (!usuario || usuario?.e_admin == 1){
                        allowedValues = [
                            '0',
                            '1'
                        ]
                    }

                    if (!allowedValues.includes(req.body.ativo)){
                        return res.status(400).json({
                            mensagem: 'O estado de ativação declarado para a foto é inválido.',
                            code: 'INVALID_INPUT_ATIVO'
                        });
                    }

                    // Se chegou aqui, o valor é válido. Converta para Number.
                        req.body.ativo = Number(req.body.ativo);
                    // Fim da conversão do estado de vacinação para Number.

                }
            // ----------------

        // Fim da Validação dos Campos.

        // Início da efetivação das alterações.

            // Inclusão da data de modificação dos dados da foto.
                req.body.data_modificacao = new Date();
            // --------------------------------------------------

            try {

                await database.transaction( async (transaction) => {

                    // Início da verificação de uso da foto nos dados do animal para retornar a foto ao padrão em casos específicos.

                        // Se a foto que sofrerá a alteração estiver sendo utilizada pelo animal, ao desativá-la a foto do animal deverá retornar ao padrão.
                            if (foto.AlbumAnimal.Animal.foto == foto.uid_foto){
                                if (req.body.ativo == 0){

                                    let defaultAnimalPicture = undefined;
                                    let possibleDefaultImages = undefined;
                                    let rngSelector = Number.parseInt((Math.random() * (1.9 - 0)));  // 0 ou 1.

                                    switch(foto.AlbumAnimal.Animal.especie){
                                        case 'Gato':
                                            possibleDefaultImages = [
                                                'default_cat_01.jpeg',
                                                'default_cat_02.jpeg'
                                            ];

                                            defaultAnimalPicture = possibleDefaultImages[rngSelector];
                                            break;
                                        case 'Cão':
                                            possibleDefaultImages = [
                                                'default_dog_01.jpeg',
                                                'default_dog_02.jpeg'
                                            ];

                                            defaultAnimalPicture = possibleDefaultImages[rngSelector];
                                            break;
                                        default:
                                            defaultAnimalPicture = 'default_unknown_pet.jpeg';
                                            break;
                                    }

                                    await Animal.update({
                                        foto: defaultAnimalPicture
                                    }, {
                                        where: {
                                            cod_animal: foto.AlbumAnimal.Animal.cod_animal
                                        },
                                        limit: 1,
                                        transaction
                                    });

                                }
                            }
                        // ---------------------------------------------------------------------------------------------------------------------------------

                    // Fim da verificação de uso da foto nos dados do animal para retornar a foto ao padrão em casos específicos.

                    // Início da atualização dos dados da foto do animal.
                        await FotoAnimal.update(req.body, {
                            where: {
                                uid_foto: uid_foto
                            },
                            limit: 1,
                            transaction
                        });
                    // Fim da atualização dos dados da foto do animal.

                    // Início da entrega da resposta de sucesso.
                        return FotoAnimal.findByPk(uid_foto, {
                            raw: true,
                            transaction
                        })
                        .then((updatedResult) => {
                            return res.status(200).json({
                                mensagem: 'Os dados da foto do animal foram atualizados com sucesso.',
                                foto: updatedResult,
                                download_foto: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${uid_foto}`
                            });
                        })
                    // Fim da entrega da resposta de sucesso.


                })
                .catch((error) => {
                    throw new Error(error);
                });

                // Se chegou aqui a ORM dá Auto-commit.

            } catch (error) {

                // Se algum problema aconteceu, dê Rollback.

                console.error(`Algo inesperado aconteceu atualizar os dados da foto.`, error);

                let customErr = new Error('Algo inesperado aconteceu atualizar os dados da foto. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';

                return next(customErr);

            }
            
            
        // Fim da efetivação das alterações.

    // Fim do processo de alterações nos campos comuns dos dados da foto do animal.

});

// Exportações.
module.exports = router;