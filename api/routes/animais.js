// Importações.
    const router = require('express').Router();

    // Conexões.
        const database = require('../../configs/database').connection;

    // Models.
        const Animal = require('../models/Animal');
        const AlbumAnimal = require('../models/AlbumAnimal');

        const Usuario = require('../models/Usuario');
        const Bloqueio = require('../models/Bloqueio');
    
    // Utilidades.
        const { Op } = require('sequelize');

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

    // Início da configuração das possíveis operações de busca + verificação dos parâmetros para cada caso.

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

                let allowedEspecies = [
                    'Cão',
                    'Gato',
                    'Outros'
                ];

                if (!allowedEspecies.includes(req.body.especie)){
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
                    foto_atual: defaultAnimalPicture,
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
                    case 'M': 
                        albumPrefix = 'Álbum do';
                        break;
                    case 'F':
                        albumPrefix = 'Álbum da';
                        break;
                    default: 
                        albumPrefix = 'Álbum';
                        break;
                }

                const albumAnimal = await AlbumAnimal.create({
                    cod_animal: animal.cod_animal,
                    titulo_album: `${albumPrefix} ${animal.nome}`,
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

router.patch('/:codAnimal', (req, res, next) => {

});

// Exportações.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
