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

// Controllers.
    // const controller = require('../controllers/...');

// Rotas.
router.get('/', async (req, res, next) => {
    /* 5 formas de listar os dados dos animais cadastrados.
     1. Lista todos os animais;
     2. Lista todos os animais de usuários ativos;
     3. Lista todos os animais de usuários inativos;
     4. Lista todos os animais de um usuário específico;
     5. Lista os dados de um animal específico.
    */

    // Início da Verificação dos Parâmetros da Rota.

        // As verificações dos parâmetros desta rota acontecem nas configurações das opções de busca.

    // Fim da verificação dos parâmetros da Rota.

    // Início das Restrições de acesso à rota.

        // Apenas aplicações Pet Adote e Usuários das aplicações Pet Adote poderão acessar a listagem dos animais dos usuários.
        // Além disso, usuários só podem visualizar animais de usuários ativos e que não são de usuários que estão em sua lista de bloqueios.
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
            if (usuario && !(req.query.getAllActive == 1 || req.query.getAllFromUser || req.query.getOne)){
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

                if (req.query?.getAllActive == '1') { operacao = 'getAllActive'; };

                if (req.query?.getAllActive == '0') { operacao = 'getAllNotActive'; };

                if (req.query?.getAllFromUser) { operacao = 'getAllFromUser'; };

                if (req.query?.getOne) { operacao = 'getOne'; };

                break;
            case 2:
                if (req.query?.page && req.query?.limit) { operacao = 'getAll' };

                if (req.query?.getAllActive == '1' && req.query?.page) { operacao = 'getAllActive'; };

                if (req.query?.getAllActive == '0' && req.query?.page) { operacao = 'getAllNotActive'; };

                if (req.query?.getAllFromUser && req.query?.page) { operacao = 'getAllFromUser'; };

                break;
            case 3:
                if (req.query?.getAllActive == '1' && req.query?.page && req.query?.limit) { operacao = 'getAllActive'; };

                if (req.query?.getAllActive == '0' && req.query?.page && req.query?.limit) { operacao = 'getAllNotActive'; };

                if (req.query?.getAllFromUser && req.query?.page && req.query?.limit) { operacao = 'getAllFromUser'; };

                break;
            default:
                break;
        }

    // Fim da configuração das possíveis operações de busca.

    // Início da Validação dos parâmetros.

        if (req.query?.getOne){
            if (String(req.query.getOne).match(/[^\d]+/g)){     // Se "getOne" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID do Animal deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        if (req.query?.getAllFromUser){
            if (String(req.query.getAllFromUser).match(/[^\d]+/g)){     // Se "getAllFromUser" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: 'Requisição inválida - O ID do Usuário deve conter apenas dígitos.',
                    code: 'INVALID_REQUEST_QUERY'
                });
            }
        }

        // Se "page" ou "limit" fores menores que 1, ou for um número real. Entregue BAD_REQUEST.
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

        req.query.getAllFromUser = String(req.query.getAllFromUser);
        req.query.getOne = String(req.query.getOne);

    // Fim da Normalização dos parâmetros.

    // Início do processo de listagem dos animais cadastrados.

        // Início das configurações de paginação.
            let requestedPage = req.query.page || 1;        // Página por padrão será a primeira.
            let paginationLimit = req.query.limit || 10;     // Limite padrão de dados por página = 10;

            let paginationOffset = (requestedPage - 1) * paginationLimit;   // Define o índice de partida para coleta dos dados.
        // Fim das configuração de paginação.

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

            Animal.findAndCountAll({
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhum animal está cadastrado.'
                    });

                }

                // Início da construção do objeto enviado na resposta.
                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais cadastrados.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((animal) => {
                        if (animal.cod_dono){
                            animal.detalhes_dono = `${req.protocol}://${req.get('host')}/usuarios/${animal.cod_dono}`;
                        }

                        if (animal.cod_dono_antigo){
                            // Se foi adotado nos sistemas Pet Adote, possui um dono antigo...
                            animal.detalhes_dono_antigo = `${req.protocol}://${req.get('host')}/usuarios/${animal.cod_dono_antigo}`
                        }

                        animais.push(animal);
                    });
                    
                // Fim da construção do objeto enviado na resposta.
                
                return res.status(200).json({
                    mensagem: 'Lista de todos os animais cadastrados.',
                    total_animais,
                    total_paginas,
                    animais,
                    voltar_pagina,
                    avancar_pagina
                });

            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao listar os animais cadastrados.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os animais cadastrados. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        };

        if (operacao == 'getAllActive'){

            Animal.findAndCountAll({
                include: [{
                    all: true
                }],
                where: {
                    '$dono.esta_ativo$': 1
                },
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true
            })
            .then( async (resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum usuário ativo cadastrou animais.'
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    // Início da verificação da lista de bloqueios e calculo da quantidade de animais que não serão exibidos.
                        let listaBloqueios = undefined;

                        let qtdAnimaisDosBloqueados = undefined;

                        if (usuario) { 

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            qtdAnimaisDosBloqueados = await Animal.count({
                                include: [{
                                    all: true
                                }],
                                where: {
                                    cod_dono: listaBloqueios,
                                    '$dono.esta_ativo$': 1
                                }
                            });

                        };

                    // Fim da verificação da lista de bloqueios e calculo da quantidade de animais que não serão exibidos.

                    let total_animais = resultArr.count - (qtdAnimaisDosBloqueados || 0); // Se qtdAnimaisDosBloqueados estiver como NULL ou UNDEFINED, atribua zero à operação.

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllActive=1&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllActive=1&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais de usuários ativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((animal) => {

                        // Removendo estruturas que agora são desnecessárias.
                            delete animal.dono;
                            delete animal.dono_antigo;
                        // --------------------------------------------------

                        // Início da adição de atributos extras ao objeto.
                            if (animal.cod_dono){
                                animal.detalhes_dono = `${req.protocol}://${req.get('host')}/usuarios/${animal.cod_dono}`;
                            }
                            
                            if (animal.cod_dono_antigo){
                                animal.detalhes_dono_antigo = `${req.protocol}://${req.get('host')}/usuarios/${animal.cod_dono_antigo}`;
                            }
                        // Fim da adição de atributos extras ao objeto.

                        if (usuario){
                            // Se o requisitante for um usuário...
                            if (!listaBloqueios.includes(animal.cod_dono)){
                                // E o dono do animal não estiver na lista de bloqueios do usuário (Bloqueado/Bloqueante)...
                                animais.push(animal);
                            }
                        } else {
                            // Se o requisitante for uma aplicação...
                            animais.push(animal);
                        }
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de todos os animais cadastrados de usuários ativos.',
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.

            })
            .catch((error) =>{

                console.error('Algo inesperado aconteceu ao listar os animais cadastrados que possuem usuários ativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os animais cadastrados que possuem usuários ativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );

            });

        };

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

            Animal.findAndCountAll({
                include: [{
                    all: true
                }],
                where: {
                    '$dono.esta_ativo$': 0
                },
                limit: paginationLimit,
                offset: paginationOffset,
                nest: true,
                raw: true
            })
            .then((resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Nenhum usuário inativo possui animais cadastrados.'
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllActive=0&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllActive=0&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais de usuários inativos.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((animal) => {

                        // Removendo estruturas que agora são desnecessárias.
                            delete animal.dono;
                            delete animal.dono_antigo;
                        // --------------------------------------------------

                        // Início da adição de atributos extras ao objeto.
                            if (animal.cod_dono){
                                animal.detalhes_dono = `${req.protocol}://${req.get('host')}/usuarios/${animal.cod_dono}`;
                            }
                            
                            if (animal.cod_dono_antigo){
                                animal.detalhes_dono_antigo = `${req.protocol}://${req.get('host')}/usuarios/${animal.cod_dono_antigo}`;
                            }
                        // Fim da adição de atributos extras ao objeto.

                        animais.push(animal);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista de todos os animais cadastrados de usuários inativos.',
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.

            })
            .catch((error) => {

                console.error('Algo inesperado aconteceu ao listar os animais cadastrados que possuem usuários inativos.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os animais cadastrados que possuem usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );

            });

        };

        if (operacao == 'getAllFromUser'){

            let dono_recurso = Number(req.query.getAllFromUser);

            // Início da verificação de bloqueios para usuários requisitantes.
                // Se o requisitante for o usuário de uma aplicação, exiba apenas os animais dos usuários que não estão bloqueados por ele, ou bloquearam ele.
                if (usuario?.e_admin == 0) {
                    try {
                        let listaBloqueios = [];    // Lista contendo todos os IDs dos usuários que bloquearam ou foram bloqueados pelo usuário requisitante.

                        listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                        if(listaBloqueios.includes(dono_recurso)){
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }
                    
                    } catch (error) {
                        console.error('Algo inesperado aconteceu ao listar os animais que estão sob a guarda do usuário.', error);
    
                        let customErr = new Error('Algo inesperado aconteceu ao listar os animais que estão sob a guarda do usuário. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR'
                
                        return next( customErr );
                    }
                };
            // Fim da verificação de bloqueios para usuários requisitantes.

            Animal.findAndCountAll({
                where: {
                    cod_dono: dono_recurso
                },
                limit: paginationLimit,
                offset: paginationOffset,
                raw: true
            })
            .then((resultArr) => {

                if (resultArr.count == 0){
                    return res.status(200).json({
                        mensagem: 'Esse usuário ainda não possui nenhum animal sob sua guarda.'
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    let total_animais = resultArr.count;

                    let total_paginas = Math.ceil(total_animais / paginationLimit);

                    let animais = [];

                    let voltar_pagina = undefined;
                    let avancar_pagina = undefined;

                    if (requestedPage > 1 && requestedPage <= total_paginas){
                        voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${dono_recurso}&page=${requestedPage - 1}&limit=${paginationLimit}`;
                    }

                    if (requestedPage < total_paginas){
                        avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/animais/?getAllFromUser=${dono_recurso}&page=${requestedPage + 1}&limit=${paginationLimit}`;
                    } 

                    if (requestedPage > total_paginas){
                        return res.status(404).json({
                            mensagem: 'Você chegou ao final da lista de animais do usuário.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    resultArr.rows.forEach((animal) => {

                        // Início da adição de atributos extras ao objeto.
                            if (animal.cod_dono_antigo){
                                animal.detalhes_dono_antigo = `${req.protocol}://${req.get('host')}/usuarios/${animal.cod_dono_antigo}`;
                            }
                        // Fim da adição de atributos extras ao objeto.
                        
                        animais.push(animal);
                        
                    });

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.

                    return res.status(200).json({
                        mensagem: 'Lista dos animais sob guarda do usuário.',
                        detalhes_dono: `${req.protocol}://${req.get('host')}/usuarios/${dono_recurso}`,
                        total_animais,
                        total_paginas,
                        animais,
                        voltar_pagina,
                        avancar_pagina
                    });

                // Fim do envio da resposta.


            })
            .catch((error) =>{
                console.error('Algo inesperado aconteceu ao listar os animais que estão sob a guarda do usuário.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os animais que estão sob a guarda do usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        };

        if (operacao == 'getOne'){

            let cod_animal = Number(req.query.getOne);

            Animal.findOne({
                include: [{ 
                    all: true
                }],
                where: {
                    cod_animal
                },
                nest: true,
                raw: true,
            })
            .then(async (result) => {

                if (!result){
                    return res.status(404).json({
                        mensagem: 'Nenhum animal está vinculado à esse ID.',
                        code: 'RESOURCE_NOT_FOUND',
                        lista_usuarios: `${req.protocol}://${req.get('host')}/usuarios/`,
                    });
                }

                // Início da construção do objeto enviado na resposta.

                    if (!result.cod_dono_antigo){
                        delete result.dono_antigo;  // Garante que {dono_antigo} só vai existir se "cod_dono_antigo" existir.
                    };

                    let { dono, dono_antigo } = result;

                    delete result.dono;
                    delete result.dono_antigo;

                    let animal = result;

                    // Início da verificação de bloqueios para usuário requisitante.
                    
                        // Se o requisitante for o usuário de uma aplicação, exiba apenas os animais dos usuários que não estão bloqueados por ele, ou bloquearam ele.
                        if (usuario?.e_admin == 0) {
                            let listaBloqueios = [];    // Lista contendo todos os IDs dos usuários que bloquearam ou foram bloqueados pelo usuário requisitante.

                            listaBloqueios = await checkUserBlockList(usuario.cod_usuario);

                            if (listaBloqueios.includes(animal.cod_dono)){
                                return res.status(401).json({
                                    mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                });
                            }
                        }

                    // Fim da verificação de bloqueios para usuário requisitante.

                // Fim da construção do objeto enviado na resposta.

                // Início do envio da resposta.
                    return res.status(200).json({
                        mensagem: 'Exibindo os dados do animal encontrado.',
                        animal,
                        dono,
                        dono_antigo
                    });
                // Fim do envio da resposta.
                
            })
            .catch((error) => {

                console.error('Algo inesperado aconteceu ao buscar os dados do animal.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do animal. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );

            });

        };

        if (!operacao){
            
            return res.status(400).json({
                mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                code: 'BAD_REQUEST'
            });

        };
    // Fim do processo de listagem dos animais cadastrados.

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
            });

            if (hasUnauthorizedField){
                return res.status(400).json({
                    mensagem: 'Algum dos campos enviados é inválido.',
                    code: 'INVALID_REQUEST_FIELDS'
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

                if (req.body.nome.length === 0 || req.body.nome.length > 100){
                    return res.status(400).json({
                        mensagem: 'O nome do animal está vazio ou possui mais do que 100 caracteres.',
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
                    'Cão',
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

            await database.transaction( async (transaction) => {

                const animal = await Animal.create({
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
                    detalhes_comportamento: req.body.detalhes_comportamento,
                    detalhes_saude: req.body.detalhes_saude,
                    historia: req.body.historia
                });

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

                const albumAnimal = await AlbumAnimal.create({
                    cod_animal: animal.cod_animal,
                    titulo: `${albumPrefix} ${animal.nome}`,
                });

                // Início da entrega da mensagem de conclusão do cadastro do animal para o usuário.

                    return res.status(200).json({
                        mensagem: 'Cadastro do animal foi realizado com sucesso! Utilize o "cod_animal" para alterar dados do animal. É possível alterar a foto padrão do animal ao adicionar uma foto ao álbum do animal e depois alterar a "foto_atual" do animal para a nova foto do álbum.',
                        cod_animal: animal.cod_animal
                    });

                // Fim da entrega da mensagem de conclusão do cadastro do animal para o usuário.

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

        // Apenas aplicações Pet Adote e Usuários das aplicações Pet Adote poderão acessar a listagem dos animais dos usuários.

        // Apenas aplicações Pet Adote, usuários de aplicações pet Adote poderão realizar alterações em animais cadastrados.
        // Além disso, o usuário deve ser um adaministrador ou dono do recurso para alterar os dados do animal.
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

    // Captura do código do animal requisitado.
        const cod_animal = req.params.codAnimal;
    // ----------------------------------------

    // Início da verificação do cadastro do animal.
        let animal = await Animal.findByPk(cod_animal, {
            raw: true
        })
        .catch((error) => {

            console.error('Algo inesperado aconteceu ao buscar os dados do animal.', error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do animal. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'
    
            return next( customErr );

        });

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

                break;
            case 1:
                if (req.query?.setDefault == 'foto') { operacao = 'setDefault_Foto' };

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
                    case 'Cão':
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
                    .then((result) => {

                        if (!isPhotoInAlbum && !possibleDefaultPhotoAnimal.includes(animal.foto)){
                            // Se a foto do animal não estiver no Álbum do animal e não for uma das fotos padrão... Remova-a.
                            // Isso só vai acontecer em casos extremos, caso algo errado aconteceu durante a atribuição de uma foto diferente do padrão ao animal e seu álbum.

                            let actualAnimalPhoto_Path = path.resolve(__dirname, '../uploads/images/usersAnimalPhotos/', animal.foto);
                            if (fs.existsSync(actualAnimalPhoto_Path)){
                                fs.unlink(actualAnimalPhoto_Path, () => {});
                            }
                            
                        }

                        return res.status(200).json({
                            mensagem: 'A foto do animal foi redefinida para o padrão.',
                            foto: defaultPhotoAnimal
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
                        mensagem: 'Dados não encontrados na requisição',
                        code: 'INVALID_REQUEST_CONTENT'
                    })
                }
            // ---------------------------------------------------

            // Início do tratamento de alterações nos campos para arquivos (req.headers.content-type == multipart/form-data).
                
                if (req.headers['content-type'].includes('multipart/form-data')){

                    // Início da verificação básica do tamanho do pacote.

                        if (Number(req.headers['content-length']) > (3 * 1024 * 1024)){
                            req.pause();
                            return res.status(413).json({
                                mensagem: 'O arquivo é grande demais. Suportamos arquivos de até 3mb.',
                                code: 'FILE_SIZE_TOO_LARGE'
                            });
                        }

                    // Fim da verificação básica do tamanho do pacote.

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
                            { name: 'foto_animal', maxCount: 1 }
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

                                let sentFile_path = req.files.foto_animal[0].path;

                                let newFile_name = `${uuid.v4()}-${moment().unix()}.jpeg`;
                                let newFile_path = path.resolve(__dirname, '../uploads/tmp/', newFile_name);
                                let newFile_dest = path.resolve(__dirname, '../uploads/images/usersAnimalPhotos/', newFile_name);

                                console.log('Iniciando processamento da foto do animal do usuário...');

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

                                        })
                                        .catch((error) => {
                                            // Se qualquer erro acontecer no bloco acima, cairemos em CATCH do bloco TRY e faremos o rollback;
                                            throw new Error(error);
                                        });
                                        
                                        // Se chegou aqui, o ORM da auto-commit...

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

                                    } catch (error) {

                                        // Se algum erro aconteceu durante o processo acima, o arquivo vai ficar em ".../tmp" e as alterações não serão aplicadas na database.

                                        console.error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário.', error);
    
                                        let customErr = new Error('Algo inesperado aconteceu ao processar a imagem enviada pelo usuário. Entre em contato com o administrador.');
                                        customErr.status = 500;
                                        customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                                        return next( customErr );
                                    }
                                    

                                    return res.status(200).json({
                                        mensagem: 'A foto do animal foi atualizada com sucesso.',
                                        foto: newFile_name
                                    });

                                })

                            // Fim do processamento do arquivo de imagem.

                        });

                    // Fim do gerenciamento de arquivos do usuário para a foto do animal.
                        
                };

            // Fim do tratamento de alterações nos campos para arquivos.

            // Início do gerenciamento de alterações em campos comuns dos dados do animal.
                
                // Início das restrições de envio de campos.

                    let hasUnauthorizedField = false;

                    // Lista de campos permitidos.

                        let allowedFields = [
                            'nome',
                            'foto',
                            'data_nascimento',
                            'especie',
                            'raca',
                            'genero',
                            'porte',
                            'esta_castrado',
                            'esta_vacinado',
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
                        });

                        if (hasUnauthorizedField){
                            return res.status(400).json({
                                mensagem: 'Algum dos campos enviados é inválido.',
                                code: 'INVALID_REQUEST_FIELDS'
                            });
                        }

                    // Fim da verificação de campos não permitidos.

                // Fim da das restrições de envio de campos.

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

                            if (req.body.nome.length === 0 || req.body.nome.length > 100){
                                return res.status(400).json({
                                    mensagem: 'O nome do animal está vazio ou possui mais do que 100 caracteres.',
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
                                            uid_foto: req.body.foto
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
                                        mensagem: 'Só é possível utilizar fotos registradas nos álbuns do animal.',
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
                                'Cão',
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
                    .then((resultUpdate) => {

                        Animal.findByPk(req.params.codAnimal, {
                            raw: true
                        })
                        .then((updatedResult) => {
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

    // Fim dos processos de alteração dos dados do animal.
    
});

// Exportações.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
