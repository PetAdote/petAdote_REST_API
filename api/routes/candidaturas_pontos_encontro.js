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

        const axios = require('axios').default;         // 'axios' cliente http para realizar requisições à APIs externas.

    // Helpers.
        const checkUserBlockList = require('../../helpers/check_user_BlockList');

        const generate_QRCode = require('../../helpers/generate_QRCode');
        const generate_Template = require('../../helpers/generate_HTMLTemplate');
        const generate_PDF = require('../../helpers/generate_PDF');

// Rotas.

router.get('/', (req, res, next) => {

    /* 01 forma de listar os pontos de encontro registrados para a aprovação de uma candidatura.
     
     01. Lista os dados dos Pontos de Encontro que foram registrados para uma candidatura específica. (Admins/Usuários - Envolvidos na Candidatura).
     //  . Lista os Pontos de Encontro que foram registrados para uma candidatura específica. (Admins).
     //  . Exibe os dados do Ponto de Encontro Ativo mais recente de uma candidatura específica. (Admins/Usuários - Envolvidos na candidatura.)
     
     */

    // Início das Restrições de acesso à rota.

        // Apenas usuários das aplicações Pet Adote poderão acessar a listagem de Pontos de Encontro das candidaturas.
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

        let { fromCandidature, page, limit } = req.query;

        switch (Object.entries(req.query).length){
            case 0:
                // operacao = 'getAny';

                break;
            case 1:
                // if (page) { operacao = 'getAny' };
                
                // if (fromUser) { operacao = 'getAll_fromUser' };

                if (fromCandidature) { operacao = 'getAll_fromCandidature' };

                break;
            case 2:
                // if (fromUser && page) { operacao = 'getAll_fromUser' };

                if (fromCandidature && page) { operacao = 'getAll_fromCandidature' };

                break;
            case 3:
                // if (fromUser && page && limit) { operacao = 'getAll_fromUser' };

                if (fromCandidature && page && limit) { operacao = 'getAll_fromCandidature' };

                break;
            default:
                break;
        }

    // Fim das configurações de possíveis operações de busca.

    // Início da validação dos parâmetros.
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

        // req.query.fromUser = String(req.query.fromUser);
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

        if (operacao == 'getAll_fromCandidature'){

            // Chamada para usuários.
            // Entrega uma lista dos Pontos de Encontro registrados pelo Anunciante ao Aprovar a candidatura.
            // Se o requisitante for um usuário comum entregará apenas os dados do Ponto de Encontro ativo mais recente, se existir.

            PontoEncontro.findAndCountAll({
                where: {
                    cod_candidatura: req.query.fromCandidature
                },
                order: [['ativo', 'DESC'], ['data_criacao', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum Ponto de Encontro foi definido para a candidatura.'
                    });
                }

                // Início das Restrições de uso da chamada.
                    let codAnunciante = resultArr.rows[0].cod_anunciante;
                    let codCandidato = resultArr.rows[0].cod_candidato;

                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum - Só podera receber os dados da candidatura se for o anunciante ou o candidato.

                        let allowedRequester = [
                            codAnunciante,
                            codCandidato
                        ];

                        if (!allowedRequester.includes(usuario.cod_usuario)){
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                    }
                // Fim das Restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_pontos_encontro = resultArr.count;

                    let total_paginas = Math.ceil(total_pontos_encontro / paginationLimit);

                    let pontos_encontro = [];
                    let ponto_encontro_atual = undefined;

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/pontosencontro/?fromCandidature=${req.query.fromCandidature}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/anuncios/candidaturas/pontosencontro/?fromCandidature=${req.query.fromCandidature}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de Pontos de Encontro dessa candidatura.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((pontoEncontro, index) => {

                            pontoEncontro = pontoEncontro.get({ plain: true });

                            if (index == 0 && pontoEncontro.ativo == 1){
                                ponto_encontro_atual = pontoEncontro;
                            }

                            // Separando os dados do objeto.
                                // ...
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                // ...
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto "dadosCandidatura".
                                // ...
                            // Fim da união dos dados em um objeto "dadosCandidatura"

                            pontos_encontro.push(pontoEncontro);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    if (usuario?.e_admin == 0){
                        if (!ponto_encontro_atual){
                            return res.status(404).json({
                                mensagem: `A conclusão da candidatura ainda não possui nenhum Ponto de Encontro definido.`,
                                code: 'PONTO_ENCONTRO_NOT_FOUND'
                            });
                        } 

                        return res.status(200).json({
                            mensagem: `O Ponto de Encontro definido para a conclusão da candidatura foi encontrado.`,
                            ponto_encontro: ponto_encontro_atual
                        });
                        
                    }

                    // Retorno para o Admin ou Cliente Pet Adote...
                    return res.status(200).json({
                        mensagem: `Lista dos Pontos de Encontro definidos pelo Anunciante para a candidatura.`,
                        total_pontos_encontro,
                        total_paginas,
                        pontos_encontro,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.


            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao exibir os dados dos Pontos de Encontro de uma candidatura.', error);

                let customErr = new Error('Algo inesperado aconteceu ao exibir os dados dos Pontos de Encontro de uma candidatura. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

    // Fim dos processos de listagem dos documentos de candidatura.

});

router.post('/:codCandidatura', async (req, res, next) => {

    // Chamada exclusiva para o usuários.
    // Permite que o usuário registre um novo Ponto de Encontro para a candidatura, permitindo a aprovação da candidatura.

    // Início da verificação do parâmetro de rota.
        if (String(req.params.codCandidatura).match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de uma Candidatura deve conter apenas dígitos.",
                code: 'BAD_REQUEST'
            });
        }
    // Fim da verificação do parâmetro de rota.

    // Início das restrições de acesso à rota.

        // Apenas Usuários das aplicações Pet Adote poderão registrar novos Pontos de Encontro para candidaturas.
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

    // Capturando o código do anúncio que receberá a candidatura.
        const cod_candidatura = req.params.codCandidatura;
    // Fim da captura do código do anúncio que receberá a candidatura.

    // Início da verificação dos dados da Candidatura.
        
        let candidatura = undefined;

        try {
            // A candidatura deve estar sob as seguintes condições para receber um novo Ponto de Encontro.
            candidatura = await Candidatura.findOne({
                include: [{
                    model: Anuncio,
                    include: [{
                        model: Usuario
                    }]
                }],
                where: {
                    cod_candidatura: cod_candidatura,
                    estado_candidatura: 'Em avaliacao',     // Candidatura "Em avaliacao";
                    '$Anuncio.estado_anuncio$': 'Aberto',   // Anuncio em "Aberto";
                    '$Anuncio.Usuario.esta_ativo$': 1       // Anunciante "ativo";
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
            console.error('Algo inesperado aconteceu ao buscar os dados da candidatura que receberá o novo ponto de encontro.', error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados da candidatura que receberá o novo ponto de encontro. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'

            return next( customErr );
        }

        if (!candidatura){
            // Se a candidatura não foi encontrada, ela não existe, ou não está sob as condições especificadas.
            return res.status(404).json({
                mensagem: 'O ID informado não pertence a uma candidatura apta a receber novos Pontos de Encontro.',
                code: 'RESOURCE_NOT_FOUND'
            });
        }
    // Fim da verificação dos dados da Candidatura.

    // Início das restrições de uso da rota.
        if (usuario?.cod_usuario != candidatura.Anuncio.cod_anunciante){
            // Se o usuário não for dono do anúncio que recebeu a candidatura, não permita a adição do Ponto de Encontro (Só o anunciante pode aprovar a Candidatura, então só ele poderá adicionar o Ponto de Encontro).
            return res.status(401).json({
                mensagem: 'Você não possui o nível de acesso adequado para esse recurso. Apenas o anunciante que recebeu a candidatura pode adicionar um Ponto de Encontro para esta candidatura.',
                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            });
        }
    // Fim das restrições de uso da rota.

    // Início da verificação de conteúdo do pacote de dados da requisição.
        if (!req.headers['content-type']){
            return res.status(400).json({
                mensagem: 'Dados não foram encontrados na requisição',
                code: 'INVALID_REQUEST_CONTENT'
            });
        }
    // Fim da verificação de conteúdo do pacote de dados da requisição.

    // Início dos processos de criação do Ponto de Encontro para a Candidatura.

        // Início das restrições de envio de campos.

            let hasUnauthorizedField = false;
            let emptyFields = [];   // Se campos vazios forem detectados, envie (400 - INVALID_REQUEST_FIELDS)
            let missingFields = []; // Receberá os campos obrigatórios que faltaram na requisição.

            // Lista de campos permitidos.

                let allowedFields = [
                    'cep',
                    'logradouro',
                    'bairro',
                    'cidade',
                    'uf',
                    'numero',
                    'complemento'
                ];

            // Fim da lista de campos permitidos.

            // Lista de campos obrigatórios.

                let requiredFields = [
                    'cep',
                    'logradouro',
                    'bairro',
                    'cidade',
                    'uf',
                    'numero'
                ];

            // Fim da lista de campos obrigatórios.

            // Início da verificação de campos.

                // Verificação dos campos não permitidos.
                Object.entries(req.body).forEach((pair) => {
                    if (!allowedFields.includes(pair[0])){
                        hasUnauthorizedField = true;
                    }

                    if (String(pair[1]).length == 0){
                        emptyFields.push(String(pair[0]));
                    }
                });

                // Verificação da existência dos campos obrigatórios.
                requiredFields.forEach((field) => {
                    if (!Object.keys(req.body).includes(field)){
                        missingFields.push(`Campo [${field}] não encontrado.`);
                    }
                })

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

                if (missingFields.length > 0){
            
                    return res.status(400).json({
                        mensagem: 'Campos obrigatórios estão faltando.',
                        code: 'INVALID_REQUEST_FIELDS',
                        missing_fields: missingFields
                    });
                }

            // Fim da verificação de campos.

        // Fim das restrições de envio de campos.

        // Início da Normalização dos campos recebidos.

            Object.entries(req.body).forEach((pair) => {

                req.body[pair[0]] = String(pair[1]).trim();     // Remove espaços excessivos no início e no fim do valor.

                let partes = undefined;     // Será útil para tratar partes individuais de um valor.

                switch(pair[0]){
                    case 'uf':
                        req.body[pair[0]] = String(pair[1]).toUpperCase();
                        break;
                    case 'numero': break;
                    case 'complemento':
                        // Deixa a primeira letra da string como maiúscula.
                        req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                        break;
                    default:
                        partes = pair[1].trim().split(' ');     // Caso ainda existirem, removerá os espaços excessívos do Início/Fim em substrings.
    
                        partes.forEach((parte, index) => {      // Como todo campo restante nessa rota trata de nomes, todo primeiro caractere das substrings ficarão em caixa alta.
                            if (parte){
                                partes[index] = parte[0].toUpperCase() + parte.substr(1);
                            }
                        })

                        req.body[pair[0]] = partes.join(' ');  // Como separamos os valores passados em substrings para o tratamento, vamos unir as partes novamente, separando-as por espaço ' ' ao atribuí-las ao campo.
                        break;
                }

            });

        // Fim da Normalização dos campos recebidos.

        // Início da Validação dos Campos

            // Coleta dos dados a respeito do CEP definido para o Ponto de Encontro na api "ViaCEP".
                let urlVerificacaoViaCep = `http://viacep.com.br/ws/${req.body.cep}/json/`;

                let infoEndereco = await axios.get(urlVerificacaoViaCep)
                .then((result) => {
                    return result.data;
                })
                .catch((error) => {

                    console.error('Algo inesperado aconteceu na API VIA CEP ao definir o Ponto de Encontro para uma Candidatura...');
                    if (error.response) { console.error('responseError:', error.response); }
                    else if (error.request) { console.error('requestError:', error.request); }
                    else { console.error('unexpectedError:', error); }
                    console.error('errorConfig', error.message);

                    return {
                        api_error: {
                            errCode: error.code,
                            errMessage: error.message
                        }
                    }
                });

                if (infoEndereco.erro){
                    return res.status(404).json({
                        mensagem: 'O [ CEP ] informado parece não existir.',
                        code: 'CEP_NOT_FOUND'
                    })
                }
        
                if (infoEndereco.api_error){
                    console.error('Algo inesperado aconteceu ao buscar informações sobre o CEP.', infoCEP.api_error);
        
                    if (!infoEndereco.api_error.errCode == 'ETIMEDOUT'){
                        console.error('A API do ViaCEP caiu às ' + new Date().toLocaleString() + '.');
            
                        let customErr = new Error('Não é possível adicionar um novo Ponto de Encontro à candidatura no momento, tente novamente mais tarde.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_API_ERROR';
            
                        return next( customErr );
                    }
        
                    let customErr = new Error('Algo inesperado aconteceu ao buscar informações sobre o CEP.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';
        
                    return next( customErr );
                }
            // Fim da coleta de dados sobre o Endereço na "ViaCEP".

            // Validação simples do CEP
                if (req.body.cep){
                    if (!String(req.body.cep).match(/^\d{5}(?:\-?)\d{3}$/)){
                        return res.status(400).json({
                            mensagem: 'O campo [ CEP ] está em um formato inválido',
                            code: 'INVALID_INPUT_CEP',
                            exemplo: '12345-123 ou 12345123'
                        });
                    }

                    if (String(req.body.cep).length === 9){
                        req.body.cep = req.body.cep.replace('-', '')
                    }
                }
            // Fim da Validação simples do CEP.

            // Validação de logradouro
                if (req.body.logradouro){
                    if (req.body.logradouro.length === 0 || req.body.logradouro.length > 100){
                        return res.status(400).json({
                            mensagem: 'O campo [ logradouro ] está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_LENGTH_LOGRADOURO'
                        });
                    }
                }
            // Fim da Validação do logradouro.

            // Validação do bairro
                if (req.body.bairro){
                    if (req.body.bairro.length === 0 || req.body.bairro.length > 100){
                        return res.status(400).json({
                            mensagem: 'O campo [ bairro ] está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_LENGTH_BAIRRO'
                        });
                    }
                }

                // if (!infoEndereco.bairro.toLowerCase().includes(req.body.bairro.toLowerCase())){
                //     return res.status(400).json({
                //         mensagem: 'BAIRRO - O bairro informado não está de acordo com o CEP.',
                //         code: 'BAIRRO_DONT_BELONG_TO_CEP'
                //     });
                // }

            // Fim da validação do Bairro.

            // Validação da cidade.

                if (req.body.cidade){
                    if (req.body.cidade.length === 0 || req.body.cidade.length > 100){
                        return res.status(400).json({
                            mensagem: 'O campo [ cidade ] está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_LENGTH_CIDADE',
                            exemplo: 'São Paulo'
                        });
                    }

                    if (!infoEndereco.localidade.toLowerCase().includes(req.body.cidade.toLowerCase())){
                        return res.status(400).json({
                            mensagem: 'A [ cidade ] informada não está de acordo com o CEP.',
                            code: 'CIDADE_DONT_BELONG_TO_CEP'
                        });
                    }
                }
            // Fim da validação da cidade.

            // Validação da uf
                if (req.body.uf){
                    if (req.body.uf.length === 0 || req.body.uf.length > 100){
                        return res.status(400).json({
                            mensagem: 'O campo [ UF ] está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_LENGTH_UF',
                            exemplo: 'SP'
                        });
                    }
        
                    if (!infoEndereco.uf.toLowerCase().includes(req.body.uf.toLowerCase())){
                        return res.status(400).json({
                            mensagem: 'O [ UF ] informado não está de acordo com o CEP.',
                            code: 'UF_DONT_BELONG_TO_CEP'
                        });
                    }
                }
            // Fim da validação da uf.

            // Validação do 'numero'.
                if (req.body.numero){

                    if (req.body.numero.match(/[^\d]+/g)){
                        return res.status(400).json({
                            mensagem: 'O campo [ numero ] deve possuir apenas dígitos.',
                            code: 'INVALID_INPUT_NUMERO',
                        });
                    }

                    if (req.body.numero.length === 0 || req.body.numero.length > 100){
                        return res.status(400).json({
                            mensagem: 'O campo [ numero ] está vazio ou possui mais do que 100 dígitos.',
                            code: 'INVALID_LENGTH_NUMERO',
                        });
                    }

                }
            // Fim da validação do 'numero'.

            // Validação do 'complemento'.
                if (req.body.complemento){

                    if (req.body.complemento.length === 0 || req.body.numero.length > 255){
                        return res.status(400).json({
                            mensagem: 'O campo [ complemento ] está vazio ou possui mais do que 255 caracteres.',
                            code: 'INVALID_LENGTH_COMPLEMENTO',
                        });
                    }

                }
            // Fim da validação do 'complemento'.

        // Fim da Validação dos Campos.

        // Início da efetivação do registro de um novo Ponto de Encontro para a Candidatura.
        
                let dataAtual = new Date();
                let novoPontoEncontro = undefined;

                try {

                    await database.transaction( async (transaction) => {

                        // Início da inativação dos Pontos de Encontro anteriores.
                            await PontoEncontro.update({
                                ativo: 0,
                                data_modificacao: dataAtual
                            }, {
                                where: {
                                    cod_candidatura: cod_candidatura
                                },
                                limit: 1,
                                transaction
                            });
                        // Fim da inativação dos Pontos de Encontro anteriores.

                        // Início do registro do novo Ponto de encontro.
                            novoPontoEncontro = await PontoEncontro.create({
                                cod_candidatura: cod_candidatura,
                                cod_anunciante: candidatura.Anuncio.cod_anunciante,
                                cod_candidato: candidatura.cod_candidato,
                                cep: req.body.cep,
                                logradouro: req.body.logradouro,
                                bairro: req.body.bairro,
                                cidade: req.body.cidade,
                                uf: req.body.uf,
                                numero: req.body.numero
                            }, {
                                transaction
                            });

                            novoPontoEncontro = await novoPontoEncontro.get({ plain: true });   // Captura os dados em um JSON.
                        // Fim do registro do novo Ponto de encontro.

                        // Início do envio da resposta de sucesso.
                            return res.status(200).json({
                                mensagem: 'O Ponto de Encontro foi definido para a candidatura, agora a candidatura pode ser aprovada.',
                                ponto_encontro: novoPontoEncontro
                            });
                        // Fim do envio da resposta de sucesso.

                    })
                    .catch((error) => {
                        // Se qualquer erro acontecer no bloco acima, cairemos em CATCH do bloco TRY e faremos o rollback;
                        throw new Error(error);
                    });

                    // Auto-commit.
                } catch (error) {
                    // Rollback.

                    console.error('Algo inesperado aconteceu ao cadastrar um novo Ponto de Encontro para a Candidatura.', error);

                    let customErr = new Error('Algo inesperado aconteceu ao cadastrar um novo Ponto de Encontro para a Candidatura. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return next( customErr );

                }

        // Fim da efetivação do registro de um novo Ponto de Encontro para a Candidatura.

    // Fim dos processos de criação do Ponto de Encontro para a Candidatura.

});

// Exportações.
module.exports = router;