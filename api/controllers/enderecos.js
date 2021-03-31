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

        if (req.url.includes('&')){ // Se a query string possuir mais do que um parâmetro, não permita o acesso.
            return res.status(400).json({
                mensagem: "Requisição inválida.",
                code: 'BAD_REQUEST'
            });
        }
    
        // Caso 01 - Se "codUsuario" for passado na Query String. Encontre um endeço cuja FK seja igual à "codUsuario".
        if (req.query.codUsuario){
    
            // Início da Verificação da Query String.
                if (req.query.codUsuario.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
                    return res.status(400).json({
                        mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos.",
                        code: 'BAD_REQUEST'
                    });
                }
            // Fim da verificação da Query String.
    
            // Restrições de acesso à rota.
                // Apenas as Aplicações Pet Adote, Administradores e o Dono do recurso poderão acessar dados de um endereço vínculado à um usuário específico.

                if (!req.dadosAuthToken){   
                    // Se não houver autenticação da aplicação, não permita o acesso.
                    return res.status(401).json({
                        mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                } else {
    
                    let { usuario } = req.dadosAuthToken;
    
                    // Se o Requisitante possuir um ID diferente do ID requisitado e não for um administrador, não permita o acesso.
                    if (usuario && (usuario.cod_usuario != req.query.codUsuario && usuario.e_admin == 0)){
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
    
            // Início da busca do endereço de um usuário.
                return EnderecoUsuario.findOne({ 
                    where: { 
                        cod_usuario: req.query.codUsuario
                    }, 
                    raw: true
                })
                .then((result) => {
                    if (result) {
                        res.status(200).json({
                            mensagem: 'Endereço encontrado.',
                            endereco: result,
                            usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`
                        });
                    } else {
                        res.status(404).json({
                            mensagem: 'Não foi encontrado nenhum endereço vínculado à este ID de Usuário.',
                            lista_enderecos: `${req.protocol}://${req.get('host')}/usuarios/enderecos/`,
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }
                })
                .catch((error) => {
                    console.error(`Algo inesperado aconteceu ao buscar um endereço vinculado à um usuário.`, error);
                    return next( new Error('Algo inesperado aconteceu ao buscar um endereço vinculado à um usuário. Entre em contato com o administrador.') );
                })
            // Fim da busca do endereço de um usuário.
    
        }
    
        // Fim do Caso 01.
    
        // Caso 02 - Se "codEndereco" for passado na Query String. Encontre um endeço por sua PK.
    
        if (req.query.codEndereco){
    
            // Início da Verificação da Query String.
                if (req.query.codEndereco.match(/[^\d]+/g)){     // Se "codEndecero" conter algo diferente do esperado.
                    return res.status(400).json({
                        mensagem: "Requisição inválida - O ID de um Endereço deve conter apenas dígitos.",
                        code: 'BAD_REQUEST'
                    });
                }
            // Fim da Verificação da Query String.
    
            // Restrições de acesso à rota.
                // Apenas as Aplicações Pet Adote poderão verificar um endereço específico.

                if (!req.dadosAuthToken){   
                    // Se não houver autenticação da aplicação, não permita o acesso.
                    return res.status(401).json({
                        mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                } else {
    
                    // Se o requisitante for um usuário, não permita o acesso.
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
            // Fim das restrições de acesso à rota.
    
            // Início da busca de um endereço específico via PK do endereço.
    
                return EnderecoUsuario.findByPk(req.query.codEndereco, { 
                    raw: true
                })
                .then((result) => {
    
                    if (result) {
                        res.status(200).json({
                            mensagem: 'Endereço encontrado.',
                            endereco: result,
                            usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`
                        });
                    } else {
                        res.status(404).json({
                            mensagem: 'Nenhum endereço com esse ID foi encontrado.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }
    
                })
                .catch((error) => {
                    console.error(`Algo inesperado aconteceu ao buscar os dados de um endereço.`, error);
                    return next( new Error('Algo inesperado aconteceu ao buscar os dados de um endereço. Entre em contato com o administrador.') );
                });
    
            // Fim da busca de um endereço específico via PK do endereço.
    
        }
    
        // Fim do Caso 02.
    
        // Caso 03 - Se nada for passado na Query String... Liste todos os endereços.
    
            // Restrições de acesso à rota.
                // Apenas as Aplicações Pet Adote poderão listar os endereços.
                if (!req.dadosAuthToken){
                    // Se não houver autenticação da aplicação, não permita o acesso.
                    return res.status(401).json({
                        mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                        code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                    });
                } else {
    
                    // Se o requisitante for um usuário, não permita o acesso.
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
            // Fim das restrições de acesso à rota.
    
            // Início da listagem de endereços dos usuários.
                return EnderecoUsuario.findAll({ raw: true })
                .then((resultArr) => {
    
                    if (resultArr.length === 0){
                        res.status(200).json({
                            mensagem: 'Nenhum endereço foi registrado.'
                        });
                    } else {
    
                        res.status(200).json({
                            total_enderecos: resultArr.length,
                            mensagem: 'Lista de enderecos registrados.',
                            enderecos: resultArr
                        });
                    }
    
                })
                .catch((error) => {
    
                    console.error(`Algo inesperado aconteceu ao buscar a lista de usuários.`, error);
                    return next( new Error('Algo inesperado aconteceu ao buscar a lista de usuários. Entre em contato com o administrador.') );
    
                });
            // Fim da listagem dos endereços dos usuários.
    
        // Fim do Caso 03.
    
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
                'estado'
            ];
    
        // Fim da lista de campos de modificação permitidos.
    
        // Início da normalização dos campos recebidos no pacote da requisição.
    
            let operacoes = {}  // Lista de Operações: Não será possível modificar via requisições, valores que não estiverem na lista de "allowedFields".
    
            Object.entries(req.body).forEach((pair) => {
    
                if (allowedFields.includes(pair[0])){               
    
                    operacoes[pair[0]] = String(pair[1]).trim();    // Todo campo será tratado como uma String e não possuirá espaços no começo e no fim.
    
                    let partes = undefined;
    
                    switch(pair[0]){
                        //case 'descricao': break;  // Se algum campo não precisar da normalização abaixo, separe-o em 'cases' com break.
                        case 'estado':
                            operacoes[pair[0]] = String(pair[1]).toUpperCase();
                            break;
                        default:
                            partes = pair[1].trim().split(' ');     // Caso ainda existirem, removerá os espaços excessívos do Início/Fim em substrings.
    
                            partes.forEach((parte, index) => {      // Como todo campo nessa rota trata de nomes, todo primeiro caractere das substrings ficarão em caixa alta.
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
    
            let urlVerificacaoViaCep = `http://viacep.com.br/ws/${enderecoAtual.cep}/json/`;
    
            let infoCEP = await axios.get(urlVerificacaoViaCep)
            .then((result) => {
                return result.data;
            })
            .catch((error) => {
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
        
                    let customErr = new Error('Não é possível alterar os dados do endereço no momento, tente novamente mais tarde.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_API_ERROR';
        
                    return next( customErr );
                }
    
                let customErr = new Error('CEP - Algo inesperado aconteceu ao buscar informações sobre o CEP.');
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
    
            // Validação de logradouro
                if (operacoes.logradouro){
                    if (operacoes.logradouro.length === 0 || operacoes.logradouro.length > 100){
                        return res.status(400).json({
                            mensagem: 'LOGRADOURO - Está vazio ou possui mais do que 100 caracteres.',
                            code: 'INVALID_LOGRADOURO_LENGTH'
                        });
                    }
                }
    
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
    
            // Validação da cidade
    
                if (operacoes.cidade){
                    if (operacoes.cidade.length === 0 || operacoes.cidade.length > 100){
                        return res.status(400).json({
                            mensagem: 'CIDADE - Está vazia ou possui mais do que 100 caracteres.',
                            code: 'INVALID_CIDADE_LENGTH',
                            exemplo: 'São Paulo'
                        });
                    }
    
                    if (!infoCEP.localidade.toLowerCase().includes(operacoes.cidade.toLowerCase())){
                        return res.status(400).json({
                            mensagem: 'CIDADE - A cidade informada não está de acordo com o CEP.',
                            code: 'CIDADE_DONT_BELONG_TO_CEP'
                        });
                    }
                }
    
            // Validação do estado
            if (operacoes.estado){
                if (operacoes.estado.length === 0 || operacoes.estado.length > 100){
                    return res.status(400).json({
                        mensagem: 'ESTADO - Está vazio ou possui mais do que 100 caracteres.',
                        code: 'INVALID_ESTADO_LENGTH',
                        exemplo: 'SP'
                    });
                }
    
                if (!infoCEP.uf.toLowerCase().includes(operacoes.estado.toLowerCase())){
                    return res.status(400).json({
                        mensagem: 'ESTADO - O estado informado não está de acordo com o CEP.',
                        code: 'ESTADO_DONT_BELONG_TO_CEP'
                    });
                }
            }
    
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