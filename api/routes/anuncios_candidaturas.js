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

router.get('/', async (req, res, next) => {
    /* 08 Formas de capturar os dados das candidaturas dos usuários.

     01. Listar todas as candidaturas. (Apps/Admins)

     02. Listar todas as candidaturas 'ativas' com estado 'Em avaliacao' de candidatos ativos em um anúncio específico para o anunciante. (Apps/Admins/Usuários)
     03. Listar todas as candidaturas 'ativas' com estado 'approved' de candidatos ativos em um anúncio específico para o anunciante (Cada anúncio poderá ter 1 candidatura approved). (Apps/Admins/Usuários)
     04. Listar todas as candidaturas 'ativas' com estado 'rejected' de candidatos ativos em um anúncio específico para o anunciante (Cada anúncio poderá ter várias candidaturas rejeitadas). (Apps/Admins/Usuários)

     05. Listar todas as candidaturas 'ativas' com estado 'Em avaliacao' de um usuário específico em anúncios 'Em aberto' de anunciantes ativos. (Apps/Admins/Usuários)
     06. Listar todas as candidaturas 'ativas' com estado 'approved' de um usuário específico em anúncios 'Concluido' de anunciantes ativos. (Apps/Admins/Usuários)
     07. Listar todas as candidaturas 'ativas' com estado 'rejected' de um usuário específico em anúncios 'Concluido' de anunciantes ativos. (Apps/Admins/Usuários)

     08. Exibir os dados de uma candidatura específica. (Apps/Admins/Usuários)

    */

    // Início das Restrições de acesso à rota.

        // Apenas aplicações Pet Adote e Usuários das aplicações Pet Adote poderão acessar a listagem de dados sobre candidaturas.
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

        let { getOne, getAll, fromUser, fromAnnouncement, validate, code, page, limit } = req.query;

        switch (Object.entries(req.query).length){
            case 0:
                operacao = 'getAny';

                break;
            case 1:
                if (page) { operacao = 'getAny' };

                if (getOne) { operacao = 'getOne' };

                if (getAll == 'under_evaluation') { operacao = 'getAll' };
                if (getAll == 'approved') { operacao = 'getAll' };
                if (getAll == 'rejected') { operacao = 'getAll' };

                break;
            case 2:
                if (page && limit) { operacao = 'getAny' };

                if (validate && code) { operacao = 'validateCandidature' };

                if (getAll == 'under_evaluation' && page) { operacao = 'getAll' };
                if (getAll == 'approved' && page) { operacao = 'getAll' };
                if (getAll == 'rejected' && page) { operacao = 'getAll' };

                if (getAll == 'under_evaluation' && fromUser) { operacao = 'getAll_fromUser' };
                if (getAll == 'approved' && fromUser) { operacao = 'getAll_fromUser' };
                if (getAll == 'rejected' && fromUser) { operacao = 'getAll_fromUser' };

                if (getAll == 'under_evaluation' && fromAnnouncement) { operacao = 'getAll_fromAnnouncement' };
                if (getAll == 'approved' && fromAnnouncement) { operacao = 'getAll_fromAnnouncement' };
                if (getAll == 'rejected' && fromAnnouncement) { operacao = 'getAll_fromAnnouncement' };

                break;
            case 3:
                if (getAll == 'under_evaluation' && page && limit) { operacao = 'getAll' };
                if (getAll == 'approved' && page && limit) { operacao = 'getAll' };
                if (getAll == 'rejected' && page && limit) { operacao = 'getAll' };

                if (getAll == 'under_evaluation' && fromUser && page) { operacao = 'getAll_fromUser' };
                if (getAll == 'approved' && fromUser && page) { operacao = 'getAll_fromUser' };
                if (getAll == 'rejected' && fromUser && page) { operacao = 'getAll_fromUser' };

                if (getAll == 'under_evaluation' && fromAnnouncement && page) { operacao = 'getAll_fromAnnouncement' };
                if (getAll == 'approved' && fromAnnouncement && page) { operacao = 'getAll_fromAnnouncement' };
                if (getAll == 'rejected' && fromAnnouncement && page) { operacao = 'getAll_fromAnnouncement' };
                break;
            case 4:
                if (getAll == 'under_evaluation' && fromUser && page && limit) { operacao = 'getAll_fromUser' };
                if (getAll == 'approved' && fromUser && page && limit) { operacao = 'getAll_fromUser' };
                if (getAll == 'rejected' && fromUser && page && limit) { operacao = 'getAll_fromUser' };

                if (getAll == 'under_evaluation' && fromAnnouncement && page && limit) { operacao = 'getAll_fromAnnouncement' };
                if (getAll == 'approved' && fromAnnouncement && page && limit) { operacao = 'getAll_fromAnnouncement' };
                if (getAll == 'rejected' && fromAnnouncement && page && limit) { operacao = 'getAll_fromAnnouncement' };
                break;
            default:
                break;
        }

    // Fim das configurações de possíveis operações de busca.

    // Início da validação dos parâmetros.
        if (getOne){
            if (String(getOne).match(/[^\d]+/g)){     // Se "getOne" conter algo diferente do esperado. (cod_candidatura).
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de uma Candidatura deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        if (getAll){

            let allowedStates = [
                'under_evaluation',
                'approved',
                'rejected'
            ]

            if (!allowedStates.includes(getAll)){
                return res.status(400).json({
                    mensagem: 'Requisição inválida - (getAll) deve receber um dos seguintes estados [under_evaluation], [approved], [rejected].',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }

        if (fromUser){

            if (String(fromUser).match(/[^\d]+/g)){     // Se "fromUser" conter algo diferente do esperado. (cod_usuario/cod_candidato).
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de um Candidato deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }

        if (fromAnnouncement){

            if (String(fromAnnouncement).match(/[^\d]+/g)){     // Se "fromAnnouncement" conter algo diferente do esperado. (cod_anuncio).
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de um Anuncio deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }

        if (validate){

            if (String(validate).match(/[^\d]+/g)){     // Se "validate" conter algo diferente do esperado. (cod_candidatura).
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de uma Candidatura deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }

        if (code){

            if (String(code).match(/[^\d]+/g)){     // Se "code" conter algo diferente do esperado. (doc_responsabilidade -> segredo_qrcode).
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O Código de um QR Code deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }

    // Fim da validação dos parâmetros.

    // Início da normalização dos parâmetros.
        
        req.query.page = Number(req.query.page);    // Se o valor para a página do sistema de páginação for recebido como String, torne-o um Number.
        req.query.limit = Number(req.query.limit);  // Se o valor para o limite de entrega de dados do sistema de páginação for recebido como String, torne-o um Number.

        req.query.getOne = String(req.query.getOne);
        req.query.fromUser = String(req.query.fromUser);
        req.query.fromAnnouncement = String(req.query.fromAnnouncement);

        req.query.validate = String(req.query.validate);
        req.query.code = String(req.query.code);

    // Fim da normalização dos parâmetros.

    // Início dos processos de listagem das candidaturas.

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

        if (operacao == 'getAny'){

            // Chamada para Clientes e Admins.
            // Entrega uma lista geral das candidaturas do sistema.

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            Candidatura.findAndCountAll({
                include: [{
                    model: Anuncio,
                    include: [{
                        model: Usuario
                    }]
                }, {
                    model: Usuario
                }],
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhuma candidatura foi registrada.'
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    let total_candidaturas = resultArr.count;

                    let total_paginas = Math.ceil(total_candidaturas / paginationLimit);

                    let candidaturas = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de candidaturas.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((candidatura) => {

                            // Separando os dados do objeto.
                                let dadosAnunciante = candidatura.Anuncio.Usuario;
                                    delete candidatura.Anuncio.Usuario;
                                let dadosCandidato = candidatura.Usuario;
                                    delete candidatura.Usuario;
                                let dadosAnuncio = candidatura.Anuncio;
                                    delete candidatura.Anuncio;
                                let dadosCandidatura = candidatura;
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnuncio.download_foto_anuncio = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnuncio.uid_foto_animal}`;

                                dadosCandidato.download_foto_candidato = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosCandidato.foto_usuario}`;

                                dadosAnunciante.download_foto_anunciante = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosAnunciante.foto_usuario}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto "dadosCandidatura".
                                dadosCandidatura.anuncio = dadosAnuncio;
                                dadosCandidatura.anunciante = dadosAnunciante;
                                dadosCandidatura.candidato = dadosCandidato;
                            // Fim da união dos dados em um objeto "dadosCandidatura"

                            candidaturas.push(dadosCandidatura);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: 'Lista de todas as candidaturas.',
                        total_candidaturas,
                        total_paginas,
                        candidaturas,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar as candidaturas.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar as candidaturas. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            })

        }

        if (operacao == 'getAll'){

            // Chamada para Clientes e Admins.
            // Entrega uma lista de candidaturas em estados específicos registradas no sistema.

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            // Início da definição do tipo de busca.
                let estadoCandidatura = undefined;

                switch (req.query.getAll){
                    case 'under_evaluation':
                        estadoCandidatura = 'Em avaliacao';
                        break;
                    case 'approved':
                        estadoCandidatura = 'Aprovada';
                        break;
                    case 'rejected':
                        estadoCandidatura = 'Rejeitada';
                        break;
                    default:
                        break;
                }
            // Fim da definição do tipo de busca.

            Candidatura.findAndCountAll({
                include: [{
                    model: Anuncio,
                    include: [{
                        model: Usuario
                    }]
                }, {
                    model: Usuario
                }],
                where: {
                    estado_candidatura: estadoCandidatura
                },
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true 
            })
            .then((resultArr) => {

                // console.log(whereStatement);

                // return res.status(200).json({
                //     resultArr
                // });

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: `Nenhuma candidatura sob o estado [ ${estadoCandidatura} ] foi encontrada.`
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    let total_candidaturas = resultArr.count;

                    let total_paginas = Math.ceil(total_candidaturas / paginationLimit);

                    let candidaturas = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?getAll=${req.query.getAll}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?getAll=${req.query.getAll}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: `Você chegou ao final da lista de candidaturas com o estado [ ${ estadoCandidatura } ].`,
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((candidatura) => {

                            // Separando os dados do objeto.
                                let dadosAnunciante = candidatura.Anuncio.Usuario;
                                    delete candidatura.Anuncio.Usuario;
                                let dadosCandidato = candidatura.Usuario;
                                    delete candidatura.Usuario;
                                let dadosAnuncio = candidatura.Anuncio;
                                    delete candidatura.Anuncio;
                                let dadosCandidatura = candidatura;
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnuncio.download_foto_anuncio = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnuncio.uid_foto_animal}`;

                                dadosCandidato.download_foto_candidato = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosCandidato.foto_usuario}`;

                                dadosAnunciante.download_foto_anunciante = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosAnunciante.foto_usuario}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto "dadosCandidatura".
                                dadosCandidatura.anuncio = dadosAnuncio;
                                dadosCandidatura.anunciante = dadosAnunciante;
                                dadosCandidatura.candidato = dadosCandidato;
                            // Fim da união dos dados em um objeto "dadosCandidatura"

                            candidaturas.push(dadosCandidatura);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de todas as candidaturas com o estado [ ${ estadoCandidatura } ].`,
                        total_candidaturas,
                        total_paginas,
                        candidaturas,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error(`Algo inesperado aconteceu ao listar as candidaturas com o estado [ ${estadoCandidatura} ].`, error);

                let customErr = new Error(`Algo inesperado aconteceu ao listar as candidaturas com o estado [ ${estadoCandidatura} ]. Entre em contato com o administrador.`);
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser'){

            // Chamada para Usuários dos Clientes.
            // Entrega a lista de candidaturas ativas (ativo = 1) do usuário em um dos 3 estados ('Em avaliacao', 'Aprovada', 'Rejeitada').

            // Início da definição do tipo de busca.
                let estadoCandidatura = undefined;

                switch (req.query.getAll){
                    case 'under_evaluation':
                        estadoCandidatura = 'Em avaliacao';
                        break;
                    case 'approved':
                        estadoCandidatura = 'Aprovada';
                        break;
                    case 'rejected':
                        estadoCandidatura = 'Rejeitada';
                        break;
                    default:
                        break;
                }
            // Fim da definição do tipo de busca.

            Candidatura.findAndCountAll({
                include: [{
                    model: Anuncio,
                    include: [{
                        model: Usuario
                    }]
                }, {
                    model: Usuario
                }],
                where: {
                    estado_candidatura: estadoCandidatura,
                    ativo: 1,
                    '$Usuario.cod_usuario$': req.query.fromUser
                },
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: `Nenhuma candidatura sob o estado [ ${estadoCandidatura} ] iniciada pelo [ Usuário de ID ${req.query.fromUser} ] foi encontrada.`
                    });
                }

                // Restrições de uso da chamada - Caso algum resultado tenha sido encontrado.
                let candidato = resultArr.rows[0].Usuario;

                if (usuario?.e_admin == 0 && (usuario?.cod_usuario != candidato.cod_usuario)){
                    // Se o requisitante for um usuário comum - Deverá ter acesso apenas a dados de candidaturas que possuem ele mesmo como candidato.
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_candidaturas = resultArr.count;

                    let total_paginas = Math.ceil(total_candidaturas / paginationLimit);

                    let candidaturas = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?getAll=${req.query.getAll}&fromUser=${req.query.fromUser}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?getAll=${req.query.getAll}&fromUser=${req.query.fromUser}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: `Você chegou ao final da lista de candidaturas com o estado [ ${ estadoCandidatura } ] iniciadas pelo [ Usuário de ID ${req.query.fromUser} ].`,
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((candidatura) => {

                            // Separando os dados do objeto.
                                let dadosAnunciante = candidatura.Anuncio.Usuario;
                                    delete candidatura.Anuncio.Usuario;
                                let dadosCandidato = candidatura.Usuario;
                                    delete candidatura.Usuario;
                                let dadosAnuncio = candidatura.Anuncio;
                                    delete candidatura.Anuncio;
                                let dadosCandidatura = candidatura;
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnuncio.download_foto_anuncio = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnuncio.uid_foto_animal}`;

                                dadosCandidato.download_foto_candidato = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosCandidato.foto_usuario}`;

                                dadosAnunciante.download_foto_anunciante = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosAnunciante.foto_usuario}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto "dadosCandidatura".
                                dadosCandidatura.anuncio = dadosAnuncio;
                                dadosCandidatura.anunciante = dadosAnunciante;
                                dadosCandidatura.candidato = dadosCandidato;
                            // Fim da união dos dados em um objeto "dadosCandidatura"

                            candidaturas.push(dadosCandidatura);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de todas as candidaturas com o estado [ ${ estadoCandidatura } ] iniciadas pelo [ Usuário de ID ${req.query.fromUser} ].`,
                        total_candidaturas,
                        total_paginas,
                        candidaturas,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error(`Algo inesperado aconteceu ao listar as candidaturas com o estado [ ${estadoCandidatura} ] iniciada pelo [ Usuário de ID ${req.query.fromUser} ].`, error);

                let customErr = new Error(`Algo inesperado aconteceu ao listar as candidaturas com o estado [ ${estadoCandidatura} ] iniciadas pelo [ Usuário de ID ${req.query.fromUser} ]. Entre em contato com o administrador.`);
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getAll_fromAnnouncement'){

            // Chamada para Usuários dos Clientes.
            // Entrega a lista de candidaturas ativas (ativo = 1) relacionadas ao anúncio. Apenas o anunciante poderá visualizar a lista do anúncio.

            // Início da definição do tipo de busca.
                let estadoCandidatura = undefined;

                switch (req.query.getAll){
                    case 'under_evaluation':
                        estadoCandidatura = 'Em avaliacao';
                        break;
                    case 'approved':
                        estadoCandidatura = 'Aprovada';
                        break;
                    case 'rejected':
                        estadoCandidatura = 'Rejeitada';
                        break;
                    default:
                        break;
                }
            // Fim da definição do tipo de busca.

            Candidatura.findAndCountAll({
                include: [{
                    model: Anuncio,
                    include: [{
                        model: Usuario
                    }]
                }, {
                    model: Usuario
                }],
                where: {
                    estado_candidatura: estadoCandidatura,
                    ativo: 1,
                    '$Anuncio.cod_anuncio$': req.query.fromAnnouncement
                },
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true 
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: `O [ Anúncio de ID ${req.query.fromAnnouncement} ] não possui nenhuma candidatura registrada com o estado [ ${estadoCandidatura} ].`
                    });
                }

                // Restrições de uso da chamada - Caso algum resultado tenha sido encontrado.
                let anunciante = resultArr.rows[0].Anuncio.Usuario;

                if (usuario?.e_admin == 0 && (usuario?.cod_usuario != anunciante.cod_usuario)){
                    // Se o requisitante for um usuário comum - Deverá ter acesso apenas aos dados das candidaturas iniciadas sobre os anúncios que ele mesmo criou.
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_candidaturas = resultArr.count;

                    let total_paginas = Math.ceil(total_candidaturas / paginationLimit);

                    let candidaturas = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?getAll=${req.query.getAll}&fromAnnouncement=${req.query.fromAnnouncement}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?getAll=${req.query.getAll}&fromAnnouncement=${req.query.fromAnnouncement}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: `Você chegou ao final da lista de candidaturas com o estado [ ${ estadoCandidatura } ] para o [ Anúncio de ID ${req.query.fromAnnouncement} ].`,
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((candidatura) => {

                            // Separando os dados do objeto.
                                let dadosAnunciante = candidatura.Anuncio.Usuario;
                                    delete candidatura.Anuncio.Usuario;
                                let dadosCandidato = candidatura.Usuario;
                                    delete candidatura.Usuario;
                                let dadosAnuncio = candidatura.Anuncio;
                                    delete candidatura.Anuncio;
                                let dadosCandidatura = candidatura;
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnuncio.download_foto_anuncio = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnuncio.uid_foto_animal}`;

                                dadosCandidato.download_foto_candidato = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosCandidato.foto_usuario}`;

                                dadosAnunciante.download_foto_anunciante = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosAnunciante.foto_usuario}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto "dadosCandidatura".
                                dadosCandidatura.anuncio = dadosAnuncio;
                                dadosCandidatura.anunciante = dadosAnunciante;
                                dadosCandidatura.candidato = dadosCandidato;
                            // Fim da união dos dados em um objeto "dadosCandidatura"

                            candidaturas.push(dadosCandidatura);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista das candidaturas com o estado [ ${ estadoCandidatura } ] para o [ Anúncio de ID ${req.query.fromAnnouncement} ].`,
                        total_candidaturas,
                        total_paginas,
                        candidaturas,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error(`Algo inesperado aconteceu ao listar as candidaturas com o estado [ ${ estadoCandidatura } ] para o [ Anúncio de ID ${req.query.fromAnnouncement} ].`, error);

                let customErr = new Error(`Algo inesperado aconteceu ao listar as candidaturas com o estado [ ${ estadoCandidatura } ] para o [ Anúncio de ID ${req.query.fromAnnouncement} ]. Entre em contato com o administrador.`);
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

        if (operacao == 'getOne'){

            // Chamada para Usuários dos Clientes - Com restrições específicas.
            // Entrega os detalhes de uma candidatura específica - Os interessados são o Anunciante e o Candidato, portanto eles poderão acessar os dados da candidatura.

            Candidatura.findOne({
                include: [{
                    model: Anuncio,
                    include: [{
                        model: Usuario
                    }, {
                        model: Animal
                    }]
                }, {
                    model: Usuario
                }],
                where: {
                    cod_candidatura: req.query.getOne,
                    ativo: 1
                },
                nest: true,
                raw: true 
            })
            .then((result) => {

                if (!result){
                    return res.status(200).json({
                        mensagem: `Nenhuma candidatura com o ID informado foi encontrada.`
                    });
                }

                // Restrições de uso da chamada - Caso algum resultado tenha sido encontrado.
                let anunciante = result.Anuncio.Usuario;
                let candidato = result.Usuario;

                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário comum - Só podera visualizar os detalhes dessa candidatura se for o anunciante ou o candidato.

                    let allowedRequester = [
                        anunciante.cod_usuario,
                        candidato.cod_usuario
                    ];

                    if (!allowedRequester.includes(usuario.cod_usuario)){
                        return res.status(401).json({
                            mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                        });
                    }
                    
                }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    // Início da inclusão de atributos extra.

                        // Separando os dados do objeto.
                            let dadosAnunciante = result.Anuncio.Usuario;
                                delete result.Anuncio.Usuario;
                            let dadosAnimal = result.Anuncio.Animal;
                                delete result.Anuncio.Animal;
                            let dadosCandidato = result.Usuario;
                                delete result.Usuario;
                            let dadosAnuncio = result.Anuncio;
                                delete result.Anuncio;
                            let dadosCandidatura = result;
                        // Fim da separação dos dados.

                        // Inclusão de atributos essenciais aos clientes.
                            dadosAnuncio.download_foto_anuncio = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnuncio.uid_foto_animal}`;

                            dadosAnimal.download_foto_animal = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;

                            dadosCandidato.download_foto_candidato = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosCandidato.foto_usuario}`;

                            dadosAnunciante.download_foto_anunciante = `GET ${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosAnunciante.foto_usuario}`;
                        // Fim da inclusão de atributos essenciais aos clientes.

                        // Unindo os dados em objeto em um objeto "dadosCandidatura".
                            dadosCandidatura.anuncio = dadosAnuncio;
                            dadosCandidatura.anuncio.animal = dadosAnimal;
                            dadosCandidatura.anunciante = dadosAnunciante;
                            dadosCandidatura.candidato = dadosCandidato;
                        // Fim da união dos dados em um objeto "dadosCandidatura"

                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Dados da candidatura de ID [ ${req.query.getOne} ].`,
                        dadosCandidatura
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao exibir os dados da candidatura.', error);

                let customErr = new Error('Algo inesperado aconteceu ao exibir os dados da candidatura. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });
            
        }

    // Fim dos processos de listagem das candidaturas.

    // Início do processo de conclusão de uma candidatura / adoção.

        if (operacao == 'validateCandidature'){
            // Chamada exclusiva para Usuários.
            // Realizará as verificações necessárias para concluir o processo de adoção de um animal e efetivará a conclusão.
            // Essa chamada será alcançada quando os usuários realizarem a leitura dos QR Codes nos Documentos de Termos de Responsabilidades da Adoção.

            // Capturando o código da candidatura a ser validada e o segredo do QR Code.
            const cod_candidatura = req.query.validate;
            const qrc_secret = req.query.code;
            // Fim da captura do código da candidatura a ser validada e o segredo do QR Code.

            // Início da verificação dos dados da Candidatura.
                let candidatura = undefined;

                try {
                    // Somente candidaturas ativas poderão receber alterações.
                    candidatura = await Candidatura.findOne({
                        include: [{
                            model: Anuncio,
                            include: [{
                                model: Usuario,
                                include: [{
                                    model: EnderecoUsuario
                                }]
                            }, {
                                model: Animal
                            }]
                        }, {
                            model: Usuario,
                            include: [{
                                model: EnderecoUsuario
                            }]
                        }, {
                            model: DocResponsabilidade,
                            as: 'DocAnunciante'
                        }, {
                            model: DocResponsabilidade,
                            as: 'DocCandidato'
                        }, {
                            model: PontoEncontro,
                            required: false,
                            where: {
                                ativo: 1
                            }
                        }],
                        where: {
                            cod_candidatura: cod_candidatura,
                            ativo: 1,   // A candidatura deve estar ativa.
                            estado_candidatura: 'Aprovada',
                            '$Anuncio.estado_anuncio$': 'Aberto',
                            '$Anuncio.Animal.estado_adocao$': 'Em processo adotivo',
                            '$Usuario.esta_ativo$': 1,  // O candidato deve estar ativo.
                            '$Anuncio.Usuario.esta_ativo$': 1   // O anunciante deve estar ativo.
                        }
                    })
                    .then((result) => {
                        if (!result){
                            return null;
                        }
                        return result.get({ plain: true });
                    })
                    .catch((error) => {
                        throw new Error(error);
                    });

                } catch (error) {
                    console.error('Algo inesperado aconteceu ao buscar os dados da candidatura.', error);

                    let customErr = new Error('Algo inesperado aconteceu ao buscar os dados da candidatura. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR'

                    return next( customErr );
                }

                if (!candidatura){
                    return res.status(200).json({
                        mensagem: `Nenhum recurso apto a ser validado foi encontrado com o ID informado.`
                    });
                }
            // Fim da verificação dos dados da Candidatura.

            // Início das Restrições de uso da chamada.
                let requesterType = undefined;

                let anunciante = candidatura.Anuncio.Usuario;
                let candidato = candidatura.Usuario;
                let animalAnunciado = candidatura.Anuncio.Animal;
                let anuncio = candidatura.Anuncio;
                let docAnunciante = candidatura.DocAnunciante;
                let docCandidato = candidatura.DocCandidato;

                if (usuario){
                    // Se o requisitante for um usuário - Só podera manipular os dados da candidatura se for o anunciante ou o candidato.

                    let allowedRequester = [
                        anunciante.cod_usuario,
                        candidato.cod_usuario
                    ];

                    if (!allowedRequester.includes(usuario.cod_usuario)){
                        return res.status(401).json({
                            mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                        });
                    }

                    // "requesterType" definirá se o requisitante é o Anunciante ou o Candidato.
                    if (usuario.cod_usuario == anunciante.cod_usuario){
                        requesterType = 'announcer';
                    }

                    if (usuario.cod_usuario == candidato.cod_usuario){
                        requesterType = 'applicant';
                    }

                }
            // Fim das Restrições de uso da chamada.

            // Início das configurações dos tipos de validação possíveis.

                let validationType = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).

                switch (requesterType){
                    case 'announcer':
                        validationType = 'validateAsAnnouncer';
                        break;
                    case 'applicant':
                        validationType = 'validateAsApplicant';
                        break;
                    default:
                        break;
                }

            // Fim das configurações dos tipos de validação possíveis.

            // Início dos possíveis processos de validação/conclusão da candidatura/adoção.
            if (!validationType){
                console.error('Algo inesperado aconteceu ao definir a operação de validação que será realizada.');

                let customErr = new Error('Algo inesperado aconteceu ao definir a operação de validação que será realizada. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'

                return next( customErr );
            }

            if (validationType == 'validateAsAnnouncer'){

                if (qrc_secret != docCandidato.segredo_qrcode){
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para validar este recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }

                let newAnimal = undefined;  // Receberá os dados da instância do Animal gerado para o Candidato, que agora se tornou tutor do animal.

                try {

                    // Início da atribuição do horário atual à data de modificação dos recursos.
                        const dataAtual = new Date();
                    // Fim da atribuição do horário atual à data de modificação dos recursos.

                    await database.transaction( async (transaction) => {

                        let candidaturaUpdateDataObj = {
                            anunciante_entregou: 1,
                            data_modificacao: dataAtual
                        };

                        if (candidatura.candidato_recebeu == 1){
                            // Se o candidato validou a recepção do animal, então conclua a adoção.

                            await Animal.update({
                                estado_adocao: 'Adotado',
                                data_modificacao: dataAtual
                            }, {
                                where: {
                                    cod_animal: animalAnunciado.cod_animal
                                },
                                limit: 1,
                                transaction
                            });

                            let defaultAnimalPicture = undefined;
                            let possibleDefaultImages = undefined;
                            let rngSelector = Number.parseInt((Math.random() * (1.9 - 0)));  // 0 ou 1.

                            switch(animalAnunciado.especie){
                                case 'Gato':
                                    possibleDefaultImages = [
                                        'default_cat_01.jpeg',
                                        'default_cat_02.jpeg'
                                    ];

                                    defaultAnimalPicture = possibleDefaultImages[rngSelector];
                                    break;
                                case 'Cao':
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

                            newAnimal = await Animal.create({
                                cod_dono: candidato.cod_usuario,
                                cod_dono_antigo: anunciante.cod_usuario,
                                nome: animalAnunciado.nome,
                                foto: defaultAnimalPicture,
                                data_nascimento: animalAnunciado.data_nascimento,
                                especie: animalAnunciado.especie,
                                raca: animalAnunciado.raca,
                                genero: animalAnunciado.genero,
                                porte: animalAnunciado.porte,
                                esta_castrado: animalAnunciado.esta_castrado,
                                esta_vacinado: animalAnunciado.esta_vacinado,
                                possui_rga: animalAnunciado.possui_rga,
                                detalhes_comportamento: animalAnunciado.detalhes_comportamento,
                                detalhes_saude: animalAnunciado.detalhes_saude,
                                historia: animalAnunciado.historia
                            }, {
                                transaction
                            });

                            newAnimal = await newAnimal.get({ plain: true });

                            let albumPrefix = undefined;

                            switch(newAnimal.genero){
                                // case 'M': 
                                //     albumPrefix = 'Álbum do';
                                //     break;
                                // case 'F':
                                //     albumPrefix = 'Álbum da';
                                //     break;
                                default: 
                                    albumPrefix = 'Álbum';
                                    break;
                            }

                            await AlbumAnimal.create({
                                cod_animal: newAnimal.cod_animal,
                                titulo: `${albumPrefix} ${newAnimal.nome}`,
                            }, {
                                transaction
                            });

                            await Anuncio.update({
                                estado_anuncio: 'Concluido',
                                data_modificacao: dataAtual
                            }, {
                                where: {
                                    cod_anuncio: anuncio.cod_anuncio
                                },
                                transaction
                            });

                            candidaturaUpdateDataObj.estado_candidatura = 'Concluida';

                        }

                        await Candidatura.update(candidaturaUpdateDataObj, {
                            where: {
                                cod_candidatura: cod_candidatura
                            },
                            limit: 1,
                            transaction
                        });

                    })
                    .catch((error) => {
                        throw new Error(error);
                    })

                    // Auto-commit.

                } catch (error) {
                    // Rollback.
                    console.error('Algo inesperado aconteceu ao concluir uma adoção.', error);
        
                    let customErr = new Error('Algo inesperado aconteceu ao concluir uma adoção. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';
            
                    return next(customErr);
                }

                if (candidatura.candidato_recebeu == 1){
                    // Entregando a resposta de sucesso caso a candidatura tenha sido concluída.
                        return res.status(200).json({
                            mensagem: 'A candidatura está concluída, o animal foi efetivamente adotado, parabéns!',
                            detalhes_animal_recebido: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${newAnimal.cod_animal}`
                        });
                    // Fim da entrega da resposta de sucesso caso a candidatura tenha sido concluída.
                }

                // Entregando a resposta de sucesso caso o anunciante tenha declarado a entrega do animal, sem que o candidato tenha validado a recepção.
                    return res.status(200).json({
                        mensagem: 'A entrega do animal foi validada, se o candidato do animal validar a recepção, o animal será indexado em seu histórico de animais.',
                        detalhes_animal_anunciado: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${animalAnunciado.cod_animal}`
                    });
                // Fim da entrega da resposta de sucesso caso o anunciante tenha declarado a entrega do animal, sem que o candidato tenha validado a recepção

            }

            if (validationType == 'validateAsApplicant'){

                if (qrc_secret != docAnunciante.segredo_qrcode){
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para validar este recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }

                let newAnimal = undefined;  // Receberá os dados da instância do Animal gerado para o Candidato, que agora se tornou tutor do animal.

                try {

                    // Início da atribuição do horário atual à data de modificação dos recursos.
                        const dataAtual = new Date();
                    // Fim da atribuição do horário atual à data de modificação dos recursos.

                    await database.transaction( async (transaction) => {

                        let candidaturaUpdateDataObj = {
                            candidato_recebeu: 1,
                            data_modificacao: dataAtual
                        };

                        if (candidatura.anunciante_entregou == 1){
                            // Se o anunciante validou a entrega do animal, então conclua a adoção.

                            await Animal.update({
                                estado_adocao: 'Adotado',
                                data_modificacao: dataAtual
                            }, {
                                where: {
                                    cod_animal: animalAnunciado.cod_animal
                                },
                                limit: 1,
                                transaction
                            });

                            let defaultAnimalPicture = undefined;
                            let possibleDefaultImages = undefined;
                            let rngSelector = Number.parseInt((Math.random() * (1.9 - 0)));  // 0 ou 1.

                            switch(animalAnunciado.especie){
                                case 'Gato':
                                    possibleDefaultImages = [
                                        'default_cat_01.jpeg',
                                        'default_cat_02.jpeg'
                                    ];

                                    defaultAnimalPicture = possibleDefaultImages[rngSelector];
                                    break;
                                case 'Cao':
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

                            newAnimal = await Animal.create({
                                cod_dono: candidato.cod_usuario,
                                cod_dono_antigo: anunciante.cod_usuario,
                                nome: animalAnunciado.nome,
                                foto: defaultAnimalPicture,
                                data_nascimento: animalAnunciado.data_nascimento,
                                especie: animalAnunciado.especie,
                                raca: animalAnunciado.raca,
                                genero: animalAnunciado.genero,
                                porte: animalAnunciado.porte,
                                esta_castrado: animalAnunciado.esta_castrado,
                                esta_vacinado: animalAnunciado.esta_vacinado,
                                possui_rga: animalAnunciado.possui_rga,
                                detalhes_comportamento: animalAnunciado.detalhes_comportamento,
                                detalhes_saude: animalAnunciado.detalhes_saude,
                                historia: animalAnunciado.historia
                            }, {
                                transaction
                            });

                            newAnimal = await newAnimal.get({ plain: true });

                            let albumPrefix = undefined;

                            switch(newAnimal.genero){
                                // case 'M': 
                                //     albumPrefix = 'Álbum do';
                                //     break;
                                // case 'F':
                                //     albumPrefix = 'Álbum da';
                                //     break;
                                default: 
                                    albumPrefix = 'Álbum';
                                    break;
                            }

                            await AlbumAnimal.create({
                                cod_animal: newAnimal.cod_animal,
                                titulo: `${albumPrefix} ${newAnimal.nome}`,
                            }, {
                                transaction
                            });

                            await Anuncio.update({
                                estado_anuncio: 'Concluido',
                                data_modificacao: dataAtual
                            }, {
                                where: {
                                    cod_anuncio: anuncio.cod_anuncio
                                },
                                transaction
                            });

                            candidaturaUpdateDataObj.estado_candidatura = 'Concluida';

                        }

                        await Candidatura.update(candidaturaUpdateDataObj, {
                            where: {
                                cod_candidatura: cod_candidatura
                            },
                            limit: 1,
                            transaction
                        });

                    })
                    .catch((error) => {
                        throw new Error(error);
                    })

                    // Auto-commit.

                } catch (error) {
                    // Rollback.
                    console.error('Algo inesperado aconteceu ao concluir uma adoção.', error);
        
                    let customErr = new Error('Algo inesperado aconteceu ao concluir uma adoção. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';
            
                    return next(customErr);
                }

                if (candidatura.anunciante_entregou == 1){
                    // Entregando a resposta de sucesso caso a candidatura tenha sido concluída.
                        return res.status(200).json({
                            mensagem: 'A candidatura está concluída, o animal foi efetivamente adotado, parabéns!',
                            detalhes_animal_recebido: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${newAnimal.cod_animal}`
                        });
                    // Fim da entrega da resposta de sucesso caso a candidatura tenha sido concluída.
                }

                // Entregando a resposta de sucesso caso o candidato tenha declarado a recepção do animal, sem que o anunciante tenha validado a entrega.
                    return res.status(200).json({
                        mensagem: 'A recepção do animal foi validada, se o tutor do animal validar a entrega, você verá o animal em sua lista de animais.',
                        detalhes_animal_anunciado: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${animalAnunciado.cod_animal}`
                    });
                // Fim da entrega da resposta de sucesso caso o candidato tenha declarado a recepção do animal, sem que o anunciante tenha validado a entrega.

            }
            // Fim dos possíveis processos de validação/conclusão da candidatura/adoção.

        }
    // Fim do processo de conclusão de uma candidatura / adoção.

});

router.post('/:codAnuncio', async (req, res, next) => {

    // Início da verificação do parâmetro de rota.
        if (String(req.params.codAnuncio).match(/[^\d]+/g)){

            let candidaturaPostSubrouters = [
                'pontosencontro'
            ];

            if ( candidaturaPostSubrouters.includes(String(req.params.codAnuncio)) ){
                // Se os subrouters que precisarem de parâmetros forem chamados sem parâmetros e cairem aqui, passe a requisição adiante, respondendo (404 - Not Found).
                return next();
            }

            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Anúncio deve conter apenas dígitos.",
                code: 'BAD_REQUEST'
            });
        }
    // Fim da verificação do parâmetro de rota.

    // Início das restrições de acesso à rota.

        // Apenas Usuários das aplicações Pet Adote poderão registrar candidaturas em anúncios.
            if (!req.dadosAuthToken){   

                // Se em algum caso não identificado, a requisição de uma aplicação chegou aqui e não apresentou suas credenciais JWT, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });

            }
        // ----------------------------------------------------------------

        // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
            if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }
        // ----------------------------------------------------------------
        
        // Capturando os dados do usuário, se o requisitante for o usuário de uma aplicação Pet Adote.
            const { usuario } = req.dadosAuthToken;

        // Se o requisitante não for um usuário, não permita o acesso.
            if (!usuario){
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            };
        // ----------------------------------------------------------------

    // Fim das restrições de acesso à rota.

    // Normalizando o parâmetro recebido.
        req.params.codAnuncio = Number(req.params.codAnuncio);
    // Fim da normalização dos parâmetros recebidos.

    // Capturando o código do anúncio que receberá a candidatura.
        const cod_anuncio = req.params.codAnuncio;
    // Fim da captura do código do anúncio que receberá a candidatura.

    // Início da verificação dos dados do Anúncio.
        
        let anuncio = undefined;

        try {

            anuncio = await Anuncio.findOne({
                include: [{
                    model: Animal
                }, {
                    model: FotoAnimal
                }, {
                    model: Usuario
                }],
                where: {
                    cod_anuncio: cod_anuncio,
                    estado_anuncio: 'Aberto',
                    '$Usuario.esta_ativo$': 1
                }
            })
            .then((result) => {
                if (!result){
                    return null;
                }
                return result.get({ plain: true });
            })
            .catch((error) => {
                throw new Error(error);
            });

        } catch (error) {
            console.error('Algo inesperado aconteceu ao buscar os dados do anúncio que receberá a candidatura.', error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do anúncio que receberá a candidatura. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'
    
            return next( customErr );
        }

        if (!anuncio){
            // Se o anúncio não foi encontrado, ele não existe, ou não está aberto, ou o anunciante está inativo.
            return res.status(404).json({
                mensagem: 'O ID informado não pertence a um anúncio apto a receber candidaturas.',
                code: 'RESOURCE_NOT_FOUND'
            });
        }
    // Fim da verificação dos dados do Anúncio.

    // Início das restrições de uso da rota.
        if (usuario?.e_admin == 0 && anuncio.cod_anunciante == usuario?.cod_usuario){
            // Se o requisitante é um usuário comum e é o dono do anúncio, a candidatura não poderá ser realizada...
            return res.status(401).json({
                mensagem: 'O dono do anúncio não pode candidatar-se como adotante no próprio anúncio.',
                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            });
        }
    // Fim das restrições de uso da rota.

    // Início da verificação de conteúdo do pacote de dados da requisição.
        // Como o requisitante deve ser um usuário, a requisição de candidatura não precisa de dados no pacote de dados da requisição.
    // Fim da verificação de conteúdo do pacote de dados da requisição.

    // Início dos processos de criação da candidatura.

        // Início da verificação de existência de uma candidatura do requisitante no anúncio requisitado.
            let candidatura = await Candidatura.findOne({
                where: {
                    cod_anuncio: cod_anuncio,
                    cod_candidato: usuario.cod_usuario
                }
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao verificar se o usuário possui uma candidatura neste anúncio.', error);
        
                let customErr = new Error('Algo inesperado aconteceu ao verificar se o usuário possui uma candidatura neste anúncio. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

            if (candidatura) {

                if (candidatura.estado_candidatura == 'Em avaliacao' && candidatura.ativo == 1){
                    return res.status(409).json({
                        mensagem: 'Não é possível se candidatar mais de uma vez no mesmo anúncio.',
                        code: 'USER_ALREADY_APPLIED_TO_ANNOUNCEMENT'
                    })
                }
    
                if (candidatura.estado_candidatura != 'Em avaliacao'){
                    return res.status(401).json({
                        mensagem: 'Não é possível se candidatar novamente em um anúncio se o anunciante já tomou uma decisão sobre a candidatura.',
                        code: 'USER_ALREADY_REPLIED'
                    })
                }

            }
            
        // Fim da verificação de existência de uma candidatura do requisitante no anúncio requisitado.

        // Início da efetivação do cadastro de uma nova candidatura.

            let dataAtual = new Date();

            let novaCandidatura = undefined;

            try {

                await database.transaction( async (transaction) => {

                    if (!candidatura){
                        // Se nenhuma candidatura prévia foi encontrada...
                        await Candidatura.create({
                            cod_anuncio: cod_anuncio,
                            cod_candidato: usuario.cod_usuario
                        }, {
                            transaction
                        });

                    }

                    if (candidatura?.estado_candidatura == 'Em avaliacao' && candidatura?.ativo == 0){
                        // Se a candidatura estava em avaliação e inativa e o usuário deseja candidatar-se novamente ao anúncio...
                        await Candidatura.update({
                            ativo: 1,
                            data_modificacao: dataAtual
                        }, {
                            where: {
                                cod_anuncio: cod_anuncio,
                                cod_candidato: usuario.cod_usuario
                            },
                            transaction
                        })
                    }

                    // Aumenta a quantidade de candidaturas do anúncio em +1.
                    await Anuncio.increment(['qtd_candidaturas'],{
                        by: 1,
                        where: {
                            cod_anuncio: cod_anuncio
                        },
                        transaction
                    });

                    novaCandidatura = await Candidatura.findOne({
                        where: {
                            cod_anuncio: cod_anuncio,
                            cod_candidato: usuario.cod_usuario
                        },
                        transaction
                    });

                    novaCandidatura = await novaCandidatura.get({ plain: true });

                })
                .catch((error) => {
                    // Se qualquer erro acontecer no bloco acima, cairemos em CATCH do bloco TRY e faremos o rollback;

                    throw new Error(error);
                });

                // Se chegou aqui, o ORM da auto-commit...
                
            } catch (error) {

                // Se um erro ocorreu na transaction, teremos um Rollback.

                console.error('Algo inesperado aconteceu ao registrar uma nova candidatura em um anúncio.', error);

                let customErr = new Error('Algo inesperado aconteceu ao registrar uma nova candidatura em um anúncio. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                return next( customErr );

            }

        // Fim da efetivação do cadastro de uma nova candidatura.

        // Início do envio da resposta de sucesso.
            if (novaCandidatura) {

                // Início da adição de atributos ao objeto que será enviado na resposta.
                    novaCandidatura.detalhes_candidatura = `GET ${req.protocol}://${req.get('host')}/anuncios/candidaturas/?getOne=${novaCandidatura.cod_candidatura}`;
                // Fim da adição de atributos ao objeto que será enviado na resposta.

                return res.status(200).json({
                    mensagem: 'A candidatura foi realizada com sucesso.',
                    candidatura: novaCandidatura
                });
            }
        // Fim do envio da resposta de sucesso.
        
    // Fim dos processos de criação da candidatura.

});

router.patch('/:codCandidatura', async (req, res, next) => {
   
    // Início da verificação do parâmetro de rota.
        if (String(req.params.codCandidatura).match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de uma Candidatura deve conter apenas dígitos.",
                code: 'BAD_REQUEST'
            });
        }
    // Fim da verificação do parâmetro de rota.

    // Início das restrições de acesso à rota.

        // Apenas Usuários das aplicações Pet Adote poderão alterar dados de candidaturas em anúncios.

        // Além disso, restrições específicas serão aplicadas para tratar os dados do ponto de vista de um anúnciante e de um candidato à adotante, pois âmbos devem poder agir sobre a candidatura de maneiras diferentes.

            if (!req.dadosAuthToken){   

                // Se em algum caso não identificado, a requisição de uma aplicação chegou aqui e não apresentou suas credenciais JWT, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });

            }

        // ----------------------------------------------------------------

        // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
            if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }
        // ----------------------------------------------------------------
        
        // Capturando os dados do usuário, se o requisitante for o usuário de uma aplicação Pet Adote.
            const { usuario } = req.dadosAuthToken;

        // Se o requisitante não for um usuário, não permita o acesso.
            if (!usuario){
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            };
        // ----------------------------------------------------------------

    // Fim das restrições de acesso à rota.

    // Normalizando o parâmetro recebido.
        req.params.codCandidatura = Number(req.params.codCandidatura);
    // Fim da normalização dos parâmetros recebidos.

    // Capturando o código da candidatura que receberá a alteração dos dados.
        const cod_candidatura = req.params.codCandidatura;
    // Fim da captura do código do anúncio que receberá a alteração dos dados.

    // Início da verificação dos dados da Candidatura.
        let candidatura = undefined;

        try {
            // Somente candidaturas ativas poderão receber alterações.
            candidatura = await Candidatura.findOne({
                include: [{
                    model: Anuncio,
                    include: [{
                        model: Usuario,
                        include: [{
                            model: EnderecoUsuario
                        }]
                    }, {
                        model: Animal
                    }]
                }, {
                    model: Usuario,
                    include: [{
                        model: EnderecoUsuario
                    }]
                }, {
                    model: DocResponsabilidade,
                    as: 'DocAnunciante'
                }, {
                    model: DocResponsabilidade,
                    as: 'DocCandidato'
                }, {
                    model: PontoEncontro,
                    required: false,
                    where: {
                        ativo: 1
                    }
                }],
                where: {
                    cod_candidatura: cod_candidatura,
                    ativo: 1,   // A candidatura deve estar ativa.
                    '$Anuncio.estado_anuncio$': 'Aberto',   // O anúncio deve estar em Aberto.
                    '$Usuario.esta_ativo$': 1,  // O candidato deve estar ativo.
                    '$Anuncio.Usuario.esta_ativo$': 1   // O anunciante deve estar ativo.
                }
            })
            .then((result) => {
                if (!result){
                    return null;
                }
                return result.get({ plain: true });
            })
            .catch((error) => {
                throw new Error(error);
            });

        } catch (error) {
            console.error('Algo inesperado aconteceu ao buscar os dados da candidatura.', error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados da candidatura. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'

            return next( customErr );
        }

        if (!candidatura){
            return res.status(200).json({
                mensagem: `Nenhuma candidatura apta a receber alterações foi encontrada para o ID informado.`
            });
        }
    // Fim da verificação dos dados da Candidatura.

    // Início das Restrições de uso da chamada.
        let requesterType = undefined;

        let anunciante = candidatura.Anuncio.Usuario;
        let candidato = candidatura.Usuario;
        let animalAnunciado = candidatura.Anuncio.Animal;
        let anuncio = candidatura.Anuncio;

        if (usuario?.e_admin == 0){
            // Se o requisitante for um usuário comum - Só podera manipular os dados da candidatura se for o anunciante ou o candidato.

            let allowedRequester = [
                anunciante.cod_usuario,
                candidato.cod_usuario
            ];

            if (!allowedRequester.includes(usuario.cod_usuario)){
                return res.status(401).json({
                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }

            // "requesterType" definirá se o requisitante é o Anunciante ou o Candidato.
            if (usuario.cod_usuario == anunciante.cod_usuario){
                requesterType = 'announcer';
            }

            if (usuario.cod_usuario == candidato.cod_usuario){
                requesterType = 'applicant';
            }

        }
    // Fim das Restrições de uso da chamada.

    // Início das configurações de possíveis operações de alteração.

        let operacao = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).

        // let { } = req.query;

        switch (Object.entries(req.query).length){
            case 0:
                if (requesterType == 'announcer') { operacao = 'updateAsAnnouncer' };

                if (requesterType == 'applicant') { operacao = 'updateAsApplicant' };

                break;
            // case 1:
            //     if (req.query?.setDefault == 'foto') { operacao = 'setDefault_Foto' };

            //     break;
            default:
                break;
        }

    // Fim das configurações de possíveis operações de alteração.

    // Início da validação das Query Strings.
        // ... Essas estruturas estão aqui caso futuras expansões sejam necessárias nessa área do sistema.
    // Fim da validação das Query Strings.

    // Início dos processos de alteração dos dados da candidatura.

        if (!operacao){
            console.error('Algo inesperado aconteceu ao definir a operação de alteração que será realizada.', error);

            let customErr = new Error('Algo inesperado aconteceu ao definir a operação de alteração que será realizada. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'

            return next( customErr );
        }

        if (operacao == 'updateAsAnnouncer'){

            // Início da verificação inicial do pacote de dados enviado na requisição.

                // Início da verificação de conteúdo do pacote de dados da requisição.
                    if (!req.headers['content-type']){
                        return res.status(400).json({
                            mensagem: 'Dados não foram encontrados na requisição',
                            code: 'INVALID_REQUEST_CONTENT'
                        })
                    }
                // Fim da verificação de conteúdo do pacote de dados da requisição.

                // Início da verificação básica por campos inválidos.

                    let hasUnauthorizedField = false;

                    let emptyFields = [];   // Se campos vazios forem detectados, envie (400 - INVALID_REQUEST_FIELDS)

                    // Lista de campos permitidos.
                        let allowedFields = [
                            'estado_candidatura'
                        ];
                    // Fim da lista de campos permitidos.

                    Object.entries(req.body).forEach((pair) => {
                        // Verifica a existência de campos não autorizados.
                        if (!allowedFields.includes(pair[0])){
                            hasUnauthorizedField = true;
                        };

                        // Verifica a existência de campos com valores vazios.
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
                // Fim da verificação básica por campos inválidos.

            // Fim da verificação inicial do pacote de dados enviado na requisição.

            // Início da normalização dos campos recebidos.
                Object.entries(req.body).forEach((pair) => {

                    req.body[pair[0]] = String(pair[1]).trim();     // Remove espaços excessivos no início e no fim do valor.

                    // let partes = undefined;     // Será útil para tratar partes individuais de um valor.

                    switch(pair[0]){
                        case 'estado_candidatura':
                            // Garantindo que a primeira letra esteja em caixa alta e as outras em caixa baixa.
                            pair[1] = pair[1].toLowerCase();

                            req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                            break;
                        default:
                            break;
                    }

                });
            // Fim da normalização dos campos recebidos.

            // Início da validação dos campos permitidos.
                
                // Validação do "estado_candidatura".
                    if (req.body.estado_candidatura?.length >= 0){

                        let allowedStates = [
                            'Em avaliacao',
                            'Aprovada',
                            'Rejeitada'
                        ];

                        if (!allowedStates.includes(req.body.estado_candidatura)){
                            return res.status(400).json({
                                mensagem: 'O estado declarado para a candidatura é inválido. Um anunciante só pode utilizar diretamente [Em avaliacao], [Aprovada], [Rejeitada].',
                                code: 'INVALID_INPUT_ESTADO_CANDIDATURA'
                            });
                        }

                        // Início da verificação das restrições de alteração para o estado da candidatura.
                        switch(candidatura.estado_candidatura){
                            case 'Em avaliacao':
                                // Se a Candidatura estiver "Em avaliacao", o anunciante pode Aprovar ou Rejeitar.
                                if (req.body.estado_candidatura == 'Em avaliacao'){
                                    return res.status(409).json({
                                        mensagem: 'A candidatura já está sob o estado [ Em avaliacao ], não há necessidade de redefiní-la para o mesmo estado.',
                                        code: 'STATE_ALREADY_IN_USE'
                                    });
                                }
                                break;
                            case 'Aprovada':
                                // Se a Candidatura estiver "Aprovada", o anunciante só pode reconsiderar (Voltar para "Em avaliacao").
                                if (req.body.estado_candidatura == 'Aprovada'){
                                    return res.status(409).json({
                                        mensagem: 'A candidatura já está sob o estado [ Aprovada ], não há necessidade de redefiní-la para o mesmo estado.',
                                        code: 'STATE_ALREADY_IN_USE'
                                    });
                                }

                                if (req.body.estado_candidatura == 'Rejeitada'){
                                    return res.status(409).json({
                                        mensagem: 'A candidatura não pode ser diretamente rejeitada após aprovada, é necessário reconsiderá-la retornando ao estado [ Em avaliacao ] antes.',
                                        code: 'INVALID_CANDIDATURE_STATE'
                                    });
                                }
                                break;
                            case 'Rejeitada':
                                // Se a Candidatura estiver "Rejeitada", o anunciante só pode reconsiderar (Voltar para "Em avaliacao").
                                if (req.body.estado_candidatura == 'Rejeitada'){
                                    return res.status(409).json({
                                        mensagem: 'A candidatura já está sob o estado [ Rejeitada ], não há necessidade de redefiní-la para o mesmo estado.',
                                        code: 'STATE_ALREADY_IN_USE'
                                    });
                                }

                                if (req.body.estado_candidatura == 'Aprovada'){
                                    return res.status(409).json({
                                        mensagem: 'A candidatura não pode ser diretamente aprovada após rejeitada, é necessário reconsiderá-la retornando ao estado [ Em avaliacao ] antes.',
                                        code: 'INVALID_CANDIDATURE_STATE'
                                    });
                                }
                                break
                            case 'Concluida':
                                // Se a Candidatura estiver "Concluida", o anunciante não poderá alterar seus dados.
                                if (req.body.estado_candidatura){
                                    return res.status(409).json({
                                        mensagem: 'A candidatura está [ Concluida ], não é possível alterar seus estados.',
                                        code: 'STATE_ALREADY_IN_USE'
                                    });
                                }
                                break;
                            default: break;
                        }
                        // Fim da verificação das restrições de alteração para o estado da candidatura.

                    }
                // Fim da validação do "estado_candidatura".

            // Fim da validação dos campos permitidos.

            // Início da efetivação das alterações na candidatura por parte do anunciante.

                let candidaturaPosAlteracao = undefined;    // Receberá os dados atualizados.

                try {

                    // Início da atribuição do horário atual à data de modificação dos recursos.
                        const dataAtual = new Date();
                            req.body.data_modificacao = dataAtual;
                    // Fim da atribuição do horário atual à data de modificação dos recursos.

                    await database.transaction( async (transaction) => {

                        if (candidatura.estado_candidatura == 'Rejeitada' && req.body.estado_candidatura == 'Em avaliacao') {
                            // Se a candidatura estava como "Rejeitada" e foi alterada para "Em avaliacao"...

                            // Informa o Candidato que o Anunciante reconsiderou a rejeição da candidatura.
                                await Notificacao.create({
                                    cod_usuario: candidato.cod_usuario,
                                    mensagem: `A candidatura rejeitada para o animal chamado ${animalAnunciado.nome} está sendo reconsiderada pelo anunciante. Entre em contato com o anunciante para saber o motivo.`
                                }, {
                                    transaction
                                });
                            // Fim da notificação de reconsideração da rejeição da candidatura do Candidato.
                        }

                        if (candidatura.estado_candidatura == 'Aprovada' && req.body.estado_candidatura == 'Em avaliacao') {
                            // Se a candidatura estava como "Aprovada" e foi alterada para "Em avaliacao"...

                            await Animal.update({
                                estado_adocao: 'Em anuncio',
                                data_modificacao: dataAtual
                            }, {
                                where: {
                                    cod_animal: animalAnunciado.cod_animal
                                },
                                limit: 1,
                                transaction
                            });

                            // Desativa o "Ponto de Encontro" definido quando a Candidatura foi inicialmente "Aprovada".
                                await PontoEncontro.update({
                                    ativo: 0,
                                    data_modificacao: dataAtual
                                }, {
                                    where: {
                                        cod_candidatura: cod_candidatura,
                                        cod_anunciante: anunciante.cod_usuario,
                                        cod_candidato: candidato.cod_usuario,
                                        ativo: 1
                                    },
                                    transaction
                                });
                            // Fim da desativação do "Ponto de Encontro".

                            // Informa o Candidato que por algum motivo, o Anunciante reconsiderou a aprovação da candidatura.
                                await Notificacao.create({
                                    cod_usuario: candidato.cod_usuario,
                                    mensagem: `A candidatura aprovada para o animal chamado ${animalAnunciado.nome} está sendo reconsiderada pelo anunciante. Entre em contato com o anunciante para saber o motivo.`
                                }, {
                                    transaction
                                });
                            // Fim da notificação de reconsideração da aprovação da candidatura do Candidato.
                        }

                        if (candidatura.estado_candidatura == 'Em avaliacao'){

                            if (req.body.estado_candidatura == 'Rejeitada'){
                                // Se a candidatura estava "Em avaliacao" e foi alterada para "Rejeitada".

                                // Informa o Candidato que o Anunciante rejeitou a candidatura.
                                    await Notificacao.create({
                                        cod_usuario: candidato.cod_usuario,
                                        mensagem: `A sua candidatura de adoção para o animal chamado ${animalAnunciado.nome} foi rejeitada.`
                                    }, {
                                        transaction
                                    });
                                // Fim do envio da notificação para o Candidato sobre a rejeição da candidatura, por parte do Anunciante.
                                
                            }

                            if (req.body.estado_candidatura == 'Aprovada'){
                                // Se a candidatura estava "Em avaliacao" e foi alterada para "Aprovada" daremos início ao processo de adoção do animal.

                                // Início da verificação de um Ponto de Encontro ativo para esta candidatura.
                                    let pontoDeEncontro = undefined;

                                    pontoDeEncontro = await PontoEncontro.findOne({
                                        where: {
                                            cod_candidatura: cod_candidatura,
                                            cod_anunciante: anunciante.cod_usuario,
                                            cod_candidato: candidato.cod_usuario,
                                            ativo: 1
                                        },
                                        transaction
                                    });

                                    if (!pontoDeEncontro){
                                        throw new Error('MEETING_POINT_STILL_UNDEFINED');
                                    }

                                    pontoDeEncontro = await pontoDeEncontro.get({ plain: true });
                                    
                                // Fim da verificação de um Ponto de Encontro ativo para esta candidatura.

                                // Início da atualização do estado do animal para "Em processo adotivo".
                                    await Animal.update({
                                        estado_adocao: 'Em processo adotivo',
                                        data_modificacao: dataAtual
                                    }, {
                                        where: {
                                            cod_animal: animalAnunciado.cod_animal
                                        },
                                        limit: 1,
                                        transaction
                                    });
                                // Fim da atualização do estado do animal para "Em processo adotivo".

                                // Início da notificação para o Candidato de que sua candidatura recebeu a aprovação do Anunciante.
                                    await Notificacao.create({
                                        cod_usuario: candidato.cod_usuario,
                                        mensagem: `A sua candidatura de adoção para o animal chamado ${animalAnunciado.nome} foi aprovada. Verifique as informações da candidatura para obter os Termos de Responsabilidade que guiará seus próximos passos para a conclusão da adoção.`
                                    }, {
                                        transaction
                                    });
                                // Fim da notificação para o Candidato de que sua candidatura recebeu a aprovação do Anunciante.

                                // Início da criação dos Documentos De Responsabilidade dos envolvidos na candidatura.

                                    // Criação do "segredo_qrcode" que será utilizado para garantir que as partes validem a adoção apenas durante a entrega do animal.
                                        const secret_qrcode_anunciante = randomize('0', 5) + moment().unix();
                                        const secret_qrcode_candidato = randomize('0', 5) + moment().unix();
                                    // Fim da criação do "segredo_qrcode".
                                
                                    // Criação dos QR Codes dos envolvidos na candidatura.
                                        const qrcode_anunciante = await generate_QRCode(`${req.protocol}://${req.get('host')}/anuncios/candidaturas/?validate=${candidatura.cod_candidatura}&code=${secret_qrcode_anunciante}`);
                                        const qrcode_candidato = await generate_QRCode(`${req.protocol}://${req.get('host')}/anuncios/candidaturas/?validate=${candidatura.cod_candidatura}&code=${secret_qrcode_candidato}`);
                                    // Fim da criação dos QR Codes dos envolvidos na candidatura.

                                    // Início do Array de objetos contendo os dados que serão renderizados no PDF do Documento de Responsabilidade.
                                    let dataObj = [
                                        {
                                            anunciante: anunciante,
                                            candidato: candidato,
                                            anuncio: anuncio,
                                            animal: animalAnunciado,
                                            foto_animal_anuncio: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${anuncio.uid_foto_animal}`,
                                            ponto_encontro: pontoDeEncontro,
                                            qrcode_validacao: undefined,
                                            tipo_doc: undefined
                                        },
                                        {
                                            styles: { 
                                                css_url: `${req.protocol}://${req.get('host')}/styles.css`,
                                                js_url: `${req.protocol}://${req.get('host')}/styles.js`
                                            }
                                        }
                                    ];
                                    // Fim do Array de objetos contendo os dados que serão renderizados no PDF do Documento de Responsabilidade.

                                    // Declaração do caminho para o Template de Renderização do Documento.
                                        const template_path = path.resolve(__dirname, '../docs/templates', 'DocResponsabilidades.ejs');
                                        let htmlTemplate = undefined;
                                    // Fim da declaração do caminho para o Template de Renderização do Documento.

                                    // Criação do Documento de Responsabilidade do Anunciante.

                                        dataObj[0].qrcode_validacao = qrcode_anunciante;    // Atribuição do QR Code para geração do PDF do Anunciante.
                                        dataObj[0].tipo_doc = 'anunciante';     // Atribuição do tipo de documento que será gerado.

                                        /*
                                            O Anunciante possuirá um QR Code que direciona o usuário à chamada contendo o Código da Candidatura e o Segredo do QR Code do Anunciante.
                                            De forma correta, o Anunciante deverá escanear o Documento do Candidato, que definirá que o Anunciante se encontrou com o Candidato e entregou o animal para ele.
                                            
                                            Quando um usuário autenticado ler o QR Code e ser redirecionado ao end-point, o end-point fará as seguintes verificações...

                                                > Se o Usuário Autenticado for o [ Anunciante do Anúncio  desta Candidatura ]...
                                                    > Verifique se o "segredo_qrcode" da QueryString desta chamada é igual ao "segredo_qrcode" do [ Documento do Candidato ].
                                                        > Isso impossibilita o Anunciante de ler o QR Code do próprio documento e validar a recepção do animal pelo Candidato.

                                                        > Isso força que o Anunciante tenha que se encontrar com o Candidato, entregar de fato o animal para o
                                                          Candidato e escanear o Documento de Responsabilidade do Candidato para efetivar a entrega do animal.
                                                        

                                                > Se o Usuário Autenticado for o [ Candidato ] na Candidatura do Anúncio...
                                                    > Verifique se o "segredo_qrcode" da QueryString desta chamada é igual ao "segredo_qrcode" do [ Documento do Anunciante ].
                                                        > Isso impossibilita o Candidato de ler o QR Code do próprio documento e validar a entrega do animal pelo Anunciante.

                                                        > Isso força que o Candidato tenha que se encontrar com o Anunciante, receber de fato o animal anunciado do
                                                          Anunciante e escanear o Documento de Responsabilidade do Anunciante para efetivar a recepção do animal.  
                                        */

                                        htmlTemplate = await generate_Template(dataObj, template_path)

                                        const anunciante_newPdf_name = `${uuid.v4()}-${moment().unix()}.pdf`;
                                        const anunciante_newPdf_path = path.resolve(__dirname, '../docs/tmp', `${anunciante_newPdf_name}`);
                                        // const anunciante_newPdf_finalPath = path.resolve(__dirname, '../docs/candidaturas_aprovadas', `${anunciante_newPdf_name}`);
                                        await generate_PDF(htmlTemplate, anunciante_newPdf_path);

                                        // Registrando o Documento na (tbl_doc_resp) para o Anunciante.
                                            if (candidatura.cod_doc_anunciante){
                                                // Se a candidatura já possuia um Documento de Responsabilidade vínculado ao Anunciante... Substituá-o.
                                                await DocResponsabilidade.update({
                                                    uid_doc: anunciante_newPdf_name,
                                                    segredo_qrcode: secret_qrcode_anunciante,
                                                    data_modificacao: dataAtual
                                                }, {
                                                    where: {
                                                        cod_doc: candidatura.cod_doc_anunciante,
                                                        tipo_doc: 'anunciante'
                                                    },
                                                    transaction
                                                })
                                                .then((result) => {
                                                    if (result == 0){
                                                        // Se a referência ao documento existe, mas a operação UPDATE não alterou registros, então algo está errado.
                                                        throw new Error('CANT_UPDATE_ANNOUNCER_HAS_INVALID_DOC_REF');
                                                    }
                                                });

                                            } else {
                                                // Se a candidatura não possuia um Documento de Responsabilidade vínculado ao Anunciante...
                                                let anunciante_newDocRef = await DocResponsabilidade.create({
                                                    cod_usuario: anunciante.cod_usuario,
                                                    uid_doc: anunciante_newPdf_name,
                                                    tipo_doc: 'anunciante',
                                                    segredo_qrcode: secret_qrcode_anunciante
                                                }, {
                                                    transaction
                                                });

                                                // Atribuindo a referência (FK) do PDF gerado às operações de alteração.
                                                    req.body.cod_doc_anunciante = anunciante_newDocRef.cod_doc;
                                                // Fim da atribuição da referência (FK) do PDF gerado às operações de alteraçao.

                                            }
                                        // Fim do registro do Documento na (tbl_doc_resp) para o Anunciante.

                                    // Fim da criação do Documento de Responsabilidade do Anunciante.

                                    // Criação do Documento de Responsabilidade do Candidato.
                                        dataObj[0].qrcode_validacao = qrcode_candidato;    // Atribuição do QR Code para geração do PDF do Candidato.
                                        dataObj[0].tipo_doc = 'candidato';     // Atribuição do tipo de documento que será gerado.

                                        htmlTemplate = await generate_Template(dataObj, template_path)

                                        const candidato_newPdf_name = `${uuid.v4()}-${moment().unix()}.pdf`;
                                        const candidato_newPdf_path = path.resolve(__dirname, '../docs/tmp', `${candidato_newPdf_name}`);
                                        // const candidato_newPdf_finalPath = path.resolve(__dirname, '../docs/candidaturas_aprovadas', `${candidato_newPdf_name}`);
                                        await generate_PDF(htmlTemplate, candidato_newPdf_path);

                                        // Registrando o Documento na (tbl_doc_resp) para o Candidato.
                                            if (candidatura.cod_doc_candidato){
                                                // Se a candidatura já possuia um Documento de Responsabilidade vínculado ao Candidato... Substituá-o.
                                                await DocResponsabilidade.update({
                                                    uid_doc: candidato_newPdf_name,
                                                    segredo_qrcode: secret_qrcode_candidato,
                                                    data_modificacao: dataAtual
                                                }, {
                                                    where: {
                                                        cod_doc: candidatura.cod_doc_candidato,
                                                        tipo_doc: 'candidato'
                                                    },
                                                    transaction
                                                })
                                                .then((result) => {
                                                    if (result == 0){
                                                        // Se a referência ao documento existe, mas a operação UPDATE não alterou registros, então algo está errado.
                                                        throw new Error('CANT_UPDATE_APPLICANT_HAS_INVALID_DOC_REF');
                                                    }
                                                });

                                            } else {
                                                // Se a candidatura não possuia um Documento de Responsabilidade vínculado ao Candidato...
                                                let candidato_newDocRef = await DocResponsabilidade.create({
                                                    cod_usuario: candidato.cod_usuario,
                                                    uid_doc: candidato_newPdf_name,
                                                    tipo_doc: 'candidato',
                                                    segredo_qrcode: secret_qrcode_candidato
                                                }, {
                                                    transaction
                                                });

                                                // Atribuindo a referência (FK) do PDF gerado às operações de alteração.
                                                    req.body.cod_doc_candidato = candidato_newDocRef.cod_doc;
                                                // Fim da atribuição da referência (FK) do PDF gerado às operações de alteraçao.

                                            }
                                        // Fim do registro do Documento na (tbl_doc_resp) para o Candidato.

                                    // Fim da criação do Documento de Responsabilidade do Candidato.

                                // Fim da criação dos Documentos De Responsabilidade dos envolvidos na candidatura.

                            }

                        }

                        // Efetivando as alterações nos dados da candidatura.
                            await Candidatura.update( req.body, {
                                where: {
                                    cod_candidatura: cod_candidatura
                                },
                                limit: 1,
                                transaction
                            });
                        // Fim da efetivação das alterações nos dados da candidatura.

                        // Captura dos dados da candidatura após as alterações do Anunciante.
                            candidaturaPosAlteracao = await Candidatura.findOne({
                                include: [{
                                    model: Anuncio,
                                    include: [{
                                        model: Animal
                                    }]
                                }, {
                                    model: DocResponsabilidade,
                                    as: 'DocAnunciante'
                                }, {
                                    model: DocResponsabilidade,
                                    as: 'DocCandidato'
                                }],
                                where: {
                                    cod_candidatura: cod_candidatura
                                },
                                transaction
                            });

                            candidaturaPosAlteracao = await candidaturaPosAlteracao.get({ plain: true });
                        // Fim da captura dos dados após as alterações do Anunciante.

                        // Início da fixação do novo Documento de Responsabilidade no sistema -- Caso a operação alterou o "estado_candidatura" de "Em avaliacao" para "Aprovada".
                            if (candidatura.estado_candidatura == 'Em avaliacao' && req.body.estado_candidatura == 'Aprovada'){

                                // Fixando o documento do Anunciante.
                                    const anunciante_updatedPdf_name = candidaturaPosAlteracao.DocAnunciante.uid_doc;
                                    const anunciante_updatedPdf_path = path.resolve(__dirname, '../docs/tmp', `${anunciante_updatedPdf_name}`);
                                    const anunciante_updatedPdf_finalPath = path.resolve(__dirname, '../docs/candidaturas_aprovadas', `${anunciante_updatedPdf_name}`);

                                    if (fs.existsSync(anunciante_updatedPdf_path)){
                                        mv(anunciante_updatedPdf_path, anunciante_updatedPdf_finalPath, (error) => {
                                            if (error) { throw new Error(error) };  // <-- Crasha o sistema @_@'
                                        });
                                    } else {
                                        throw new Error('Não foi possível encontrar o arquivo de PDF atualizado no diretório temporário.');
                                    }
                                // Fim da fixação do documento do Anunciante.

                                // Fixando o documento do Candidato.
                                    const candidato_updatedPdf_name = candidaturaPosAlteracao.DocCandidato.uid_doc;
                                    const candidato_updatedPdf_path = path.resolve(__dirname, '../docs/tmp', `${candidato_updatedPdf_name}`);
                                    const candidato_updatedPdf_finalPath = path.resolve(__dirname, '../docs/candidaturas_aprovadas', `${candidato_updatedPdf_name}`);

                                    if (fs.existsSync(candidato_updatedPdf_path)){
                                        mv(candidato_updatedPdf_path, candidato_updatedPdf_finalPath, (error) => {
                                            if (error) { throw new Error(error) };
                                        });
                                    } else {
                                        throw new Error('Não foi possível encontrar o arquivo de PDF atualizado no diretório temporário.');
                                    }
                                // Fim da fixação do documento do Candidato.
                                
                            }
                        // Fim da fixação do novo Documento de Responsabilidade no sistema.

                    })
                    .catch((error) => {
                        throw new Error(error);
                    });
                    
                    // Auto-commit.

                } catch (error) {
                    // Rollback.

                    if (error.message.includes('MEETING_POINT_STILL_UNDEFINED')){
                        return res.status(409).json({
                            mensagem: 'Nenhum ponto de encontro foi definido para a entrega do Animal. Não foi possível aprovar a candidatura e iniciar o processo adotivo.',
                            code: 'MEETING_POINT_STILL_UNDEFINED'
                        });
                    }

                    console.error('Algo inesperado aconteceu durante os processos de alteração dos dados da candidatura pelo Anunciante.', error);

                    let customErr = new Error('Algo inesperado aconteceu durante os processos de alteração dos dados da candidatura pelo Anunciante. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR'

                    return next( customErr );

                }

            // Fim da efetivação das alterações na candidatura por parte do anunciante.

            // Verificando se a candidatura possuia Documentos de Responsabilidade vínculados a ela.
            // Essa verificação só deve ocorrer caso a operação alterou o "estado_candidatura" de "Em avaliacao" para "Aprovada", pois a operação gera um novo Documento de Responsabilidade.
                if (candidatura.estado_candidatura == 'Em avaliacao' && req.body.estado_candidatura == 'Aprovada'){

                    if (candidatura.cod_doc_anunciante){
                        const anunciante_oldPdf_name = candidatura.DocAnunciante.uid_doc;
                        const anunciante_oldPdf_path = path.resolve(__dirname, '../docs/candidaturas_aprovadas', `${anunciante_oldPdf_name}`);

                        // Início da remoção do Documento de Responsabilidade antigo do Anunciante.
                            if (fs.existsSync(anunciante_oldPdf_path)){
                                fs.unlinkSync(anunciante_oldPdf_path);
                            }
                        // Fim da remoção do Documento de Responsabilidade antigo do Anunciante.
                    }

                    if (candidatura.cod_doc_candidato){
                        const candidato_oldPdf_name = candidatura.DocCandidato.uid_doc;
                        const candidato_oldPdf_path = path.resolve(__dirname, '../docs/candidaturas_aprovadas', `${candidato_oldPdf_name}`);

                        // Início da remoção do Documento de Responsabilidade antigo do Candidato.
                            if (fs.existsSync(candidato_oldPdf_path)){
                                fs.unlinkSync(candidato_oldPdf_path);
                            }
                        // Fim da remoção do Documento de Responsabilidade antigo do Candidato.
                    }

                }
            // Fim da verificação do antigo documento de responsabilidade da candidatura.

            // Início dos ajustes dos dados que serão exibidos para a chamada do usuário Anunciante.
                delete candidaturaPosAlteracao.DocCandidato;
                if (req.body.estado_candidatura == 'Em avaliacao'){
                    delete candidaturaPosAlteracao.DocAnunciante;
                };
            // Fim dos ajustes dos dados que serão exibidos para a chamada do usuário Anunciante.

            // Início do envio da mensagem de sucesso da operação de alteração.

                return res.status(200).json({
                    mensagem: 'Os dados da candidatura foram atualizados com sucesso.',
                    candidatura: candidaturaPosAlteracao
                });

            // Fim do envio da mensagem de sucesso da operação de alteração.

        }

        if (operacao == 'updateAsApplicant'){

            // Início da verificação inicial do pacote de dados enviado na requisição.

                // Início da verificação de conteúdo do pacote de dados da requisição.
                    if (!req.headers['content-type']){
                        return res.status(400).json({
                            mensagem: 'Dados não foram encontrados na requisição',
                            code: 'INVALID_REQUEST_CONTENT'
                        });
                    }
                // Fim da verificação de conteúdo do pacote de dados da requisição.

                // Início da verificação básica por campos inválidos.

                    let hasUnauthorizedField = false;

                    let emptyFields = [];   // Se campos vazios forem detectados, envie (400 - INVALID_REQUEST_FIELDS)

                    // Lista de campos permitidos.
                        let allowedFields = [
                            'ativo'
                        ];
                    // Fim da lista de campos permitidos.

                    Object.entries(req.body).forEach((pair) => {
                        // Verifica a existência de campos não autorizados.
                        if (!allowedFields.includes(pair[0])){
                            hasUnauthorizedField = true;
                        };

                        // Verifica a existência de campos com valores vazios.
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
                // Fim da verificação básica por campos inválidos.

            // Fim da verificação inicial do pacote de dados enviado na requisição.

            // Início da normalização dos campos recebidos.
                Object.entries(req.body).forEach((pair) => {

                    req.body[pair[0]] = String(pair[1]).trim();     // Remove espaços excessivos no início e no fim do valor.

                    // let partes = undefined;     // Será útil para tratar partes individuais de um valor.

                    // switch(pair[0]){
                    //     case 'estado_candidatura':
                    //         // Garantindo que a primeira letra esteja em caixa alta e as outras em caixa baixa.
                    //         pair[1] = pair[1].toLowerCase();

                    //         req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                    //         break;
                    //     default:
                    //         break;
                    // }

                });
            // Fim da normalização dos campos recebidos.

            // Início da validação dos campos permitidos.
                
                // Validação do campo "ativo".
                    if (req.body.ativo?.length >= 0){

                        let allowedStates = [
                            '0'
                        ];

                        if (!allowedStates.includes(req.body.ativo)){
                            return res.status(400).json({
                                mensagem: 'O valor declarado para o estado de ativação da candidatura é inválido. Um candidato só pode inativar a candidatura.',
                                code: 'INVALID_INPUT_ATIVO'
                            });
                        }

                    }
                // Fim da validação do campo "ativo".

            // Fim da validação dos campos permitidos.

            // Início da efetivação das alterações na candidatura por parte do Candidato.

                let candidaturaPosAlteracao = undefined;    // Receberá os dados atualizados.

                try {

                    // Início da atribuição do horário atual à data de modificação dos recursos.
                        const dataAtual = new Date();
                            req.body.data_modificacao = dataAtual;
                    // Fim da atribuição do horário atual à data de modificação dos recursos.

                    await database.transaction( async (transaction) => {

                        if (candidatura.estado_candidatura == 'Aprovada' && req.body.ativo == '0'){
                            // Se a Candidatura estava como Aprovada e o Candidato está inativando a Candidatura.

                            // Retornando a candidatura para o estado de avaliação.
                                req.body.estado_candidatura = 'Em avaliacao';
                            // Fim da declaração de retorno da candidatura ao estado de avaliação.

                            // Removendo uma candidatura da "qtd_candidaturas" do anúncio.
                                await Anuncio.findOne({
                                    where: {
                                        cod_anuncio: candidatura.Anuncio.cod_anuncio
                                    },
                                    transaction
                                })
                                .then((result) => {
                                    result.decrement(['qtd_candidaturas'], {
                                        by: 1,
                                        transaction
                                    })
                                    .catch((error) => {
                                        throw new Error(error);
                                    })
                                })
                                .catch((error) => {
                                    throw new Error(error);
                                });
                            // Fim do decremento na "qtd_candidaturas" do anúncio;

                            // Retorna o Animal para o estado "Em anuncio" -- Se a candidatura está como "Aprovada", o Animal estaria em "Em processo adotivo".
                                await Animal.update({
                                    estado_adocao: 'Em anuncio',
                                    data_modificacao: dataAtual
                                }, {
                                    where: {
                                        cod_animal: animalAnunciado.cod_animal
                                    },
                                    limit: 1,
                                    transaction
                                });
                            // Fim do Retorno do Animal para o estado "Em anuncio".

                            // Desativa o "Ponto de Encontro" definido pelo Anunciante quando a Candidatura foi inicialmente "Aprovada".
                                await PontoEncontro.update({
                                    ativo: 0,
                                    data_modificacao: dataAtual
                                }, {
                                    where: {
                                        cod_candidatura: cod_candidatura,
                                        cod_anunciante: anunciante.cod_usuario,
                                        cod_candidato: candidato.cod_usuario,
                                        ativo: 1
                                    },
                                    transaction
                                });
                            // Fim da desativação do "Ponto de Encontro".

                            // Informa o Anunciante que por algum motivo, o Candidato inativou a Candidatura.
                                await Notificacao.create({
                                    cod_usuario: anunciante.cod_usuario,
                                    mensagem: `A candidatura que você aprovou para o animal chamado ${animalAnunciado.nome} foi cancelada pelo candidato. Entre em contato com o candidato para saber o motivo.`
                                }, {
                                    transaction
                                });
                            // Fim da notificação de inativação da candidatura por parte do Candidato.

                        }

                        // Efetivando as alterações nos dados da candidatura.
                            await Candidatura.update( req.body, {
                                where: {
                                    cod_candidatura: cod_candidatura
                                },
                                limit: 1,
                                transaction
                            });
                        // Fim da efetivação das alterações nos dados da candidatura.

                        // Captura dos dados da candidatura após as alterações do Candidato.
                            candidaturaPosAlteracao = await Candidatura.findOne({
                                where: {
                                    cod_candidatura: cod_candidatura
                                },
                                transaction
                            });

                            candidaturaPosAlteracao = await candidaturaPosAlteracao.get({ plain: true });
                        // Fim da captura dos dados após as alterações do Candidato.

                    })
                    .catch((error) => {
                        throw new Error(error);
                    });

                    // Auto-commit.

                } catch (error) {
                    // Rollback.

                    console.error('Algo inesperado aconteceu durante os processos de alteração dos dados da candidatura pelo Candidato.', error);

                    let customErr = new Error('Algo inesperado aconteceu durante os processos de alteração dos dados da candidatura pelo Candidato. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR'

                    return next( customErr );

                }

            // Fim da efetivação das alterações na candidatura por parte do Candidato.

            // Início dos ajustes dos dados que serão exibidos para a chamada do usuário Anunciante.
                // Nesse caso não precisamos ajustar os dados...
            // Fim dos ajustes dos dados que serão exibidos para a chamada do usuário Anunciante.

            // Início do envio da mensagem de sucesso da operação de alteração.

                return res.status(200).json({
                    mensagem: 'Os dados da candidatura foram atualizados com sucesso.',
                    candidatura: candidaturaPosAlteracao
                });

            // Fim do envio da mensagem de sucesso da operação de alteração.
            
        }

    // Fim dos processos de alteração dos dados da candidatura.

});

// Exportações.
module.exports = router;