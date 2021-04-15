// Importações.
    const router = require('express').Router();

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
    /* 5 formas de listar os dados sobre os álbuns dos animais.
     1. Listar todos os álbuns.
     2. Listar todos os álbuns dos animais cujo dono está ativo.
     3. Listar todos os álbuns dos animais cujo dono está inativo.
     4. Listar todos os álbuns de um animal específico cujo dono está ativo.
     5. Listar os dados de um álbum específico.
    */

    // Início da Verificação dos Parâmetros da Rota.
        // As verificações dos parâmetros desta rota acontecem nas configurações das opções de busca.
    // Fim da verificação dos parâmetros da Rota.

    // Início das Restrições de acesso à rota.

        // Apenas aplicações Pet Adote e Usuários das aplicações Pet Adote poderão acessar os álbuns dos animais dos usuários.
        // Além disso, usuários só podem visualizar os álbuns dos animais de usuários ativos que não estão em sua lista de bloqueios.
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
            // if (usuario && !(req.query.getAllActive == 1 || req.query.getAllFromUser || req.query.getOne)){
            //     return res.status(401).json({
            //         mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
            //         code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
            //     });
            // }

    // Fim das Restrições de acesso à rota.

    // Início da configuração das possíveis operações de busca.

        let operacao = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).

        switch (Object.entries(req.query).length){
            case 0:
                operacao = 'getAll';

                break;
            case 1:
                if (req.query?.page) { operacao = 'getAll' };

                if (req.query?.getAllActive == '1') { operacao = 'getAllActive'; };

                if (req.query?.getAllActive == '0') { operacao = 'getAllNotActive'; };

                if (req.query?.getAllFromAnimal) { operacao = 'getAllFromAnimal'; };

                if (req.query?.getOne) { operacao = 'getOne'; };

                break;
            case 2:
                if (req.query?.page && req.query?.limit) { operacao = 'getAll' };

                if (req.query?.getAllActive == '1' && req.query?.page) { operacao = 'getAllActive'; };

                if (req.query?.getAllActive == '0' && req.query?.page) { operacao = 'getAllNotActive'; };

                if (req.query?.getAllFromAnimal && req.query?.page) { operacao = 'getAllFromAnimal'; };

                break;
            case 3:
                if (req.query?.getAllActive == '1' && req.query?.page && req.query?.limit) { operacao = 'getAllActive'; };

                if (req.query?.getAllActive == '0' && req.query?.page && req.query?.limit) { operacao = 'getAllNotActive'; };

                if (req.query?.getAllFromAnimal && req.query?.page && req.query?.limit) { operacao = 'getAllFromAnimal'; };

                break;
            default:
                break;
        }

    // Fim da configuração das possíveis operações de busca.

    // Início da Validação dos Parâmetros.
    
        if (req.query?.getOne){
            if (String(req.query.getOne).match(/[^\d]+/g)){     // Se "getOne" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID do Álbum do Animal deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        if (req.query?.getAllFromAnimal){
            if (String(req.query.getAllFromAnimal).match(/[^\d]+/g)){     // Se "getAllFromAnimal" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID de um Animal deve conter apenas dígitos.',
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

    // Fim da Validação dos Parâmetros.

    // Início da Normalização dos parâmetros.

        req.query.page = Number(req.query.page);    // Se o valor para a página do sistema de páginação for recebido como String, torne-o um Number.
        req.query.limit = Number(req.query.limit);  // Se o valor para o limite de entrega de dados do sistema de páginação for recebido como String, torne-o um Number.

        req.query.getAllFromAnimal = String(req.query.getAllFromAnimal);
        req.query.getOne = String(req.query.getOne);

    // Fim da Normalização dos parâmetros.
    
    // Início do processo de listagem dos álbuns dos animais.

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
        };

        if (operacao == 'getAll'){

            // Essa operação lista todos os álbuns independente do dono do recurso estar ativo ou não, 
            // será útil para os clientes e administradores realizarem alguns gerenciamentos no futuro.

            // Restrições de Uso.
                if (usuario?.e_admin == 0){
                    // Se o requisitante for um usuário e não for um administrador...
                    return res.status(401).json({
                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
            // -----------------

            AlbumAnimal.findAndCountAll({
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhum álbum foi encontrado, nenhum animal está cadastrado ainda.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_albuns = resultArr.count;

                    let total_paginas = Math.ceil(total_albuns / paginationLimit);

                    let albuns = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de álbuns de animais cadastrados.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((album) => {
                        album.fotos_album = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllFromAlbum=${album.cod_album}`;
                        
                        albuns.push(album);
                    });
                    
                // Fim da construção do objeto enviado na resposta.
                
                return res.status(200).json({
                    mensagem: 'Lista de todos os álbuns de animais cadastrados.',
                    total_albuns,
                    total_paginas,
                    albuns,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os álbuns dos animais cadastrados.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os álbuns dos animais cadastrados. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getAllActive'){

            AlbumAnimal.findAndCountAll({
                include: [{
                    model: Animal,
                    include: [{
                        model: Usuario,
                        as: 'dono'
                    }]
                }],
                where: {
                    '$Animal.dono.esta_ativo$': 1
                },
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum usuário ativo possui animais, portanto não foi possível encontrar os álbuns.'
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    // Início da verificação da lista de bloqueios e calculo da quantidade de álbuns de animais que não serão exibidos.
                        let listaBloqueios = undefined;

                        let qtdAlbunsBloqueados = undefined;

                        if (usuario) { 

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            qtdAlbunsBloqueados = await AlbumAnimal.count({
                                include: [{
                                    model: Animal,
                                    include: [{
                                        model: Usuario,
                                        as: 'dono'
                                    }]
                                }],
                                where: {
                                    '$Animal.cod_dono$': listaBloqueios,
                                    '$Animal.dono.esta_ativo$': 1
                                },
                                limit: paginationLimit,
                                offset: paginationOffset,
                                nest: true,
                                raw: true
                            })

                        };

                    // Fim da verificação da lista de bloqueios e calculo da quantidade de álbuns de animais que não serão exibidos.

                    let total_albuns = resultArr.count - (qtdAlbunsBloqueados || 0); // Se "qtdAlbunsBloqueados" estiver como NULL ou UNDEFINED, atribua zero à operação.

                    let total_paginas = Math.ceil(total_albuns / paginationLimit);

                    let albuns = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllActive=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllActive=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de álbuns de animais de usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((album) => {

                        

                        // Início da adição de atributos extras ao objeto.
                            album.fotos_album = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllFromAlbum=${album.cod_album}`;
                        // Fim da adição de atributos extras ao objeto.

                        if (usuario){
                            // Se o requisitante for um usuário...
                            if (!listaBloqueios.includes(album.Animal.cod_dono)){
                                // E o dono do animal não estiver na lista de bloqueios do usuário (Bloqueado/Bloqueante)...

                                // Removendo estruturas que agora são desnecessárias.
                                    delete album.Animal;
                                // --------------------------------------------------

                                albuns.push(album);
                            }
                        } else {
                            // Se o requisitante for uma aplicação...

                            // Removendo estruturas que agora são desnecessárias.
                                delete album.Animal;
                            // --------------------------------------------------

                            albuns.push(album);
                        }
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de todos os álbuns de animais cadastrados por usuários ativos.',
                        total_albuns,
                        total_paginas,
                        albuns,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.

            })
            .catch((error) =>{

                console.error('Algo inesperado aconteceu ao listar os álbuns de animais cadastrados que possuem usuários ativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os álbuns de animais cadastrados que possuem usuários ativos. Entre em contato com o administrador.');
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

            AlbumAnimal.findAndCountAll({
                include: [{
                    model: Animal,
                    include: [{
                        model: Usuario,
                        as: 'dono'
                    }]
                }],
                where: {
                    '$Animal.dono.esta_ativo$': 0
                },
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum usuário inativo possui animais, portanto não foi possível encontrar os álbuns.'
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    let total_albuns = resultArr.count;

                    let total_paginas = Math.ceil(total_albuns / paginationLimit);

                    let albuns = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllActive=0&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllActive=0&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de álbuns de animais de usuários inativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((album) => {

                        // Removendo estruturas que agora são desnecessárias.
                            delete album.Animal;
                        // --------------------------------------------------

                        // Início da adição de atributos extras ao objeto.
                            album.fotos_album = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllFromAlbum=${album.cod_album}`;
                        // Fim da adição de atributos extras ao objeto.

                        albuns.push(album);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de todos os álbuns de animais cadastrados por usuários inativos.',
                        total_albuns,
                        total_paginas,
                        albuns,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.

            })
            .catch((error) =>{

                console.error('Algo inesperado aconteceu ao listar os álbuns de animais cadastrados que possuem usuários inativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os álbuns de animais cadastrados que possuem usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );

            });
            
        }

        if (operacao == 'getAllFromAnimal'){
            
            let cod_animal = Number(req.query.getAllFromAnimal);

            AlbumAnimal.findAndCountAll({
                include: [{
                    model: Animal,
                    include: [{
                        model: Usuario,
                        as: 'dono'
                    }]
                }],
                where: {
                    cod_animal: cod_animal,
                    '$Animal.dono.esta_ativo$': 1
                },
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum álbum está vínculado ao animal do ID informado. Não há um animal de um usuário ativo cadastrado com esse ID.'
                    });
                }

                // console.log('Result: ', resultArr.rows[0]?.Animal)
                // return res.status(200).json({
                //     resultArr
                // });

                // Início da verificação de bloqueios para usuários requisitantes.
                    // Se o requisitante for o usuário de uma aplicação, exiba apenas os álbuns dos animais dos usuários que não estão bloqueados por ele, ou bloquearam ele.
                    if (usuario?.e_admin == 0) {
                        try {
                            let listaBloqueios = [];    // Lista contendo todos os IDs dos usuários que bloquearam ou foram bloqueados pelo usuário requisitante.

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            if (resultArr.rows[0]?.Animal){
                                if(listaBloqueios.includes(resultArr.rows[0].Animal.cod_dono)){
                                    return res.status(401).json({
                                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                    });
                                }
                            }
                        
                        } catch (error) {
                            console.error('Algo inesperado aconteceu ao listar os álbuns do animal.', error);
        
                            let customErr = new Error('Algo inesperado aconteceu ao listar os álbuns do animal. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR'
                    
                            return next( customErr );
                        }
                    };
                // Fim da verificação de bloqueios para usuários requisitantes.

                // Início da construção do objeto enviado na resposta.

                    let total_albuns = resultArr.count;

                    let total_paginas = Math.ceil(total_albuns / paginationLimit);

                    let albuns = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllFromAnimal=${cod_animal}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/?getAllFromAnimal=${cod_animal}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de álbuns do animal.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((album) => {

                        // Removendo estruturas que agora são desnecessárias.
                            delete album.Animal;
                        // --------------------------------------------------

                        // Início da adição de atributos extras ao objeto.
                            album.fotos_album = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllFromAlbum=${album.cod_album}`;
                        // Fim da adição de atributos extras ao objeto.

                        albuns.push(album);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de todos os álbuns do animal.',
                        total_albuns,
                        total_paginas,
                        albuns,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os álbuns do animal.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os álbuns do animal. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

        if (operacao == 'getOne'){

            let cod_album = req.query.getOne;

            AlbumAnimal.findOne({
                include: [{
                    model: Animal,
                    include: [{
                        model: Usuario,
                        as: 'dono'
                    }]
                }],
                where: {
                    cod_album: cod_album,
                    '$Animal.dono.esta_ativo$': 1
                },
                nest: true,
                raw: true
            })
            .then( async (result) => {

                if (!result) {
                    return res.status(404).json({
                        mensagem: 'Nenhum álbum está vínculado ao ID fornecido. O dono do animal pode não estar ativo, ou o álbum não existir.',
                        code: 'RESOURCE_NOT_FOUND',
                        lista_albuns: `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/`,
                    });
                }

                // return res.status(200).json({
                //     result
                // });

                // Início da verificação de bloqueios para usuários requisitantes.
                    // Se o requisitante for o usuário de uma aplicação, exiba apenas os álbuns dos animais dos usuários que não estão bloqueados por ele, ou bloquearam ele.
                    if (usuario?.e_admin == 0) {
                        try {
                            let listaBloqueios = [];    // Lista contendo todos os IDs dos usuários que bloquearam ou foram bloqueados pelo usuário requisitante.

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            if (result.Animal){
                                if(listaBloqueios.includes(result.Animal.cod_dono)){
                                    return res.status(401).json({
                                        mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                    });
                                }
                            }
                        
                        } catch (error) {
                            console.error('Algo inesperado aconteceu ao exibir dados sobre o álbum.', error);
        
                            let customErr = new Error('Algo inesperado aconteceu ao exibir dados sobre o álbum. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR'
                    
                            return next( customErr );
                        }
                    };
                // Fim da verificação de bloqueios para usuários requisitantes.

                // Início da construção do objeto enviado na resposta.

                    // Removendo estruturas que agora são desnecessárias.
                        delete result.Animal;
                    // --------------------------------------------------

                    // Início da adição de atributos extras ao objeto.
                        result.fotos_album = `${req.protocol}://${req.get('host')}/usuarios/animais/albuns/fotos/?getAllFromAlbum=${result.cod_album}`;
                    // Fim da adição de atributos extras ao objeto.

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Exibindo os dados do álbum do animal.',
                        result
                    });

                // Fim do envio da resposta.

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao exibir os dados do álbum do animal.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao exibir os dados do álbum do animal. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        }

    // Fim do processo de listagem dos álbuns dos animais.
});

// Exportações.
module.exports = router;