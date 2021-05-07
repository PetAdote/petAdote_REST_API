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

    /* 02 formas de capturar dados dos documentos de termos de responsabilidade das candidaturas.

     01. Listar todos os documentos de termos de responsabilidade de um usuário. (Admins/Usuário - Dono do recurso)
     02. Exibir o documento de termos de responsabilidade do requisitante em uma candidatura ativa. (Usuários - Envolvidos na candidatura)

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

        let { fromUser, fromCandidature, page, limit } = req.query;

        switch (Object.entries(req.query).length){
            case 0:
                // operacao = 'getAny';

                break;
            case 1:
                // if (page) { operacao = 'getAny' };
                
                if (fromUser) { operacao = 'getAll_fromUser' };

                if (fromCandidature) { operacao = 'getOwn_fromCandidature' };

                break;
            case 2:
                if (fromUser && page) { operacao = 'getAll_fromUser' };

                if (fromCandidature && page) { operacao = 'getOwn_fromCandidature' };

                break;
            case 3:
                if (fromUser && page && limit) { operacao = 'getAll_fromUser' };

                if (fromCandidature && page && limit) { operacao = 'getOwn_fromCandidature' };

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

        }

        if (fromCandidature){

            if (String(fromCandidature).match(/[^\d]+/g)){     // Se "fromCandidature" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de uma Candidatura deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }
    // Fim da validação dos parâmetros.

    // Início da normalização dos parâmetros.
        
        req.query.page = Number(req.query.page);    // Se o valor para a página do sistema de páginação for recebido como String, torne-o um Number.
        req.query.limit = Number(req.query.limit);  // Se o valor para o limite de entrega de dados do sistema de páginação for recebido como String, torne-o um Number.

        req.query.fromUser = String(req.query.fromUser);
        req.query.fromCandidature = String(req.query.fromCandidature);
        
    // Fim da normalização dos parâmetros.

    // Início dos processos de listagem dos documentos de candidatura.

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
            // Entrega uma lista contendo dados relacionados ao documento contendo os termos de responsabilidade do usuário.

            DocResponsabilidade.findAndCountAll({
                include: [{
                    model: Candidatura,
                    as: 'Candidatura_DocAnunciante',
                    include: [{
                        model: Anuncio,
                        include: [{
                            model: Animal
                        }]
                    }]
                }, {
                    model: Candidatura,
                    as: 'Candidatura_DocCandidato',
                    include: [{
                        model: Anuncio,
                        include: [{
                            model: Animal
                        }]
                    }]
                }],
                where: {
                    cod_usuario: req.query.fromUser
                },
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Este usuário não possui documentos de termos de responsabilidades.'
                    });
                }

                // Restrições de uso da chamada - Caso algum resultado tenha sido encontrado.
                    if (usuario?.e_admin == 0 && (usuario?.cod_usuario != resultArr.rows[0].cod_usuario)){
                        // Se o requisitante for um usuário comum - Deverá ter acesso apenas a documentos que pertencem a ele.
                        return res.status(401).json({
                            mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                        });
                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_documentos = resultArr.count;

                    let total_paginas = Math.ceil(total_documentos / paginationLimit);

                    let documentos = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/documentos/?fromUser=${req.query.fromUser}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/documentos/?fromUser=${req.query.fromUser}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de documentos de termos de responsabilidades deste usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((documento) => {

                            documento = documento.get({ plain: true });

                            if (!documento.Candidatura_DocAnunciante){ delete documento.Candidatura_DocAnunciante };
                            if (!documento.Candidatura_DocCandidato){ delete documento.Candidatura_DocCandidato };

                            // Separando os dados do objeto.
                                let dadosAnimal = undefined;
                                let dadosAnuncio = undefined;
                                let dadosCandidatura = undefined;
                                let dadosDocumento = undefined;

                                if (documento.Candidatura_DocAnunciante){
                                    dadosAnimal = documento.Candidatura_DocAnunciante.Anuncio.Animal;
                                        delete documento.Candidatura_DocAnunciante.Anuncio.Animal;
                                    dadosAnuncio = documento.Candidatura_DocAnunciante.Anuncio;
                                        delete documento.Candidatura_DocAnunciante.Anuncio;
                                    dadosCandidatura = documento.Candidatura_DocAnunciante;
                                        delete documento.Candidatura_DocAnunciante;
                                    dadosDocumento = documento;
                                }
                                
                                if (documento.Candidatura_DocCandidato){
                                    dadosAnimal = documento.Candidatura_DocCandidato.Anuncio.Animal;
                                        delete documento.Candidatura_DocCandidato.Anuncio.Animal;
                                    dadosAnuncio = documento.Candidatura_DocCandidato.Anuncio;
                                        delete documento.Candidatura_DocCandidato.Anuncio;
                                    dadosCandidatura = documento.Candidatura_DocCandidato;
                                        delete documento.Candidatura_DocCandidato;
                                    dadosDocumento = documento;
                                }
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosDocumento.download_documento = `GET ${req.protocol}://${req.get('host')}/anuncios/candidaturas/documentos/${dadosDocumento.uid_doc}`;

                                dadosAnuncio.download_foto_anuncio = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnuncio.uid_foto_animal}`;

                                dadosAnimal.download_foto_animal = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto "dadosCandidatura".
                                dadosDocumento.candidatura = dadosCandidatura;
                                dadosDocumento.anuncio = dadosAnuncio;
                                dadosDocumento.animal = dadosAnimal;
                            // Fim da união dos dados em um objeto "dadosCandidatura"

                            documentos.push(dadosDocumento);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista dos documentos contendo os Termos de Responsabilidades do usuário.`,
                        total_documentos,
                        total_paginas,
                        documentos,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os dados dos documentos de responsabilidade do usuário.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os dados dos documentos de responsabilidade do usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getOwn_fromCandidature'){

            // Chamada Exclusiva para Usuários.
            // Entrega os dados do documento contendo os Termos de Responsabilidades do usuário, dependendo de qual lado (Anunciante/Candidato) ele pertence em uma candidatura.

            if (!usuario){
                return res.status(401).json({
                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }

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
                }, {
                    model: DocResponsabilidade,
                    as: 'DocAnunciante'
                }, {
                    model: DocResponsabilidade,
                    as: 'DocCandidato'
                }],
                where: {
                    cod_candidatura: req.query.fromCandidature
                }
            })
            .then((result) => {

                if (!result){
                    return res.status(404).json({
                        mensagem: 'A candidatura informada não foi encontrada, não será possível buscar documentos de Termos de Responsabilidades na candidatura.',
                        code: 'RESOURCE_NOT_FOUND'
                    });
                }

                // Início das Restrições de uso da chamada.
                    let requesterType = undefined;

                    let anunciante = result.Anuncio.Usuario;
                    let candidato = result.Usuario;
                    // let animalAnunciado = result.Anuncio.Animal;
                    // let anuncio = result.Anuncio;
                    let docAnunciante = result.DocAnunciante;
                    let docCandidato = result.DocCandidato;

                    if (usuario){
                        // Se o requisitante for um usuário - Só podera receber os dados da candidatura se for o anunciante ou o candidato.
    
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

                // Início da entrega da resposta de sucesso.

                    if (!requesterType){

                        console.error('Algo inesperado aconteceu ao definir o tipo de usuário que receberá o resultado da busca de documentos de Termos de Responsabilidade.');

                        let customErr = new Error('Algo inesperado aconteceu ao definir o tipo de usuário que receberá o resultado da busca de documentos de Termos de Responsabilidade. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR'

                        return next( customErr );
                    }

                    if (requesterType == 'announcer'){

                        if (!docAnunciante){
                            return res.status(200).json({
                                mensagem: 'Nenhum documento de Termos de Responsabilidades vinculado a você foi encontrado.'
                            });
                        }

                        return res.status(200).json({
                            mensagem: 'O documento contendo os seus Termos de Responsabilidades foi encontrado.',
                            download_documento: `GET ${req.protocol}://${req.get('host')}/anuncios/candidaturas/documentos/${docAnunciante.uid_doc}`
                        });

                    }

                    if (requesterType == 'applicant'){

                        if (!docCandidato){
                            return res.status(200).json({
                                mensagem: 'Nenhum documento de Termos de Responsabilidades vinculado a você foi encontrado.'
                            });
                        }

                        return res.status(200).json({
                            mensagem: 'O documento contendo os seus Termos de Responsabilidades foi encontrado.',
                            download_documento: `GET ${req.protocol}://${req.get('host')}/anuncios/candidaturas/documentos/${docCandidato.uid_doc}`
                        });

                    }

                // Fim da entrega da resposta de sucesso.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao buscar os dados da candidatura para realizar a entrega do documento dos Termos de Responsabilidades.', error);

                let customErr = new Error('Algo inesperado aconteceu ao buscar os dados da candidatura para realizar a entrega do documento dos Termos de Responsabilidades. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'

                return next( customErr );
            });

        }

    // Fim dos processos de listagem dos documentos de candidatura.

});

router.get('/:uidDoc', (req, res, next) => {

    // Início das Restrições de acesso à rota.

        // Apenas usuários das aplicações Pet Adote poderão visualizar os documentos de termos de responsabilidade das candidaturas.
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

    // Início da validação dos parâmetros.
        if (req.params.uidDoc){
            if (!String(req.params.uidDoc).match(/^[\d\w-]+\.pdf$/g)){     // Se "uidDoc" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'O UID do documento não aparenta ser válido.',
                    code: 'INVALID_REQUEST_PARAMS'
                });
            }
        }
    // Fim da validação dos parâmetros.

    DocResponsabilidade.findOne({
        where: {
            uid_doc: req.params.uidDoc
        }
    })
    .then((result) => {

        if (!result){
            return res.status(200).json({
                mensagem: 'Nenhum documento de Termos de Responsabilidades com este UID foi encontrado.'
            });
        }

        result = result.get({ plain: true });

        if (usuario?.e_admin == 0){

            if (usuario.cod_usuario != result.cod_usuario){
                return res.status(401).json({
                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }

        }

        const pathToDoc = path.resolve(__dirname, '..', 'docs', 'candidaturas_aprovadas', req.params.uidDoc);
        return res.sendFile(pathToDoc);

    })
    .catch((error) => {
        console.error('Algo inesperado aconteceu ao entregar o documento dos Termos de Responsabilidades ao usuário.', error);

        let customErr = new Error('Algo inesperado aconteceu ao entregar o documento dos Termos de Responsabilidades ao usuário. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR'

        return next( customErr );
    });

});

// Exportações.
module.exports = router;