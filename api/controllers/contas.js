// Importações.

    // Conexões.
        const database = require('../../configs/database').connection;      // Nossa instância de conexão com o banco de dados MySQL.

        const redisClient = require('../../configs/redis_connection');      // Nossa instância de conexão com o Redis Data Storage.

    // Models.
        const ContaLocal = require('../models/ContaLocal');
        const ContaFacebook = require('../models/ContaFacebook');
        const ContaGoogle = require('../models/ContaGoogle');

        const Usuario = require('../models/Usuario');

        const EnderecoUsuario = require('../models/EnderecoUsuario');

    // Utilidades.
        const { EventEmitter } = require('events');     // 'events:EventEmitter' para utilizar event listeners personalizados.

        const axios = require('axios').default;         // 'axios' cliente http para realizar requisições à APIs externas.

        const bcrypt = require('bcrypt');               // 'bcrypt' para "hashear" as senhas dos usuários antes de enviá-las ao DB.

        const randomize = require('randomatic');        // 'randomatic' para gerar strings com valores aleatórios.
    
    // Helpers.
        const userTokenGenerator = require('../../helpers/generate_userToken');     // Nosso helper, gerador de tokens temporários de ativação e recuperação.

        const envioEmailAtivacao = require('../../helpers/send_email_ativacao');    // Nosso helper de envio dos e-mails contendo o código de ativação da conta do usuário.
    
        const envioEmailRecuperacao = require('../../helpers/send_email_recuperacao');  // Nosso helper de envio dos e-mails contendo o código de permissão para renovação e recuperação da senha da conta do usuário.
        const envioEmailSenhaProvisoria = require('../../helpers/send_email_senhaProvisoria');  // Nosso helper de envio dos e-mails contendo a senha provisória gerada durante a recuperação da senha da conta do usuário.


// Controllers.

    /**
     * @description Permite que as aplicações acessem a lista de contas de usuários cadastrados, informações sensíveis como senhas não são exibidas.
     * @description Método 01 - [ GET: .../contas/?codUsuario=1 ] - Entrega dados sobre a conta de um usuário específico caso o código do usuário seja conhecido.
     * @description Método 02 - [ GET: .../contas/?tipoCadastro=local&chaveConta=contazeroum@email.com ] - Entrega dados sobre uma conta específica caso o tipo da conta e a chave da conta sejam conhecidos.
     * @description Método 03 - [ GET: .../contas/ ] - Entrega uma lista de contas registradas, inclui dados quantificadores (Quatidade de cadastros locais/sociais). Para aplicações que não forem do tipo "Pet Adote" exibiremos apenas os dados quantificadores.
     */
    const getOneOrAll = (req, res, next) => {

        // Início da Reconstrução da chamada GET em ".../contas/" para exibir a lista de contas dos usuários.

        // Início das Restrições de Acesso à Rota.

            // Apenas Aplicações autenticadas poderão acessar a listagem de contas.
            // Além disso, apenas Aplicações Pet Adote poderão ver detalhes das contas. Aplicações comuns verão apenas meta-dados.
            if (!req.dadosAuthToken){   

                // Se em algum caso não identificado, a requisição de uma aplicação chegou aqui e não apresentou suas credenciais JWT, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });

            }

            // Se a requisição for realizada por um usuário, não permita o acesso.
            if (req.dadosAuthToken.usuario){
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }

        // Fim das Restrições de Acesso à Rota.

        // Início das configurações das possíveis opções de busca + verificação dos parâmetros para cada caso.

            let operacao = undefined;

            switch (Object.entries(req.query).length){
                case 0:
                    operacao = 'getAll';
                    break;
                case 1:
                    if (req.query?.page) { operacao = 'getAll' };

                    if (req.query?.codUsuario) { operacao = 'getByUser' };
                    break;
                case 2:
                    if (req.query?.page && req.query?.limit) { operacao = 'getAll' };

                    if (req.query?.tipoCadastro && req.query?.chaveConta) { operacao = 'getByTypeAndKey' };
                    break;
                default:
                    break;
            }

        // Fim das configurações das possíveis opções de busca.

        // Início da Validação dos Parâmetros.

            if (req.query?.codUsuario){
                if (req.query.codUsuario.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
                    return res.status(400).json({
                        mensagem: 'Requisição inválida - O ID do Usuário deve conter apenas dígitos.',
                        code: 'INVALID_REQUEST_QUERY'
                    });
                }
            }

            if (req.query?.tipoCadastro){

                let allowedTypes = [
                    'local',
                    'facebook',
                    'google'
                ];

                if (!allowedTypes.includes(req.query.tipoCadastro)){
                    return res.status(400).json({
                        mensagem: 'Requisição inválida - Os únicos tipos de cadastro aceitos são [local], [facebook] e [google].',
                        code: 'INVALID_REQUEST_QUERY'
                    });
                }
            }

            if (req.query?.chaveConta){
                if (!(req.query.chaveConta.match(/^\d+$/g) || req.query.chaveConta.match(/^([\w\d-+.]{1,64})(@[\w\d-]+)((?:\.\w+)+)$/g))){     // Se "chaveConta" conter algo diferente do esperado, respectivamente não for um dígito ou não for um e-mail.
                    return res.status(400).json({
                        mensagem: 'Requisição inválida - A chave do usuário deve ser um valor numérico ou um e-mail.',
                        code: 'INVALID_REQUEST_QUERY'
                    });
                }
            }

            // Se "page" ou "limit" forem menores que 1, ou for um número real. Entregue BAD_REQUEST.
            if (req.query?.page){
                
                if (Number(req.query.page) < 1 || req.query.page != Number.parseInt(req.query.page)) {
                    return res.status(400).json({
                        mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                        code: 'BAD_REQUEST'
                    });
                }
            }

            if (req.query?.limit){
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

            req.query.codUsuario = String(req.query.codUsuario);
            req.query.tipoCadastro = String(req.query.tipoCadastro);
            req.query.chaveConta = String(req.query.chaveConta);

        // Fim da Normalização dos parâmetros.

        // Início do processo de listagem das contas cadastradas.

            // Início das configurações de paginação.
                let requestedPage = req.query.page || 1;        // Página por padrão será a primeira.
                let paginationLimit = req.query.limit || 10;     // Limite padrão de dados por página = 10;

                let paginationOffset = (requestedPage - 1) * paginationLimit;   // Define o índice de partida para coleta dos dados.
            // Fim das configurações de paginação.

            // Início das Operações.
                if (operacao == 'getAll'){

                    Usuario.findAndCountAll({
                        attributes: ['cod_usuario'],
                        include: [{
                            model: ContaLocal, 
                            attributes: ['cod_usuario', 'email']
                        }, {
                            model: ContaFacebook,
                            attributes: ['cod_usuario', 'cod_facebook']
                        }, {
                            model: ContaGoogle,
                            attributes: ['cod_usuario', 'cod_google']
                        }],
                        limit: paginationLimit,
                        offset: paginationOffset,
                        nest: true,
                        raw: true
                    })
                    .then(async (resultArr) => {

                        if (resultArr.count === 0){
                            return res.status(200).json({
                                mensagem: 'Nenhuma conta de usuário está cadastrada.'
                            });
                        }

                        // Início da entrega da resposta para aplicações comuns autenticadas na REST API.
                            if (req.dadosAuthToken.tipo_cliente != 'Pet Adote'){

                                let total_contas = resultArr.count;

                                let total_contas_locais = await ContaLocal.count();
                                let total_contas_facebook = await ContaFacebook.count();
                                let total_contas_google = await ContaGoogle.count();
                                
                                return res.status(200).json({
                                    mensagem: 'Soma de todas as contas cadastradas.',
                                    total_contas,
                                    total_contas_locais,
                                    total_contas_facebook,
                                    total_contas_google,
                                });
                            }
                        // Fim da entrega da resposta para aplicações comuns.

                        // Início da construção do objeto enviado na resposta.

                            // Estrutura.
                            let total_contas = resultArr.count;

                            let total_contas_locais = await ContaLocal.count();
                            let total_contas_facebook = await ContaFacebook.count();
                            let total_contas_google = await ContaGoogle.count();

                            let total_paginas = Math.ceil(total_contas / paginationLimit);

                            let contas = [];

                            let voltar_pagina = undefined;
                            let avancar_pagina = undefined;
                            // ---------

                            // Verificações e Processamentos.

                            if (requestedPage > 1 && requestedPage <= total_paginas){
                                voltar_pagina = `${req.protocol}://${req.get('host')}/contas/?page=${requestedPage - 1}&limit=${paginationLimit}`;
                            }
        
                            if (requestedPage < total_paginas){
                                avancar_pagina = `${req.protocol}://${req.get('host')}/contas/?page=${requestedPage + 1}&limit=${paginationLimit}`;
                            } 
        
                            if (requestedPage > total_paginas){
                                return res.status(404).json({
                                    mensagem: 'Você chegou ao final da lista de contas cadastradas.',
                                    code: 'RESOURCE_NOT_FOUND'
                                });
                            }

                            resultArr.rows.forEach((registro) => {

                                let { ContaLocal, ContaFacebook, ContaGoogle } = registro;

                                if (ContaLocal.cod_usuario){
                                    ContaLocal.tipo_cadastro = 'local';
                                    ContaLocal.detalhes = `${req.protocol}://${req.get('host')}/contas/?codUsuario=${ContaLocal.cod_usuario}`,
                                    contas.push(ContaLocal);
                                }

                                if (ContaFacebook.cod_usuario){
                                    ContaFacebook.tipo_cadastro = 'facebook';
                                    ContaFacebook.detalhes = `${req.protocol}://${req.get('host')}/contas/?codUsuario=${ContaFacebook.cod_usuario}`,
                                    contas.push(ContaFacebook);
                                }

                                if (ContaGoogle.cod_usuario){
                                    ContaGoogle.tipo_cadastro = 'google';
                                    ContaGoogle.detalhes = `${req.protocol}://${req.get('host')}/contas/?codUsuario=${ContaGoogle.cod_usuario}`,
                                    contas.push(ContaGoogle);
                                }
                            });

                            // ----------------------------

                        // Fim da construção do objeto enviado na resposta.

                        // Início do envio da resposta.

                            return res.status(200).json({
                                mensagem: 'Lista de todas as contas cadastradas.',
                                total_contas,
                                total_contas_locais,
                                total_contas_facebook,
                                total_contas_google,
                                total_paginas,
                                contas,
                                voltar_pagina,
                                avancar_pagina
                            });

                        // Fim do envio da resposta.

                    })
                    .catch((error) => {
                        console.error('Algo inesperado aconteceu ao listar as contas cadastradas.', error);
    
                        let customErr = new Error('Algo inesperado aconteceu ao listar as contas cadastradas. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR'
                
                        return next( customErr );
                    });

                }

                if (operacao == 'getByUser'){

                    // Restrições de Uso.
                        if (req.dadosAuthToken.tipo_cliente != 'Pet Adote'){
                            // Se a aplicação não for do tipo "Pet Adote"...
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }
                    // -----------------

                    Usuario.findByPk(req.query.codUsuario, {
                        attributes: ['cod_usuario'],
                        include: [{
                            model: ContaLocal, 
                            attributes: ['cod_usuario', 'email']
                        }, {
                            model: ContaFacebook,
                            attributes: ['cod_usuario', 'cod_facebook']
                        }, {
                            model: ContaGoogle,
                            attributes: ['cod_usuario', 'cod_google']
                        }],
                        nest: true,
                        raw: true
                    })
                    .then((result) => {

                        if (!result){
                            res.status(404).json({
                                mensagem: 'Nenhuma conta está vinculada à esse ID de Usuário.',
                                code: 'RESOURCE_NOT_FOUND',
                                lista_usuarios: `${req.protocol}://${req.get('host')}/usuarios/`,
                            });
                        }

                        // Início da construção do objeto enviado na resposta.

                            if (!result.ContaLocal?.cod_usuario){
                                delete result.ContaLocal;
                            }

                            if (!result.ContaFacebook?.cod_usuario){
                                delete result.ContaFacebook;
                            }

                            if (!result.ContaGoogle?.cod_usuario){
                                delete result.ContaGoogle;
                            }

                            let conta = undefined;

                            if (result.ContaLocal) { 
                                conta = result.ContaLocal; 
                                conta.tipo_cadastro = 'local';
                                conta.usuario = `${req.protocol}://${req.get('host')}/usuarios/${conta.cod_usuario}`;
                            }

                            if (result.ContaFacebook) { 
                                conta = result.ContaFacebook;
                                conta.tipo_cadastro = 'facebook'; 
                                conta.usuario = `${req.protocol}://${req.get('host')}/usuarios/${conta.cod_usuario}`;
                            }

                            if (result.ContaGoogle) { 
                                conta = result.ContaGoogle;
                                conta.tipo_cadastro = 'google';
                                conta.usuario = `${req.protocol}://${req.get('host')}/usuarios/${conta.cod_usuario}`;
                            }
                            
                        // Fim da construção do objeto enviado na resposta.

                        // Início do envio da resposta.

                            return res.status(200).json({
                                mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                                conta: conta,
                                
                            });

                        // Fim do envio da resposta.

                    })
                    .catch((error) => {
                        console.error('Algo inesperado aconteceu ao buscar a conta de um usuário pelo id do usuário.', error);
    
                        let customErr = new Error('Algo inesperado aconteceu ao buscar a conta de um usuário pelo id do usuário. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR'
                
                        return next( customErr );
                    });

                }

                if (operacao == 'getByTypeAndKey'){

                    // Restrições de Uso.
                        if (req.dadosAuthToken.tipo_cliente != 'Pet Adote'){
                            // Se a aplicação não for do tipo "Pet Adote"...
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        }
                    // -----------------

                    try {

                        let getConta = async () => {
                            
                            switch(req.query.tipoCadastro){
                                case 'local':
                                    return await ContaLocal.findByPk(req.query.chaveConta, { attributes: ['email', 'cod_usuario'], raw: true });
                                case 'facebook':
                                    return await ContaFacebook.findByPk(req.query.chaveConta, { raw: true });
                                case 'google':
                                    return await ContaGoogle.findByPk(req.query.chaveConta, { raw: true });
                                default:
                                    break;
                            };
                        }

                        getConta()
                        .then((conta) => {
                            if (conta?.email){ conta.tipo_cadastro = 'local'; }

                            if (conta?.cod_facebook){ conta.tipo_cadastro = 'facebook'; }

                            if (conta?.cod_google){ conta.tipo_cadastro = 'google'; }

                            if (conta){ conta.usuario = `${req.protocol}://${req.get('host')}/usuarios/${conta.cod_usuario}`; }

                            if (!conta){
                                return res.status(404).json({
                                    mensagem: `A chave informada não está vinculada à nenhuma conta ${req.query.tipoCadastro}.`,
                                    code: 'RESOURCE_NOT_FOUND'
                                });
                            }
                            
                            return res.status(200).json({
                                mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                                conta
                            });
                        });

                    } catch (error) {

                        console.error('Algo inesperado aconteceu ao buscar os dados de um usuário via tipo de cadastro e chave.', error);
                
                        let customErr = new Error('Algo inesperado aconteceu ao buscar os dados de um usuário via tipo de cadastro e chave. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';
    
                        return next( customErr );

                    }

                }

                if (!operacao){
                    return res.status(400).json({
                        mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                        code: 'BAD_REQUEST'
                    });
                }
            // Fim das Operações.
            
        // Fim do processo de listagem das contas cadastradas.

    };


    /**
     * @description Recebe os dados de cadastro de um usuário. Os dados sobre a conta (e-mail e senha), sobre o usuário (nome, telefone, cpf, descricao, etc.) e sobre o endereço do usuário (cep, cidade, estado, etc.) serão necessários para efetivar o cadastro do usuário.
     */
    const createOne = async (req, res, next) => {

        // Restrições de acesso à rota.
            // Apenas as Aplicações Pet Adote e Administradores poderão cadastrar novas contas de usuários.

            if (!req.dadosAuthToken){   

                // Se em algum caso não identificado, a requisição de uma aplicação chegou aqui e não apresentou suas credenciais JWT, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });

            } else {
        
                let { usuario } = req.dadosAuthToken;
        
                // Se o Requisitante não for um administrador, não permita o acesso.
                if (usuario && usuario.e_admin != 1){
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
        
            }
        // Fim das restrições de acesso à rota.
    
        // Início da validação dos campos.

            let missingFields = [];     // Lista de missingFields
    
            // Lista de campos obrigatórios.
                let requiredFields = [
                    'email',
                    'senha',
                    'confirma_senha',
                    'primeiro_nome',
                    'sobrenome',
                    'data_nascimento',
                    'cpf',
                    'telefone',
                    'cep',
                    'logradouro',
                    'bairro',
                    'cidade',
                    'estado'
                ];
            // Fim da lista de campos obrigatórios.
    
            // Verificador de campos obrigatórios.
                requiredFields.forEach((field) => {
                    if (!Object.keys(req.body).includes(field)){
                        missingFields.push(`Campo [${field}] não encontrado.`);
                    }
                });
            // Fim do verificador de campos obrigatórios.
    
            // Se algum dos campos obrigatórios não estiverem presentes no request, responda com a lista de missingFields.
                if (missingFields.length > 0){
                    // console.log('missingFields detectados, campos obrigatórios estão faltando.');
            
                    return res.status(400).json({
                        mensagem: 'Campos obrigatórios estão faltando.',
                        code: 'INVALID_REQUEST_FIELDS',
                        missing_fields: missingFields
                    });
                }
            //------------------------------------------------------------------------------------------------------
        
            // Normalização de Campos recebidos.
    
                // console.log('Antes do processamento: ', req.body);
    
                Object.entries(req.body).forEach((pair) => {        // Todo campo se tornará uma String e não possuirá espaços "     " no começo ou no fim.
            
                    // Remove espaços excessivos no início/fim da String.
                    req.body[pair[0]] = String(pair[1]).trim();
                    let partes = undefined;     // Para cada "pair", se necessário, faremos a divisão de partes(substrings) do valor.
            
                    // Deixando as primeiras letras dos nomes com caixa alta.
                    switch(pair[0]){    // Se "pair[0]" (campo) não for um dos casos (cair em "default"), ele passará pelo tratamento de letras capitulares.
                        case 'email': 
                            req.body[pair[0]] = String(pair[1]).toLowerCase();
                            break;
                        // case 'email_recuperacao': break;
                        case 'senha': break;
                        case 'confirma_senha': break;
                        case 'descricao': break;
                        default:
                            partes = pair[1].trim().split(' ');     // Remove os espaços excessivos no início/fim da String antes de dividí-la em substrings.
            
                            // console.log('partesPréNorm:', partes);
            
                            partes.forEach((parte, index) => {
                                // console.log('parte: ',parte);
                                if (parte){     // Se a substring(parte) for detectada como "NULL/Undefined/blankspace" será ignorada, não gerando exceções.
                                    // console.log('parteOk: ',parte);
                                    partes[index] = parte[0].toUpperCase() + parte.substr(1);   // Trata a substring capitalizando a primeira letra.
                                }
                            })
            
                            // console.log('partesPósNorm:', partes)
            
                            req.body[pair[0]] = partes.join(' ');   // Retorna o valor de "primeiro_nome" pós tratamento.
            
                            // console.log('body', req.body[pair[0]].split(' '));
            
                            /* Atenção: Aqui apenas normalizamos a primeira letra de cada parte do nome.
                            Ainda é necessário validações para restringir que usuários digitem espaços excessivos no meio do nome. */
                            break;
                    }
            
                    
                });

                // console.log('Depois do processamento: ', req.body);

            // Fim da normalização dos campos recebidos.
    
            //------------------------------------------------------------------------------------------------------
            // Validação dos Campos Obrigatórios.
        
                // Campos relacionados à CONTA DO USUÁRIO.

                    // Validação básica do e-mail.
                    if (req.body.email.length === 0 || req.body.email.length > 255){
                        // console.log('Erro: E-mail vazio ou ultrapassa 255 caracteres.')
                        return res.status(400).json({
                            mensagem: 'EMAIL - Vazio ou ultrapassa 255 caracteres.',
                            code: 'INVALID_EMAIL_LENGTH'
                        })
                    }
            
                    if (!req.body.email.match(/^([\w\d-+.]{1,64})(@[\w\d-]+)((?:\.\w+)+)$/g)){
                        // console.log('Erro: O formato do e-mail está diferente do esperado.');
                        return res.status(400).json({
                            mensagem: 'EMAIL - Formato inválido.',
                            code: 'INVALID_EMAIL_INPUT',
                            exemplo: 'email@dominio.com'
                        });
                    }
            
                    // Verificação do [ORM] sobre o e-mail -- Caso o e-mail já existir, o usuário não poderá continuar o cadastro.
            
                    const isEmailLivre = await ContaLocal.findOne({ where: { email: req.body.email } }).then((res) => {
                        if (res === null || res === undefined || res === ''){
                            // console.log('[ORM] Email livre!');
                            return true;
                        } else {
                            // console.log('[ORM] Esse Email não está livre!');
                            return false;
                        }
                    });
            
                    // console.log('[ORM] O email está livre? ', isEmailLivre);
            
                    if (!isEmailLivre){
                        // console.log('O Email não está livre. Enviando resposta ao front-end');
                        return res.status(409).json({
                            mensagem: 'EMAIL - Em Uso.',
                            code: 'EMAIL_ALREADY_TAKEN'
                        });
                    }
                                        
                    // Validação senha.
                    if (req.body.senha.length < 4 || req.body.senha.length > 100) {
                        // console.log('Erro: Senha pequena demais ou ultrapassa 100 caracteres.')
                        return res.status(400).json({
                            mensagem: 'SENHA - Possui menos que 4 ou mais que 100 caracteres.',
                            code: 'INVALID_PASSWORD_LENGTH'
                        });
                    }
            
                    if (!req.body.senha.match(/\d+/g)){
                        // console.log('Erro: A senha não possui dígitos.');
                        return res.status(400).json({
                            mensagem: 'SENHA - Não possui dígitos.',
                            code: 'PASSWORD_WITHOUT_NUMBER'
                        })
                    }
            
                    if (!req.body.senha.match(/[A-Z]+/g)){
                        // console.log('Erro: A senha não possui letras maiúsculas.');
                        return res.status(400).json({
                            mensagem: 'SENHA - Não possui letras maiúsculas.',
                            code: 'PASSWORD_WITHOUT_UPPERCASE_LETTER'
                        })
                    }
            
                    if (!req.body.senha.match(/[a-z]+/g)){
                        // console.log('Erro: A senha não possui letras minúsculas.');
                        return res.status(400).json({
                            mensagem: 'SENHA - Não possui letras minúsculas.',
                            code: 'PASSWORD_WITHOUT_LOWERCASE_LETTERS'
                        })
                    }
            
                    if (req.body.senha != req.body.confirma_senha){
                        // console.log('Erro: A confirmação de senha está diferente da senha.');
                        return res.status(400).json({
                            mensagem: 'CONFIRMACAO SENHA - Está diferente da senha.',
                            code: 'INVALID_PASSWORD_CONFIRMATION'
                        })
                    }
                        
                // Fim dos campos relacionados à CONTA DO USUÁRIO.
            
                // Campos relacionados aos DADOS DO USUÁRIO.

                    // Validação do primeiro nome.
                    if (req.body.primeiro_nome.length === 0){
                        // console.log('Erro: Nome vazio.');
                        return res.status(400).json({
                            mensagem: 'PRIMEIRO NOME - Está vazio.',
                            code: 'INVALID_PRIMEIRO_NOME_LENGTH'
                        })
                    } else {
                        // console.log('Nome: [' + req.body.primeiro_nome + ']');
            
                        if (req.body.primeiro_nome.match(/\s{2}|[^A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){  // Anterior: /\s{2}|[^a-zà-ü ,.'-]+/gi
                            // console.log('Erro: Espaços excessivos ou caracteres inválidos detectados!');
                            return res.status(400).json({
                                mensagem: 'PRIMEIRO NOME - Espaços excessivos ou caracteres inválidos detectados.',
                                code: 'INVALID_PRIMEIRO_NOME_INPUT'
                            })
                        }
            
                    }
                
                    // Validação do sobrenome.
                    if (req.body.sobrenome.length === 0){
                        // console.log('Erro: Sobrenome vazio.');
                        return res.status(400).json({
                            mensagem: 'SOBRENOME - Está vazio.',
                            code: 'INVALID_SOBRENOME_LENGTH'
                        })
                    } else {
                        // console.log('Sobrenome: [' + req.body.sobrenome + ']');
                        
                        if (req.body.sobrenome.match(/\s|[^A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){  // Anterior: /\s{2}|[^a-zà-ü ,.'-]+/gi
                            // console.log('Erro: Espaços excessivos ou caracteres inválidos detectados!');
                            return res.status(400).json({
                                mensagem: 'SOBRENOME - Espaços excessivos ou caracteres inválidos detectados.',
                                code: 'INVALID_SOBRENOME_INPUT'
                            })
                        }
            
                    }
                
                    // Validação da data de nascimento.
                    if (req.body.data_nascimento.length === 0){
                        // console.log('Erro: Data de nascimento vazia.');
                        return res.status(400).json({
                            mensagem: 'DATA DE NASCIMENTO - Está vazia.',
                            code: 'INVALID_DATA_NASCIMENTO_LENGTH'
                        })
                    } else {
                        // console.log('Data de Nascimento: [' + req.body.data_nascimento + ']');
                        if (!req.body.data_nascimento.match(/^(\d{4})\-([1][0-2]|[0][1-9])\-([0][1-9]|[1-2]\d|[3][0-1])$/g)){
                            // console.log('Erro: Formato inválido de data!');
                            return res.status(400).json({
                                mensagem: 'DATA DE NASCIMENTO - Formato inválido de data.',
                                code: 'INVALID_DATA_NASCIMENTO_INPUT',
                                exemplo: 'aaaa-mm-dd'
                            })
                        }
            
                        // Verificação de ano bissexto
                        let data_nascimento = req.body.data_nascimento.split('-');
                        if(data_nascimento[0][2] == 0 && data_nascimento[0][3] == 0){
                            if (data_nascimento[0] % 400 == 0){
                                // console.log('Ano bissexto % 400');
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 29){
                                    return res.status(400).json({
                                        mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR'
                                    });
                                }
                            } else {
                                // console.log('Ano não-bissexto % 400');
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 28){
                                    return res.status(400).json({
                                        mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano não-bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR'
                                    });
                                }
                            }
                        } else {
                            if (data_nascimento[0] % 4 == 0){
                                // console.log('Ano bissexto % 4');
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 29){
                                    return res.status(400).json({
                                        mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR'
                                    });
                                }
                            } else {
                                // console.log('Ano não-bissexto % 4');
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 28){
                                    return res.status(400).json({
                                        mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano não-bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR'
                                    });
                                }
                            }
                        }
                        // Fim da verificação de ano bissexto.
            
                        // Verificação de idade do usuário. Se tive menos que 10 anos não poderá se cadastrar.
                        if (data_nascimento[0] > (new Date().getFullYear() - 10)){
                            return res.status(403).json({
                                mensagem: 'DATA DE NASCIMENTO - Usuário possui menos que 10 anos, portanto não poderá cadastrar.',
                                code: 'FORBIDDEN_USER_AGE'
                            });
                        }
                        
                        if (data_nascimento[0] < 1900){
                            return res.status(400).json({
                                mensagem: 'DATA DE NASCIMENTO - Ano de nascimento inválido, digite um valor para ano acima de 1900.',
                                code: 'INVALID_DATA_NASCIMENTO_INPUT'
                            })
                        }
                    }
                
                    // Validação de CPF.
                    if (!req.body.cpf.match(/^\d{3}[.]\d{3}[.]\d{3}[-]\d{2}$|^\d{11}$/g)){
                        // console.log('Erro: CPF vazio ou incompleto.');
                        return res.status(400).json({
                            mensagem: 'CPF - Está vazio, incompleto ou em um formato incorreto.',
                            code: 'INVALID_CPF_INPUT',
                            exemplo: '123.123.123-12 ou 12312312312'
                        })
                    } else {
                        // console.log('CPF: [' + req.body.cpf + ']');
                        
                        // Análise do CPF digitado pelo usuário.
                
                        let cpfDigits = req.body.cpf.replace(/\D/g, '');
                        // console.log(`Dígitos do CPF: ${cpfDigits}`);
                
                        if (cpfDigits.match(/^(.)\1{2,}$/g)){
                            // console.log('Erro: Todos os dígitos são iguais.');
                            return res.status(400).json({
                                mensagem: 'CPF - Inválido, todos os digitos são iguais.',
                                code: 'CPF_DIGITS_ARE_REPEATING'
                            })
                        }
                        
                        let cpfDigitsArray = cpfDigits.split('');
                        
                        // console.log(`Array dos números iniciais necessários para validação`);
                        
                        let cpfValidationArray = cpfDigitsArray.slice(0, 9);    // Para antes de atingir Index[9]
                
                        // console.log(cpfValidationArray);
                
                        let multiplier = cpfDigits.length - 1;    // Multiplicador inicia em 10 para encontrar o valor apropriado do 1º digito verificador.
                        let result = 0; // Valor da soma dos quocientes da multiplicação de cada digito não verificador do CPF.
                            
                        cpfValidationArray.forEach( (value, index) => {
                            result += value * multiplier;
                            // console.log(`[D1] Última verificação: ${value} * ${multiplier} = ${value + multiplier}`);
                            // console.log(`[D1] Último resultado parte um: ${result}`);
                            multiplier--;
                        });
                
                        // console.log(`Comprimento do Array do CPF: ${cpfDigits.length}`);
                        let remainder = result % cpfDigits.length;   // 11 digitos do CPF.
                        // console.log(`[D1] O resto da divisão entre ${result} e ${cpfDigits.length} é [${remainder}], e ${cpfDigits.length} - ${remainder} é [${cpfDigits.length - remainder}].`);
                
                        let cpfFirstVerificationDigit;
                
                        if (remainder >= 2){
                            cpfFirstVerificationDigit = (11 - remainder).toString();
                        } else {
                            cpfFirstVerificationDigit = 0;
                        }
                
                        // console.log(`Primeiro dígito verificador: [${cpfFirstVerificationDigit}]`);
                        
                        // Primeiro dígito verificador apropriado adquirido.
                
                        cpfValidationArray.push(cpfFirstVerificationDigit);
                        // console.log(`Array dos números necessários para verificação do segundo dígito de validação`)
                        // console.log(cpfValidationArray);
                
                        multiplier = cpfDigits.length; // Multiplicador inicia em 11 para encontrar o valor apropriado do 2º digito verificador.
                        result = 0; // O resultado deve iniciar em 0 para o próximo teste;
                        
                        cpfValidationArray.forEach( (value, index) => {
                            result += value * multiplier;
                            // console.log(`[D2] Última verificação: ${value} * ${multiplier} = ${value + multiplier}`);
                            // console.log(`[D2] Último resultado parte um: ${result}`);
                            multiplier--;
                        });
                
                        remainder = result % cpfDigits.length;  // 11 digitos do CPF.
                        // console.log(`[D2] O resto da divisão entre ${result} e ${cpfDigits.length} é [${remainder}], e ${cpfDigits.length} - ${remainder} é [${cpfDigits.length - remainder}].`);
                
                        let cpfSecondVerificationDigit;
                
                        if (remainder >= 2){
                            cpfSecondVerificationDigit = (11 - remainder).toString();    //// 11 digitos do CPF - Resto da divisão.
                        } else {
                            cpfSecondVerificationDigit = 0;
                        }
                
                        // console.log(`Segundo dígito verificador: [${cpfSecondVerificationDigit}]`);
                        
                        // Segundo dígito verificador apropriado adquirido.
                
                        // Verificação final do CPF digitado pelo usuário, para permitir o envio dos dados ao Back-end.
                
                        if (cpfDigits.indexOf(cpfFirstVerificationDigit, 9) != -1 && cpfDigits.indexOf(cpfSecondVerificationDigit, 10) != -1){
                            // console.log(`O CPF [${req.body.cpf}] é válido!`);
                
                            // Reconstruindo o CPF no formato padrão definido para o Banco de Dados.
                            req.body.cpf = `${cpfDigitsArray.slice(0,3).join('')}.${cpfDigitsArray.slice(3,6).join('')}.${cpfDigitsArray.slice(6,9).join('')}-${cpfDigitsArray.slice(9).join('')}`;
                
                            // Verificação do [ORM] sobre o CPF -- Caso o CPF já tenha sido utilizado, o usuário não poderá continuar o cadastro.
                            await Usuario.findOne({ where: { cpf: req.body.cpf } })
                            .then((result) => {
                                if (result === null || result === undefined || result === ''){
                                    // console.log('[ORM] CPF livre!');
                                    return true;
                                } else {
                                    // console.log('[ORM] Esse CPF não está livre!');
                                    return res.status(409).json({
                                        mensagem: 'CPF - Em Uso.',
                                        code: 'CPF_ALREADY_TAKEN'
                                    });
                                }
                            });
                
                            
                        } else {
                            // console.log(`Erro: O CPF [${req.body.cpf}] é inválido!`)
                            return res.status(400).json({
                                mensagem: 'CPF - Inválido.',
                                code: 'INVALID_CPF'
                            })
                        }
                
                        // console.log('OK: O CPF está validado e formatado corretamente!');
                        // console.log('-------------------------------------------------');
                    }
                
                    // Validação do telefone.
                    if (!req.body.telefone.match(/^\(?[0]?(\d{2})\)?\s?((?:[9])?\d{4})[-]?(\d{4})$/g)){
                        // console.log('Erro: Telefone vazio ou incompleto.');
                        return res.status(400).json({
                            mensagem: 'TELEFONE - O formato digitado é inválido, o telefone deve possuir DDD e 9 ou 8 dígitos.',
                            code: 'INVALID_TELEFONE_INPUT',
                            exemplo: '(012) 1234-1234 / (12) 91234-1234 / 012 1234-1234 / 12 91234-1234 / 01212341234 / 12912341234 / etc.'
                        })  
                    } else {
                        // console.log('Telefone: [' + req.body.telefone + ']');
                        
                        // Outra forma de utilizar RegEx. :D
                        //let telValidationRegEx = /^\((\d{2})\) ((?:[9])?\d{4}-\d{4})$/g;   // Entrada esperada: "(00) 91234-1234" ou "(00) 1234-1234";
                        let telValidationRegEx = /^\(?[0]?(\d{2})\)?\s?((?:[9])?\d{4})[-]?(\d{4})$/g;     // O usuário poderá digitar o telefone da forma que desejar. Contanto que tenha apenas o DDD e 8 ou 9 dígitos.
                        let telValidationMatchesArray = telValidationRegEx.exec(String(req.body.telefone));
                
                        let telDDD;
                        let telNum;
                
                        if (telValidationMatchesArray){
                            telDDD = telValidationMatchesArray[1];  // Capturando os agrupamentos da RegEx.
                            telNum = `${telValidationMatchesArray[2]}-${telValidationMatchesArray[3]}`;
                        } else {
                            // console.log('Erro: O formato do número está incorreto!');
                            return res.status(400).json({
                                mensagem: 'TELEFONE - O formato digitado é inválido, o telefone deve possuir DDD e 9 ou 8 dígitos.',
                                code: 'INVALID_TELEFONE_INPUT',
                                exemplo: '(012) 1234-1234 / (12) 91234-1234 / 012 1234-1234 / 12 91234-1234 / 01212341234 / 12912341234 / etc.'
                            })
                        }
                
                        // console.log(`DDD: ${telDDD} -- Número: ${telNum}`);
                
                        // console.log('telNum indexOf9', telNum.indexOf('9'));
                        // console.log('telNum.length', telNum.length)
                
                        if (telNum.indexOf('9') == 0 && telNum.length == 10){
                            // console.log('O número é de um dispositivo móvel.');
                
                            if (telNum.match(/^(?:9?(\d{4})\-\1)$/)){
                                // console.log('Erro: Número de celular com muitos dígitos repetidos.');
                                return res.status(400).json({
                                    mensagem: 'TELEFONE - Número de celular com muitos dígitos repetidos.',
                                    code: 'TELEFONE_DIGITS_ARE_REPEATING'
                                })
                            }
                        } else {
                            // console.log('O número é de um aparelho fixo.');
                
                            if (telNum.match(/^(?:(\d{4})\-\1)$/)){
                                // console.log('Erro: Número fixo com muitos dígitos repetidos.');
                                return res.status(400).json({
                                    mensagem: 'TELEFONE - Número fixo com muitos dígitos repetidos.',
                                    code: 'TELEFONE_DIGITS_ARE_REPEATING'
                                })
                            }
                        }
                
                        let brDDD = {       // JSON
                            "AC": ["68"],
                            "AL": ["82"],
                            "AM": ["92", "97"],
                            "AP": ["96"],
                            "BA": ["71", "73", "74", "75", "77"],
                            "CE": ["85", "88"],
                            "DF": ["61"],
                            "ES": ["27", "28"],
                            "GO": ["62", "64"],
                            "MA": ["98", "99"],
                            "MG": ["31", "32", "33", "34", "35", "37", "38"],
                            "MS": ["67"],
                            "MT": ["65", "66"],
                            "PA": ["91", "93", "94"],
                            "PB": ["83"],
                            "PE": ["81", "87"],
                            "PI": ["86", "89"],
                            "PR": ["41", "42", "43", "44", "45", "46"],
                            "RJ": ["21", "22", "24"],
                            "RN": ["84"],
                            "RO": ["69"],
                            "RR": ["95"],
                            "RS": ["51", "53", "54", "55"],
                            "SC": ["47", "48", "49"],
                            "SE": ["79"],
                            "SP": ["11", "12", "13", "14", "15", "16", "17", "18", "19"],
                            "TO": ["63"]
                        }
                
                        // console.log('Início da verificação do objeto javascript contendo os DDDs do Brasil.');
                
                        let isDDDValid;
                        for (estado in brDDD){
                
                            brDDD[estado].forEach((ddd, index) => {
                                if (ddd == telDDD){
                                    isDDDValid = true;
                                }
                            })
                
                            if (isDDDValid){
                                break;
                            }
                
                        }
                
                        if (!isDDDValid){
                            // console.log('Erro: O DDD não pertence a nenhum estado brasileiro.');
                            return res.status(400).json({
                                mensagem: 'TELEFONE - O DDD não pertence a nenhum estado brasileiro.',
                                code: 'INVALID_TELEFONE_DDD'
                            })
                        }
                
                        // Se todas as restrições passaram, o telefone é válido.
                        // Reconstruindo o telefone no formato padrão definido para o Banco de Dados.
                        req.body.telefone = `(${telDDD}) ${telNum}`
                
                    }
                    
                // Fim dos campos relacionados aos DADOS DO USUÁRIO.
            
                // Campos relacionados ao ENDEREÇO DO USUÁRIO.

                    // Validação simples do CEP
                    if (!String(req.body.cep).match(/^\d{5}(?:\-?)\d{3}$/)){
                        return res.status(400).json({
                            mensagem: 'CEP - Formato inválido',
                            code: 'INVALID_CEP_INPUT',
                            exemplo: '12345-123 ou 12345123'
                        })
                    }
                
                    if (String(req.body.cep).length === 9){
                        req.body.cep = req.body.cep.replace('-', '')
                    }
                
                    // Coleta dados a respeito do CEP na api "ViaCEP".
                    let urlVerificacaoViaCep = `http://viacep.com.br/ws/${req.body.cep}/json/`;
                
                    let infoCEP = await axios.get(urlVerificacaoViaCep)
                    .then((res) => {
                        // console.log(res.data);
                        return res.data;
                    })
                    .catch((err) => {
                        return { 
                            api_error: {
                                errCode: err.code,
                                errMessage: err.message
                            }
                        };
                    });
                
                    if (infoCEP.erro){
                        return res.status(404).json({
                            mensagem: 'CEP - O CEP informado parece não existir.',
                            code: 'CEP_NOT_FOUND'
                        })
                    }
                
                    if (infoCEP.api_error){
                        console.error('CEP - Algo inesperado aconteceu ao buscar informações sobre o CEP.', infoCEP.api_error);
                
                        if (!infoCEP.api_error.errCode == 'ETIMEDOUT'){
                            console.error('A API do ViaCEP caiu às ' + new Date().toLocaleString() + '.');
                
                            let customErr = new Error('Não é possível realizar o cadastro no momento, tente novamente mais tarde.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_API_ERROR';
                
                            return next( customErr );
                        }
                
                        let customErr = new Error('CEP - Algo inesperado aconteceu ao buscar informações sobre o CEP.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';
                
                        return next( customErr );
                    }
                
                    // Validação de logradouro
                    if (req.body.logradouro.length === 0 || req.body.logradouro.length > 100){
                        return res.status(400).json({
                            mensagem: 'LOGRADOURO - Está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_LOGRADOURO_LENGTH'
                        })
                    }
                
                    // Validação do bairro
                    if (req.body.bairro.length === 0 || req.body.bairro.length > 100){
                        return res.status(400).json({
                            mensagem: 'BAIRRO - Está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_BAIRRO_LENGTH'
                        })
                    }
                
                    // if (infoCEP && !infoCEP.bairro.toLowerCase().includes(req.body.bairro.toLowerCase())){
                    //     return res.status(400).json({
                    //         mensagem: 'BAIRRO - O bairro informado nao esta de acordo com o CEP'
                    //     })
                    // }
                
                    // Validação da cidade
                    if (req.body.cidade.length === 0 || req.body.cidade.length > 100){
                        return res.status(400).json({
                            mensagem: 'CIDADE - Está vazia ou possui mais do que 100 caracteres.',
                            code: 'INVALID_CIDADE_LENGTH',
                            exemplo: 'São Paulo'
                        })
                    }
                
                    if (!infoCEP.localidade.toLowerCase().includes(req.body.cidade.toLowerCase())){
                        return res.status(400).json({
                            mensagem: 'CIDADE - A cidade informada não esta de acordo com o CEP.',
                            code: 'CIDADE_DONT_BELONG_TO_CEP'
                            
                        })
                    }
                
                    // Validação do estado
                    if (req.body.estado.length === 0 || req.body.estado.length > 100){
                        return res.status(400).json({
                            mensagem: 'ESTADO - Está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_ESTADO_LENGTH',
                            exemplo: 'SP'
                        })
                    }
                
                    if (!infoCEP.uf.toLowerCase().includes(req.body.estado.toLowerCase())){
                        return res.status(400).json({
                            mensagem: 'ESTADO - O estado informado não está de acordo com o CEP.',
                            code: 'ESTADO_DONT_BELONG_TO_CEP'
                        })
                    }
                // Fim das validações relacionadas ao ENDEREÇO DO USUÁRIO.
        
            // Fim da validação dos campos obrigatórios.
        
            //------------------------------------------------------------------------------------------------------
        
            // Validação de campos opcionais.
        
                // Validação da descrição do usuário.
                if (req.body.descricao && req.body.descricao.length > 255){
                    return res.status(400).json({
                        mensagem: 'DESCRICAO - Possui mais do que 255 caracteres.',
                        code: 'INVALID_DESCRICAO_LENGTH'
                    })
                }

            // Fim da validação dos campos opcionais.
    
        // Fim da validação dos campos.
        //------------------------------------------------------------------------------------------------------
    
        // Início do processamento dos dados para criação da conta do usuário.
    
            // console.log('Dados recebidos com sucesso: ', req.body);
    
            // Criptografando a senha do usuário. Lembre-se de tratar a criptografia da senha na área de Login (autenticacao_usuario.js).
        
                try {
                    const salt = await bcrypt.genSalt(10);
                    // console.log('O salt será: ', salt);
                    const hashedPassword = await bcrypt.hash(req.body.senha, salt);
                    // console.log('Senha hasheada: ', hashedPassword);    // 60 caracteres.
        
                    req.body.senha = hashedPassword;    // Atribui a senha pós tratamento à variável.
                } catch (error) {
                    console.error('Algo inesperado aconteceu ao criptografar a senha do usuário.', error);
        
                    let customErr = new Error('Algo inesperado aconteceu ao tratar dados do usuário');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';
        
                    next( customErr );
                }
        
            // Concluíndo o cadastro.
        
                let idUsuario = undefined;
            
                try {
                    await database.transaction( async (transaction) => {

                        
                        let possibleDefaultAvatar = [
                            'default_avatar_01.jpeg',
                            'default_avatar_02.jpeg',
                            'default_avatar_03.jpeg'
                        ];
                        let rngSelector = Number.parseInt((Math.random() * (2.9 - 0)));  // 0 até 2.

                        let defaultUserAvatar = possibleDefaultAvatar[rngSelector];
            
                        const usuario = await Usuario.create({
                            primeiro_nome: req.body.primeiro_nome,
                            sobrenome: req.body.sobrenome,
                            data_nascimento: req.body.data_nascimento,
                            cpf: req.body.cpf,
                            telefone: req.body.telefone,
                            descricao: req.body.descricao || null,
                            foto_usuario: defaultUserAvatar
                        });
            
                        const contaUsuario = await ContaLocal.create({
                            email: req.body.email,
                            cod_usuario: usuario.cod_usuario,
                            senha: req.body.senha,
                        });
            
                        const endUsuario = await EnderecoUsuario.create({
                            cod_usuario: usuario.cod_usuario,
                            cep: req.body.cep,
                            logradouro: req.body.logradouro,
                            bairro: req.body.bairro,
                            cidade: req.body.cidade,
                            estado: req.body.estado
                        });
            
                        idUsuario = usuario.cod_usuario;
                                    
                    });
            
                    // Auto-Commit
                } catch (error) {
                    // Auto-Rollback
                    console.error('Algo inesperado aconteceu ao cadastrar os dados do novo usuário.', error);
            
                    let customErr = new Error('Algo inesperado aconteceu ao cadastrar os dados do novo usuário. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';
            
                    return next(customErr);
                }
        
            // Conclusão da recepção e processamento do formulário de cadastro.
        
            // Início do Envio do e-mail com o Token de Ativação da conta do usuário e finalização do processo de cadastro.
        
                await userTokenGenerator(idUsuario, 'atv')
                .then(async (resultTokenAtivacao) => {
            
                    if (resultTokenAtivacao) {
            
                        await envioEmailAtivacao(resultTokenAtivacao, req.body.email)
                        .then((resultEnvioEmail) => {
            
                            if (resultEnvioEmail === 'E-mail enviado com sucesso') {
            
                                return res.status(200).json({
                                    mensagem: 'Novo usuário cadastrado com sucesso em breve o usuário receberá o Token de ativação da conta. Utilize o ID do Usuário para incluir dados adicionais ao cadastro do usuário.',
                                    cod_usuario: idUsuario,
                                    // tokenUsuario: accessTokenUsuario
                                });
            
                            } else {

                                let customErr = new Error('Algo inesperado aconteceu ao enviar o e-mail com o Token de ativação nos processamentos de finalização do cadastro. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR';
                        
                                return next ( customErr );
                            }
            
                        })
                        .catch((errorEnvioEmail) => {
            
                            if (errorEnvioEmail.code === 'INVALID_REQUEST_FIELDS'){
            
                                return res.status(errorEnvioEmail.status).json({
                                    mensagem: errorEnvioEmail.message,
                                    code: errorEnvioEmail.code,
                                    missing_fields: errorEnvioEmail.missing_fields
                                });
            
                            } else {
            
                                console.error('Algo inesperado aconteceu durante o envio do e-mail com o token de ativação.', errorEnvioEmail);
                
                                let customErr = new Error('Algo inesperado aconteceu durante o envio do e-mail com o token de ativação. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR';
                        
                                return next ( customErr );
            
                            }
            
                        });
            
                    } else {
                        let customErr = new Error('Algo inesperado aconteceu ao gerar o Token de Ativação nos processamentos de finalização do cadastro. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';
                
                        return next ( customErr );
                        
                    }
                })
                .catch((errorTokenAtivacao) => {
            
                    if (errorTokenAtivacao.code === 'USER_HAS_ACTIVE_TOKEN') {
            
                        return res.status(errorTokenAtivacao.status).json({
                            mensagem: errorTokenAtivacao.message,
                            data_liberacao: errorTokenAtivacao.data_liberacao,
                            code: errorTokenAtivacao.code
                        });
            
                    } else {
            
                        console.error('Algo inesperado aconteceu durante a geração do token de ativação.', errorTokenAtivacao);
                
                        let customErr = new Error('Algo inesperado aconteceu durante a geração do token de ativação ou envio do e-mail com o token de ativação. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';
                
                        return next ( customErr );
            
                    }
            
                });

            // Fim do Envio do e-mail com o Token de Ativação da conta do usuário e finalização do processo de cadastro.
        
            // Fim do processo de cadastro.

        // Fim do processamento dos dados para criação da conta do usuário.
    
    };


    /**
     * @description Permite que um usuário local altere a senha da própria conta. Apenas o dono do recurso, as aplicações pet adote ou administradores poderão realizar essa atualização, será necessário enviar o código do usuário no parâmetro da rota, a "senha" e "confirma_senha" nos corpo da requisição.
     */
    const updateOne = async (req, res, next) => {

        // Início da Verificação do Parâmetro de Rota.
    
            if (req.params.codUsuario.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
                return res.status(400).json({
                    mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos.",
                    code: 'BAD_REQUEST'
                });
            }
    
        // Fim da Verificação do Parâmetro de Rota.
    
        // Início das Restrições de Acesso à Rota.
    
            // Apenas as Aplicações Pet Adote, Administradores e o Dono do Recurso poderão realizar modificações na conta do usuário.
            // Além disso, a conta do dono do recurso deve ser uma Conta Local. Contas Sociais não podem alterar os dados da conta uma vez que armazenamos apenas o ID do usuário no provedor social.
    
            if (!req.dadosAuthToken){   // Se não houver autenticação da aplicação, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            } else {
    
                let { usuario } = req.dadosAuthToken;
    
                // Se o Requisitante possuir um ID diferente do ID requisitado e não for um administrador, ou o tipo do cadastro do usuário não for local, não permita o acesso.
                if (usuario){
                    if ((usuario.cod_usuario != req.params.codUsuario && usuario.e_admin == 0) || (usuario.tipo_cadastro != 'local')){
                        return res.status(401).json({
                            mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                        });
                    }
                }
    
                // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
                if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
                    return res.status(401).json({
                        mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
    
            }
    
        // Fim das Restrições de Acesso à Rota.
    
        // Início da verificação da conta vínculada ao "codUsuario".
        
            let contaAtual = await ContaLocal.findOne({
                where: { 
                    cod_usuario: req.params.codUsuario
                },
                raw: true
            })
            .then((result) => {
                if (result){
                    return result;
                } else {
                    return res.status(404).json({
                        mensagem: 'O usuário não existe ou nenhuma conta local está vínculada à ele.',
                        code: 'RESOURCE_NOT_FOUND'
                    });
                }
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu na verificação de existência de uma conta vínculada à um usuário.', error);
        
                let customErr = new Error('Algo inesperado aconteceu na verificação de existência de uma conta vínculada à um usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
        
                return next( customErr );
            });
    
        // Fim da verificação da conta vínculada ao "codUsuario".
    
        // Início da Verificação da existência de dados no pacote da requisição.
    
            if (!req.headers['content-type']){
                return res.status(400).json({
                    mensagem: 'Dados não encontrados na requisição',
                    code: 'INVALID_REQUEST_CONTENT'
                })
            }
    
        // Fim da verificação da existência de dados no pacote da requisição.
    
        // Início da lista de campos de modificação permitidos.
    
            let allowedFields = [
                'senha',
                'confirma_senha'
            ];
    
        // Fim da lista de campos de modificação permitidos.
    
        // Início da normalização dos campos recebidos no pacote da requisição.
    
            let operacoes = {}  // Lista de Operações: Não será possível modificar via requisições, valores que não estiverem na lista de "allowedFields".
    
            Object.entries(req.body).forEach((pair) => {
    
                if (allowedFields.includes(pair[0])){               
    
                    operacoes[pair[0]] = String(pair[1]).trim();    // Todo campo será tratado como uma String e não possuirá espaços no começo e no fim.
    
                    switch(pair[0]){
                        //case 'descricao': break;  // Se algum campo não precisar da normalização abaixo, separe-o em 'cases' com break.
                        case 'senha':
                            try {
                                const salt = bcrypt.genSaltSync(10);
                                // console.log('O salt será: ', salt);
                                const hashedPassword = bcrypt.hashSync(pair[1], salt);
                                // console.log('Senha hasheada: ', hashedPassword);    // 60 caracteres.
                    
                                pair[1] = hashedPassword;    // Atribui a senha pós tratamento à variável.
                            } catch (error) {
                                console.error('Algo inesperado aconteceu ao criptografar a senha do usuário.')
                    
                                let customErr = new Error('Algo inesperado aconteceu ao tratar dados do usuário');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';
                    
                                return next( customErr );
                            }
    
                            operacoes[pair[0]] = String(pair[1]);
                            break;
                        default:
                            break;
                    }
    
                }
    
            });
    
        // Fim da normalização dos campos recebidos no pacote da requisição.
    
        // Início da validação dos campos da operação.
    
            // Validação senha.
                if (operacoes.senha){
                    if (req.body.senha.length < 4 || req.body.senha.length > 100) {
                        // console.log('Erro: Senha pequena demais ou ultrapassa 100 caracteres.')
                        return res.status(400).json({
                            mensagem: 'SENHA - Possui menos que 4 ou mais que 100 caracteres.',
                            code: 'INVALID_PASSWORD_LENGTH'
                        });
                    }
    
                    if (!req.body.senha.match(/\d+/g)){
                        // console.log('Erro: A senha não possui dígitos.');
                        return res.status(400).json({
                            mensagem: 'SENHA - Não possui dígitos.',
                            code: 'PASSWORD_WITHOUT_NUMBER'
                        })
                    }
    
                    if (!req.body.senha.match(/[A-Z]+/g)){
                        // console.log('Erro: A senha não possui letras maiúsculas.');
                        return res.status(400).json({
                            mensagem: 'SENHA - Não possui letras maiúsculas.',
                            code: 'PASSWORD_WITHOUT_UPPERCASE_LETTER'
                        })
                    }
    
                    if (!req.body.senha.match(/[a-z]+/g)){
                        // console.log('Erro: A senha não possui letras minúsculas.');
                        return res.status(400).json({
                            mensagem: 'SENHA - Não possui letras minúsculas.',
                            code: 'PASSWORD_WITHOUT_LOWERCASE_LETTERS'
                        })
                    }
    
                    if (req.body.senha != req.body.confirma_senha){
                        // console.log('Erro: A confirmação de senha está diferente da senha.');
                        return res.status(400).json({
                            mensagem: 'CONFIRMACAO SENHA - Está diferente da senha.',
                            code: 'INVALID_PASSWORD_CONFIRMATION'
                        })
                    }
                }
            // Fim da validação da senha.
    
        // Fim da validação dos campos da operação.
    
        // Início das Operações de Update.
    
            ContaLocal.update(operacoes, {
                where: {
                    cod_usuario: req.params.codUsuario
                },
                limit: 1
            })
            .then(async (resultUpdate) => {
    
                if (resultUpdate){
                    return res.status(200).json({
                        mensagem: 'Os dados da conta do usuário foram atualizados com sucesso.',
                    });
                } else {
                    console.error('Algo inesperado aconteceu ao atualizar os dados da conta do usuário.', resultUpdate);

                    let customErr = new Error('Algo inesperado aconteceu ao atualizar os dados da conta do usuário. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';
        
                    return next( customErr );
                }
        
            })
            .catch((errorUpdate) => {
                console.error('Algo inesperado aconteceu ao atualizar os dados da conta do usuário.', errorUpdate);
    
                let customErr = new Error('Algo inesperado aconteceu ao atualizar os dados da conta do usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
    
                return next( customErr );
            })
    
        // Fim das Operações de Update.
    
    };

    /**
     * @description Um Token de Ativação no parâmetro da rota e um usuário autenticado em uma aplicação são necessários para realizar a ativação da conta do usuário. Um usuário que ainda não ativou sua conta poderá acessar áreas públicas da aplicação, porém não poderá realizar ações mais críticas como "Candidatar-se como adotante", se ele desejar utilizar essas áreas da aplicação, deverá ativar sua conta e prover o Token de Ativação recebido via e-mail na aplicação.
     */
    const activateOne = async (req, res, next) => {
        // Restrições de acesso à rota.
            //Apenas as Aplicações Pet Adote e  usuários autenticados poderão realizar a ativação da conta.

            if (!req.dadosAuthToken){   
                // Se em algum caso não identificado, a requisição de uma aplicação chegou aqui e não apresentou suas credenciais JWT, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            } else {
        
                // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
                if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
                    return res.status(401).json({
                        mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                }
        
                // Se o Access Token não apresentar um usuário, mas for de uma aplicação, e a aplicação não passar o "codUsuario", não permita o acesso.
                if (!req.dadosAuthToken.usuario){
                    if (!req.body.codUsuario){
                        return res.status(401).json({
                            mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                        });
                    }
                }
        
            }
        // Fim das restrições de acesso à rota.
    
        // Verificação do Token de Ativação.
            let {tokenAtivacao} = req.params;
            
            if (!String(tokenAtivacao).match(/^\w{7}[^_]$/g)){
                return res.status(400).json({
                    mensagem: 'Token de Ativação não está em um formato válido.',
                    code: 'INVALID_INPUT',
                    exemplo: '/ativacao/012t0K3n'
                });
            }
        // Fim da verificação do Token de Ativação.
    
        // Início da Ativação da conta do Usuário.
    
            let usuario = undefined;

            if (req.dadosAuthToken.usuario){

                usuario = req.dadosAuthToken.usuario
                
            } else {

                usuario = {
                    cod_usuario: req.body.codUsuario
                }
            }
        
            let tokenType = 'atv';
            let hashKey = `tokens:${tokenType}:user_${usuario.cod_usuario}`;
        
            redisClient.HGETALL(hashKey, (errorHGETALL, resultHGETALL) => {
                if (errorHGETALL){
                    console.error('Algo inesperado aconteceu durante a ativação da conta do usuário ao verificar o token de ativação.', errorHGETALL);
        
                    let customErr = new Error('Algo inesperado aconteceu durante a ativação da conta do usuário ao verificar o token de ativação. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';
        
                    next ( customErr );
                };
        
                // console.log(`Algum Token do tipo ['${tokenType}'] para o usuário [${usuario.cod_usuario}] foi encontrado?`, resultHGETALL);
        
                if (resultHGETALL){
                    let dataExpiracaoToken = Number(resultHGETALL.data_expiracao);
        
                    if (dataExpiracaoToken > new Date()){
                        // Se o usuário possuir um Token de Ativação vigente...
        
                        Usuario.update({ 
                            esta_ativo: 1,
                            data_modificacao: new Date()
                        }, {
                            where: { cod_usuario: usuario.cod_usuario },
                            limit: 1
                        })
                        .then((updateResult) => {
        
                            // Removendo o Token de Ativação utilizado.
                            let hashKey = `tokens:atv:user_${usuario.cod_usuario}`;
        
                            redisClient.DEL(hashKey, (errorDEL, resultDEL) => {
                                if (errorDEL) {
                                    console.error('Algo inesperado aconteceu ao remover o Token de Ativação consumido pelo usuário.', errorDEL);
        
                                    let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                                    customErr.status = 500;
                                    customErr.code = 'INTERNAL_SERVER_ERROR';
                                    
                                    return next( customErr );
                                };
        
                                // Se nenhum error acontecer, a chave será deletada ou um resultado dizendo que ela nunca existiu será retornado...
                                // console.log('Resultado da remoção do Token de Ativação consumido pelo usuário.:', resultDEL);
        
                                return res.status(200).json({
                                    mensagem: 'Ativação da conta do usuário efetuada com sucesso.'
                                })
        
                            });
            
                        })
                        .catch((updateError) => {
                            console.error('Algo inesperado aconteceu ao realizar a ativação da conta do usuário.', updateError);
                
                            let customErr = new Error('Algo inesperado aconteceu ao realizar a ativação da conta do usuário. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR';
                
                            return next( customErr );
                        }); // ending Usuario.update()
                        
                    }
        
                } else {
        
                    return res.status(404).json({
                        mensagem: 'Nenhum Token de Ativação vigente e vinculado ao usuário foi encontrado.',
                        code: 'TOKEN_NOT_FOUND'
                    });
        
                }
        
            }); // ending redisClient.HGETALL()
        
        // Fim da Ativação da conta do usuário.
    
    };
    
    /**
     * @description Realiza o reenvio do e-mail contendo o Token de Ativação do usuário local, caso ele não tenha ativado a conta após o cadastro. O código do usuário será necessário para realizar o reenvio.
     */
    const sendActivationTokenAgain = async (req, res, next) => {
        // Realiza o reenvio do e-mail contendo o Token de Ativação do usuário local, caso ele não tenha ativado a conta após o cadastro.
    
        // Restrições de acesso à rota.
            // Apenas o usuários dono do recurso e autenticado em uma aplicações Pet Adote poderá requisitar o reenvio do e-mail contendo o Token de Ativação de conta.

            if (!req.dadosAuthToken || !req.dadosAuthToken.usuario){   
                // Se não houver autenticação da aplicação com um usuário, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            } else {
        
                let { usuario } = req.dadosAuthToken;
        
                // Se o Requisitante possuir um ID diferente do ID requisitado, não permita o acesso.
                if (usuario && (usuario.cod_usuario != req.params.codUsuario)){
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
        
            }
        // Fim das restrições de acesso à rota.    
    
        // Início da coleta de dados do usuário autenticado.

            let { usuario } = req.dadosAuthToken;

        // Fim da coleta de dados do usuário autenticado.
    
        // Início das verificações de tipo de cadastro.

            // Se o tipo do cadastro for Local, enviaremos um e-mail contendo o Token de Ativação.

                if (usuario.tipo_cadastro == 'local'){
            
                    // Busca o e-mail do usuário.
                    let emailUsuario = await ContaLocal.findOne({
                        where: {
                            cod_usuario: usuario.cod_usuario
                        },
                        raw: true
                    })
                    .then((result) => {
                        if (result){
                            console.log('Email encontrado: ', result.email);
                            return result.email
                        } else {
                            return res.status(404).json({
                                mensagem: 'Nenhum e-mail vínculado à esse usuário foi encontrado.',
                                code: 'RESOURCE_NOT_FOUND',
                            });
                        }
                    })
                    .catch((error) => {
                        console.log('Algo inesperado aconteceu ao buscar o e-mail do usuário requisitante do Token de Ativação.', error);
            
                        let customErr = new Error('Algo inesperado aconteceu ao buscar o e-mail do usuário requisitante do Token de Ativação. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';
                
                        next ( customErr );
                    });
            
                    // Cria e envia o e-mail contendo o Token de Ativação.
                    try {
            
                        let tokenAtivacao = await userTokenGenerator(req.params.codUsuario, 'atv');
                
                        if (tokenAtivacao){
                
                            console.log('Token recebido', tokenAtivacao);
                            console.log('Enviando e-mail para o usuário...');
                
                            await envioEmailAtivacao(tokenAtivacao, emailUsuario)
                            .then((result) => {
            
                                if (result === 'E-mail enviado com sucesso'){
                                    return res.status(200).json({
                                        mensagem: 'O e-mail com o Token de Ativação foi enviado com sucesso.'
                                    });
                                }
            
                            });
                
                        };
                
                
                    } catch (error) {
            
                        if (error.code === 'USER_HAS_ACTIVE_TOKEN') {
            
                            return res.status(error.status).json({
                                mensagem: error.message,
                                data_liberacao: error.data_liberacao,
                                code: error.code
                            });
            
                        };
            
                        if (error.code === 'INVALID_REQUEST_FIELDS') {
            
                            return res.status(error.status).json({
                                mensagem: error.message,
                                code: error.code,
                                missing_fields: error.missing_fields
                            });
            
                        };
            
                        console.log('Algo inesperado aconteceu durante a geração do token de ativação ou envio do e-mail com o token de ativação.', error);
                
                        let customErr = new Error('Algo inesperado aconteceu durante a geração do token de ativação ou envio do e-mail com o token de ativação. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';
                
                        return next ( customErr );
                    };
            
                };
        
            /*  Usuários Sociais serão cadastrados como ativos, uma vez que toda verificação de autenticidade ocorreu nas redes aceitas pelo Sistema.
        
                Se eles desativarem a conta em algum ponto do uso, no futuro, eles poderão solicitar um SMS com o Token de Ativação, ou caso não tenham
                informado um telefone celular no cadastro, ou esse tenha sido expirado, requisitar ao suporte PetAdote para que ativem suas contas, informando
                os primeiros e últimos dígitos do CPF.  */

        // Fim das verificações de tipo de cadastro.
        
    };


    /**
     * @description Verifica se o e-mail enviado na requisição está cadastrado e vínculado à um usuário para então gerar um Token de Recuperação que será utilizado pelo usuário para permitir que a aplicação altere sua senha.
     */
    const sendNewPasswordToken = async (req, res, next) => {

        // Início da Verificação do Parâmetro de Rota.
            // Rota sem parâmetros...
        // Fim da Verificação do Parâmetro de Rota.
    
        // Início das Restrições de Acesso à Rota.
    
            // Apenas as Aplicações Pet Adote poderão realizar a recuperação da conta de um usuário.
    
            if (!req.dadosAuthToken){   // Se não houver autenticação da aplicação, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            } else {
    
                // Se o requisitante for um usuário autenticado, não permita o acesso.
                if (req.dadosAuthToken.usuario){
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
    
            }
    
        // Fim das Restrições de Acesso à Rota.
    
        // Início da Verificação da existência de dados no pacote da requisição.
    
            if (!req.headers['content-type']){
                return res.status(400).json({
                    mensagem: 'Dados não encontrados na requisição',
                    code: 'INVALID_REQUEST_CONTENT'
                })
            }
    
        // Fim da verificação da existência de dados no pacote da requisição.
    
        // Início da lista de campos obrigatórios na requisição.
    
            let requiredFields = [
                'email'
            ];
    
        // Fim da lista de campos obrigatórios na requisição.
    
        // Verificação da existência dos campos obrigatórios no pacote da requisição.
            
            let missingFields = [];
    
            requiredFields.forEach((field) => {
                if (!Object.keys(req.body).includes(field)){
                    missingFields.push(`Campo [${field}] não encontrado.`);
                }
            });
    
            if (missingFields.length > 0){
                console.log('missingFields detectados, campos obrigatórios estão faltando.');
        
                return res.status(400).json({
                    mensagem: 'Campos inválidos ou incompletos foram detectados.',
                    code: 'INVALID_REQUEST_FIELDS',
                    missing_fields: missingFields
                });
            }
    
        // Fim da verificação da existência dos campos obrigatórios no pacote da requisição.
    
        // Início da normalização dos campos recebidos no pacote da requisição.
    
            Object.entries(req.body).forEach((pair) => {        // Todo campo se tornará uma String e não possuirá espaços "     " no começo ou no fim.
    
                // Remove espaços excessivos no início/fim da String.
                req.body[pair[0]] = String(pair[1]).trim();
    
                // Deixando as primeiras letras dos nomes com caixa alta.
                switch(pair[0]){
                    // case 'descricao': break;     // Se algum campo não precisar da normalização, separe-o em 'cases' com apenas 'break'.
                    case 'email': 
                        req.body[pair[0]] = String(pair[1]).toLowerCase();
                        break;
                    default: break;
                }
                
            });
    
        // Fim da normalização dos campos recebidos no pacote da requisição.
    
        // Início da validação dos campos recebidos.
    
            // Validação básica do e-mail.
            if (req.body.email.length === 0 || req.body.email.length > 255){
                // console.log('Erro: E-mail vazio ou ultrapassa 255 caracteres.')
                return res.status(400).json({
                    mensagem: 'EMAIL - Vazio ou ultrapassa 255 caracteres.',
                    code: 'INVALID_EMAIL_LENGTH'
                })
            }
    
            if (!req.body.email.match(/^([\w\d-+.]{1,64})(@[\w\d-]+)((?:\.\w+)+)$/g)){
                // console.log('Erro: O formato do e-mail está diferente do esperado.');
                return res.status(400).json({
                    mensagem: 'EMAIL - Formato inválido.',
                    code: 'INVALID_EMAIL_INPUT',
                    exemplo: 'email@dominio.com'
                });
            }
            // Fim da validação básica do e-mail.
    
        // Fim da validação dos campos recebidos.
    
        // Início do processamento de envio do Token de Recuperação que o usuário utilizará para autorizar a renovação da senha.
    
            try {
                // Início da verificação da existência de um usuário vínculado ao e-mail.
                    let { cod_usuario } = await ContaLocal.findOne({
                        where: {
                            email: req.body.email
                        },
                        raw: true
                    })
    
                    if (!cod_usuario){
                        return res.status(404).json({
                            mensagem: 'Nenhum usuário vínculado à esse e-mail foi encontrado.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }
                // Fim da verificação da existência de um usuário vínculado ao e-mail.
    
                // Início da criação do Token de Recuperação - A função de criação também verifica se um Token de Recuperação já foi enviado.
                    const tokenRecuperacao = await userTokenGenerator(cod_usuario, 'rec', 10 * 60);
                // Fim da criação do Token de Recuperação.
    
                // Início do envio do e-mail de recuperação contendo o Token de Recuperação.
                    if (tokenRecuperacao){
                        await envioEmailRecuperacao(tokenRecuperacao, req.body.email)
                        .then((result) => {
    
                            if (result === 'E-mail enviado com sucesso'){
                                return res.status(200).json({
                                    mensagem: 'O e-mail com o Token de Recuperação foi enviado com sucesso.'
                                });
                            }
        
                        });
                    }
                // Fim do envio do e-mail de recuperação contendo o Token de Recuperação.
    
            } catch (error) {
    
                if (error.code === 'USER_HAS_ACTIVE_TOKEN') {
    
                    return res.status(error.status).json({
                        mensagem: error.message,
                        data_liberacao: error.data_liberacao,
                        code: error.code
                    });
    
                };
    
                if (error.code === 'INVALID_REQUEST_FIELDS') {
    
                    return res.status(error.status).json({
                        mensagem: error.message,
                        code: error.code,
                        missing_fields: error.missing_fields
                    });
    
                };
    
                console.log('Algo inesperado aconteceu durante o processo de envio do Token de recuperação de senha do usuário.', error);
        
                let customErr = new Error('Algo inesperado aconteceu durante a geração do token de recuperação ou envio do e-mail com o token de recuperação. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
        
                return next ( customErr );
    
            }
        // Fim do processamento de envio do Token de Recuperação que o usuário utilizará para autorizar a renovação da senha.
    
    };

    /**
     * @description Recebe o e-mail do usuário que requisitou a alteração de senha e o Token de Recuperação que ele recebeu no e-mail informado. Se ambos os dados existirem nos nossos bancos de dados, uma nova senha provisória será gerada para o usuário. Por fim, o usuário receberá a nova senha no e-mail cadastrado.
     */
     const sendNewPassword = async (req, res, next) => {

        // Início da Verificação do Parâmetro de Rota.
            // Rota sem parâmetros...
        // Fim da Verificação do Parâmetro de Rota.
    
        // Início das Restrições de Acesso à Rota.
    
            // Apenas as Aplicações Pet Adote poderão realizar a recuperação da conta de um usuário.
    
            if (!req.dadosAuthToken){   // Se não houver autenticação da aplicação, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            } else {
    
                // Se o requisitante for um usuário autenticado, não permita o acesso.
                if (req.dadosAuthToken.usuario){
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
    
            }
    
        // Fim das Restrições de Acesso à Rota.
    
        // Início da Verificação da existência de dados no pacote da requisição.
    
            if (!req.headers['content-type']){
                return res.status(400).json({
                    mensagem: 'Dados não encontrados na requisição',
                    code: 'INVALID_REQUEST_CONTENT'
                })
            }
    
        // Fim da verificação da existência de dados no pacote da requisição.
    
        // Início da lista de campos obrigatórios na requisição.
    
            let requiredFields = [
                'email',
                'tokenRecuperacao'
            ];
    
        // Fim da lista de campos obrigatórios na requisição.
    
        // Verificação da existência dos campos obrigatórios no pacote da requisição.
            
            let missingFields = [];
    
            requiredFields.forEach((field) => {
                if (!Object.keys(req.body).includes(field)){
                    missingFields.push(`Campo [${field}] não encontrado.`);
                }
            });
    
            if (missingFields.length > 0){
                // console.log('missingFields detectados, campos obrigatórios estão faltando.');
    
                return res.status(400).json({
                    mensagem: 'Campos inválidos ou incompletos foram detectados.',
                    code: 'INVALID_REQUEST_FIELDS',
                    missing_fields: missingFields
                });
            }
    
        // Fim da verificação da existência dos campos obrigatórios no pacote da requisição.
    
        // Início da normalização dos campos recebidos no pacote da requisição.
    
            Object.entries(req.body).forEach((pair) => {        // Todo campo se tornará uma String e não possuirá espaços "     " no começo ou no fim.
    
                // Remove espaços excessivos no início/fim da String.
                req.body[pair[0]] = String(pair[1]).trim();
    
                // Deixando as primeiras letras dos nomes com caixa alta.
                switch(pair[0]){
                    // case 'descricao': break;     // Se algum campo não precisar da normalização, separe-o em 'cases' com apenas 'break'.
                    case 'email': 
                        req.body[pair[0]] = String(pair[1]).toLowerCase();
                        break;
                    default: break;
                }
                
            });
    
        // Fim da normalização dos campos recebidos no pacote da requisição.
    
        // Início da validação dos campos recebidos.
    
            // Validação básica do e-mail.
                if (req.body.email.length === 0 || req.body.email.length > 255){
                    // console.log('Erro: E-mail vazio ou ultrapassa 255 caracteres.')
                    return res.status(400).json({
                        mensagem: 'EMAIL - Vazio ou ultrapassa 255 caracteres.',
                        code: 'INVALID_EMAIL_LENGTH'
                    })
                }
    
                if (!req.body.email.match(/^([\w\d-+.]{1,64})(@[\w\d-]+)((?:\.\w+)+)$/g)){
                    // console.log('Erro: O formato do e-mail está diferente do esperado.');
                    return res.status(400).json({
                        mensagem: 'EMAIL - Formato inválido.',
                        code: 'INVALID_EMAIL_INPUT',
                        exemplo: 'email@dominio.com'
                    });
                }
            // Fim da validação básica do e-mail.
    
            // Validação do Token de Recuperação.
    
                if (!String(req.body.tokenRecuperacao).match(/^\w{7}[^_]$/g)){
                    return res.status(400).json({
                        mensagem: 'O Token de Recuperação não está em um formato válido.',
                        code: 'INVALID_INPUT',
                        exemplo: '012t0K3n'
                    });
                }
    
            // Fim da validação do Token de Recuperação.
    
        // Fim da validação dos campos recebidos.
    
        // Início dos processos de recuperação de senha do usuário.
    
            try{
                // Início da verificação da existência do e-mail e do vínculo entre usuário e o Token de Recuperação.
    
                    // Início da verificação da existência de um usuário vínculado ao e-mail.
                        let { cod_usuario } = await ContaLocal.findOne({
                            where: {
                                email: req.body.email
                            },
                            raw: true
                        })
    
                        if (!cod_usuario){
                            return res.status(404).json({
                                mensagem: 'Nenhum usuário vínculado à esse e-mail foi encontrado.',
                                code: 'RESOURCE_NOT_FOUND'
                            });
                        }
                    // Fim da verificação da existência de um usuário vínculado ao e-mail.
    
                    // Início da verificação do Token de Recuperação.
    
                        let getRecToken = async (hashKey) => {
    
                            return new Promise((resolve, reject) => {
    
                                redisClient.HGET(hashKey, 'token', (error, result) => {
                                    if (error) {
                                        return reject(error);
                                    }
            
                                    // console.log('resultGetRecToken', result);

                                    return resolve(result);
                                    
                                });
    
                            });
    
                        };
    
                        let hashKey = `tokens:rec:user_${cod_usuario}`;
    
                        let token = await getRecToken(hashKey);
                        
                        if (req.body.tokenRecuperacao != token){
                            return res.status(401).json({
                                mensagem: 'O token informado não é válido para esse usuário, não é possível realizar a redefinição da senha.',
                                code: 'NOT_ALLOWED'
                            });
                        }
    
                    // Fim da verificação do Token de Recuperação.
    
                // Fim da verificação da existência do e-mail e do vínculo entre usuário e o Token de Recuperação.
    
                // Início da redefinição provisória da senha do usuário.
                        
                    let senhaProvisoria = randomize('Aa0', 16);   // Nova senha provisória com 16 caracteres alfanuméricos.
    
                    // Início da criptografia da nova senha provisória do usuário.
                        
                        const salt = bcrypt.genSaltSync(10);
                        // console.log('O salt será: ', salt);
                        const hashedPassword = bcrypt.hashSync(senhaProvisoria, salt);
                        // console.log('Senha hasheada: ', hashedPassword);    // 60 caracteres.
    
                    // Fim da criptografia da nova senha provisória do usuário.
    
                    // Início da redefinição da senha da conta do usuário.
                        
                        let isAcessoRenovado = await ContaLocal.update({
                            senha: hashedPassword
                        }, {
                            where: { 
                                email: req.body.email
                            }
                        });
    
                    // Fim da redefinição da senha da conta do usuário.
    
                // Fim da redefinição provisória da senha do usuário.
    
                // Início do envio do e-mail contendo a nova senha do usuário.
                    if (isAcessoRenovado){
    
                        await envioEmailSenhaProvisoria(senhaProvisoria, req.body.email)
                        .then(async (result) => {
    
                            if (result === 'E-mail enviado com sucesso'){
                                // Remova o Token de Recuperação.
                                redisClient.DEL(hashKey, (errorDEL, resultDEL) => {
                                    if (errorDEL) {
                                        console.error('Algo inesperado aconteceu ao remover o Token de Recuperação consumido pelo usuário.', errorDEL);
            
                                        let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                                        customErr.status = 500;
                                        customErr.code = 'INTERNAL_SERVER_ERROR';
                                        
                                        return next( customErr );
                                    };
            
                                    return res.status(200).json({
                                        mensagem: 'O e-mail com a senha provisória foi enviado com sucesso.'
                                    });
            
                                });
    
                            }
        
                        });
    
                    } else {
    
                        return res.status(500).json({
                            mensagem: 'Algo inesperado aconteceu durante o processo de redefinição da senha do usuário para recuperação do acesso à conta. Entre em contato com o administrador.',
                            code: 'INTERNAL_SERVER_ERROR'
                        });
    
                    }
    
                // Fim do envio do e-mail contendo a nova senha do usuário.
            } catch(error) {
                
                console.error('Algo inesperado aconteceu durante o processo de redefinição da senha do usuário para recuperação do acesso à conta.', error);
        
                let customErr = new Error('Algo inesperado aconteceu durante o processo de redefinição da senha do usuário para recuperação do acesso à conta. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
        
                return next ( customErr );
    
            }
        // Fim dos processos de recuperação de senha do usuário.

    };

// Exportações.
module.exports = {
    getOneOrAll,
    createOne,
    updateOne,
    activateOne,
    sendActivationTokenAgain,
    sendNewPasswordToken,
    sendNewPassword
}