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
        const Candidatura = require('../models/Candidatura');

        const Usuario = require('../models/Usuario');
        const EnderecoUsuario = require('../models/EnderecoUsuario');
        const Bloqueio = require('../models/Bloqueio');

        const Notificacao = require('../models/Notificacao');

        const PontoEncontro = require('../models/PontoEncontro');

        const DocResponsabilidade = require('../models/DocResponsabilidade');

    // Utilidades.
        const { Op } = require('sequelize');

        const fs = require('fs');

        const path = require('path');

        const uuid = require('uuid');       // 'uuid' para criar os nomes únicos dos arquivos.

        const moment = require('moment');   // 'moment' para manipular dados de tempo de forma mais flexível.

        const multer = require('multer');   // 'multer' para receber dados via POST de um formulário com encode 'multipart/form-data' (XMLHttpRequest).

        const sharp = require('sharp');     // 'sharp' para processar imagens.

        const mv = require('mv');           // 'mv' para mover arquivos de forma segura.

        const randomize = require('randomatic');    // 'randomatic' para gerar valores aleatórios.

    // Helpers.
        const checkUserBlockList = require('../../helpers/check_user_BlockList');

        const generate_QRCode = require('../../helpers/generate_QRCode');
        const generate_Template = require('../../helpers/generate_HTMLTemplate');
        const generate_PDF = require('../../helpers/generate_PDF');

// Rotas.

router.get('/', (req, res, next) => {

    /* 02 formas de capturar as notificações.

     01. Listar todas as notificações um usuário. (Admins/Usuário - Dono do recurso).
     02. Listar todas as notificações um usuário com filtros (Lida/Não lida). (Admins/Usuário - Dono do recurso).

    */

    // Início das Restrições de acesso à rota.

        // Apenas usuários das aplicações Pet Adote poderão acessar a listagem de documentos de termos de responsabilidade das candidaturas.
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

    // Fim das Restrições de acesso à rota.

    // Início das configurações de possíveis operações de busca.

        let operacao = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).

        let { fromUser, filterBy, page, limit } = req.query;

        switch (Object.entries(req.query).length){
            case 0:
                // operacao = 'getAny';

                break;
            case 1:
                // if (page) { operacao = 'getAny' };
                if (fromUser) { operacao = 'getAll_fromUser' };

                break;
            case 2:
                if (fromUser && page) { operacao = 'getAll_fromUser' };

                if (fromUser && filterBy) { operacao = 'getAll_filtered_fromUser' };

                break;
            case 3:
                if (fromUser && page && limit) { operacao = 'getAll_fromUser' };

                if (fromUser && filterBy && page) { operacao = 'getAll_filtered_fromUser' };

                break;
            case 4:
                if (fromUser && filterBy && page && limit) { operacao = 'getAll_filtered_fromUser' };

                break;
            default:
                break;
        }

    // Fim das configurações de possíveis operações de busca.

    // Início da validação dos parâmetros.
        if (fromUser){

            if (String(fromUser).match(/[^\d]+/g)){     // Se "fromUser" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de um Usuário deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

            if (usuario?.e_admin == 0 && (usuario?.cod_usuario != fromUser)){
                // Se o requisitante for um usuário comum - Deverá ter acesso apenas as notificações que pertencem a ele.
                return res.status(401).json({
                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }

        }

        if (filterBy){

            let allowedFilters = [
                'read',
                'unread'
            ];

            if (!allowedFilters.includes(filterBy)){
                return res.status(400).json({
                    mensagem: 'Requisição inválida - (filterBy) deve receber um dos seguintes valores [read], [unread].',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }
    // Fim da validação dos parâmetros.

    // Início da normalização dos parâmetros.
        
        req.query.page = Number(req.query.page);    // Se o valor para a página do sistema de páginação for recebido como String, torne-o um Number.
        req.query.limit = Number(req.query.limit);  // Se o valor para o limite de entrega de dados do sistema de páginação for recebido como String, torne-o um Number.

        req.query.fromUser = String(req.query.fromUser);
        req.query.filterBy = String(req.query.filterBy);
        
    // Fim da normalização dos parâmetros.

    // Início dos processos de listagem das notificações.

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

        if (operacao == 'getAll_fromUser'){

            // Chamada para Usuários.
            // Entrega uma lista contendo todas as notificações que o usuário possui.

            Notificacao.findAndCountAll({
                where: {
                    cod_usuario: req.query.fromUser
                },
                order: [['foi_lida', 'ASC'], ['data_criacao', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Este usuário não possui notificações.'
                    });
                }

                // Restrições de uso da chamada - Caso algum resultado tenha sido encontrado.
                    if (usuario?.e_admin == 0 && (usuario?.cod_usuario != resultArr.rows[0].cod_usuario)){
                        // Se o requisitante for um usuário comum - Deverá ter acesso apenas as notificações que pertencem a ele.
                        return res.status(401).json({
                            mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                        });
                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_notificacoes = resultArr.count;

                    let total_paginas = Math.ceil(total_notificacoes / paginationLimit);

                    let notificacoes = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/notificacoes/?fromUser=${req.query.fromUser}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/notificacoes/?fromUser=${req.query.fromUser}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de notificações deste usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((notificacao) => {

                            if (usuario?.e_admin == 0){
                                if (notificacao.foi_lida == 0){
                                    notificacao.update({
                                        foi_lida: 1,
                                        data_modificacao: new Date()
                                    });  // Se a notificação foi exibida para o usuário, então foi lida.
                                }
                            }

                            notificacao = notificacao.get({ plain: true });

                            // Separando os dados do objeto.
                                // ...
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                // ...
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto "dadosCandidatura".
                                // ...
                            // Fim da união dos dados em um objeto "dadosCandidatura"

                            notificacoes.push(notificacao);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de notificações do usuário.`,
                        total_notificacoes,
                        total_paginas,
                        notificacoes,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as notificações do usuário.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar as notificações do usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }
    
        if (operacao == 'getAll_filtered_fromUser'){

            // Chamada para Usuários.
            // Entrega uma lista contendo todas as notificações que o usuário possui filtradas pelo estado de leitura (lida/não lida).

            // Início da definição do filtro.
                let filter = undefined;

                switch(req.query.filterBy){
                    case 'read':
                        filter = 1;
                        break;
                    case 'unread':
                        filter = 0;
                        break;
                    default: 
                        break;
                }

                if (filter === undefined) {
                    return res.status(400).json({
                        mensagem: 'Requisição inválida - (filterBy) deve receber um dos seguintes valores [read], [unread].',
                        code: 'INVALID_REQUEST_QUERY'
                    });
                }
            // Fim da definição do filtro.

            Notificacao.findAndCountAll({
                where: {
                    cod_usuario: req.query.fromUser,
                    foi_lida: filter
                },
                order: [['data_criacao', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: `Este usuário não possui notificações ${ filter == 1 ? 'lidas' : 'não lidas' }.`
                    });
                }

                // Restrições de uso da chamada - Caso algum resultado tenha sido encontrado.
                    if (usuario?.e_admin == 0 && (usuario?.cod_usuario != resultArr.rows[0].cod_usuario)){
                        // Se o requisitante for um usuário comum - Deverá ter acesso apenas as notificações que pertencem a ele.
                        return res.status(401).json({
                            mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                        });
                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_notificacoes = resultArr.count;

                    let total_paginas = Math.ceil(total_notificacoes / paginationLimit);

                    let notificacoes = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/notificacoes/?fromUser=${req.query.fromUser}&filterBy=${req.query.filterBy}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/notificacoes/?fromUser=${req.query.fromUser}&filterBy=${req.query.filterBy}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de notificações deste usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((notificacao) => {

                            if (usuario?.e_admin == 0){
                                if (notificacao.foi_lida == 0){
                                    notificacao.update({
                                        foi_lida: 1,
                                        data_modificacao: new Date()
                                    });  // Se a notificação foi exibida para o usuário, então foi lida.
                                }
                            }

                            notificacao = notificacao.get({ plain: true });

                            // Separando os dados do objeto.
                                // ...
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                // ...
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto "dadosCandidatura".
                                // ...
                            // Fim da união dos dados em um objeto "dadosCandidatura"

                            notificacoes.push(notificacao);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de notificações ${ filter == 1 ? 'lidas' : 'não lidas' } do usuário.`,
                        total_notificacoes,
                        total_paginas,
                        notificacoes,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as notificações do usuário.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar as notificações do usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }
    // Fim dos processos de listagem das notificações.

})

// Exportações.
module.exports = router;