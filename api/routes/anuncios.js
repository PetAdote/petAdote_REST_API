// Importações.
const express = require('express');
const router = express.Router();

    // Conexões.
        const database = require('../../configs/database').connection;

    // Models.
        const Animal = require('../models/Animal');
        const AlbumAnimal = require('../models/AlbumAnimal');
        const FotoAnimal = require('../models/FotoAnimal');
        const Anuncio = require('../models/Anuncio');

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

router.get('/', (req, res, next) => {
    /* 16 Formas de capturar os dados dos anúncios.
     01. Listar todos os anúncios.              (Apps/Admins)
     02. Listar todos os anúncios abertos.      (Apps/Admins)
     03. Listar todos os anúncios concluidos.   (Apps/Admins)
     04. Listar todos os anúncios fechados.     (Apps/Admins)

     05. Listar todos os anúncios abertos de animais de usuários ativos.    (Apps/Admins/Usuários/Público)
     06. Listar todos os anúncios concluídos de animais de usuários ativos. (Apps/Admins/Usuários/Público)
     07. Listar todos os anúncios fechados de animais de usuários ativos.   (Apps/Admins)

     08. Listar todos os anúncios abertos de animais de usuários inativos.      (Apps/Admins/Usuários/Privado - Apenas o dono do recurso apenas visualiza)
     09. Listar todos os anúncios concluídos de animais de usuários inativos.   (Apps/Admins/Usuarios/Privado - Apenas o dono do recurso apenas visualiza)
     10. Listar todos os anúncios fechados de animais de usuários inativos.     (Apps/Admins)

     11. Listar anúncios abertos de animais de usuários ativos ordenando por quantidade de visualização.  (Apps/Admins/Usuários/Público)
     12. Listar anúncios abertos de animais de usuários ativos ordenando por quantidade de avaliações.    (Apps/Admins/Usuários/Público)

     13. Listar todos os anúncios abertos de um usuário específico.	    (Apps/Admins/Usuários - Restrições específicas)
     14. Listar todos os anúncios concluidos de um usuário específico.  (Apps/Admins/Usuários - Restrições específicas)
     15. Listar todos os anúncios fechados de um usuário específico.    (Apps/Admins)

     16. Exibir os dados de um anúncio específico. (Apps/Admins/Usuários/Público - Restrições específicas.)
    */

    // Início da Verificação dos Parâmetros da Rota.
        // As verificações dos parâmetros desta rota acontecem nas configurações das opções de busca.
    // Fim da verificação dos parâmetros da Rota.

    // Início das restrições básicas de acesso à rota.

        // Apenas aplicações Pet Adote e Usuários das aplicações Pet Adote poderão acessar a listagem de anúncios de adoção dos animais dos usuários.
        // Além disso, usuários só podem visualizar dados de outros usuários ativos e que não pertencem à usuários que estão em sua lista de bloqueios.

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
            const { usuario } = req.dadosAuthToken;

        // Se o usuário da aplicação estiver requisitando qualquer rota além de "getAllActive=1", "getAllFromUser" ou "getOne". Não permita o acesso.

            let allowedQueriesForUsers = [

            ];

            // if (usuario && !( (req.query.getAllActive == 1 & req.query.activeOwner == 1) || req.query.getAllFromAlbum || req.query.getOne)){
            //     return res.status(401).json({
            //         mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
            //         code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            //     });
            // }

    // Fim das restrições básicas de acesso à rota.

    // Início das configurações de possíveis operações de busca.

        let operacao = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).

        let { getOne, getAll, activeOwner, fromUser, orderBy, page, limit } = req.query;

        switch (Object.entries(req.query).length){
            case 0:
                operacao = 'getAll';

                break;
            case 1:
                if (page) { operacao = 'getAll' };

                if (getOne) { operacao = 'getOne'};

                if (getAll == 'open') { operacao = 'getAll_Open' };
                if (getAll == 'completed') { operacao = 'getAll_Completed' };
                if (getAll == 'closed') { operacao = 'getAll_Closed' };

                break;
            case 2:
                if (page && limit) { operacao = 'getAll' };

                if (getAll == 'open' && page) { operacao = 'getAll_Open' };
                if (getAll == 'completed' && page) { operacao = 'getAll_Completed' };
                if (getAll == 'closed' && page) { operacao = 'getAll_Closed' };

                if (getAll == 'open' && activeOwner == '1') { operacao = 'getAll_Open_With_ActiveOwner' };
                if (getAll == 'completed' && activeOwner == '1') { operacao = 'getAll_Completed_With_ActiveOwner' };
                if (getAll == 'closed' && activeOwner == '1') { operacao = 'getAll_Closed_With_ActiveOwner' };

                if (getAll == 'open' && activeOwner == '0') { operacao = 'getAll_Open_With_InactiveOwner' };
                if (getAll == 'completed' && activeOwner == '0') { operacao = 'getAll_Completed_With_InactiveOwner' };
                if (getAll == 'closed' && activeOwner == '0') { operacao = 'getAll_Closed_With_InactiveOwner' };

                if (getAll == 'open' && fromUser) { operacao = 'getAll_Open_FromUser' };
                if (getAll == 'completed' && fromUser) { operacao = 'getAll_Completed_FromUser' };
                if (getAll == 'closed' && fromUser) { operacao = 'getAll_Closed_FromUser' };

                break;
            case 3:
                if (getAll == 'open' && page && limit) { operacao = 'getAll_Open' };
                if (getAll == 'completed' && page && limit) { operacao = 'getAll_Completed' };
                if (getAll == 'closed' && page && limit) { operacao = 'getAll_Closed' };

                if (getAll == 'open' && activeOwner == '1' && orderBy) { operacao = 'getAll_Open_With_ActiveOwner_And_Order' };

                if (getAll == 'open' && activeOwner == '1' && page) { operacao = 'getAll_Open_With_ActiveOwner' };
                if (getAll == 'completed' && activeOwner == '1' && page) { operacao = 'getAll_Completed_With_ActiveOwner' };
                if (getAll == 'closed' && activeOwner == '1' && page) { operacao = 'getAll_Closed_With_ActiveOwner' };

                if (getAll == 'open' && activeOwner == '0' && page) { operacao = 'getAll_Open_With_InactiveOwner' };
                if (getAll == 'completed' && activeOwner == '0' && page) { operacao = 'getAll_Completed_With_InactiveOwner' };
                if (getAll == 'closed' && activeOwner == '0' && page) { operacao = 'getAll_Closed_With_InactiveOwner' };

                if (getAll == 'open' && fromUser && page) { operacao = 'getAll_Open_FromUser' };
                if (getAll == 'completed' && fromUser && page) { operacao = 'getAll_Completed_FromUser' };
                if (getAll == 'closed' && fromUser && page) { operacao = 'getAll_Closed_FromUser' };

                break;
            case 4:

                if (getAll == 'open' && activeOwner == '1' && orderBy && page) { operacao = 'getAll_Open_With_ActiveOwner_And_Order' };

                if (getAll == 'open' && activeOwner == '1' && page && limit) { operacao = 'getAll_Open_With_ActiveOwner' };
                if (getAll == 'completed' && activeOwner == '1' && page && limit) { operacao = 'getAll_Completed_With_ActiveOwner' };
                if (getAll == 'closed' && activeOwner == '1' && page && limit) { operacao = 'getAll_Closed_With_ActiveOwner' };

                if (getAll == 'open' && activeOwner == '0' && page && limit) { operacao = 'getAll_Open_With_InactiveOwner' };
                if (getAll == 'completed' && activeOwner == '0' && page && limit) { operacao = 'getAll_Completed_With_InactiveOwner' };
                if (getAll == 'closed' && activeOwner == '0' && page && limit) { operacao = 'getAll_Closed_With_InactiveOwner' };

                if (getAll == 'open' && fromUser && page && limit) { operacao = 'getAll_Open_FromUser' };
                if (getAll == 'completed' && fromUser && page && limit) { operacao = 'getAll_Completed_FromUser' };
                if (getAll == 'closed' && fromUser && page && limit) { operacao = 'getAll_Closed_FromUser' };

                break;
            case 5:
                if (getAll == 'open' && activeOwner == '1' && orderBy && page && limit) { operacao = 'getAll_Open_With_ActiveOwner_And_Order' };

                break;
            default:
                break;
        }

    // Fim das configurações de possíveis operações de busca.

    // Início da validação dos parâmetros.
        if (getOne){
            if (String(getOne).match(/[^\d]+/g)){     // Se "getOne" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID do Anúncio não parece ser válido.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        if (fromUser){
            if (String(fromUser).match(/[^\d]+/g)){     // Se "getAllFromUser" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID do Usuário deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        if (getAll){

            let allowedStates = [
                'open',
                'completed',
                'closed'
            ]
            
            if (!allowedStates.includes(getAll)){
                return res.status(400).json({
                    mensagem: 'Requisição inválida - (getAll) deve receber um dos seguintes estados [open], [completed], [closed].',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        if (orderBy){

            let allowedFilters = [
                'visualizacoes',
                'avaliacoes'
            ]

            if (!allowedFilters.includes(orderBy)){
                return res.status(400).json({
                    mensagem: 'Requisição inválida - (orderBy) deve receber um dos seguintes valores [visualizacoes], [avaliacoes].',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }

        // Se "page" ou "limit" forem menores que 1, ou for um número real. Entregue BAD_REQUEST.
        if (page){
            if (Number(page) < 1 || page != Number.parseInt(page)) {
                return res.status(400).json({
                    mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                    code: 'BAD_REQUEST'
                });
            }
        }

        if (limit){
            if (Number(limit) < 1 || limit != Number.parseInt(limit)) {
                return res.status(400).json({
                    mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                    code: 'BAD_REQUEST'
                });
            }
        }
    // Fim da validação dos parâmetros.

    // Início da normalização dos parâmetros.

        req.query.page = Number(req.query.page);    // Se o valor para a página do sistema de páginação for recebido como String, torne-o um Number.
        req.query.limit = Number(req.query.limit);  // Se o valor para o limite de entrega de dados do sistema de páginação for recebido como String, torne-o um Number.

        req.query.fromUser = String(req.query.fromUser);
        req.query.getAll = String(req.query.getAll);
        req.query.getOne = String(req.query.getOne);
        req.query.orderBy = String(req.query.orderBy);

    // Fim da normalização dos parâmetros.

    // Início dos processos de listagem dos anúncios de animais dos usuários.

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

            Anuncio.findAndCountAll({
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio foi registrado.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((anuncio) => {
                            anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;
                            
                            anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                            anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                            anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                            anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                            anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                            anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // anuncio.rmv_candidatura = `PATCH ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;

                            anuncios.push(anuncio);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                return res.status(200).json({
                    mensagem: 'Lista de todos os anúncios registrados.',
                    total_anuncios,
                    total_paginas,
                    anuncios,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAll_Open'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Anuncio.findAndCountAll({
                where: {
                    estado_anuncio: 'Aberto'
                },
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio em aberto foi encontrado.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios em aberto.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((anuncio) => {
                            anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                            anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                            anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                            anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                            anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                            anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                            anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;

                            anuncios.push(anuncio);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                return res.status(200).json({
                    mensagem: 'Lista de anúncios que estão em aberto.',
                    total_anuncios,
                    total_paginas,
                    anuncios,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios que estão em aberto.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios que estão em aberto. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAll_Completed'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Anuncio.findAndCountAll({
                where: {
                    estado_anuncio: 'Concluido'
                },
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio concluído foi encontrado.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=completed&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=completed&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios concluídos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((anuncio) => {
                            anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                            anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                            anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                            anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                            anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                            anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                            anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;

                            anuncios.push(anuncio);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                return res.status(200).json({
                    mensagem: 'Lista de anúncios que estão concluídos.',
                    total_anuncios,
                    total_paginas,
                    anuncios,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios que estão concluídos.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios que estão concluídos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAll_Closed'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Anuncio.findAndCountAll({
                where: {
                    estado_anuncio: 'Fechado'
                },
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio fechado foi encontrado.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=closed&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=closed&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios fechados.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((anuncio) => {
                            anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                            anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                            anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                            anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                            anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                            anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                            anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;

                            anuncios.push(anuncio);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                return res.status(200).json({
                    mensagem: 'Lista de anúncios que estão fechados.',
                    total_anuncios,
                    total_paginas,
                    anuncios,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios que estão fechados.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios que estão fechados. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAll_Open_With_ActiveOwner'){

            // Chamada livre para usuários.
            // Listará os anúncios em aberto de usuários ativos.
            // Útil para a listagem geral dos anúncios criados pelos usuários na tela principal das aplicações.

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Aberto',
                    '$Usuario.esta_ativo$': 1
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio em aberto de usuários ativos foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    // Início da verificação da lista de bloqueios e cálculo da quantidade de dados que não serão exibidas.
                        let listaBloqueios = undefined;

                        let qtdAnunciosBloqueados = undefined;

                        if (usuario?.e_admin == 0) { 

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            qtdAnunciosBloqueados = await Anuncio.count({
                                include: [{
                                    model: Usuario
                                }],
                                where: {
                                    estado_anuncio: 'Aberto',
                                    '$Usuario.cod_usuario$': listaBloqueios,
                                    '$Usuario.esta_ativo$': 1
                                }
                            })

                        };

                    // Fim da verificação da lista de bloqueios e cálculo da quantidade de dados que não serão exibidas.

                    let total_anuncios = resultArr.count - (qtdAnunciosBloqueados || 0); // Se "qtdAnunciosBloqueados" estiver como NULL ou UNDEFINED, atribua zero à operação.

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&activeOwner=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&activeOwner=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios em aberto de usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            if (usuario){

                                // Se o requisitante for um usuário...

                                if (!listaBloqueios.includes(anuncio.Usuario.cod_usuario)){
                                    // E o criador do anúncio não estiver na lista de bloqueios do usuário (Bloqueado/Bloqueante)...

                                    // Removendo estruturas que agora são desnecessárias.
                                        delete anuncio.Usuario;
                                    // --------------------------------------------------

                                    anuncios.push(anuncio);
                                }

                            } else {

                                // Se o requisitante for uma aplicação...

                                // Removendo estruturas que agora são desnecessárias.
                                    delete anuncio.Usuario;
                                // --------------------------------------------------

                                anuncios.push(anuncio);
                            }
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios em aberto de usuários ativos.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios em aberto dos usuários ativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios em aberto dos usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_Completed_With_ActiveOwner'){

            // Chamada livre para o usuário.
            // Listará os anúncios concluídos de usuários ativos.
            // Útil para exibição do histórico de anúncios concluídos (Animais anúnciados que efetivamente encontraram um adotante, que foram listados pelo usuário).

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Concluido',
                    '$Usuario.esta_ativo$': 1
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio concluído de usuários ativos foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    // Início da verificação da lista de bloqueios e cálculo da quantidade de dados que não será exibido.
                        let listaBloqueios = undefined;

                        let qtdAnunciosBloqueados = undefined;

                        if (usuario?.e_admin == 0) { 

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            qtdAnunciosBloqueados = await Anuncio.count({
                                include: [{
                                    model: Usuario
                                }],
                                where: {
                                    estado_anuncio: 'Concluido',
                                    '$Usuario.cod_usuario$': listaBloqueios,
                                    '$Usuario.esta_ativo$': 1
                                }
                            })

                        };

                    // Fim da verificação da lista de bloqueios e calculo da quantidade de dados que não será exibido.

                    let total_anuncios = resultArr.count - (qtdAnunciosBloqueados || 0); // Se "qtdAnunciosBloqueados" estiver como NULL ou UNDEFINED, atribua zero à operação.

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=completed&activeOwner=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=completed&activeOwner=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios concluídos de usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            if (usuario){

                                // Se o requisitante for um usuário...

                                if (!listaBloqueios.includes(anuncio.Usuario.cod_usuario)){
                                    // E o criador do anúncio não estiver na lista de bloqueios do usuário (Bloqueado/Bloqueante)...

                                    // Removendo estruturas que agora são desnecessárias.
                                        delete anuncio.Usuario;
                                    // --------------------------------------------------

                                    anuncios.push(anuncio);
                                }

                            } else {

                                // Se o requisitante for uma aplicação...

                                // Removendo estruturas que agora são desnecessárias.
                                    delete anuncio.Usuario;
                                // --------------------------------------------------

                                anuncios.push(anuncio);
                            }
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios concluídos de usuários ativos.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios concluídos dos usuários ativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios concluídos dos usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_Closed_With_ActiveOwner'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Fechado',
                    '$Usuario.esta_ativo$': 1
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio fechado de usuários ativos foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=closed&activeOwner=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=closed&activeOwner=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios fechados de usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            // Removendo estruturas que agora são desnecessárias.
                                delete anuncio.Usuario;
                            // --------------------------------------------------

                            anuncios.push(anuncio);
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios fechados de usuários ativos.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios fechados dos usuários ativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios fechados dos usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_Open_With_InactiveOwner'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Aberto',
                    '$Usuario.esta_ativo$': 0
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio em aberto de usuários inativos foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&activeOwner=0&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&activeOwner=0&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios em aberto de usuários inativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            // Removendo estruturas que agora são desnecessárias.
                                delete anuncio.Usuario;
                            // --------------------------------------------------

                            anuncios.push(anuncio);
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios em aberto de usuários inativos.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios em aberto dos usuários inativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios em aberto dos usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_Completed_With_InactiveOwner'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Concluido',
                    '$Usuario.esta_ativo$': 0
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio concluído de usuários inativos foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    let total_anuncios = resultArr.count - (qtdAnunciosBloqueados || 0); // Se "qtdAnunciosBloqueados" estiver como NULL ou UNDEFINED, atribua zero à operação.

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=completed&activeOwner=0&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=completed&activeOwner=0&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios concluídos de usuários inativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            // Removendo estruturas que agora são desnecessárias.
                                delete anuncio.Usuario;
                            // --------------------------------------------------

                            anuncios.push(anuncio);
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios concluídos de usuários inativos.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios concluídos dos usuários inativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios concluídos dos usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_Closed_With_InactiveOwner'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Fechado',
                    '$Usuario.esta_ativo$': 0
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio fechado de usuários inativos foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=closed&activeOwner=0&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=closed&activeOwner=0&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios fechados de usuários inativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------


                            // Removendo estruturas que agora são desnecessárias.
                                delete anuncio.Usuario;
                            // --------------------------------------------------

                            anuncios.push(anuncio);
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios fechados de usuários inativos.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios fechados dos usuários inativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios fechados dos usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_Open_FromUser'){
            
            // Chamada livre para usuários.
            // Listará os anúncios em aberto de um usuário específico.
            // Útil para visitantes visualizarem a lista de anúncios abertos de um usuário específico.

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Aberto',
                    '$Usuario.cod_usuario$': req.query.fromUser
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio em aberto do usuário foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    // Início da verificação do requisitante e da lista de bloqueios.
                        let listaBloqueios = undefined;

                        // let qtdAnunciosBloqueados = undefined;

                        let dono_recurso = resultArr.rows[0]?.Usuario.cod_usuario;
                        let dono_ativo = resultArr.rows[0]?.Usuario.esta_ativo;

                        if (usuario?.e_admin == 0 && usuario?.cod_usuario != dono_recurso) { 
                            // Se o requisitante não for o dono do recurso ou um administrador...

                            if (dono_ativo == 0){
                                return res.status(401).json({
                                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                });
                            }

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            if(listaBloqueios.includes(dono_recurso)){
                                return res.status(401).json({
                                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                });
                            }

                        };

                    // Fim da verificação do requisitante e da lista de bloqueios.

                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&fromUser=${req.query.fromUser}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&fromUser=${req.query.fromUser}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios em aberto do usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            // Removendo estruturas que agora são desnecessárias.
                                delete anuncio.Usuario;
                            // --------------------------------------------------

                            anuncios.push(anuncio);
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios em aberto do usuário.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios em aberto do usuário.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios em aberto dos usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAll_Completed_FromUser'){

            // Chamada livre para usuários.
            // Listará os anúncios concluídos de um usuário específico.
            // Útil para visitantes visualizarem o histórico de anúncios concluídos de um usuário específico.

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Concluido',
                    '$Usuario.cod_usuario$': req.query.fromUser
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio concluído do usuário foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    // Início da verificação do requisitante e da lista de bloqueios.
                        let listaBloqueios = undefined;

                        // let qtdAnunciosBloqueados = undefined;

                        let dono_recurso = resultArr.rows[0]?.Usuario.cod_usuario;
                        let dono_ativo = resultArr.rows[0]?.Usuario.esta_ativo;

                        if (usuario?.e_admin == 0 && usuario?.cod_usuario != dono_recurso) { 
                            // Se o requisitante não for o dono do recurso ou um administrador...

                            if (dono_ativo == 0){
                                return res.status(401).json({
                                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                });
                            }

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            if(listaBloqueios.includes(dono_recurso)){
                                return res.status(401).json({
                                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                });
                            }

                        };

                    // Fim da verificação do requisitante e da lista de bloqueios.

                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=completed&fromUser=${req.query.fromUser}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=completed&fromUser=${req.query.fromUser}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios concluídos do usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            // Removendo estruturas que agora são desnecessárias.
                                delete anuncio.Usuario;
                            // --------------------------------------------------

                            anuncios.push(anuncio);
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios concluídos do usuário.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios concluídos do usuário.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios concluídos dos usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAll_Closed_FromUser'){

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Fechado',
                    '$Usuario.cod_usuario$': req.query.fromUser
                },
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio fechado do usuário foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    let total_anuncios = resultArr.count;

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=closed&fromUser=${req.query.fromUser}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=closed&fromUser=${req.query.fromUser}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios fechados do usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            // Removendo estruturas que agora são desnecessárias.
                                delete anuncio.Usuario;
                            // --------------------------------------------------

                            anuncios.push(anuncio);
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios fechados do usuário.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios fechados do usuário.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios fechados dos usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAll_Open_With_ActiveOwner_And_Order'){

            // Início da definição da ordenação utilizada.
            let order = undefined;

            switch(req.query.orderBy){
                case 'visualizacoes':
                    order = ['qtd_visualizacoes', 'DESC'];
                    break;
                case 'avaliacoes':
                    order = ['qtd_avaliacoes', 'DESC'];
                    break;
                default:
                    break;
            }

            if (!order) {
                return res.status(400).json({
                    mensagem: 'Requisição inválida - (orderBy) deve receber um dos seguintes valores [visualizacoes], [avaliacoes].',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
            // Fim da definição do filtro utilizado.

            // Chamada livre para usuários.
            // Listará os anúncios em aberto de usuários ativos ordenando pelo filtro específicado acima.
            // Útil para a listagem geral dos anúncios criados pelos usuários na tela principal das aplicações.

            Anuncio.findAndCountAll({
                include: [{
                    model: Usuario
                }],
                where: {
                    estado_anuncio: 'Aberto',
                    '$Usuario.esta_ativo$': 1
                },
                order: [ order ],
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum anúncio em aberto de usuários ativos foi encontrado.'
                    });
                }

                // Início da construção do objeto que será enviado na resposta.

                    // Início da verificação da lista de bloqueios e cálculo da quantidade de dados que não serão exibidas.
                        let listaBloqueios = undefined;

                        let qtdAnunciosBloqueados = undefined;

                        if (usuario?.e_admin == 0) { 

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            qtdAnunciosBloqueados = await Anuncio.count({
                                include: [{
                                    model: Usuario
                                }],
                                where: {
                                    estado_anuncio: 'Aberto',
                                    '$Usuario.cod_usuario$': listaBloqueios,
                                    '$Usuario.esta_ativo$': 1
                                }
                            })

                        };

                    // Fim da verificação da lista de bloqueios e cálculo da quantidade de dados que não serão exibidas.

                    let total_anuncios = resultArr.count - (qtdAnunciosBloqueados || 0); // Se "qtdAnunciosBloqueados" estiver como NULL ou UNDEFINED, atribua zero à operação.

                    let total_paginas = Math.ceil(total_anuncios / paginationLimit);

                    let anuncios = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&activeOwner=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&activeOwner=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de anúncios em aberto de usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos adicionais ao objeto que será enviado na resposta.
                        resultArr.rows.forEach((anuncio) => {

                            // Atributos adicionais.
                                anuncio.detalhes_anuncio = `GET ${req.protocol}://${req.get('host')}/anuncios/?getOne=${anuncio.cod_anuncio}`;

                                anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`;

                                anuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;
                                anuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${anuncio.cod_anuncio}`;

                                anuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;
                                anuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${anuncio.cod_anuncio}`;

                                anuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${anuncio.cod_anuncio}`;
                            // --------------------

                            if (usuario){

                                // Se o requisitante for um usuário...

                                if (!listaBloqueios.includes(anuncio.Usuario.cod_usuario)){
                                    // E o criador do anúncio não estiver na lista de bloqueios do usuário (Bloqueado/Bloqueante)...

                                    // Removendo estruturas que agora são desnecessárias.
                                        delete anuncio.Usuario;
                                    // --------------------------------------------------

                                    anuncios.push(anuncio);
                                }

                            } else {

                                // Se o requisitante for uma aplicação...

                                // Removendo estruturas que agora são desnecessárias.
                                    delete anuncio.Usuario;
                                // --------------------------------------------------

                                anuncios.push(anuncio);
                            }
                            
                        });
                    // Fim da inclusão de atributos adicionais ao objeto que será enviado na resposta.

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de anúncios em aberto de usuários ativos.',
                        total_anuncios,
                        total_paginas,
                        anuncios,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.
                
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os anúncios em aberto dos usuários ativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os anúncios em aberto dos usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

            
        }

        if (operacao == 'getOne'){

            // Chamada livre para usuários.
            // Exibirá os dados de um específico.
            // Útil para exibir a página ou card de um anúncio específico.

            Anuncio.findOne({
                include: [{
                    all: true
                }],
                where: {
                    cod_anuncio: req.query.getOne
                },
                nest: true,
                raw: true
            })
            .then( async (result) => {
                // return res.status(200).json({
                //     result
                // });

                if (!result){
                    return res.status(404).json({
                        mensagem: 'Nenhum anúncio com este ID foi encontrado.',
                        code: 'RESOURCE_NOT_FOUND',
                        lista_anuncios: `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&activeOwner=1`
                    });
                }

                // Início da verificação do requisitante e da lista de bloqueios.
                    let listaBloqueios = undefined;

                    let dono_recurso = result.Usuario?.cod_usuario;
                    let dono_ativo = result.Usuario?.esta_ativo;

                    if (usuario?.e_admin == 0 && usuario?.cod_usuario != dono_recurso) { 
                        // Se o requisitante não for o dono do recurso ou um administrador...

                        if (dono_ativo == 0){
                            return res.status(404).json({
                                mensagem: 'Nenhum anúncio com este ID foi encontrado.',
                                code: 'RESOURCE_NOT_FOUND',
                                lista_anuncios: `${req.protocol}://${req.get('host')}/anuncios/?getAll=open&activeOwner=1`
                            });
                        }

                        listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                        if(listaBloqueios.includes(dono_recurso)){
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                    };

                // Fim da verificação do requisitante e da lista de bloqueios.

                // Início da construção do objeto que será enviado na resposta.

                    let dadosAnimal = result.Animal;
                        delete result.Animal;
                    let dadosFotoAnimal = result.FotoAnimal;
                        delete result.FotoAnimal;
                    let dadosAnunciante = result.Usuario;
                        delete result.Usuario
                    let dadosAnuncio = result;

                    // Atributos adicionais ao anúncio.
                    dadosAnuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${result.uid_foto_animal}`;

                    dadosAnuncio.add_avaliacao = `POST ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${result.cod_anuncio}`;
                    dadosAnuncio.rmv_avaliacao = `DELETE ${req.protocol}://${req.get('host')}/anuncios/avaliacoes/${result.cod_anuncio}`;

                    dadosAnuncio.add_favorito = `POST ${req.protocol}://${req.get('host')}/anuncios/favoritos/${result.cod_anuncio}`;
                    dadosAnuncio.rmv_favorito = `DELETE ${req.protocol}://${req.get('host')}/anuncios/favoritos/${result.cod_anuncio}`;

                    dadosAnuncio.add_candidatura = `POST ${req.protocol}://${req.get('host')}/anuncios/candidaturas/${result.cod_anuncio}`;
                    // --------------------

                    // Atributos adicionais do animal.
                    dadosAnimal.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                    // -------------------------------

                    // Atributos adicionais do anunciante.
                    dadosAnunciante.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosAnunciante.foto_usuario}`;
                    // --------------------------------

                // Fim da construção do objeto que será enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Exibindo os dados do anúncio.',
                        anuncio: dadosAnuncio,
                        animal: dadosAnimal,
                        anunciante: dadosAnunciante
                    });

                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao exibir os dados do anúncio.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao exibir os dados do anúncio. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            })
            
        }

    // Início dos processos de listagem dos anúncios de animais dos usuários.
});

// Exportações.
module.exports = router;