// Importações.
    const router = require('express').Router();

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

    // Helpers.
        const checkUserBlockList = require('../../helpers/check_user_BlockList');

// Controllers.
    // const controller = require('../controllers/...');

// Rotas.
router.get('/', async (req, res, next) => {
    
    /*  09 Formas de listar os dados dos animais cadastrados dos usuários.

     01. Exibir os dados de um animal específico.
     02. Listar todos os animais ativos de um usuário específico.
     03. Listar os animais ativos de um usuário específico que possuam a espécie definida para busca.
     04. Listar os animais ativos de um usuário específico sob determinado estado de adoção.
     05. Listar os animais ativos de um usuário específico que possuam um nome similar ao definido para a busca.
     06 até 09. São formas combinadas de realizar as buscas acima, nome + espécie, espécie + estado de adoção, etc.

    */

    // Início das Restrições de acesso à rota.

        // Apenas Usuários das aplicações Pet Adote poderão acessar a listagem de animais dos usuários.
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

        let { getOne, getAllFromUser, bySpecie, byStatus, byName, page, limit } = req.query;

        switch (Object.entries(req.query).length){
            case 0:
                break;
            case 1:
                if (getOne) { operacao = 'getOne' };

                if (getAllFromUser) { operacao = 'getAll_fromUser' };

                break;
            case 2:
                if (getAllFromUser && page) { operacao = 'getAll_fromUser' };

                if (getAllFromUser && bySpecie) { operacao = 'getAll_fromUser_bySpecie' };
                if (getAllFromUser && byStatus) { operacao = 'getAll_fromUser_byStatus' };
                if (getAllFromUser && byName) { operacao = 'getAll_fromUser_byName' };

                break;
            case 3:
                if (getAllFromUser && bySpecie && page) { operacao = 'getAll_fromUser_bySpecie' };
                if (getAllFromUser && byStatus && page) { operacao = 'getAll_fromUser_byStatus' };
                if (getAllFromUser && byName && page) { operacao = 'getAll_fromUser_byName' };

                if (getAllFromUser && bySpecie && byStatus) { operacao = 'getAll_fromUser_bySpecie_n_byStatus' };
                if (getAllFromUser && bySpecie && byName) { operacao = 'getAll_fromUser_bySpecie_n_byName' };

                if (getAllFromUser && byStatus && byName) { operacao = 'getAll_fromUser_byStatus_n_byName' };
                break;
            case 4:
                if (getAllFromUser && bySpecie && page && limit) { operacao = 'getAll_fromUser_bySpecie' };
                if (getAllFromUser && byStatus && page && limit) { operacao = 'getAll_fromUser_byStatus' };
                if (getAllFromUser && byName && page && limit) { operacao = 'getAll_fromUser_byName' };

                if (getAllFromUser && bySpecie && byStatus && page) { operacao = 'getAll_fromUser_bySpecie_n_byStatus' };
                if (getAllFromUser && bySpecie && byName && page) { operacao = 'getAll_fromUser_bySpecie_n_byName' };

                if (getAllFromUser && byStatus && byName && page) { operacao = 'getAll_fromUser_byStatus_n_byName' };

                if (getAllFromUser && bySpecie && byStatus && byName) { operacao = 'getAll_fromUser_bySpecie_n_byStatus_n_byName' };
                break;
            case 5:
                if (getAllFromUser && bySpecie && byStatus && page && limit) { operacao = 'getAll_fromUser_bySpecie_n_byStatus' };
                if (getAllFromUser && bySpecie && byName && page && limit) { operacao = 'getAll_fromUser_bySpecie_n_byName' };

                if (getAllFromUser && byStatus && byName && page && limit) { operacao = 'getAll_fromUser_byStatus_n_byName' };

                if (getAllFromUser && bySpecie && byStatus && byName && page) { operacao = 'getAll_fromUser_bySpecie_n_byStatus_n_byName' };
            case 6:
                if (getAllFromUser && bySpecie && byStatus && byName && page && limit) { operacao = 'getAll_fromUser_bySpecie_n_byStatus_n_byName' };
            default:
                break;
        }

    // Fim das configurações de possíveis operações de busca.

    // Início da validação dos parâmetros.
        if (getOne){

            if (String(getOne).match(/[^\d]+/g)){     // Se "getOne" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de um Animal deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }
        
        if (getAllFromUser){

            if (String(getAllFromUser).match(/[^\d]+/g)){     // Se "getAllFromUser" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de um Usuário deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }

        if (bySpecie){

            let allowedSpecies = [
                'cats',
                'dogs',
                'others'
            ];

            if (!allowedSpecies.includes(bySpecie)){
                return res.status(400).json({
                    mensagem: 'Requisição inválida - (bySpecie) deve receber um dos seguintes valores [cats], [dogs], [others].',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }

        if (byStatus){

            let allowedStatus = [
                'protected',
                'announced',
                'trial',
                'adopted'
            ];

            if (!allowedStatus.includes(byStatus)){
                return res.status(400).json({
                    mensagem: 'Requisição inválida - (byStatus) deve receber um dos seguintes valores [protected], [announced], [trial], [adopted].',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }

        }
    // Fim da validação dos parâmetros.

    // Início da normalização dos parâmetros.
        
        req.query.page = Number(req.query.page);    // Se o valor para a página do sistema de páginação for recebido como String, torne-o um Number.
        req.query.limit = Number(req.query.limit);  // Se o valor para o limite de entrega de dados do sistema de páginação for recebido como String, torne-o um Number.

        req.query.getOne = String(req.query.getOne);
        req.query.getAllFromUser = String(req.query.getAllFromUser);
        req.query.bySpecie = String(req.query.bySpecie);
        req.query.byStatus = String(req.query.byStatus);
        req.query.byName = String(req.query.byName);
        
    // Fim da normalização dos parâmetros.

    // Início dos processos de listagem dos animais.

        // Início das configurações de paginação.
            let requestedPage = req.query.page || 1;        // Página por padrão será a primeira.
            let paginationLimit = req.query.limit || 10;     // Limite padrão de dados por página = 10;

            let paginationOffset = (requestedPage - 1) * paginationLimit;   // Define o índice de partida para coleta dos dados.
        // Fim das configurações de paginação.

        // Início da captura da lista de bloqueios do usuário.
            let listaBloqueiosReq = [];

            if (usuario?.e_admin == 0){
                // Se for um usuário comum...
                listaBloqueiosReq = await checkUserBlockList(usuario.cod_usuario);
            }
        // Fim da captura da lista de bloqueios do usuário.

        if (!operacao){
            return res.status(400).json({
                mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                code: 'BAD_REQUEST'
            });
        }

        if (operacao == 'getOne'){

            // Chamada para Usuários.
            // Exibe os dados de um animal específico.

            Animal.findOne({
                include: [{
                    model: Usuario,
                    as: 'dono'
                }, {
                    model: Usuario,
                    as: 'dono_antigo'
                }, {
                    model: Anuncio
                }, {
                    model: AlbumAnimal
                }],
                where: {
                    cod_animal: req.query.getOne,
                }
            })
            .then((result) => {

                if (!result) {
                    return res.status(200).json({
                        mensagem: 'Nenhum animal encontrado no ID informado.'
                    });
                }

                // return res.status(200).json({
                //     animal: result
                // });

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(result.cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if (result.ativo == 0){
                        // Não deverá ter acesso à recursos inativos.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal encontrado no ID informado.'
                            });
                        }

                        if ((usuario.cod_usuario != result.dono.cod_usuario) && result.dono.esta_ativo == 0){
                        // Se não for o dono do recurso e o dono estiver inativo, não deve ter acesso.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal encontrado no ID informado.'
                            });
                        }
                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let objDadosAnimal = result.get({ plain: true });

                    // Início da inclusão de atributos extra.

                        // Separando os dados do objeto.
                            
                            let dadosDono = objDadosAnimal.dono;
                                delete objDadosAnimal.dono;
                            let dadosDonoAntigo = objDadosAnimal.dono_antigo;
                                delete objDadosAnimal.dono_antigo;
                            let dadosAnuncio = objDadosAnimal.Anuncio;
                                delete objDadosAnimal.Anuncio;
                            let dadosAlbumAnimal = objDadosAnimal.AlbumAnimal;
                                delete objDadosAnimal.AlbumAnimal;
                            let dadosAnimal = objDadosAnimal; 

                        // Fim da separação dos dados.

                        // Inclusão de atributos essenciais aos clientes.
                            dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                            // dadosAnimal.lista_albuns = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllFromAnimal=${dadosAnimal.cod_animal}`;
                        // Fim da inclusão de atributos essenciais aos clientes.

                        // Unindo os dados em objeto em um objeto.
                            if (dadosDono) {
                                dadosAnimal.dono = dadosDono;
                                dadosAnimal.dono.download_avatar = `${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosDono.foto_usuario}`;
                            }
                            
                            if (dadosDonoAntigo) {
                                dadosAnimal.dono_antigo = dadosDonoAntigo;
                                dadosAnimal.dono_antigo.download_avatar = `${req.protocol}://${req.get('host')}/usuarios/avatars/${dadosDonoAntigo.foto_usuario}`;
                            }

                            if (dadosAnuncio){
                                dadosAnimal.anuncio = dadosAnuncio;
                                dadosAnimal.anuncio.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnuncio.uid_foto_animal}`;
                            }
                            
                            if (dadosAlbumAnimal) {
                                dadosAnimal.album_animal = dadosAlbumAnimal;
                                dadosAnimal.album_animal.lista_fotos = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllActiveFromAlbum=${dadosAlbumAnimal.cod_album}`;
                            }
                            
                        // Fim da união dos dados em um objeto.

                    // Fim da inclusão de atributos extra.

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Dados do animal do usuário.`,
                        animal: dadosAnimal
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao buscar os dados de um animal.', error);

                let customErr = new Error('Algo inesperado aconteceu ao buscar os dados de um animal. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser'){

            // Chamada para Usuários.
            // Exibe uma lista contendo todos os animais ativos de um usuário específico.
            // Se o requerinte for uma Aplicação ou um Administrador, exibirá também os animais inativos no fim da listagem de animais ativos.

            let whereConfig = {
                cod_dono: req.query.getAllFromUser
            };  // Padrão se o requirinte for um Admin/Aplicação.

            if (usuario?.e_admin == 0){
                // Padrão se o requirente for um usuário comum.
                whereConfig = {
                    cod_dono: req.query.getAllFromUser,
                    ativo: 1
                }
            }

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono',
                    attributes: ['cod_usuario', 'esta_ativo']
                }],
                where: whereConfig,
                order: [['ativo', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum animal foi registrado pelo usuário.'
                    });
                }

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(resultArr.rows[0].cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if ((usuario.cod_usuario != resultArr.rows[0].cod_dono) && resultArr.rows[0].dono.esta_ativo == 0){
                        // Se não for o dono do recurso e o dono estiver inativo, não deve ter acesso.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal foi registrado pelo usuário.'
                            });
                        }

                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais deste usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((animal) => {

                            let objDadosAnimal = animal.get({ plain: true });

                            // Separando os dados do objeto.
                                let dadosDono = objDadosAnimal.dono;
                                    delete objDadosAnimal.dono;
                                let dadosAnimal = objDadosAnimal; 
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                                dadosAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${dadosAnimal.cod_animal}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto.
                                // ...
                            // Fim da união dos dados em um objeto.

                            animais.push(dadosAnimal);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de animais do usuário.`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais do usuário.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os animais do usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser_bySpecie'){

            // Chamada para Usuários.
            // Exibe uma lista contendo todos os animais ativos de uma espécie específica, que pertencem a um usuário específico.
            // Se o requerinte for uma Aplicação ou um Administrador, exibirá também os animais inativos no fim da listagem de animais ativos.

            let especie = undefined;
                req.query.bySpecie == 'cats' ? especie = 'Gato': undefined ;
                req.query.bySpecie == 'dogs' ? especie = 'Cao': undefined ;
                req.query.bySpecie == 'others' ? especie = 'Outros': undefined ;

            let whereConfig = {
                cod_dono: req.query.getAllFromUser,
                especie: especie
            };  // Padrão se o requirinte for um Admin/Aplicação.

            if (usuario?.e_admin == 0){
                // Padrão se o requirente for um usuário comum.
                whereConfig = {
                    cod_dono: req.query.getAllFromUser,
                    especie: especie,
                    ativo: 1
                }
            }

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono',
                    attributes: ['cod_usuario', 'esta_ativo']
                }],
                where: whereConfig,
                order: [['ativo', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum animal da espécie selecionada foi registrado pelo usuário.'
                    });
                }

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(resultArr.rows[0].cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if ((usuario.cod_usuario != resultArr.rows[0].cod_dono) && resultArr.rows[0].dono.esta_ativo == 0){
                        // Se não for o dono do recurso e o dono estiver inativo, não deve ter acesso.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal da espécie selecionada foi registrado pelo usuário.'
                            });
                        }

                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&bySpecie=${req.query.bySpecie}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&bySpecie=${req.query.bySpecie}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais deste usuário para a espécie selecionada.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((animal) => {

                            let objDadosAnimal = animal.get({ plain: true });

                            // Separando os dados do objeto.
                                let dadosDono = objDadosAnimal.dono;
                                    delete objDadosAnimal.dono;
                                let dadosAnimal = objDadosAnimal; 
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                                dadosAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${dadosAnimal.cod_animal}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto.
                                // ...
                            // Fim da união dos dados em um objeto.

                            animais.push(dadosAnimal);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de animais do usuário sob a espécie selecionada.`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais do usuário sob uma espécie específica.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os animais do usuário sob uma espécie específica. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser_byStatus'){

            // Chamada para Usuários.
            // Exibe uma lista contendo todos os animais ativos sob um estado específico de adoção, que pertencem a um usuário específico.
            // Se o requerinte for uma Aplicação ou um Administrador, exibirá também os animais inativos no fim da listagem de animais ativos.

            let estado_adocao = undefined;
                req.query.byStatus == 'protected' ? estado_adocao = 'Sob protecao': undefined ;
                req.query.byStatus == 'announced' ? estado_adocao = 'Em anuncio': undefined ;
                req.query.byStatus == 'trial' ? estado_adocao = 'Em processo adotivo': undefined ;
                req.query.byStatus == 'adopted' ? estado_adocao = 'Adotado': undefined ;

            let whereConfig = {
                cod_dono: req.query.getAllFromUser,
                estado_adocao: estado_adocao
            };  // Padrão se o requirinte for um Admin/Aplicação.

            if (usuario?.e_admin == 0){
                // Padrão se o requirente for um usuário comum.
                whereConfig = {
                    cod_dono: req.query.getAllFromUser,
                    estado_adocao: estado_adocao,
                    ativo: 1
                }
            }

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono',
                    attributes: ['cod_usuario', 'esta_ativo']
                }],
                where: whereConfig,
                order: [['ativo', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum animal sob o estado de adoção selecionado foi encontrado na lista de animais do usuário.'
                    });
                }

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(resultArr.rows[0].cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if ((usuario.cod_usuario != resultArr.rows[0].cod_dono) && resultArr.rows[0].dono.esta_ativo == 0){
                        // Se não for o dono do recurso e o dono estiver inativo, não deve ter acesso.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal sob o estado de adoção selecionado foi encontrado na lista de animais do usuário.'
                            });
                        }

                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byStatus=${req.query.byStatus}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byStatus=${req.query.byStatus}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais sob o estado de adoção selecionado deste usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((animal) => {

                            let objDadosAnimal = animal.get({ plain: true });

                            // Separando os dados do objeto.
                                let dadosDono = objDadosAnimal.dono;
                                    delete objDadosAnimal.dono;
                                let dadosAnimal = objDadosAnimal; 
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                                dadosAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${dadosAnimal.cod_animal}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto.
                                // ...
                            // Fim da união dos dados em um objeto.

                            animais.push(dadosAnimal);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de animais do usuário sob o estado de adoção selecionado.`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais do usuário sob um estado de adoção específico.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os animais do usuário sob um estado de adoção específico. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser_byName'){

            // Chamada para Usuários.
            // Exibe uma lista contendo todos os animais ativos que possuam o nome parecido com o que foi definido na busca e que pertencem a um usuário específico.
            // Se o requerinte for uma Aplicação ou um Administrador, exibirá também os animais inativos no fim da listagem de animais ativos.

            let whereConfig = {
                cod_dono: req.query.getAllFromUser,
                nome: {
                    [Op.like]: `%${req.query.byName}%`
                }
            };  // Padrão se o requirinte for um Admin/Aplicação.

            if (usuario?.e_admin == 0){
                // Padrão se o requirente for um usuário comum.
                whereConfig = {
                    cod_dono: req.query.getAllFromUser,
                    nome: {
                        [Op.like]: `%${req.query.byName}%`
                    },
                    ativo: 1
                }
            }

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono',
                    attributes: ['cod_usuario', 'esta_ativo']
                }],
                where: whereConfig,
                order: [['ativo', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum animal com o nome similar ao definido na busca foi encontrado na lista de animais do usuário.'
                    });
                }

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(resultArr.rows[0].cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if ((usuario.cod_usuario != resultArr.rows[0].cod_dono) && resultArr.rows[0].dono.esta_ativo == 0){
                        // Não deverá ter acesso se não for o dono do recurso e o dono estiver inativo.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal com o nome similar ao definido na busca foi encontrado na lista de animais do usuário.'
                            });
                        }

                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byName=${req.query.byName}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byName=${req.query.byName}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista dos animais deste usuário que possuem o nome similar ao que foi definido na busca.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((animal) => {

                            let objDadosAnimal = animal.get({ plain: true });

                            // Separando os dados do objeto.
                                let dadosDono = objDadosAnimal.dono;
                                    delete objDadosAnimal.dono;
                                let dadosAnimal = objDadosAnimal; 
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                                dadosAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${dadosAnimal.cod_animal}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto.
                                // ...
                            // Fim da união dos dados em um objeto.

                            animais.push(dadosAnimal);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de animais do usuário que possuem o nome similar ao que foi definido na busca.`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais do usuário que possuem o nome similar ao que foi definido na busca.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os animais do usuário que possuem o nome similar ao que foi definido na busca. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser_bySpecie_n_byStatus'){

            // Chamada para Usuários.
            // Exibe uma lista contendo todos os animais ativos sob um estado específico de adoção, que pertencem a um usuário específico.
            // Se o requerinte for uma Aplicação ou um Administrador, exibirá também os animais inativos no fim da listagem de animais ativos.

            let especie = undefined;
                req.query.bySpecie == 'cats' ? especie = 'Gato': undefined ;
                req.query.bySpecie == 'dogs' ? especie = 'Cao': undefined ;
                req.query.bySpecie == 'others' ? especie = 'Outros': undefined ;

            let estado_adocao = undefined;
                req.query.byStatus == 'protected' ? estado_adocao = 'Sob protecao': undefined ;
                req.query.byStatus == 'announced' ? estado_adocao = 'Em anuncio': undefined ;
                req.query.byStatus == 'trial' ? estado_adocao = 'Em processo adotivo': undefined ;
                req.query.byStatus == 'adopted' ? estado_adocao = 'Adotado': undefined ;

            let whereConfig = {
                cod_dono: req.query.getAllFromUser,
                especie: especie,
                estado_adocao: estado_adocao
            };  // Padrão se o requirinte for um Admin/Aplicação.

            if (usuario?.e_admin == 0){
                // Padrão se o requirente for um usuário comum.
                whereConfig = {
                    cod_dono: req.query.getAllFromUser,
                    especie: especie,
                    estado_adocao: estado_adocao,
                    ativo: 1
                }
            }

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono',
                    attributes: ['cod_usuario', 'esta_ativo']
                }],
                where: whereConfig,
                order: [['ativo', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum animal foi encontrado para os filtros definidos na lista de animais do usuário.'
                    });
                }

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(resultArr.rows[0].cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if ((usuario.cod_usuario != resultArr.rows[0].cod_dono) && resultArr.rows[0].dono.esta_ativo == 0){
                        // Se não for o dono do recurso e o dono estiver inativo, não deve ter acesso.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal foi encontrado para os filtros definidos na lista de animais do usuário.'
                            });
                        }

                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&bySpecie=${req.query.bySpecie}&byStatus=${req.query.byStatus}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&bySpecie=${req.query.bySpecie}&byStatus=${req.query.byStatus}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista com filtro dos animais deste usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((animal) => {

                            let objDadosAnimal = animal.get({ plain: true });

                            // Separando os dados do objeto.
                                let dadosDono = objDadosAnimal.dono;
                                    delete objDadosAnimal.dono;
                                let dadosAnimal = objDadosAnimal; 
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                                dadosAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${dadosAnimal.cod_animal}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto.
                                // ...
                            // Fim da união dos dados em um objeto.

                            animais.push(dadosAnimal);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de animais do usuário sob filtro de espécie e estado de adoção.`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais do usuário sob filtro de espécie e estado de adoção.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os animais do usuário sob filtro de espécie e estado de adoção. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser_bySpecie_n_byName'){

            // Chamada para Usuários.
            // Exibe uma lista contendo os animais ativos de um usuário cujo nome são semelhantes ao nome definido na busca, que são de uma determinada espécie.
            // Se o requerinte for uma Aplicação ou um Administrador, exibirá também os animais inativos no fim da listagem de animais ativos.

            let especie = undefined;
                req.query.bySpecie == 'cats' ? especie = 'Gato': undefined ;
                req.query.bySpecie == 'dogs' ? especie = 'Cao': undefined ;
                req.query.bySpecie == 'others' ? especie = 'Outros': undefined ;

            let whereConfig = {
                cod_dono: req.query.getAllFromUser,
                especie: especie,
                nome: {
                    [Op.like]: `%${req.query.byName}%`
                }
            };  // Padrão se o requirinte for um Admin/Aplicação.

            if (usuario?.e_admin == 0){
                // Padrão se o requirente for um usuário comum.
                whereConfig = {
                    cod_dono: req.query.getAllFromUser,
                    especie: especie,
                    nome: {
                        [Op.like]: `%${req.query.byName}%`
                    },
                    ativo: 1
                }
            }

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono',
                    attributes: ['cod_usuario', 'esta_ativo']
                }],
                where: whereConfig,
                order: [['ativo', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum animal da lista de animais do usuário se encaixa nos filtros que foram definidos para esta busca.'
                    });
                }

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(resultArr.rows[0].cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if ((usuario.cod_usuario != resultArr.rows[0].cod_dono) && resultArr.rows[0].dono.esta_ativo == 0){
                        // Se não for o dono do recurso e o dono estiver inativo, não deve ter acesso.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal da lista de animais do usuário se encaixa nos filtros que foram definidos para esta busca.'
                            });
                        }

                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byName=${req.query.byName}&bySpecie=${req.query.bySpecie}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byName=${req.query.byName}&bySpecie=${req.query.bySpecie}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais do usuário filtrada por nome e espécie.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((animal) => {

                            let objDadosAnimal = animal.get({ plain: true });

                            // Separando os dados do objeto.
                                let dadosDono = objDadosAnimal.dono;
                                    delete objDadosAnimal.dono;
                                let dadosAnimal = objDadosAnimal; 
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                                dadosAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${dadosAnimal.cod_animal}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto.
                                // ...
                            // Fim da união dos dados em um objeto.

                            animais.push(dadosAnimal);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de animais do usuário filtrada por nome e espécie.`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais do usuário sob filtro de nome e espécie.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os animais do usuário sob filtro de nome e espécie. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser_byStatus_n_byName'){

            // Chamada para Usuários.
            // Exibe uma lista contendo os animais ativos de um usuário cujo nome são semelhantes ao nome definido na busca, que estão sob um determinado estado de adoção.
            // Se o requerinte for uma Aplicação ou um Administrador, exibirá também os animais inativos no fim da listagem de animais ativos.

            let estado_adocao = undefined;
                req.query.byStatus == 'protected' ? estado_adocao = 'Sob protecao': undefined ;
                req.query.byStatus == 'announced' ? estado_adocao = 'Em anuncio': undefined ;
                req.query.byStatus == 'trial' ? estado_adocao = 'Em processo adotivo': undefined ;
                req.query.byStatus == 'adopted' ? estado_adocao = 'Adotado': undefined ;

            let whereConfig = {
                cod_dono: req.query.getAllFromUser,
                estado_adocao: estado_adocao,
                nome: {
                    [Op.like]: `%${req.query.byName}%`
                }
            };  // Padrão se o requirinte for um Admin/Aplicação.

            if (usuario?.e_admin == 0){
                // Padrão se o requirente for um usuário comum.
                whereConfig = {
                    cod_dono: req.query.getAllFromUser,
                    estado_adocao: estado_adocao,
                    nome: {
                        [Op.like]: `%${req.query.byName}%`
                    },
                    ativo: 1
                }
            }

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono',
                    attributes: ['cod_usuario', 'esta_ativo']
                }],
                where: whereConfig,
                order: [['ativo', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum animal da lista de animais do usuário se encaixa nos filtros que foram definidos para esta busca.'
                    });
                }

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(resultArr.rows[0].cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if ((usuario.cod_usuario != resultArr.rows[0].cod_dono) && resultArr.rows[0].dono.esta_ativo == 0){
                        // Se não for o dono do recurso e o dono estiver inativo, não deve ter acesso.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal da lista de animais do usuário se encaixa nos filtros que foram definidos para esta busca.'
                            });
                        }

                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byName=${req.query.byName}&byStatus=${req.query.byStatus}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byName=${req.query.byName}&byStatus=${req.query.byStatus}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais do usuário filtrada por nome e estado de adoção.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((animal) => {

                            let objDadosAnimal = animal.get({ plain: true });

                            // Separando os dados do objeto.
                                let dadosDono = objDadosAnimal.dono;
                                    delete objDadosAnimal.dono;
                                let dadosAnimal = objDadosAnimal; 
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                                dadosAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${dadosAnimal.cod_animal}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto.
                                // ...
                            // Fim da união dos dados em um objeto.

                            animais.push(dadosAnimal);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de animais do usuário filtrada por nome e estado de adoção.`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais do usuário sob filtro de nome e estado de adoção.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os animais do usuário sob filtro de nome e estado de adoção. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAll_fromUser_bySpecie_n_byStatus_n_byName'){

            // Chamada para Usuários.
            // Exibe uma lista contendo os animais ativos de um usuário cujo nome são semelhantes ao nome definido na busca, que são de uma determinada espécie e que estão sob um determinado estado de adoção.
            // Se o requerinte for uma Aplicação ou um Administrador, exibirá também os animais inativos no fim da listagem de animais ativos.

            let especie = undefined;
                req.query.bySpecie == 'cats' ? especie = 'Gato': undefined ;
                req.query.bySpecie == 'dogs' ? especie = 'Cao': undefined ;
                req.query.bySpecie == 'others' ? especie = 'Outros': undefined ;

            let estado_adocao = undefined;
                req.query.byStatus == 'protected' ? estado_adocao = 'Sob protecao': undefined ;
                req.query.byStatus == 'announced' ? estado_adocao = 'Em anuncio': undefined ;
                req.query.byStatus == 'trial' ? estado_adocao = 'Em processo adotivo': undefined ;
                req.query.byStatus == 'adopted' ? estado_adocao = 'Adotado': undefined ;

            let whereConfig = {
                cod_dono: req.query.getAllFromUser,
                especie: especie,
                estado_adocao: estado_adocao,
                nome: {
                    [Op.like]: `%${req.query.byName}%`
                }
            };  // Padrão se o requirinte for um Admin/Aplicação.

            if (usuario?.e_admin == 0){
                // Padrão se o requirente for um usuário comum.
                whereConfig = {
                    cod_dono: req.query.getAllFromUser,
                    especie: especie,
                    estado_adocao: estado_adocao,
                    nome: {
                        [Op.like]: `%${req.query.byName}%`
                    },
                    ativo: 1
                }
            }

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono',
                    attributes: ['cod_usuario', 'esta_ativo']
                }],
                where: whereConfig,
                order: [['ativo', 'DESC']],
                limit: paginationLimit,
                offset: paginationOffset
            })
            .then((resultArr) => {

                if (resultArr.count === 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum animal da lista de animais do usuário se encaixa nos filtros que foram definidos para esta busca.'
                    });
                }

                // Restrições de uso da chamada.
                    if (usuario?.e_admin == 0){
                        // Se o requisitante for um usuário comum...

                        if (listaBloqueiosReq.includes(resultArr.rows[0].cod_dono)){
                        // Não deverá ter acesso à recursos de usuários bloqueados ou que bloquearam ele.
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }

                        if ((usuario.cod_usuario != resultArr.rows[0].cod_dono) && resultArr.rows[0].dono.esta_ativo == 0){
                        // Se não for o dono do recurso e o dono estiver inativo, não deve ter acesso.
                            return res.status(200).json({
                                mensagem: 'Nenhum animal da lista de animais do usuário se encaixa nos filtros que foram definidos para esta busca.'
                            });
                        }

                    }
                // Fim das restrições de uso da chamada.

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byName=${req.query.byName}&byStatus=${req.query.byStatus}&bySpecie=${req.query.bySpecie}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${req.query.getAllFromUser}&byName=${req.query.byName}&byStatus=${req.query.byStatus}&bySpecie=${req.query.bySpecie}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais do usuário filtrada por nome, espécie e estado de adoção.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    // Início da inclusão de atributos extra.
                        resultArr.rows.forEach((animal) => {

                            let objDadosAnimal = animal.get({ plain: true });

                            // Separando os dados do objeto.
                                let dadosDono = objDadosAnimal.dono;
                                    delete objDadosAnimal.dono;
                                let dadosAnimal = objDadosAnimal; 
                            // Fim da separação dos dados.

                            // Inclusão de atributos essenciais aos clientes.
                                dadosAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${dadosAnimal.foto}`;
                                dadosAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${dadosAnimal.cod_animal}`;
                            // Fim da inclusão de atributos essenciais aos clientes.

                            // Unindo os dados em objeto em um objeto.
                                // ...
                            // Fim da união dos dados em um objeto.

                            animais.push(dadosAnimal);
                        });
                    // Fim da inclusão de atributos extra.
                    
                // Fim da construção do objeto enviado na resposta.

                // Início do envio da Resposta.
                    return res.status(200).json({
                        mensagem: `Lista de animais do usuário filtrada por nome, espécie e estado de adoção.`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });
                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais do usuário sob filtro de nome, espécie e estado de adoção.', error);

                let customErr = new Error('Algo inesperado aconteceu ao listar os animais do usuário sob filtro nome, espécie e estado de adoção. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }


    // Fim dos processos de listagem dos animais.

});

router.post('/', async (req, res, next) => {

    // Início das Restrições de acesso à rota.

        // Apenas Usuários das aplicações Pet Adote poderão cadastrar animais.
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

        // Capturando os dados do usuário requisitante.
        let { usuario } = req.dadosAuthToken;
        
        // Se o requisitante não for um usuário, não permita o acesso.
        if (!usuario){
            return res.status(401).json({
                mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            });
        };

    // Fim das Restrições de acesso à rota.

    // Início das restrições de envio de campos.

        let hasUnauthorizedField = false;

        let emptyFields = [];   // Se campos vazios forem detectados, envie (400 - INVALID_REQUEST_FIELDS)

        // Lista de campos permitidos.

            let allowedFields = [
                'nome',
                'data_nascimento',
                'especie',
                'raca',
                'genero',
                'porte',
                'esta_castrado',
                'esta_vacinado',
                'possui_rga',
                'detalhes_comportamento',
                'detalhes_saude',
                'historia'
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

    // Fim da das restrições de envio de campos.

    // Início da Verificação de campos obrigatórios.

        let missingFields = []; // Receberá os campos que faltaram na requisição.

        // Lista de campos obrigatórios.

            let requiredFields = [
                'nome',
                'data_nascimento',
                'especie',
                'raca',
                'genero',
                'porte',
                'esta_castrado',
                'esta_vacinado',
                'possui_rga',
                'detalhes_comportamento',
                'detalhes_saude',
            ];

        // Fim da lista de campos obrigatórios.

        // Verificador de campos obrigatórios.

            requiredFields.forEach((field) => {
                if (!Object.keys(req.body).includes(field)){
                    missingFields.push(`Campo [${field}] não encontrado.`);
                }
            });

        // Fim do verificador de campos obrigatórios.

        // Resposta para campos obrigatórios não preenchidos.

            if (missingFields.length > 0){
                // console.log('missingFields detectados, campos obrigatórios estão faltando.');
        
                return res.status(400).json({
                    mensagem: 'Campos obrigatórios estão faltando.',
                    code: 'INVALID_REQUEST_FIELDS',
                    missing_fields: missingFields
                });
            }

        // Fim da Resposta de campos obrigatórios não preenchidos.

    // Fim da Verificação de campos obrigatórios.

    // Início da Normalização dos campos recebidos.

        Object.entries(req.body).forEach((pair) => {

            req.body[pair[0]] = String(pair[1]).trim();     // Remove espaços excessivos no início e no fim do valor.

            let partes = undefined;     // Será útil para tratar partes individuais de um valor.

            switch(pair[0]){
                case 'nome':
                    // Deixando cada parte do nome com a primeira letra maiúscula.
                    partes = pair[1].trim().split(' ');

                    partes.forEach((parte, index) => {
                        if (parte){
                            partes[index] = parte[0].toUpperCase() + parte.substr(1);
                        };
                    })

                    req.body[pair[0]] = partes.join(' ');
                    break;
                case 'especie':
                    // Deixa a primeira letra da string como maiúscula.
                    req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                    break;
                case 'raca':
                    req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                    break;
                case 'genero':
                    // Deixa as letras da string em caixa alta.
                    req.body[pair[0]] = pair[1].toUpperCase();
                    break;
                case 'porte':
                    req.body[pair[0]] = pair[1].toUpperCase();
                    break;
                default:
                    break;
            }

        });

    // Fim da Normalização dos campos recebidos.

    // Início da Validação dos Campos.

        // Validação Nome.
            if (req.body.nome?.length >= 0){

                if (req.body.nome.match(/\s{2}|[^A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){
                    return res.status(400).json({
                        mensagem: 'O nome do animal possui espaços excessivos ou caracteres inválidos.',
                        code: 'INVALID_INPUT_NOME'
                    });
                }

                if (req.body.nome.length === 0 || req.body.nome.length > 50){
                    return res.status(400).json({
                        mensagem: 'O nome do animal está vazio ou possui mais do que 50 caracteres.',
                        code: 'INVALID_LENGTH_NOME'
                    });
                }

            }
        // ---------------

        // Validação Data Nascimento.
            if (req.body.data_nascimento?.length >= 0){

                if (req.body.data_nascimento.length === 0){

                    // console.log('Erro: Data de nascimento vazia.');
                    return res.status(400).json({
                        mensagem: 'A data de nascimento do animal está vazia.',
                        code: 'INVALID_LENGTH_DATA_NASCIMENTO'
                    });

                } else {

                    // console.log('Data de Nascimento: [' + req.body.data_nascimento + ']');

                    if (!req.body.data_nascimento.match(/^(\d{4})\-([1][0-2]|[0][1-9])\-([0][1-9]|[1-2]\d|[3][0-1])$/g)){
                        // console.log('Erro: Formato inválido de data!');
                        return res.status(400).json({
                            mensagem: 'A data de nascimento do animal está em um formato inválido.',
                            code: 'INVALID_INPUT_DATA_NASCIMENTO',
                            exemplo: 'aaaa-mm-dd'
                        });
                    }
        
                    // Verificação de ano bissexto

                        let data_nascimento = req.body.data_nascimento.split('-');

                        if(data_nascimento[0][2] == 0 && data_nascimento[0][3] == 0){
                            if (data_nascimento[0] % 400 == 0){
                                // console.log('Ano bissexto % 400');
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 29){
                                    return res.status(400).json({
                                        mensagem: 'A data de nascimento do animal declara um dia inválido para ano bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR'
                                    });
                                }
                            } else {
                                // console.log('Ano não-bissexto % 400');
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 28){
                                    return res.status(400).json({
                                        mensagem: 'A data de nascimento do animal declara um dia inválido para ano não-bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR'
                                    });
                                }
                            }
                        } else {
                            if (data_nascimento[0] % 4 == 0){
                                // console.log('Ano bissexto % 4');
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 29){
                                    return res.status(400).json({
                                        mensagem: 'A data de nascimento do animal declara um dia inválido para ano bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR'
                                    });
                                }
                            } else {
                                // console.log('Ano não-bissexto % 4');
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 28){
                                    return res.status(400).json({
                                        mensagem: 'A data de nascimento do animal declara um dia inválido para ano não-bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR'
                                    });
                                }
                            }
                        }
                    // Fim da verificação de ano bissexto.
                    
                    if (data_nascimento[0] < 1900){
                        return res.status(400).json({
                            mensagem: 'A data de nascimento do animal é inválida, digite um valor para ano acima de 1900.',
                            code: 'INVALID_INPUT_DATA_NASCIMENTO'
                        });
                    }

                    if (new Date(req.body.data_nascimento) > new Date()){
                        // Se a data informada for maior que o dia atual, não permita continuar.
                        return res.status(400).json({
                            mensagem: 'A data de nascimento do animal é inválida, o animal não pode ter nascido no futuro.',
                            code: 'INVALID_INPUT_DATA_NASCIMENTO'
                        });
                    }

                }

            }
        // -------------------------

        // Validação Especie.
            if (req.body.especie?.length >= 0){

                let allowedSpecies = [
                    'Cao',
                    'Gato',
                    'Outros'
                ];

                if (!allowedSpecies.includes(req.body.especie)){
                    return res.status(400).json({
                        mensagem: 'A espécie declarada para o animal é inválida.',
                        code: 'INVALID_INPUT_ESPECIE'
                    });
                }

            }
        // ------------------

        // Validação Raça.
            if (req.body.raca?.length >= 0){

                if (req.body.raca.match(/\s{2}|[^A-Za-zÀ-ÖØ-öø-ÿ ]+/g)){
                    return res.status(400).json({
                        mensagem: 'A declaração da raça do animal possui espaços excessivos ou caracteres inválidos.',
                        code: 'INVALID_INPUT_RACA'
                    });
                }

                if (req.body.raca.length == 0 || req.body.raca.length > 20){
                    return res.status(400).json({
                        mensagem: 'A declaração da raça do animal está vazia ou possui mais do que 20 caracteres.',
                        code: 'INVALID_LENGTH_RACA'
                    });
                }

            }
        // ---------------

        // Validação Gênero.
            if (req.body.genero?.length >= 0){

                let allowedGenres = [
                    'M',
                    'F'
                ];

                if (!allowedGenres.includes(req.body.genero)){
                    return res.status(400).json({
                        mensagem: 'O genero declarado para o animal é inválido.',
                        code: 'INVALID_INPUT_GENERO'
                    });
                }
                
            }
        // -----------------

        // Validação Porte.
            if (req.body.porte?.length >= 0){

                let allowedSize = [
                    'P',
                    'M',
                    'G'
                ];

                if (!allowedSize.includes(req.body.porte)){
                    return res.status(400).json({
                        mensagem: 'O porte (tamanho) declarado para o animal é inválido.',
                        code: 'INVALID_INPUT_PORTE'
                    });
                }
                
            }
        // ----------------

        // Validação Está Castrado?
            if (req.body.esta_castrado?.length >= 0){

                let allowedValues = [
                    '0',
                    '1'
                ];

                if (!allowedValues.includes(req.body.esta_castrado)){
                    return res.status(400).json({
                        mensagem: 'O estado de castração declarado para o animal é inválido',
                        code: 'INVALID_INPUT_ESTA_CASTRADO'
                    });
                }

                // Se chegou aqui, o valor é válido. Converta para Number.
                    req.body.esta_castrado = Number(req.body.esta_castrado);
                // Fim da conversão do estado de castração para Number.

            }
        // ------------------------

        // Validação Está Vacinado?
            if (req.body.esta_vacinado?.length >= 0){

                let allowedValues = [
                    '0',
                    '1'
                ];

                if (!allowedValues.includes(req.body.esta_vacinado)){
                    return res.status(400).json({
                        mensagem: 'O estado de vacinação declarado para o animal é inválido',
                        code: 'INVALID_INPUT_ESTA_VACINADO'
                    });
                }

                // Se chegou aqui, o valor é válido. Converta para Number.
                    req.body.esta_vacinado = Number(req.body.esta_vacinado);
                // Fim da conversão do estado de vacinação para Number.
                
            }
        // ------------------------

        // Validação Possui RGA?
            if (req.body.possui_rga?.length >= 0){

                let allowedValues = [
                    '0',
                    '1'
                ];

                if (!allowedValues.includes(req.body.possui_rga)){
                    return res.status(400).json({
                        mensagem: 'O estado de posse de RGA é inválido',
                        code: 'INVALID_INPUT_ESTA_VACINADO'
                    });
                }

                // Se chegou aqui, o valor é válido. Converta para Number.
                    req.body.possui_rga = Number(req.body.possui_rga);
                // Fim da conversão do estado de vacinação para Number.
                
            }
        // ------------------------
        
        // Validação Detalhes comportamento.
            if (req.body.detalhes_comportamento?.length >= 0){

                if (req.body.detalhes_comportamento.length == 0 || req.body.detalhes_comportamento.length > 255 ){
                    return res.status(400).json({
                        mensagem: 'O campo de detalhes de comportamento do animal está vazio ou possui mais do que 255 caracteres.',
                        code: 'INVALID_LENGTH_DETALHES_COMPORTAMENTO'
                    });
                }

            }
        // ---------------------------------

        // Validação Detalhes saúde.
            if (req.body.detalhes_saude?.length >= 0){

                if (req.body.detalhes_saude.length == 0 || req.body.detalhes_saude.length > 255 ){
                    return res.status(400).json({
                        mensagem: 'O campo de detalhes de saúde do animal está vazio ou possui mais do que 255 caracteres.',
                        code: 'INVALID_LENGTH_DETALHES_SAUDE'
                    });
                }

            }
        // -------------------------

        // Validação História.
            if (req.body.historia?.length >= 0){

                if (req.body.historia.length == 0){
                    return res.status(400).json({
                        mensagem: 'O campo de detalhes de saúde do animal está vazio.',
                        code: 'INVALID_LENGTH_HISTORIA'
                    });
                }

            }
        // -------------------

    // Fim da Validação dos Campos.

    // console.log('Id do requisitante:', usuario.cod_usuario);
    // console.log('Estado final do corpo da requisição:', req.body);

    // Início do processo de cadastro do animal.

        try {

            let defaultAnimalPicture = undefined;
            let possibleDefaultImages = undefined;
            let rngSelector = Number.parseInt((Math.random() * (1.9 - 0)));  // 0 ou 1.

            switch(req.body.especie){
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

            await database.transaction( async (transaction) => {

                let animal = await Animal.create({
                    cod_dono: usuario.cod_usuario,
                    nome: req.body.nome,
                    foto: defaultAnimalPicture,
                    data_nascimento: req.body.data_nascimento,
                    especie: req.body.especie,
                    raca: req.body.raca,
                    genero: req.body.genero,
                    porte: req.body.porte,
                    esta_castrado: req.body.esta_castrado,
                    esta_vacinado: req.body.esta_vacinado,
                    possui_rga: req.body.possui_rga,
                    detalhes_comportamento: req.body.detalhes_comportamento,
                    detalhes_saude: req.body.detalhes_saude,
                    historia: req.body.historia
                }, {
                    transaction
                });

                // [!] Atenção, se o álbum começar a ter prefixos, isso deve ser verificado também na chamada PATCH do Animal, ao alterar o nome do animal...
                // [!] Se o nome do animal for alterado, o álbum padrão que ele recebe quando cadastrado terá seu nome alterado também...
                let albumPrefix = undefined;

                switch(animal.genero){
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

                let albumAnimal = await AlbumAnimal.create({
                    cod_animal: animal.cod_animal,
                    titulo: `${albumPrefix} ${animal.nome}`,
                }, {
                    transaction
                });

                // Início da construção do objeto que vai ser enviado na resposta.
                    let objAnimal = animal.get({ plain: true });

                    // Início da adição de atributos extras ao objeto.

                        // Adicionando o end-point para exibição da foto do animal.
                            objAnimal.download_foto = `GET ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${animal.foto}`
                        // --------------------------------------------------------

                    // Fim da adição de atributos extras ao objeto.

                // Fim da construção do objeto que vai ser enviado na resposta.

                // Início da entrega da mensagem de conclusão do cadastro do animal para o usuário.

                    return res.status(200).json({
                        mensagem: 'Cadastro do animal foi realizado com sucesso! Utilize o [ cod_animal ] para alterar dados do animal, como por exemplo, trocar a [ foto ] padrão, ou o [ cod_album ] para adicionar uma nova foto ao álbum do animal.',
                        animal: objAnimal,
                        alterar_foto: `PATCH ${req.protocol}://${req.get('host')}/usuarios/animais/${animal.cod_animal}`,
                        album: albumAnimal,
                        add_foto_album: `POST ${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${albumAnimal.cod_album}`,
                    });

                // Fim da entrega da mensagem de conclusão do cadastro do animal para o usuário.

            })
            .catch((error) => {
                throw new Error(error);
            });

            // Se chegou aqui: Auto-commit.            

        } catch (error) {
            // Se algo deu errado: Auto-rollback.
            console.error('Algo inesperado aconteceu ao cadastrar os dados do novo usuário.', error);
        
            let customErr = new Error('Algo inesperado aconteceu ao cadastrar os dados do novo usuário. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';
    
            return next(customErr);
        }

    // Fim do processo de cadastro do animal.

});

router.patch('/:codAnimal', async (req, res, next) => {

    // Início da verificação do parâmetro de rota.

        if (String(req.params.codAnimal).match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Animal deve conter apenas dígitos.",
                code: 'BAD_REQUEST'
            });
        }

    // Fim da verificação do parâmetro de rota.

    // Início das Restrições de acesso à rota.

        // Apenas aplicações Pet Adote e seus usuários poderão realizar alterações em animais cadastrados.
        // Além disso, o usuário deve ser um Administrador ou Dono do Recurso para alterar os dados do animal.
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
        
        // Capturando os dados do usuário.
            let { usuario } = req.dadosAuthToken;

    // Fim das Restrições de acesso à rota.

    // Captura do código do animal requisitado.
        const cod_animal = req.params.codAnimal;
    // ----------------------------------------

    // Início da verificação do cadastro do animal.
        let animal = undefined;

        try {

            animal = await Animal.findOne({
                where: {
                    cod_animal: cod_animal,
                    ativo: 1
                },
                raw: true
            })
            .catch((error) => {
                throw new Error(error);
            });

        } catch (error) {

            console.error('Algo inesperado aconteceu ao buscar os dados do animal.', error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do animal. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'
    
            return next( customErr );

        }

        if (!animal) {
            // Se o animal não for encontrado...
            return res.status(404).json({
                mensagem: 'Nenhum animal está vinculado à esse ID.',
                code: 'RESOURCE_NOT_FOUND',
                lista_usuarios: `${req.protocol}://${req.get('host')}/usuarios/`,
            });
        }

    // Fim da verificação do cadastro do animal.

    // Início das restrições de uso da rota.

        if (usuario?.e_admin == 0 && animal.cod_dono != usuario.cod_usuario){
            // Se o requisitante é um usuário que não é o dono do recurso ou um administrador...
            return res.status(401).json({
                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            });
        }

        // console.log('DADOS ANIMAL: ', animal);
        
    // Fim das restrições de uso da rota.

    // Início das configurações das possíveis operações de alteração.

        let operacao = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).

        switch (Object.entries(req.query).length){
            case 0:
                operacao = 'update';

                if (animal.estado_adocao == 'Adotado') { operacao = 'update_adopted_animal' };

                break;
            case 1:
                if (req.query?.setDefault == 'foto') { operacao = 'setDefault_Foto' };

                if (animal.estado_adocao == 'Adotado' && req.query.setDefault == 'foto') { operacao = 'update_adopted_animal' };

                break;
            default:
                break;
        }

    // Fim das configurações das possíveis operações de alteração.

    // Início dos processos de alteração dos dados do animal.

        if (!operacao){
            return res.status(400).json({
                mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                code: 'BAD_REQUEST'
            });
        };

        if (operacao == 'setDefault_Foto'){
            // Início do retorno da foto do animal para o padrão.

                let possibleDefaultPhotoAnimal = [
                    'default_dog_01.jpeg',
                    'default_dog_02.jpeg',
                    'default_cat_01.jpeg',
                    'default_cat_02.jpeg',
                    'default_unknown_pet.jpeg'
                ];

                let rngSelector = undefined;

                let defaultPhotoAnimal = undefined;

                switch (animal.especie){
                    case 'Cao':
                        rngSelector = Number.parseInt(Math.random() * 1.9); // 0 ou 1.
                        defaultPhotoAnimal = possibleDefaultPhotoAnimal[rngSelector];
                        break;
                    case 'Gato':
                        rngSelector = Number.parseInt(2 + Math.random() * (3.9 - 2)); // 2 ou 3;
                        defaultPhotoAnimal = possibleDefaultPhotoAnimal[rngSelector];
                        break;
                    default:
                        defaultPhotoAnimal = possibleDefaultPhotoAnimal[4];
                        break;
                }

                // Existem dois casos onde a foto não poderá ser deletada ao ser substituída pelo padrão...
                // 1. Se a foto do animal já for a foto padrão.
                // 2. Se a foto do animal for uma foto do álbum do animal.
                // Isso acontece pois a foto estabelecida para o animal de início não é relacionada às fotos do Álbum.
                // Porém programáticamente a REST API só permitirá que o usuário utilize fotos que estejam no seu Álbum [ durante alterações das fotos ].
                // Então ele deverá adicionar uma foto ao álbum caso queira trocar.
                // Entretanto, se ele alterar a foto a foto utilizada anteriormente permanecerá no Álbum.
                // Fazemos isso para que não haja a necessidade de criar um novo registro de foto padrão para cada novo animal cadastrado.

                // Verificando se a atual foto do animal está no Álbum do Animal.
                    let isPhotoInAlbum = await AlbumAnimal.findOne({
                        where: { 
                            cod_animal: cod_animal,
                        },
                        include: [{
                            model: FotoAnimal,
                            where: { 
                                uid_foto: animal.foto
                            },
                        }],
                        nest: true,
                        raw: true
                    })
                    .then((result) => {
                        if (!result){
                            return false;
                        }
                        return true;
                    })
                    .catch((error) => {
                        let customErr = new Error('Algo inesperado aconteceu ao retornar a foto do animal ao padrão. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';
            
                        return next( customErr );
                    });
                // --------------------------------------------------------------

                // Aplicando a foto padrão aos dados do Animal.
                    return await Animal.update({
                        foto: defaultPhotoAnimal
                    }, {
                        where: { 
                            cod_animal: req.params.codAnimal
                        }
                    })
                    .then( async (result) => {

                        if (!isPhotoInAlbum && !possibleDefaultPhotoAnimal.includes(animal.foto)){
                            // Se a foto do animal não estiver no Álbum do animal e não for uma das fotos padrão... Remova-a.
                            // Isso só vai acontecer em casos extremos, caso algo errado aconteceu durante a atribuição de uma foto diferente do padrão ao animal e seu álbum.

                            let actualAnimalPhoto_Path = path.resolve(__dirname, '../uploads/images/usersAnimalPhotos/', animal.foto);
                            if (fs.existsSync(actualAnimalPhoto_Path)){
                                fs.unlink(actualAnimalPhoto_Path, () => {});
                            }
                            
                        }

                        // Início da construção do objeto que vai ser enviado na resposta.

                            let updatedAnimal = await Animal.findByPk(cod_animal, {
                                raw: true
                            });

                            // Início da adição de atributos extras ao objeto.

                                // Adicionando o end-point para exibição da foto do animal.
                                    updatedAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${updatedAnimal.foto}`
                                // --------------------------------------------------------

                                // Adicionando o end-point para listagem de álbuns do animal.
                                    updatedAnimal.lista_albuns = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllFromAnimal=${updatedAnimal.cod_animal}`
                                // ----------------------------------------------------------

                            // Fim da adição de atributos extras ao objeto.
                        // Fim da construção do objeto que vai ser enviado na resposta.
                        return res.status(200).json({
                            mensagem: 'A foto do animal foi redefinida para o padrão.',
                            animal: updatedAnimal
                        });

                    })
                    .catch((error) => {
                        console.error('Algo inesperado aconteceu ao atualizar os dados do animal.', error);
        
                        let customErr = new Error('Algo inesperado aconteceu ao atualizar os dados do animal. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';
            
                        return next( customErr );
                    })
                // --------------------------------------------

            // Fim do retorno da foto do animal para o padrão.
        }

        if (operacao == 'update'){

            // Verificando se o pacote da requisição tem conteúdo.
                if (!req.headers['content-type']){
                    return res.status(400).json({
                        mensagem: 'Dados não foram encontrados na requisição',
                        code: 'INVALID_REQUEST_CONTENT'
                    })
                }
            // ---------------------------------------------------

            // Início do tratamento de alterações nos campos para arquivos (req.headers.content-type == multipart/form-data).
                
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

                    // Início do gerenciamento de arquivos do usuário para a foto do animal.

                        const multerStorage = multer.diskStorage({
                            destination: (req, file, cb) => {
                                cb(null, path.resolve(__dirname, '../uploads/tmp'))
                            },
                            filename: (req, file, cb) => {
                                cb(null, `${uuid.v4()}${path.extname(file.originalname)}`)
                            }
                        })

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
                
                                    console.error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário para o animal. - multerError:', error);
                
                                    let customErr = new Error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário. Entre em contato com o administrador.');
                                    customErr.status = 500;
                                    customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';
                
                                    return next( customErr );

                                }
                                
                                if (error) {
                                    console.error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário para o animal. - commonErr: ', error);
                
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
                                let possibleDefaultPhotoAnimal = [
                                    'default_dog_01.jpeg',
                                    'default_dog_02.jpeg',
                                    'default_cat_01.jpeg',
                                    'default_cat_02.jpeg',
                                    'default_unknown_pet.jpeg'
                                ];

                                let originalFile_name = animal.foto;
                                let originalFile_path = path.resolve(__dirname, '../uploads/images/usersAnimalPhotos/', animal.foto);

                                let sentFile_path = req.files.foto[0].path;

                                let newFile_name = `${uuid.v4()}-${moment().unix()}.jpeg`;
                                let newFile_path = path.resolve(__dirname, '../uploads/tmp/', newFile_name);
                                let newFile_dest = path.resolve(__dirname, '../uploads/images/usersAnimalPhotos/', newFile_name);

                                // console.log('Iniciando processamento da foto do animal do usuário...');

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

                                            // Início da coleta de albuns do animal.
                                                let albuns = await AlbumAnimal.findAll({
                                                    where: {
                                                        cod_animal: cod_animal
                                                    },
                                                    raw: true,
                                                    transaction
                                                })
                                            // Fim da coleta de albuns do animal.
    
                                            // Se um dia o sistema expandir e permitirmos que o animal possua vários álbums...
    
                                                // let targetedAlbum = undefined;
                                                // albuns.forEach((album) => {
                                                //     if (album.titulo == 'Album Criado Pelo Usuario'){
                                                //         targetedAlbum = album.cod_album;
                                                //     }
                                                // });
    
                                            // No caso atual, o álbum de índice 0 sempre será o álbum que criamos por padrão ao cadastrar o animal.
                                                let targetedAlbum = albuns[0];
    
                                            // Início da atribuição de uma nova foto ao álbum do animal.
    
                                                let photoPrefix = undefined;
    
                                                switch(animal.genero){
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
                                                    cod_album: targetedAlbum.cod_album,
                                                    nome: `${photoPrefix} ${animal.nome}`
                                                }, {
                                                    transaction
                                                });

                                                // Início da aplicação de uma atualização de estado no Álbum do Animal.
                                                    await AlbumAnimal.update({
                                                        data_modificacao: new Date()
                                                    }, {
                                                        where: {
                                                            cod_album: targetedAlbum.cod_album
                                                        },
                                                        transaction
                                                    })
                                                // Fim da aplicação de uma atualização de estado no Álbum do Animal.
    
                                            // Fim da atribuição de uma nova foto ao álbum do animal.
    
                                            // Início da verificação de existência da foto inicial do animal em algum Álbum do Animal.
    
                                                let isPhotoInAlbum = await AlbumAnimal.findAll({
                                                    where: { 
                                                        cod_animal: cod_animal,
                                                    },
                                                    include: [{
                                                        model: FotoAnimal,
                                                        where: { 
                                                            uid_foto: animal.foto
                                                        },
                                                    }],
                                                    nest: true,
                                                    raw: true,
                                                    transaction
                                                })
                                                .then((result) => {
                                                    if (result.length < 1){
                                                        return false;
                                                    }
                                                    return true;
                                                })
    
                                                // console.log('Photo in Album?', isPhotoInAlbum);
    
                                            // Fim da verificação de existência da foto inicial do animal em algum Álbum do Animal.
                                            
                                            // Início da remoção da foto inicial sob determinada condição.
                                                if (!isPhotoInAlbum && !possibleDefaultPhotoAnimal.includes(originalFile_name)){
                                                    // Se a foto inicial do animal não estiver nos Álbuns do animal e não for uma das fotos padrão... Remova-a.
                                                    // Isso só vai acontecer em casos extremos, caso algo errado aconteceu durante uma das execuções desse processo de atualização da foto do animal.
                                                    if (fs.existsSync(originalFile_path)){
                                                        fs.unlinkSync(originalFile_path);
                                                    }
                                                    
                                                }
                                            // Fim da remoção da foto inicial sob determinada condição.
    
                                            // Início da atualização da foto do animal nos dados do animal.
                                            
                                                await Animal.update({
                                                    foto: newFile_name,
                                                    data_modificacao: new Date()
                                                }, {
                                                    where: {
                                                        cod_animal: cod_animal
                                                    },
                                                    limit: 1,
                                                    transaction
                                                })
                                            
                                            // Fim da atualização da foto do animal nos dados do animal.

                                            // Início da relocação da imagem tratada pelo Sharp para o diretório de imagens dos animais.
                                                mv(newFile_path, newFile_dest, (mvError) => {
                                                    if (mvError){
                                                        console.error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário.', mvError);

                                                        let customErr = new Error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário. Entre em contato com o administrador.');
                                                        customErr.status = 500;
                                                        customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                                                        return next( customErr );
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

                                    // Início do envio da resposta com os dados do animal atualizados.
                                    await Animal.findByPk(cod_animal, {
                                        raw: true
                                    })
                                    .then((resultFindAnimal) => {


                                        // Início da construção do objeto que vai ser enviado na resposta.
                                            // Início da adição de atributos extras ao objeto.

                                                // Adicionando o end-point para exibição da foto do animal.
                                                    resultFindAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${resultFindAnimal.foto}`;
                                                // --------------------------------------------------------

                                                // Adicionando o end-point para listagem de álbuns do animal.
                                                    resultFindAnimal.lista_albuns = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllFromAnimal=${resultFindAnimal.cod_animal}`
                                                // ----------------------------------------------------------

                                            // Fim da adição de atributos extras ao objeto.
                                        // Fim da construção do objeto que vai ser enviado na resposta.

                                        return res.status(200).json({
                                            mensagem: 'A foto do animal foi atualizada com sucesso.',
                                            animal: resultFindAnimal
                                        });

                                    })
                                    .catch((errorFindAnimal) => {

                                        console.error(`Algo inesperado aconteceu ao buscar os dados atualizados do animal.`, errorFindAnimal);

                                        let customErr = new Error('Algo inesperado aconteceu ao buscar os dados atualizados do animal. Entre em contato com o administrador.');
                                        customErr.status = 500;
                                        customErr.code = 'INTERNAL_SERVER_ERROR';

                                        return next( customErr );

                                    })
                                    // Fim do envio da resposta com os dados do animal atualizados.

                                })

                            // Fim do processamento do arquivo de imagem.

                        });

                    // Fim do gerenciamento de arquivos do usuário para a foto do animal.
                        
                };

            // Fim do tratamento de alterações nos campos para arquivos.

            // Início do gerenciamento de alterações em campos comuns dos dados do animal.
                
                // Início das restrições de envio de campos.

                    let hasUnauthorizedField = false;

                    let emptyFields = [];

                    // Lista de campos permitidos.

                        let allowedFields = [
                            'ativo',
                            'nome',
                            'foto',
                            'data_nascimento',
                            'especie',
                            'raca',
                            'genero',
                            'porte',
                            'esta_castrado',
                            'esta_vacinado',
                            'possui_rga',
                            'detalhes_comportamento',
                            'detalhes_saude',
                            'historia'
                        ];

                    // Fim da lista de campos permitidos.

                    // Início da verificação de campos não permitidos.

                        Object.entries(req.body).forEach((pair) => {
                            if (!allowedFields.includes(pair[0])){
                                hasUnauthorizedField = true;
                            };

                            if (String(pair[1]).length == 0){
                                emptyFields.push(String(pair[0]));
                            }
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
                                // Deixando cada parte do nome com a primeira letra maiúscula.
                                partes = pair[1].trim().split(' ');

                                partes.forEach((parte, index) => {
                                    if (parte){
                                        partes[index] = parte[0].toUpperCase() + parte.substr(1);
                                    };
                                })

                                req.body[pair[0]] = partes.join(' ');
                                break;
                            case 'especie':
                                // Deixa a primeira letra da string como maiúscula.
                                req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                                break;
                            case 'raca':
                                req.body[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);
                                break;
                            case 'genero':
                                // Deixa as letras da string em caixa alta.
                                req.body[pair[0]] = pair[1].toUpperCase();
                                break;
                            case 'porte':
                                req.body[pair[0]] = pair[1].toUpperCase();
                                break;
                            default:
                                break;
                        }

                    });

                // Fim da Normalização dos campos recebidos.

                // Início da Validação dos Campos.

                    // Validação "ativo".
                        if (req.body.ativo?.length >= 0){

                            let allowedValues = [
                                '0',
                                '1'
                            ];

                            if (!allowedValues.includes(req.body.ativo)){
                                return res.status(400).json({
                                    mensagem: 'O estado de ativação declarado para o animal é inválido, aceitamos apenas [0] ou [1].',
                                    code: 'INVALID_INPUT_ATIVO'
                                });
                            }

                        }
                    // Fim da validação "ativo".

                    // Validação Nome.
                        if (req.body.nome?.length >= 0){

                            if (req.body.nome.match(/\s{2}|[^A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){
                                return res.status(400).json({
                                    mensagem: 'O nome do animal possui espaços excessivos ou caracteres inválidos.',
                                    code: 'INVALID_INPUT_NOME'
                                });
                            }

                            if (req.body.nome.length === 0 || req.body.nome.length > 50){
                                return res.status(400).json({
                                    mensagem: 'O nome do animal está vazio ou possui mais do que 50 caracteres.',
                                    code: 'INVALID_LENGTH_NOME'
                                });
                            }

                        }
                    // ---------------

                    // Validação Foto.
                        if (req.body.foto?.length >= 0){

                            if (req.body.foto.length === 0){
                                return res.status(400).json({
                                    mensagem: 'O uid do campo de foto do animal está vazio.',
                                    code: 'INVALID_INPUT_FOTO'
                                });
                            }

                            // Verificando se a foto selecionada está no Álbum do Animal.

                                let isSelectedPhotoInAlbum = await AlbumAnimal.findOne({
                                    where: { 
                                        cod_animal: cod_animal,
                                    },
                                    include: [{
                                        model: FotoAnimal,
                                        where: { 
                                            uid_foto: req.body.foto,
                                            ativo: 1
                                        },
                                    }],
                                    nest: true,
                                    raw: true
                                })
                                .then((result) => {
                                    if (!result){
                                        return false;
                                    }
                                    return true;
                                })
                                .catch((error) => {
                                    console.error(`Algo inesperado aconteceu ao atualizar os dados do animal.`, error);

                                    let customErr = new Error('Algo inesperado aconteceu ao atualizar os dados do animal. Entre em contato com o administrador.');
                                    customErr.status = 500;
                                    customErr.code = 'INTERNAL_SERVER_ERROR';

                                    return next( customErr );
                                });

                                if (!isSelectedPhotoInAlbum){
                                    return res.status(400).json({
                                        mensagem: 'Só é possível utilizar fotos ativas registradas nos álbuns do animal.',
                                        code: 'INVALID_SELECTION_FOTO'
                                    });
                                }

                            // --------------------------------------------------------------

                        }
                    // ---------------

                    // Validação Data Nascimento.
                        if (req.body.data_nascimento?.length >= 0){

                            if (req.body.data_nascimento.length === 0){

                                // console.log('Erro: Data de nascimento vazia.');
                                return res.status(400).json({
                                    mensagem: 'A data de nascimento do animal está vazia.',
                                    code: 'INVALID_LENGTH_DATA_NASCIMENTO'
                                });

                            } else {

                                // console.log('Data de Nascimento: [' + req.body.data_nascimento + ']');

                                if (!req.body.data_nascimento.match(/^(\d{4})\-([1][0-2]|[0][1-9])\-([0][1-9]|[1-2]\d|[3][0-1])$/g)){
                                    // console.log('Erro: Formato inválido de data!');
                                    return res.status(400).json({
                                        mensagem: 'A data de nascimento do animal está em um formato inválido.',
                                        code: 'INVALID_INPUT_DATA_NASCIMENTO',
                                        exemplo: 'aaaa-mm-dd'
                                    });
                                }
                    
                                // Verificação de ano bissexto

                                    let data_nascimento = req.body.data_nascimento.split('-');

                                    if(data_nascimento[0][2] == 0 && data_nascimento[0][3] == 0){
                                        if (data_nascimento[0] % 400 == 0){
                                            // console.log('Ano bissexto % 400');
                                            if (data_nascimento[1] == 02 && data_nascimento[2] > 29){
                                                return res.status(400).json({
                                                    mensagem: 'A data de nascimento do animal declara um dia inválido para ano bissexto.',
                                                    code: 'INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR'
                                                });
                                            }
                                        } else {
                                            // console.log('Ano não-bissexto % 400');
                                            if (data_nascimento[1] == 02 && data_nascimento[2] > 28){
                                                return res.status(400).json({
                                                    mensagem: 'A data de nascimento do animal declara um dia inválido para ano não-bissexto.',
                                                    code: 'INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR'
                                                });
                                            }
                                        }
                                    } else {
                                        if (data_nascimento[0] % 4 == 0){
                                            // console.log('Ano bissexto % 4');
                                            if (data_nascimento[1] == 02 && data_nascimento[2] > 29){
                                                return res.status(400).json({
                                                    mensagem: 'A data de nascimento do animal declara um dia inválido para ano bissexto.',
                                                    code: 'INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR'
                                                });
                                            }
                                        } else {
                                            // console.log('Ano não-bissexto % 4');
                                            if (data_nascimento[1] == 02 && data_nascimento[2] > 28){
                                                return res.status(400).json({
                                                    mensagem: 'A data de nascimento do animal declara um dia inválido para ano não-bissexto.',
                                                    code: 'INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR'
                                                });
                                            }
                                        }
                                    }
                                // Fim da verificação de ano bissexto.
                                
                                if (data_nascimento[0] < 1900){
                                    return res.status(400).json({
                                        mensagem: 'A data de nascimento do animal é inválida, digite um valor para ano acima de 1900.',
                                        code: 'INVALID_INPUT_DATA_NASCIMENTO'
                                    });
                                }

                                if (new Date(req.body.data_nascimento) > new Date()){
                                    // Se a data informada for maior que o dia atual, não permita continuar.
                                    return res.status(400).json({
                                        mensagem: 'A data de nascimento do animal é inválida, o animal não pode ter nascido no futuro.',
                                        code: 'INVALID_INPUT_DATA_NASCIMENTO'
                                    });
                                }

                            }

                        }
                    // -------------------------

                    // Validação Especie.
                        if (req.body.especie?.length >= 0){

                            let allowedSpecies = [
                                'Cao',
                                'Gato',
                                'Outros'
                            ];

                            if (!allowedSpecies.includes(req.body.especie)){
                                return res.status(400).json({
                                    mensagem: 'A espécie declarada para o animal é inválida.',
                                    code: 'INVALID_INPUT_ESPECIE'
                                });
                            }

                        }
                    // ------------------

                    // Validação Raça.
                        if (req.body.raca?.length >= 0){

                            if (req.body.raca.match(/\s{2}|[^A-Za-zÀ-ÖØ-öø-ÿ ]+/g)){
                                return res.status(400).json({
                                    mensagem: 'A declaração da raça do animal possui espaços excessivos ou caracteres inválidos.',
                                    code: 'INVALID_INPUT_RACA'
                                });
                            }

                            if (req.body.raca.length == 0 || req.body.raca.length > 20){
                                return res.status(400).json({
                                    mensagem: 'A declaração da raça do animal está vazia ou possui mais do que 20 caracteres.',
                                    code: 'INVALID_LENGTH_RACA'
                                });
                            }

                        }
                    // ---------------

                    // Validação Gênero.
                        if (req.body.genero?.length >= 0){

                            let allowedGenres = [
                                'M',
                                'F'
                            ];

                            if (!allowedGenres.includes(req.body.genero)){
                                return res.status(400).json({
                                    mensagem: 'O genero declarado para o animal é inválido.',
                                    code: 'INVALID_INPUT_GENERO'
                                });
                            }
                            
                        }
                    // -----------------

                    // Validação Porte.
                        if (req.body.porte?.length >= 0){

                            let allowedSize = [
                                'P',
                                'M',
                                'G'
                            ];

                            if (!allowedSize.includes(req.body.porte)){
                                return res.status(400).json({
                                    mensagem: 'O porte (tamanho) declarado para o animal é inválido.',
                                    code: 'INVALID_INPUT_PORTE'
                                });
                            }
                            
                        }
                    // ----------------

                    // Validação Está Castrado?
                        if (req.body.esta_castrado?.length >= 0){

                            let allowedValues = [
                                '0',
                                '1'
                            ];

                            if (!allowedValues.includes(req.body.esta_castrado)){
                                return res.status(400).json({
                                    mensagem: 'O estado de castração declarado para o animal é inválido',
                                    code: 'INVALID_INPUT_ESTA_CASTRADO'
                                });
                            }

                            // Se chegou aqui, o valor é válido. Converta para Number.
                                req.body.esta_castrado = Number(req.body.esta_castrado);
                            // Fim da conversão do estado de castração para Number.

                        }
                    // ------------------------

                    // Validação Está Vacinado?
                        if (req.body.esta_vacinado?.length >= 0){

                            let allowedValues = [
                                '0',
                                '1'
                            ];

                            if (!allowedValues.includes(req.body.esta_vacinado)){
                                return res.status(400).json({
                                    mensagem: 'O estado de vacinação declarado para o animal é inválido',
                                    code: 'INVALID_INPUT_ESTA_VACINADO'
                                });
                            }

                            // Se chegou aqui, o valor é válido. Converta para Number.
                                req.body.esta_vacinado = Number(req.body.esta_vacinado);
                            // Fim da conversão do estado de vacinação para Number.
                            
                        }
                    // ------------------------

                    // Validação Possui RGA?
                        if (req.body.possui_rga?.length >= 0){

                            let allowedValues = [
                                '0',
                                '1'
                            ];

                            if (!allowedValues.includes(req.body.possui_rga)){
                                return res.status(400).json({
                                    mensagem: 'O estado de posse de RGA é inválido',
                                    code: 'INVALID_INPUT_ESTA_VACINADO'
                                });
                            }

                            // Se chegou aqui, o valor é válido. Converta para Number.
                                req.body.possui_rga = Number(req.body.possui_rga);
                            // Fim da conversão do estado de vacinação para Number.
                            
                        }
                    // ------------------------
                    
                    // Validação Detalhes comportamento.
                        if (req.body.detalhes_comportamento?.length >= 0){

                            if (req.body.detalhes_comportamento.length == 0 || req.body.detalhes_comportamento.length > 255 ){
                                return res.status(400).json({
                                    mensagem: 'O campo de detalhes de comportamento do animal está vazio ou possui mais do que 255 caracteres.',
                                    code: 'INVALID_LENGTH_DETALHES_COMPORTAMENTO'
                                });
                            }

                        }
                    // ---------------------------------

                    // Validação Detalhes saúde.
                        if (req.body.detalhes_saude?.length >= 0){

                            if (req.body.detalhes_saude.length == 0 || req.body.detalhes_saude.length > 255 ){
                                return res.status(400).json({
                                    mensagem: 'O campo de detalhes de saúde do animal está vazio ou possui mais do que 255 caracteres.',
                                    code: 'INVALID_LENGTH_DETALHES_SAUDE'
                                });
                            }

                        }
                    // -------------------------

                    // Validação História.
                        if (req.body.historia?.length >= 0){

                            if (req.body.historia.length == 0){
                                return res.status(400).json({
                                    mensagem: 'O campo de detalhes de saúde do animal está vazio ou possui mais do que 255 caracteres.',
                                    code: 'INVALID_LENGTH_HISTORIA'
                                });
                            }

                        }
                    // -------------------

                // Fim da Validação dos Campos.

                // Início da efetivação das alterações.

                    return await Animal.update(req.body, {
                        where: {
                            cod_animal: req.params.codAnimal
                        },
                        limit: 1
                    })
                    .then( async (resultUpdate) => {

                        if (req.body.nome){
                        // Atualiza o nome do álbum primário do animal caso o nome do animal for alterado.
                            await AlbumAnimal.update({
                                titulo: `Álbum ${req.body.nome}`,
                                data_modificacao: new Date()
                            }, {
                                where: {
                                    titulo: `Álbum ${animal.nome}`,
                                    cod_animal: req.params.codAnimal,
                                },
                                limit: 1
                            });
                        }

                        await Animal.findByPk(req.params.codAnimal, {
                            raw: true
                        })
                        .then((updatedResult) => {

                            // Início da construção do objeto que vai ser enviado na resposta.
                                // Início da adição de atributos extras ao objeto.

                                    // Adicionando o end-point para exibição da foto do animal.
                                        updatedResult.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${updatedResult.foto}`
                                    // --------------------------------------------------------

                                    // Adicionando o end-point para listagem de álbuns do animal.
                                        updatedResult.lista_albuns = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllFromAnimal=${updatedResult.cod_animal}`
                                    // ----------------------------------------------------------

                                // Fim da adição de atributos extras ao objeto.
                            // Fim da construção do objeto que vai ser enviado na resposta.

                            return res.status(200).json({
                                mensagem: 'Os dados do animal foram atualizados com sucesso.',
                                animal: updatedResult
                            });


                        })
                        .catch((updatedError) => {
                            console.error(`Algo inesperado aconteceu ao buscar os dados atualizados do animal.`, updatedError);

                            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados atualizados do animal. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR';

                            return next( customErr );
                        });
                        
                    })
                    .catch((errorUpdate) => {
                        console.error(`Algo inesperado aconteceu ao atualizar os dados do animal.`, errorUpdate);

                        let customErr = new Error('Algo inesperado aconteceu ao atualizar os dados do animal. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';

                        return next( customErr );
                    });

                // Fim da efetivação das alterações.

            // Fim do gerenciamento de alterações em campos comuns dos dados do animal.

        };

        if (operacao == 'update_adopted_animal'){

            // Permite a alteração de animais que estão no histórico de animais adotados.
            // Chamada única pois possui restrições específicas.

            // Início da verificação de conteúdo do pacote de dados da requisição.
                if (!req.headers['content-type']){
                    return res.status(400).json({
                        mensagem: 'Dados não foram encontrados na requisição',
                        code: 'INVALID_REQUEST_CONTENT'
                    });
                }
            // Fim da verificação de conteúdo do pacote de dados da requisição.

            // Início do gerenciamento de alterações em campos comuns dos dados do recurso.

                // Início das restrições de envio de campos.

                    let hasUnauthorizedField = false;
                    let emptyFields = [];   // Se campos vazios forem detectados, envie (400 - INVALID_REQUEST_FIELDS)
                    let missingFields = []; // Receberá os campos obrigatórios que faltaram na requisição.

                    // Lista de campos permitidos.

                        let allowedFields = [
                            'ativo'
                        ];

                    // Fim da lista de campos permitidos.

                    // Lista de campos obrigatórios.

                        let requiredFields = [
                            'ativo'
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
                    });

                // Fim da Normalização dos campos recebidos.

                // Início da Validação dos campos.

                    // Validação do campo "ativo".
                        if (req.body.ativo?.length >= 0){

                            let allowedValues = [
                                '0',
                                '1'
                            ];

                            if (!allowedValues.includes(req.body.ativo)){
                                return res.status(400).json({
                                    mensagem: 'O estado de ativação declarado para o animal é inválido, aceitamos apenas [0] ou [1].',
                                    code: 'INVALID_INPUT_ATIVO'
                                });
                            }

                        }
                    // Fim da validação do campo "ativo".
                    
                // Fim da Validação dos campos.

                // Início da efetivação das alterações dos dados do recurso.

                    try {

                        let dataAtual = new Date();

                        await database.transaction( async (transaction) => {

                            req.body.data_modificacao = dataAtual;

                            await Animal.update(req.body, {
                                where: {
                                    cod_animal: req.params.codAnimal
                                },
                                limit: 1,
                                transaction
                            });

                        })
                        .catch((error) => {
                            // Se qualquer erro acontecer no bloco acima, cairemos em CATCH do bloco TRY e faremos o rollback;
                            throw new Error(error);
                        })

                        // Auto-commit.
                    } catch (error) {
                        // Rollback.

                        console.error('Algo inesperado aconteceu ao alterar o estado de ativação de um animal do histórico de animais adotados.', error);

                        let customErr = new Error('Algo inesperado aconteceu ao alterar o estado de ativação de um animal do histórico de animais adotados. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';

                        return next( customErr );
                    }

                // Fim da efetivação das alterações dos dados do recurso.

                // Início do envio da resposta com os dados atualizados do recurso.

                    let updatedAnimal = undefined;

                    updatedAnimal = await Animal.findByPk(req.params.codAnimal);

                    if (!updatedAnimal){
                        console.error('Algo inesperado aconteceu ao buscar os dados do animal do histórico de animais adotados após a alteração do seu estado de ativação.');

                        let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do animal do histórico de animais adotados após a alteração do seu estado de ativação. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';

                        return next( customErr );
                    }

                    // Início da inclusão de atributos extra.
                        updatedAnimal = await updatedAnimal.get({ plain: true });

                        // Separando os dados do objeto.
                            // ...
                        // Fim da separação dos dados.

                        // Inclusão de atributos essenciais aos clientes.
                            updatedAnimal.download_foto = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/${updatedAnimal.foto}`;
                            updatedAnimal.detalhes_animal = `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${updatedAnimal.cod_animal}`;
                        // Fim da inclusão de atributos essenciais aos clientes.

                        // Unindo os dados em objeto em um objeto.
                            // ...
                        // Fim da união dos dados em um objeto.

                    // Fim da inclusão de atributos extra.

                    // Início do envio da Resposta.
                        return res.status(200).json({
                            mensagem: 'Os dados do animal foram atualizados com sucesso',
                            animal: updatedAnimal
                        })
                    // Fim do envio da Resposta.
                // Fim do envio da resposta com os dados atualizados do recurso.

            // Fim do gerenciamento de alterações em campos comuns dos dados do recurso.

        };

    // Fim dos processos de alteração dos dados do animal.
    
});

// Exportações.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
