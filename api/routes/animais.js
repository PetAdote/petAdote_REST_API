// Importações.
    const router = require('express').Router();

    // Models.
        const Animal = require('../models/Animal');
        const Usuario = require('../models/Usuario');
        const Bloqueio = require('../models/Bloqueio');
    
    // Utilidades.
        const { Op } = require('sequelize');

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

        if (String(req.query).includes('&')){

            return res.status(400).json({
                mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                code: 'BAD_REQUEST'
            });

        }

    // Fim da verificação dos parâmetros da Rota.

    // Início das Restrições de acesso à rota.

        // Apenas aplicações Pet Adote e Usuários das aplicações Pet Adote poderão acessar a listagem dos animais dos usuários.
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

        // Se o usuário da aplicação estiver requisitando qualquer rota além de "getAllActive", não permita o acesso.
            if (usuario && !(req.query.getAllActive == 1 || req.query.getAllFromUser || req.query.getOne)){
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }

    // Fim das Restrições de acesso à rota.

    // Início da configuração das possíveis operações de busca.

        let operacao = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).
    
        if (Object.entries(req.query).length == 0){
            operacao = 'getAll';
        };

        if (req.query?.getAllActive == '1'){     // Utilizando "Optional Chaining" do Javascript. (query existe? Se sim, verifique se x atributo existe.)
            // Exemplo - "GET: .../usuarios/animais/?getAllActive=1"
            operacao = 'getAllActive';
        };

        if (req.query?.getAllActive == '0'){
            operacao = 'getAllNotActive';
        };

        if (req.query?.getAllFromUser){

            if (req.query.getAllFromUser.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
                let customErr = new Error('Requisição inválida - O ID do Usuário deve conter apenas dígitos.');
                customErr.status = 400;
                customErr.code = 'INVALID_REQUEST_QUERY';
                return next(customErr);
            }

            operacao = 'getAllFromUser';
        };

        if (req.query?.getOne){

            if (req.query.getOne.match(/[^\d]+/g)){     // Se 'getOne' conter algo diferente do esperado.
                let customErr = new Error('Requisição inválida - O ID do Animal deve conter apenas dígitos.');
                customErr.status = 400;
                customErr.code = 'INVALID_REQUEST_QUERY';
                return next(customErr);
            }

            operacao = 'getOne';
        }
    // Fim da configuração das possíveis operações de busca.

    // Início do processo de listagem dos animais cadastrados.
        if (operacao == 'getAll'){

            Animal.findAndCountAll({
                include: [{
                    model: Usuario,
                    as: 'dono'
                }],
                nest: true,
                raw: true
            })
            .then((resultArr) => {

                if (resultArr.count === 0){

                    return res.status(200).json({
                        mensagem: 'Nenhum animal está cadastrado.'
                    });

                }

                let total_animais = resultArr.count;
                let animais = [];

                resultArr.rows.forEach((animal) => {
                    animais.push({ 
                        cod_animal: animal.cod_animal,
                        detalhes: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${animal.cod_animal}`
                    });
                });

                return res.status(200).json({
                    mensagem: 'Lista de todos os animais cadastrados.',
                    total_animais,
                    animais
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
                nest: true,
                raw: true
            })
            .then((result) => {

                if (result) {

                    if (result.count === 0){

                        return res.status(200).json({
                            mensagem: 'Nenhum animal com usuários ativos está cadastrado.'
                        });

                    }

                    let total_animais = result.count;
                    let animais = [];

                    // Início do processamento da resposta caso o requisitante for o usuário de uma aplicação.

                        // Se o requisitante for o usuário de uma aplicação, exiba apenas os animais dos usuários que não estão bloqueados por ele, ou bloquearam ele.
                        if (usuario) {

                            total_animais = 0;          // Vamos ter que incrementar à cada animal passado pra lista que será exibida pro usuário.
                            let listaBloqueios = [];    // Lista contendo todos os IDs dos usuários que bloquearam ou foram bloqueados pelo usuário requisitante.

                            return Bloqueio.findAll({ 
                                where: {
                                    [Op.or]: [{
                                        bloqueado: usuario.cod_usuario
                                    }, {
                                        bloqueante: usuario.cod_usuario
                                    }]
                                },
                                raw: true
                            })
                            .then((resultBloqueiosArr) => {

                                if(resultBloqueiosArr){

                                    // console.log('resultBloqueiosArr', resultBloqueiosArr);

                                    resultBloqueiosArr.forEach((bloqueio) => {
                                        // Se o usuário requisitante bloqueou alguém, verifique se esse alguém está na lista de bloqueios... Se não tiver? Adicione.
                                        if (bloqueio.bloqueante == usuario.cod_usuario){
                                            if(!listaBloqueios.includes(bloqueio.bloqueado)){
                                                listaBloqueios.push(bloqueio.bloqueado);
                                            }
                                        }

                                        // Se o usuário requisitante foi bloqueado por alguém, verifique se esse alguém está na lista de bloqueios... Se não tiver? Adicione.
                                        if (bloqueio.bloqueado == usuario.cod_usuario){
                                            if(!listaBloqueios.includes(bloqueio.bloqueante)){
                                                listaBloqueios.push(bloqueio.bloqueante)
                                            };
                                        };
                                    });

                                    // console.log('listaBloqueios', listaBloqueios);

                                    result.rows.forEach((animal) => {
                                        if(!listaBloqueios.includes(animal.dono.cod_usuario)){  // Se o dono do animal encontrado não estiver na lista de bloqueios do usuário requisitante, liste-o.
                                            total_animais += 1;
                                            animais.push({
                                                cod_animal: animal.cod_animal,
                                                detalhes: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${animal.cod_animal}`
                                            });
                                        }
                                    });

                                    return res.status(200).json({
                                        mensagem: 'Lista de todos os animais cadastrados.',
                                        total_animais,
                                        animais
                                    });

                                };

                            })
                            .catch((error) => {
                                console.error('Algo inesperado aconteceu ao listar os animais cadastrados.', error);
            
                                let customErr = new Error('Algo inesperado aconteceu ao listar os animais cadastrados. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR'
                        
                                return next( customErr );
                            });

                            // Conclusão dessa resposta no caso do requisitante ser um usuário.
                        };

                    // Fim do processamento da resposta caso o requisitante for o usuário de uma aplicação.

                    result.rows.forEach((row) => {
                        animais.push({ 
                            cod_animal: row.cod_animal,
                            detalhes: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${row.cod_animal}`
                        });
                    });

                    return res.status(200).json({
                        mensagem: 'Lista de todos os animais de usuários ativos.',
                        total_animais,
                        animais
                    });

                }

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

            Animal.findAndCountAll({
                include: [{
                    all: true
                }],
                where: {
                    '$dono.esta_ativo$': 0
                },
                nest: true,
                raw: true
            })
            .then((result) => {

                if (result) {

                    if (result.count === 0){

                        return res.status(200).json({
                            mensagem: 'Nenhum animal com usuários inativos está cadastrado.'
                        });

                    }

                    let total_animais = result.count;
                    let animais = [];

                    result.rows.forEach((row) => {
                        animais.push({ 
                            cod_animal: row.cod_animal,
                            detalhes: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${row.cod_animal}`
                        });
                    });

                    return res.status(200).json({
                        mensagem: 'Lista de todos os animais de usuários inativos.',
                        total_animais,
                        animais
                    });

                }

            })
            .catch((error) =>{
                console.error('Algo inesperado aconteceu ao listar os animais cadastrados que possuem usuários inativos.', error);
    
                let customErr = new Error('lgo inesperado aconteceu ao listar os animais cadastrados que possuem usuários inativos. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR'
        
                return next( customErr );
            });

        };

        if (operacao == 'getAllFromUser'){

            let cod_usuario = Number(req.query.getAllFromUser);

            // Início da verificação de bloqueios para usuários requisitantes.
                // Se o requisitante for o usuário de uma aplicação, exiba apenas os animais dos usuários que não estão bloqueados por ele, ou bloquearam ele.
                if (usuario) {

                    try {
                        let listaBloqueios = [];    // Lista contendo todos os IDs dos usuários que bloquearam ou foram bloqueados pelo usuário requisitante.

                        let arrBloqueios = await Bloqueio.findAll({ 
                            where: {
                                [Op.or]: [{
                                    bloqueado: usuario.cod_usuario
                                }, {
                                    bloqueante: usuario.cod_usuario
                                }]
                            },
                            raw: true
                        });

                        if (arrBloqueios.length > 0){

                            // console.log('resultBloqueiosArr', arrBloqueios);

                            arrBloqueios.forEach((bloqueio) => {
                                // Se o usuário requisitante bloqueou alguém, verifique se esse alguém está na lista de bloqueios... Se não tiver? Adicione.
                                if (bloqueio.bloqueante == usuario.cod_usuario){
                                    if(!listaBloqueios.includes(bloqueio.bloqueado)){
                                        listaBloqueios.push(bloqueio.bloqueado);
                                    }
                                }

                                // Se o usuário requisitante foi bloqueado por alguém, verifique se esse alguém está na lista de bloqueios... Se não tiver? Adicione.
                                if (bloqueio.bloqueado == usuario.cod_usuario){
                                    if(!listaBloqueios.includes(bloqueio.bloqueante)){
                                        listaBloqueios.push(bloqueio.bloqueante)
                                    };
                                };
                            });

                            // console.log('listaBloqueios', listaBloqueios);

                            if(listaBloqueios.includes(cod_usuario)){
                                return res.status(401).json({
                                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                });
                            }

                        }
                    
                    } catch (error) {
                        console.error('Algo inesperado aconteceu ao listar os animais cadastrados.', error);
        
                        let customErr = new Error('Algo inesperado aconteceu ao listar os animais cadastrados. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR'
                
                        return next( customErr );
                    }
                    // Conclusão dessa resposta no caso do requisitante ser um usuário.
                };
            // Fim da verificação de bloqueios para usuários requisitantes.

            Animal.findAndCountAll({
                include: [{
                    all: true
                }],
                where: {
                    cod_dono: cod_usuario
                },
                nest: true,
                raw: true
            })
            .then((result) => {

                if (result) {

                    if (result.count === 0){

                        return res.status(200).json({
                            mensagem: 'Esse usuário ainda não cadastrou nenhum animal.'
                        });

                    }

                    let total_animais = result.count;
                    let animais = [];

                    result.rows.forEach((row) => {
                        animais.push({ 
                            cod_animal: row.cod_animal,
                            detalhes: `${req.protocol}://${req.get('host')}/usuarios/animais/?getOne=${row.cod_animal}`
                        });
                    });

                    return res.status(200).json({
                        mensagem: 'Lista de todos os animais do usuários.',
                        total_animais,
                        animais
                    });

                }

            })
            .catch((error) =>{
                console.error('Algo inesperado aconteceu ao listar os animais cadastrados pelo usuário.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao listar os animais cadastrados pelo usuário. Entre em contato com o administrador.');
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

                if (result){

                    if (!result.cod_dono_antigo){
                        delete result.dono_antigo;
                    }

                    let {dono_antigo, dono} = result;
                        delete result.dono_antigo;
                        delete result.dono;

                    let animal = result;

                    // Início da verificação de bloqueios para usuários requisitantes.
                        // Se o requisitante for o usuário de uma aplicação, exiba apenas os animais dos usuários que não estão bloqueados por ele, ou bloquearam ele.
                        if (usuario) {

                            try {
                                let listaBloqueios = [];    // Lista contendo todos os IDs dos usuários que bloquearam ou foram bloqueados pelo usuário requisitante.

                                let arrBloqueios = await Bloqueio.findAll({ 
                                    where: {
                                        [Op.or]: [{
                                            bloqueado: usuario.cod_usuario
                                        }, {
                                            bloqueante: usuario.cod_usuario
                                        }]
                                    },
                                    raw: true
                                });

                                if (arrBloqueios.length > 0){

                                    // console.log('resultBloqueiosArr', arrBloqueios);

                                    arrBloqueios.forEach((bloqueio) => {
                                        // Se o usuário requisitante bloqueou alguém, verifique se esse alguém está na lista de bloqueios... Se não tiver? Adicione.
                                        if (bloqueio.bloqueante == usuario.cod_usuario){
                                            if(!listaBloqueios.includes(bloqueio.bloqueado)){
                                                listaBloqueios.push(bloqueio.bloqueado);
                                            }
                                        }

                                        // Se o usuário requisitante foi bloqueado por alguém, verifique se esse alguém está na lista de bloqueios... Se não tiver? Adicione.
                                        if (bloqueio.bloqueado == usuario.cod_usuario){
                                            if(!listaBloqueios.includes(bloqueio.bloqueante)){
                                                listaBloqueios.push(bloqueio.bloqueante)
                                            };
                                        };
                                    });

                                    // console.log('listaBloqueios', listaBloqueios);

                                    if(listaBloqueios.includes(Number(dono.cod_usuario))){
                                        return res.status(401).json({
                                            mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                                            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                                        });
                                    }

                                }
                            
                            } catch (error) {

                                console.error('Algo inesperado aconteceu ao buscar os dados do animal.', error);
    
                                let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do animal Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR'
                        
                                return next( customErr );

                            }
                            // Conclusão dessa resposta no caso do requisitante ser um usuário.
                        };
                    // Fim da verificação de bloqueios para usuários requisitantes.
                    
                    return res.status(200).json({
                        mensagem: 'Exibindo os dados do animal encontrado.',
                        animal,
                        dono,
                        dono_antigo
                    });

                } else {

                    return res.status(400).json({
                        mensagem: 'Nenhum animal com esse ID foi encontrado.'
                    });

                }
                
            })
            .catch((error) => {

                console.error('Algo inesperado aconteceu ao buscar os dados do animal.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do animal Entre em contato com o administrador.');
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

router.patch('/:codUsuario', (req, res, next) => {

});

// Exportações.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
