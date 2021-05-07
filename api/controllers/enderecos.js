// Importações.

    // Models.
        const EnderecoUsuario = require('../models/EnderecoUsuario');

    // Utilidades.
        const axios = require('axios');     // 'axios' cliente http para realizar requisições à APIs externas.

// Controllers.

    /**
     * @description Permite que as aplicações acessem a lista de endereços dos usuários cadastrados.
     * @description Método 01 - [ GET: .../enderecos/?codUsuario=1 ] - Se "codUsuario" for passado na Query String, a resposta possuirá o endereço de um usuário específico.
     * @description Método 02 - [ GET: .../enderecos/?codEndereco=1 ] - Se "codEndereco" for passado na Query String, a resposta possuirá o endereço vínculado ao valor de "codEndereco".
     * @description Método 03 - [ GET: .../enderecos/ ] - Entrega uma lista dos endereços registrados.
     */
    const getOneOrAll = (req, res, next) => {

        // Início das Restrições de Acesso à Rota.

            // Apenas aplicações Pet Adote e usuários autenticados nelas poderão acessar a listagem de endereços.
            // Além disso, para acessar um endereço específico, o usuário deve ser o dono do recurso, ou um administrador.
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

        // Fim das Restrições de Acesso à Rota.

        // Início da configuração das possíveis operações de busca + verificação dos parâmetros para cada caso.

            let operacao = undefined;   // Se a operação continuar como undefined, envie BAD_REQUEST (400).

            switch (Object.entries(req.query).length){
                case 0:
                    operacao = 'getAll';

                    break;
                case 1:
                    if (req.query?.page) { operacao = 'getAll' };

                    if (req.query?.codUsuario) { operacao = 'getOneFromUser'; };

                    if (req.query?.codEndereco) { operacao = 'getOneFromAddress'; };

                    break;
                case 2:
                    if (req.query?.page && req.query?.limit) { operacao = 'getAll' };

                    break;
                default:
                    break;
            }

        // Fim da configuração das possíveis operações de busca.

        // Início da Validação dos parâmetros.

            if (req.query?.codUsuario){
                if (req.query.codUsuario.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
                    return res.status(400).json({
                        mensagem: 'O ID do usuário deve conter apenas dígitos.',
                        code: 'INVALID_REQUEST_QUERY'
                    });
                }
            }

            if (req.query?.codEndereco){
                if (req.query.codEndereco.match(/[^\d]+/g)){     // Se "codEndereco" conter algo diferente do esperado.
                    return res.status(400).json({
                        mensagem: 'O ID do endereço deve conter apenas dígitos.',
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

            req.query.codUsuario = String(req.query.codUsuario);
            req.query.codEndereco = String(req.query.codEndereco);

        // Fim da Normalização dos parâmetros.

        // Início do processo de listagem dos endereços de usuários cadastrados.

            // Início das configurações de paginação.
                let requestedPage = req.query.page || 1;        // Página por padrão será a primeira.
                let paginationLimit = req.query.limit || 10;     // Limite padrão de dados por página = 10;

                let paginationOffset = (requestedPage - 1) * paginationLimit;   // Define o índice de partida para coleta dos dados.
            // Fim das configuração de paginação.

            // Início das operações de busca.

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

                    EnderecoUsuario.findAndCountAll({
                        limit: paginationLimit,
                        offset: paginationOffset,
                        raw: true
                    })
                    .then((resultArr) => {

                        if (resultArr.count === 0){
                            return res.status(200).json({
                                mensagem: 'Nenhum endereço está cadastrado.'
                            });
                        }

                        // Início da construção do objeto enviado na resposta.

                            let total_enderecos = resultArr.count;

                            let total_paginas = Math.ceil(total_enderecos / paginationLimit);

                            let enderecos = [];

                            let voltar_pagina = undefined;
                            let avancar_pagina = undefined;

                            if (requestedPage > 1 && requestedPage <= total_paginas){
                                voltar_pagina = `${req.protocol}://${req.get('host')}/usuarios/enderecos/?page=${requestedPage - 1}&limit=${paginationLimit}`;
                            }

                            if (requestedPage < total_paginas){
                                avancar_pagina = `${req.protocol}://${req.get('host')}/usuarios/enderecos/?page=${requestedPage + 1}&limit=${paginationLimit}`;
                            } 

                            if (requestedPage > total_paginas){
                                return res.status(404).json({
                                    mensagem: 'Você chegou ao final da lista de endereços dos usuários cadastrados.',
                                    code: 'RESOURCE_NOT_FOUND'
                                });
                            }

                            resultArr.rows.forEach((endereco) => {
                                // Adiciona o caminho do end-point para visualizar mais detalhes dos dados do usuário, dono do endereço.
                                endereco.detalhes_usuario = `${req.protocol}://${req.get('host')}/usuarios/${endereco.cod_usuario}`

                                enderecos.push(endereco);
                            });
                            
                        // Fim da construção do objeto enviado na resposta.

                        // Início do envio da resposta.
                            
                            return res.status(200).json({
                                mensagem: 'Lista de todos os enderecos cadastrados.',
                                total_enderecos,
                                total_paginas,
                                enderecos,
                                voltar_pagina,
                                avancar_pagina
                            });
                            
                        // Fim do envio da resposta.
                        
                    })
                    .catch((error) => {
                        console.error('Algo inesperado aconteceu ao listar os enderecos dos usuários cadastrados.', error);
    
                        let customErr = new Error('Algo inesperado aconteceu ao listar os enderecos dos usuários cadastrados. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR'
                
                        return next( customErr );
                    });

                }

                if (operacao  == 'getOneFromUser'){

                    // Restrições de Uso.
                        if (usuario?.e_admin == 0 && usuario?.cod_usuario != req.query.codUsuario){
                            // Se o requisitante for um usuário e não for um administrador ou o dono do recurso...
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        };
                    // -----------------

                    EnderecoUsuario.findOne({
                        where: {
                            cod_usuario: req.query.codUsuario
                        },
                        raw: true
                    })
                    .then((result) => {

                        if (!result) {
                            return res.status(200).json({
                                mensagem: 'Nenhum endereço vinculado à esse usuário foi encontrado.'
                            });
                        }

                        // Início da construção do objeto enviado na resposta.

                            let endereco = result;
                        
                            endereco.detalhes_usuario = `${req.protocol}://${req.get('host')}/usuarios/${req.query.codUsuario}`;

                        // Fim da construção do objeto enviado na resposta.

                        // Início do envio da resposta.
                            return res.status(200).json({
                                mensagem: 'Endereço encontrado.',
                                endereco
                            });
                        // Fim do envio da resposta.

                    })
                    .catch((error) => {
                        console.error('Algo inesperado aconteceu ao buscar o endereco vinculado ao usuários.', error);

                        let customErr = new Error('Algo inesperado aconteceu ao buscar o endereco vinculado ao usuários. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR'
                
                        return next( customErr );
                    });

                }

                if (operacao  == 'getOneFromAddress'){

                    // Restrições de Uso.
                        if (usuario?.e_admin == 0){
                            // Se o requisitante for um usuário e não for um administrador...
                            return res.status(401).json({
                                mensagem: 'Você não possui o nível de acesso adequado para esse recurso.',
                                code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                            });
                        };
                    // -----------------

                    EnderecoUsuario.findOne({
                        where: {
                            cod_end_usuario: req.query.codEndereco
                        },
                        raw: true
                    })
                    .then((result) => {

                        if (!result) {
                            return res.status(200).json({
                                mensagem: 'Nenhum endereço com esse ID foi encontrado.'
                            });
                        }

                        // Início da construção do objeto enviado na resposta.

                            let endereco = result;
                        
                            endereco.detalhes_usuario = `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`;

                        // Fim da construção do objeto enviado na resposta.

                        // Início do envio da resposta.
                            return res.status(200).json({
                                mensagem: 'Endereço encontrado.',
                                endereco
                            });
                        // Fim do envio da resposta.

                    })
                    .catch((error) => {
                        console.error('Algo inesperado aconteceu ao buscar o enderecos.', error);

                        let customErr = new Error('Algo inesperado aconteceu ao buscar o enderecos. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR'
                
                        return next( customErr );
                    });

                }

                if (!operacao){
                
                    return res.status(400).json({
                        mensagem: 'Algum parâmetro inválido foi passado na URL da requisição.',
                        code: 'BAD_REQUEST'
                    });
        
                };

            // Fim das operações de busca.

        // Fim do processo de listagem dos endereços de usuários cadastrados.    
    };

    /**
     * @description Permite que aplicações Pet Adote, administradores ou o dono do endereço realize alterações no endereço. Recebe como parâmetro de rota "codUsuario".
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
            // Apenas as Aplicações Pet Adote, Administradores e o Dono do recurso poderão realizar modificações no endereço.
    
            if (!req.dadosAuthToken){   // Se não houver autenticação da aplicação, não permita o acesso.
                return res.status(401).json({
                    mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            } else {
    
                let { usuario } = req.dadosAuthToken;
    
                // Se o Requisitante possuir um ID diferente do ID requisitado e não for um administrador, não permita o acesso.
                if (usuario && (usuario.cod_usuario != req.params.codUsuario && usuario.e_admin == 0)){
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
    
        // Início da verificação de existência de um endereço vínculado ao "codUsuario".
    
            let enderecoAtual = await EnderecoUsuario.findOne({
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
                        mensagem: 'O usuário não existe ou nenhum endereço está vínculado à ele.',
                        code: 'RESOURCE_NOT_FOUND'
                    });
                }
            })
            .catch((error) => {
                console.error(`Algo inesperado aconteceu na verificação de existência de um endereço vínculado à um usuário.`, error);
    
                let customErr = new Error('Algo inesperado aconteceu na verificação de existência de um endereço vínculado à um usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
    
                return next( customErr );
            });
    
        // Fim da verificação de um endereço vínculado ao "codUsuario".
    
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
                'cep',
                'logradouro',
                'bairro',
                'cidade',
                'uf',
                'numero',
                'complemento'
            ];
    
        // Fim da lista de campos de modificação permitidos.

        // Verificação de campos vazios.
            let emptyFields = [];   // Se campos vazios forem detectados, envie (400 - INVALID_REQUEST_FIELDS)

            Object.entries(req.body).forEach((pair) => {
                if (String(pair[1]).length == 0){
                    emptyFields.push(String(pair[0]));
                };
            });

            if (emptyFields.length > 0){
                return res.status(400).json({
                    mensagem: `Campos vazios foram detectados.`,
                    code: 'INVALID_REQUEST_FIELDS',
                    campos_vazios: emptyFields
                });
            }
        // Fim da verificação de campos vazios.
    
        // Início da normalização dos campos recebidos no pacote da requisição.
    
            let operacoes = {}  // Lista de Operações: Não será possível modificar via requisições, valores que não estiverem na lista de "allowedFields".
    
            Object.entries(req.body).forEach((pair) => {
    
                if (allowedFields.includes(pair[0])){               
    
                    operacoes[pair[0]] = String(pair[1]).trim();    // Todo campo será tratado como uma String e não possuirá espaços no começo e no fim.
    
                    let partes = undefined;
    
                    switch(pair[0]){
                        //case 'descricao': break;  // Se algum campo não precisar da normalização abaixo, separe-o em 'cases' com break.
                        case 'uf':
                            operacoes[pair[0]] = String(pair[1]).toUpperCase();

                            break;
                        case 'numero': break;
                        case 'complemento':
                            // Deixa a primeira letra da string como maiúscula.
                            operacoes[pair[0]] = pair[1][0].toUpperCase() + pair[1].substr(1);

                            break;
                        default:
                            partes = pair[1].trim().split(' ');     // Caso ainda existirem, removerá os espaços excessívos do Início/Fim em substrings.
    
                            partes.forEach((parte, index) => {      // Como todo campo restante nessa rota trata de nomes, todo primeiro caractere das substrings ficarão em caixa alta.
                                if (parte){
                                    partes[index] = parte[0].toUpperCase() + parte.substr(1);
                                }
                            })
    
                            operacoes[pair[0]] = partes.join(' ');  // Como separamos os valores passados em substrings para o tratamento, vamos unir as partes novamente, separando-as por espaço ' ' ao atribuí-las ao campo.
                            break;
                    }
    
                }
    
            });
    
        // Fim da normalização dos campos recebidos no pacote da requisição.
    
        // Coleta dos dados a respeito do CEP do endereço atual do Usuário na api "ViaCEP".
    
            let urlVerificacaoViaCep = `http://viacep.com.br/ws/${operacoes.cep}/json/`;
    
            let infoCEP = await axios.get(urlVerificacaoViaCep)
            .then((result) => {
                return result.data;
            })
            .catch((error) => {

                console.error('Algo inesperado aconteceu na API VIA CEP ao atualizar o endereço do usuário...');
                if (error.response) { console.error('responseError:', error.response); }
                else if (error.request) { console.error('requestError:', error.request); }
                else { console.error('unexpectedError:', error); }
                console.error('errorConfig', error.message);

                return { 
                    api_error: {
                        errCode: error.code,
                        errMessage: error.message
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
        
                    let customErr = new Error('Não é possível alterar os dados do endereço no momento, tente novamente mais tarde.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_API_ERROR';
        
                    return next( customErr );
                }
    
                let customErr = new Error('CEP - Algo inesperado aconteceu ao buscar informações sobre o CEP. O CEP deve ser informado para alterar os dados de endereço.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
    
                return next( customErr );
            }
        
        // Fim da coleta dos dados a respeito do CEP do endereço atual do Usuário na api "ViaCEP".
    
        // Início da validação dos campos da operação.
    
            // Validação simples do CEP
                if (operacoes.cep){
                    if (!String(operacoes.cep).match(/^\d{5}(?:\-?)\d{3}$/)){
                        return res.status(400).json({
                            mensagem: 'CEP - Formato inválido',
                            code: 'INVALID_CEP_INPUT',
                            exemplo: '12345-123 ou 12345123'
                        });
                    }
    
                    if (String(operacoes.cep).length === 9){
                        operacoes.cep = operacoes.cep.replace('-', '')
                    }
                }
            // Fim da Validação simples do CEP.
    
            // Validação de logradouro
                if (operacoes.logradouro){
                    if (operacoes.logradouro.length === 0 || operacoes.logradouro.length > 100){
                        return res.status(400).json({
                            mensagem: 'LOGRADOURO - Está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_LOGRADOURO_LENGTH'
                        });
                    }
                }
            // Fim da Validação do logradouro.
    
            // Validação do bairro
                if (operacoes.bairro){
                    if (operacoes.bairro.length === 0 || operacoes.bairro.length > 100){
                        return res.status(400).json({
                            mensagem: 'BAIRRO - Está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_BAIRRO_LENGTH'
                        });
                    }
                }
    
                // if (!infoCEP.bairro.toLowerCase().includes(operacoes.bairro.toLowerCase())){
                //     return res.status(400).json({
                //         mensagem: 'BAIRRO - O bairro informado não está de acordo com o CEP.',
                //         code: 'BAIRRO_DONT_BELONG_TO_CEP'
                //     });
                // }

            // Fim da validação do Bairro.
    
            // Validação da cidade.
    
                if (operacoes.cidade){
                    if (operacoes.cidade.length === 0 || operacoes.cidade.length > 100){
                        return res.status(400).json({
                            mensagem: 'CIDADE - Está vazia ou possui mais do que 100 caracteres.',
                            code: 'INVALID_CIDADE_LENGTH',
                            exemplo: 'São Paulo'
                        });
                    }
    
                    if (!infoCEP.localidade.toLowerCase().includes(operacoes.cidade.toLowerCase())){
                        console.log(infoCEP);
                        console.log(operacoes.cidade);
                        return res.status(400).json({
                            mensagem: 'CIDADE - A cidade informada não está de acordo com o CEP.',
                            code: 'CIDADE_DONT_BELONG_TO_CEP'
                        });
                    }
                }
            // Fim da validação da cidade.
    
            // Validação da uf
                if (operacoes.uf){
                    if (operacoes.uf.length === 0 || operacoes.uf.length > 100){
                        return res.status(400).json({
                            mensagem: 'UF - Está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_UF_LENGTH',
                            exemplo: 'SP'
                        });
                    }
        
                    if (!infoCEP.uf.toLowerCase().includes(operacoes.uf.toLowerCase())){
                        return res.status(400).json({
                            mensagem: 'UF - O UF informado não está de acordo com o CEP.',
                            code: 'UF_DONT_BELONG_TO_CEP'
                        });
                    }
                }
            // Fim da validação da uf.

            // Validação do 'numero'.
                if (operacoes.numero){

                    if (operacoes.numero.match(/[^\d]+/g)){
                        return res.status(400).json({
                            mensagem: 'NUMERO - Deve possuir apenas dígitos.',
                            code: 'INVALID_INPUT_NUMERO',
                        });
                    }

                    if (operacoes.numero.length === 0 || operacoes.numero.length > 100){
                        return res.status(400).json({
                            mensagem: 'NUMERO - Está vazio ou possui mais do que 100 dígitos.',
                            code: 'INVALID_NUMERO_LENGTH',
                        });
                    }

                }
            // Fim da validação do 'numero'.

            // Validação do 'complemento'.
                if (operacoes.complemento){

                    if (operacoes.complemento.length === 0 || operacoes.numero.length > 255){
                        return res.status(400).json({
                            mensagem: 'COMPLEMENTO - Está vazio ou possui mais do que 255 caracteres.',
                            code: 'INVALID_COMPLEMENTO_LENGTH',
                        });
                    }

                }
            // Fim da validação do 'complemento'.
    
        // Fim da validação dos campos da operação.
    
        // Início das Operações de Update.
    
            // console.log('Estado das Operações antes do Update:', operacoes);
    
            await EnderecoUsuario.update(operacoes, {
                where: { 
                    cod_usuario: req.params.codUsuario
                },
                limit: 1
            })
            .then((resultUpdate) => {
    
                return EnderecoUsuario.findOne({
                    where: { 
                        cod_usuario: req.params.codUsuario
                    },
                    raw: true
                });
    
            })
            .then((resultFind) => {
                return res.status(200).json({
                    mensagem: 'Os dados de endereço do usuário foram atualizados com sucesso.',
                    endereco: resultFind
                })
            })
            .catch((errorUpdate) => {
                console.error('Algo inesperado aconteceu ao atualizar os dados de endereço do usuário.', errorUpdate);
    
                let customErr = new Error('Algo inesperado aconteceu ao atualizar os dados de endereço do usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
    
                return next( customErr );
            });
    
        // Fim das Operações de Update.
    
    };

// Exportações.
module.exports = {
    getOneOrAll,
    updateOne
}