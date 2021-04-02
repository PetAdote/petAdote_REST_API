// Importações.

    // Models.
        const Usuario = require('../models/Usuario');

        const Bloqueio = require('../models/Bloqueio');

    // Utilidades.
        const fs = require('fs');           // 'fs' do Node para manipular o "file system', gerenciando os arquivos que o servidor receberá.

        const path = require('path');       // 'path' do Node para gerenciar caminhos para arquivos e diretórios.

        const uuid = require('uuid');       // 'uuid' para criar os nomes únicos dos arquivos.

        const moment = require('moment');   // 'moment' para manipular dados de tempo de forma mais flexível.

        const multer = require('multer');   // 'multer' para receber dados via POST de um formulário com encode 'multipart/form-data' (XMLHttpRequest).

        const sharp = require('sharp');     // 'sharp' para processar imagens.

        const mv = require('mv');           // 'mv' para mover arquivos de forma segura.

// Controllers.

    /**
     * @description Lista de todos os usuários registrados.
     */
    const getAll = (req, res, next) => {

        Usuario.findAll({ attributes: ['cod_usuario'], raw: true })
        .then((resultArr) => {

            if (resultArr.length === 0){
                return res.status(200).json({
                    mensagem: 'Nenhum usuário está registrado.'
                });
            }

            resultArr.forEach((row) => {
                row.conta = `${req.protocol}://${req.get('host')}/contas/?codUsuario=${row.cod_usuario}`,
                row.detalhes = `${req.protocol}://${req.get('host')}/usuarios/${row.cod_usuario}`
            });

            res.status(200).json({
                total_usuarios: resultArr.length,
                mensagem: 'Lista de usuários registrados.',
                usuarios: resultArr
            });

        })
        .catch((error) => {

            console.error(`Algo inesperado aconteceu ao buscar a lista de usuários.`, error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar a lista de usuários. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';

            return next( customErr );

        });

    };

    /**
     * @description Recebe "codUsuário" como parâmetro de Rota para capturar os dados de um usuário específico. O resultado será diferente dependendo do requisitante, por exemplo, um usuário bloqueado pelo usuário cujos dados foram requisitados não poderá visualizar as informações do usuário requisitado.
     */
    const getOne = async (req, res, next) => {

        if (req.params.codUsuario.match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos.",
                code: 'INVALID_REQUESTED_ID'
            });
        }

        /* Verificar a lista de bloqueados desse usuário.
        Se o usuário requisitante estiver na lista de bloqueados, retornar status 401. */
        if (req.dadosAuthToken.usuario && req.dadosAuthToken.usuario.e_admin === 0){
            const estaBloqueado = await Bloqueio.findOne({ 
                where: { 
                    bloqueante: req.params.codUsuario,
                    bloqueado: req.dadosAuthToken.usuario.cod_usuario
                },
                raw: true
            })
            .then((result) => {
                if (result) {
                    // Usuário requisitante está bloqueado de acessar os dados desse usuário.
                    return true;
                    

                } else {
                    return false;
                }
            })
            .catch((error) => {
                console.error(`Algo inesperado aconteceu ao verificar se o usuário requisitante está bloqueado.`, error);

                let customErr = new Error('Algo inesperado aconteceu ao verificar se o usuário requisitante está bloqueado. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';

                return next( customErr );
            });

            if (estaBloqueado) {
                return res.status(401).json({
                    mensagem: "Não foi possível acessar os dados desse usuário.",
                    code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
                });
            }
        }

        Usuario.findByPk(req.params.codUsuario, { raw: true })
        .then((result) => {

            if (result) {

                /* Exibir lista de rotas com base nos níveis de acesso.
                Cliente (API); Usuário Admin; Usuário dono do recurso; Usuário visitante do recurso. */

                if (req.dadosAuthToken.cod_cliente && (!req.dadosAuthToken.usuario || req.dadosAuthToken.usuario.e_admin == 1)) {
                    // Chamada da API ou de um Admin.

                    return res.status(200).json({
                        usuario: result,
                        conta: `${req.protocol}://${req.get('host')}/contas/?codUsuario=${result.cod_usuario}`,
                        endereco: `${req.protocol}://${req.get('host')}/usuarios/enderecos/?codUsuario=${result.cod_usuario}`,
                        seguidos: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidos=${result.cod_usuario}`,
                        seguidores: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidores=${result.cod_usuario}`,
                        denunciados: `${req.protocol}://${req.get('host')}/usuarios/denuncias/?denunciados=${result.cod_usuario}`,
                        denunciantes: `${req.protocol}://${req.get('host')}/usuarios/denuncias/?denunciantes=${result.cod_usuario}`,
                        bloqueados: `${req.protocol}://${req.get('host')}/usuarios/bloqueios/?bloqueados=${result.cod_usuario}`,
                        bloqueantes: `${req.protocol}://${req.get('host')}/usuarios/bloqueios/?bloqueantes=${result.cod_usuario}`,
                        animais: `${req.protocol}://${req.get('host')}/animais/?codDono=${result.cod_usuario}`,
                        momentos: `${req.protocol}://${req.get('host')}/momentos/?codUsuario=${result.cod_usuario}`,
                        postagens: `${req.protocol}://${req.get('host')}/postagens/?codUsuario=${result.cod_usuario}`,
                        postagens_avaliadas: `${req.protocol}://${req.get('host')}/postagens/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        anuncios: `${req.protocol}://${req.get('host')}/anuncios/?codUsuario=${result.cod_usuario}`,
                        anuncios_favoritos: `${req.protocol}://${req.get('host')}/anuncios/favoritos/?codUsuario=${result.cod_usuario}`,
                        anuncios_avaliados: `${req.protocol}://${req.get('host')}/anuncios/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        candidaturas: `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?codUsuario=${result.cod_usuario}`,
                        conversas: `${req.protocol}://${req.get('host')}/conversas/?codUsuario=${result.cod_usuario}`
                    });
                } else if (req.dadosAuthToken.usuario && req.dadosAuthToken.usuario.cod_usuario != req.params.codUsuario){
                    // Chamada de um Usuário visitante.

                    return res.status(200).json({
                        conta: `${req.protocol}://${req.get('host')}/contas/?codUsuario=${result.cod_usuario}`,
                        usuario: result,
                        seguidos: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidos=${result.cod_usuario}`,
                        seguidores: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidores=${result.cod_usuario}`,
                        animais: `${req.protocol}://${req.get('host')}/animais/?codDono=${result.cod_usuario}`,
                        momentos: `${req.protocol}://${req.get('host')}/momentos/?codUsuario=${result.cod_usuario}`,
                        postagens: `${req.protocol}://${req.get('host')}/postagens/?codUsuario=${result.cod_usuario}`,
                        postagens_avaliadas: `${req.protocol}://${req.get('host')}/postagens/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        anuncios: `${req.protocol}://${req.get('host')}/anuncios/?codUsuario=${result.cod_usuario}`,
                        anuncios_favoritos: `${req.protocol}://${req.get('host')}/anuncios/favoritos/?codUsuario=${result.cod_usuario}`,
                        anuncios_avaliados: `${req.protocol}://${req.get('host')}/anuncios/avaliacoes/?codUsuario=${result.cod_usuario}`,
                    });

                } else if (req.dadosAuthToken.usuario && req.dadosAuthToken.usuario.cod_usuario == req.params.codUsuario){
                    // Chamada do Usuário dono do recurso.

                    return res.status(200).json({
                        conta: `${req.protocol}://${req.get('host')}/contas/?codUsuario=${result.cod_usuario}`,
                        usuario: result,
                        endereco: `${req.protocol}://${req.get('host')}/usuarios/enderecos/?codUsuario=${result.cod_usuario}`,
                        seguidos: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidos=${result.cod_usuario}`,
                        seguidores: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidores=${result.cod_usuario}`,
                        denunciados: `${req.protocol}://${req.get('host')}/usuarios/denuncias/?denunciados=${result.cod_usuario}`,
                        bloqueados: `${req.protocol}://${req.get('host')}/usuarios/bloqueios/?bloqueados=${result.cod_usuario}`,
                        animais: `${req.protocol}://${req.get('host')}/animais/?codDono=${result.cod_usuario}`,
                        momentos: `${req.protocol}://${req.get('host')}/momentos/?codUsuario=${result.cod_usuario}`,
                        postagens: `${req.protocol}://${req.get('host')}/postagens/?codUsuario=${result.cod_usuario}`,
                        postagens_avaliadas: `${req.protocol}://${req.get('host')}/postagens/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        anuncios: `${req.protocol}://${req.get('host')}/anuncios/?codUsuario=${result.cod_usuario}`,
                        anuncios_favoritos: `${req.protocol}://${req.get('host')}/anuncios/favoritos/?codUsuario=${result.cod_usuario}`,
                        anuncios_avaliados: `${req.protocol}://${req.get('host')}/anuncios/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        candidaturas: `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?codUsuario=${result.cod_usuario}`,
                        conversas: `${req.protocol}://${req.get('host')}/conversas/?codUsuario=${result.cod_usuario}`
                    });

                }

            } else {
                return res.status(404).json({
                    mensagem: 'Nenhum usuário com esse ID foi encontrado.',
                    code: 'RESOURCE_NOT_FOUND'
                });
            }

        })
        .catch((error) => {
            console.error(`Algo inesperado aconteceu ao buscar os dados do usuário.`, error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do usuário. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';

            return next( customErr );
        });

    };

    /**
     * @description Permite que aplicações Pet Adote, Administradores ou o dono do recurso alterem dados de "perfil" do usuário.
     * @description É possível retornar as imagens de "avatar" e "banner" ao padrão adicionando a seguinte Query String à rota: [ PATCH: .../usuarios/codUsuario?setDefault='avatar' ou 'banner' ].
     * @description Usuários autenticados poderão alterar alguns campos básicos, como nome, sobrenome, data de nascimento, etc. Enquanto as Aplicações e Administradores poderão realizar alterações mais sistêmicas, como a quantidade de seguidores, o CPF em casos extremos (contato via suporte), etc.
     */
    const updateOne = async (req, res, next) => {  /*, controller.usuario_updateOne*/

        if (req.params.codUsuario.match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Usuário deve conter apenas dígitos.",
                code: 'INVALID_REQUEST_ID'
            });
        }

        // O usuário existe?
        let usuarioExiste = await Usuario.findByPk(req.params.codUsuario)
        .then((result) => {

            if (result){
                return true;
            } else {
                return false;
            }

        })
        .catch((error) => {
            console.error(`Algo inesperado aconteceu ao verificar se o usuário existe.`, error);

            let customErr = new Error('Algo inesperado aconteceu ao verificar se o usuário existe. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';

            return next( customErr );
        })

        if (!usuarioExiste){
            // console.log('RESULT VAZIO')
            return res.status(404).json({
                mensagem: 'Usuário não encontrado.',
                code: 'RESOURCE_NOT_FOUND'
            })
        }

        // Restrições de acesso à rota --- Apenas as Aplicações Pet Adote, Administradores e o Dono do recurso poderão modificar dados.
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
        // Fim das restrições de acesso à rota.

        // Retrocedendo o avatar ou o banner do usuário para o padrão.
        if (req.query.setDefault === 'avatar'){

            let { foto_usuario } = await Usuario.findByPk(req.params.codUsuario, {
                attributes: ['foto_usuario'],
                raw: true
            })
            .then((result) => {
                return result;
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao buscar o usuário para retornar seu avatar ao padrão.', error);

                let customErr = new Error('Algo inesperado aconteceu ao buscar o usuário para retornar seu avatar ao padrão. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';

                return next( customErr );
            })

            if (foto_usuario) {

                Usuario.update({ 
                    foto_usuario: 'avatar_default.jpeg',
                    data_modificacao: new Date()
                 }, {
                    where: { cod_usuario: req.params.codUsuario },
                    limit: 1
                })
                .then((result) => {

                    if (foto_usuario !== 'avatar_default.jpeg'){
                        fs.unlink(path.resolve(__dirname, '../uploads/images/usersAvatar/', foto_usuario), () => {});
                    }

                    return res.status(200).json({
                        mensagem: 'O avatar do usuário foi redefinido para o padrão.'
                    });
                    
                })
                .catch((error) => {
                    console.error('Algo inesperado aconteceu ao retornar o avatar do usuário ao padrão.', error);

                    let customErr = new Error('Algo inesperado aconteceu ao retornar o avatar do usuário ao padrão. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return next( customErr );
                })

            }

            return; // Necessário pois os processamentos para esse caso, acabam nesse ponto.

        }

        if (req.query.setDefault === 'banner'){

            let { banner_usuario } = await Usuario.findByPk(req.params.codUsuario, {
                attributes: ['banner_usuario'],
                raw: true
            })
            .then((result) => {
                return result;
            })
            .catch((error) => {
                console.error('Algo inesperado aconteceu ao buscar o usuário para retornar seu banner ao padrão.', error);

                let customErr = new Error('Algo inesperado aconteceu ao buscar o usuário para retornar seu banner ao padrão. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';

                return next( customErr );
            })

            if (banner_usuario) {

                Usuario.update({ 
                    banner_usuario: 'banner_default.jpeg',
                    data_modificacao: new Date()
                 }, {
                    where: { cod_usuario: req.params.codUsuario },
                    limit: 1
                })
                .then((result) => {

                    if (banner_usuario !== 'banner_default.jpeg'){
                        fs.unlink(path.resolve(__dirname, '../uploads/images/usersBanner/', banner_usuario), () => {});
                    }

                    return res.status(200).json({
                        mensagem: 'O banner do usuário foi redefinido para o padrão.'
                    });
                    
                })
                .catch((error) => {
                    console.error('Algo inesperado aconteceu ao retornar o banner do usuário ao padrão.', error);

                    let customErr = new Error('Algo inesperado aconteceu ao retornar o banner do usuário ao padrão. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return next( customErr );
                })

            }

            return; // Necessário pois os processamentos para esse caso, acabam nesse ponto.
        }

        // O pacote da requisição tem conteúdo?
        if (!req.headers['content-type']){
            return res.status(400).json({
                mensagem: 'Dados não encontrados na requisição',
                code: 'INVALID_REQUEST_CONTENT'
            })
        }
        // Tratando alterações nos campos.
        if (!req.headers['content-type'].includes('multipart/form-data')){

            let operacoes = {
                data_modificacao: new Date()
            };

            let allowedFields = undefined;

            // Restrição das alterações que podem ser realizadas por usuários comuns vs. Aplicações Pet Adote / Admins.
                if (req.dadosAuthToken.usuario && req.dadosAuthToken.usuario.e_admin == 0){

                    // Usuários autenticados nas aplicações poderão alterar...
                    allowedFields = [
                        'primeiro_nome',
                        'sobrenome',
                        'telefone',
                        'data_nascimento',
                        'descricao',
                    ];

                } else {

                    // Aplicações Pet Adote e Administradores poderão alterar...
                    allowedFields = [
                        'primeiro_nome',
                        'sobrenome',
                        'cpf',
                        'telefone',
                        'data_nascimento',
                        'descricao',
                        'esta_ativo',
                        'ong_ativo',
                        'e_admin',
                        'qtd_seguidores',
                        'qtd_seguidos',
                        'qtd_denuncias'
                    ];

                };
            // Fim das restrições de alterações.
            

            // console.log('body', req.body);

            //------------------------------------------------------------------------------------------------------
            // Normalização dos campos recebidos 

            Object.entries(req.body).forEach((pair) => {
                if (allowedFields.includes(pair[0])){               // Não será possível modificar valores que não estiverem na lista "allowedFields" via Clientes.
                    operacoes[pair[0]] = String(pair[1]).trim();    // Todo campo será tratado como uma String e não possuirá espaços no começo e no fim.

                    let partes = undefined;

                    switch(pair[0]){
                        case 'descricao': break;
                        default:
                            partes = pair[1].trim().split(' ');     // Caso ainda existirem, removerá os espaços excessívos do Início/Fim em substrings.

                            partes.forEach((parte, index) => {
                                if (parte){
                                    partes[index] = parte[0].toUpperCase() + parte.substr(1);
                                }
                            })

                            operacoes[pair[0]] = partes.join(' ');
                            break;
                    }
                }
            });

            //------------------------------------------------------------------------------------------------------
            // Validação das operações de alteração de campos.
            // console.log('Início das Operacoes de atualização: ', operacoes);

                // Validação do primeiro nome.
                if (operacoes.primeiro_nome){
                    if (operacoes.primeiro_nome.length === 0){
                        return res.status(400).json({
                            mensagem: 'PRIMEIRO NOME - Está vazio.',
                            code: 'INVALID_PRIMEIRO_NOME_LENGTH'
                        })
                    } else {
                        if (operacoes.primeiro_nome.match(/\s{2}|[^A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){
                            return res.status(400).json({
                                mensagem: 'PRIMEIRO NOME - Espaços excessivos ou caracteres inválidos detectados.',
                                code: 'INVALID_PRIMEIRO_NOME_INPUT'
                            })
                        }
                    }
                }

                // Validação do sobrenome.
                if (operacoes.sobrenome){
                    if (operacoes.sobrenome.length === 0){
                        return res.status(400).json({
                            mensagem: 'SOBRENOME - Está vazio.',
                            code: 'INVALID_SOBRENOME_LENGTH'
                        })
                    } else {
                        if (operacoes.sobrenome.match(/\s|[^A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){
                            return res.status(400).json({
                                mensagem: 'SOBRENOME - Espaços excessivos ou caracteres inválidos detectados.',
                                code: 'INVALID_SOBRENOME_INPUT'
                            })
                        }
                    }
                }

                // Validação da data de nascimento.
                if (operacoes.data_nascimento){
                    if (operacoes.data_nascimento.length === 0){
                        return res.status(400).json({
                            mensagem: 'DATA DE NASCIMENTO - Está vazia.',
                            code: 'INVALID_DATA_NASCIMENTO_LENGTH'
                        })
                    } else {
                        if (!operacoes.data_nascimento.match(/^(\d{4})\-([1][0-2]|[0][1-9])\-([0][1-9]|[1-2]\d|[3][0-1])$/g)){
                            return res.status(400).json({
                                mensagem: 'DATA DE NASCIMENTO - Formato inválido de data.',
                                code: 'INVALID_DATA_NASCIMENTO_INPUT',
                                exemplo: 'aaaa-mm-dd'
                            })
                        }

                        // Verificação de ano bissexto
                        let data_nascimento = operacoes.data_nascimento.split('-');
                        if(data_nascimento[0][2] == 0 && data_nascimento[0][3] == 0){
                            if (data_nascimento[0] % 400 == 0){
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 29){
                                    return res.status(400).json({
                                        mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR'
                                    });
                                }
                            } else {
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 28){
                                    return res.status(400).json({
                                        mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano não-bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR'
                                    });
                                }
                            }
                        } else {
                            if (data_nascimento[0] % 4 == 0){
                                if (data_nascimento[1] == 02 && data_nascimento[2] > 29){
                                    return res.status(400).json({
                                        mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano bissexto.',
                                        code: 'INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR'
                                    });
                                }
                            } else {
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
                            return res.status(400).json({
                                mensagem: 'DATA DE NASCIMENTO - Usuário possui menos que 10 anos, portanto não podera cadastrar.',
                                code: 'FORBIDDEN_USER_AGE'
                            });
                        }

                        if (data_nascimento[0] < 1900){
                            return res.status(400).json({
                                mensagem: 'DATA DE NASCIMENTO - Ano de nascimento inválido, digite um valor acima de 1900.',
                                code: 'INVALID_DATA_NASCIMENTO_INPUT'
                            })
                        }
                    }
                }

                // Validação de CPF.
                if (operacoes.cpf){
                    if (!req.body.cpf.match(/^\d{3}[.]\d{3}[.]\d{3}[-]\d{2}$|^\d{11}$/g)){
                        return res.status(400).json({
                            mensagem: 'CPF - Está vazio, incompleto ou em um formato incorreto.',
                            code: 'INVALID_CPF_INPUT',
                            exemplo: '123.123.123-12 ou 12312312312'
                        })
                    } else {
                        // Análise do CPF digitado pelo usuário.
                        let cpfDigits = operacoes.cpf.replace(/\D/g, '');

                        if (cpfDigits.match(/^(.)\1{2,}$/g)){
                            return res.status(400).json({
                                mensagem: 'CPF - Inválido, todos os dígitos são iguais.',
                                code: 'CPF_DIGITS_ARE_REPEATING'
                            })
                        }
                        
                        let cpfDigitsArray = cpfDigits.split('');
                        
                        let cpfValidationArray = cpfDigitsArray.slice(0, 9);    // Para antes de atingir Index[9]

                        let multiplier = cpfDigits.length - 1;    // Multiplicador inicia em 10 para encontrar o valor apropriado do 1º digito verificador.
                        let result = 0; // Valor da soma dos quocientes da multiplicação de cada digito não verificador do CPF.
                            
                        cpfValidationArray.forEach( (value, index) => {
                            result += value * multiplier;
                            multiplier--;
                        });

                        let remainder = result % cpfDigits.length;   // 11 digitos do CPF.

                        let cpfFirstVerificationDigit;

                        if (remainder >= 2){
                            cpfFirstVerificationDigit = (11 - remainder).toString();
                        } else {
                            cpfFirstVerificationDigit = 0;
                        }

                        // Primeiro dígito verificador apropriado adquirido.

                        cpfValidationArray.push(cpfFirstVerificationDigit);

                        multiplier = cpfDigits.length; // Multiplicador inicia em 11 para encontrar o valor apropriado do 2º digito verificador.
                        result = 0; // O resultado deve iniciar em 0 para o próximo teste;
                        
                        cpfValidationArray.forEach( (value, index) => {
                            result += value * multiplier;
                            multiplier--;
                        });

                        remainder = result % cpfDigits.length;  // 11 digitos do CPF.

                        let cpfSecondVerificationDigit;

                        if (remainder >= 2){
                            cpfSecondVerificationDigit = (11 - remainder).toString();    //// 11 digitos do CPF - Resto da divisão.
                        } else {
                            cpfSecondVerificationDigit = 0;
                        }

                        // Segundo dígito verificador apropriado adquirido.

                        // Verificação final do CPF digitado pelo usuário, para permitir o envio dos dados ao Back-end.

                        if (cpfDigits.indexOf(cpfFirstVerificationDigit, 9) != -1 && cpfDigits.indexOf(cpfSecondVerificationDigit, 10) != -1){

                            // Reconstruindo o CPF no formato padrão definido para o Banco de Dados.
                            operacoes.cpf = `${cpfDigitsArray.slice(0,3).join('')}.${cpfDigitsArray.slice(3,6).join('')}.${cpfDigitsArray.slice(6,9).join('')}-${cpfDigitsArray.slice(9).join('')}`;

                            // Verificação do [ORM] sobre o CPF -- Caso o CPF já tenha sido utilizado, o usuário não poderá continuar a alteração
                            await Usuario.findOne({ where: { cpf: operacoes.cpf } })
                            .then((result) => {
                                if (result === null || result === undefined || result === ''){
                                    // console.log('[ORM] CPF livre!');
                                    return true;
                                } else {
                                    // console.log('[ORM] Esse CPF não está livre!');
                                    if (result.cpf === operacoes.cpf){
                                        return true;
                                    }
                                    return res.status(409).json({
                                        mensagem: 'CPF - Em Uso.',
                                        code: 'CPF_ALREADY_TAKEN'
                                    });
                                }
                            });
                            
                        } else {
                            // console.log(`Erro: O CPF [${operacoes.cpf}] é inválido!`)
                            return res.status(400).json({
                                mensagem: 'CPF - Inválido.',
                                code: 'INVALID_CPF'
                            })
                        }

                    }
                }

                // Validação do telefone.
                if (operacoes.telefone){
                    if (!operacoes.telefone.match(/^\(?[0]?(\d{2})\)?\s?((?:[9])?\d{4})[-]?(\d{4})$/g)){
                        return res.status(400).json({
                            mensagem: 'TELEFONE - Está vazio ou incompleto.',
                            code: 'INVALID_TELEFONE_INPUT',
                            exemplo: '(12) 91234-1234 ou (12) 1234-1234'
                        })
                    } else {
                        // Outra forma de utilizar RegEx. :D
                        // let telValidationRegEx = /^\((\d{2})\) ((?:[9])?\d{4}-\d{4})$/g;   // Entrada esperada: "(00) 91234-1234" ou "(00) 1234-1234";
                        let telValidationRegEx = /^\(?[0]?(\d{2})\)?\s?((?:[9])?\d{4})[-]?(\d{4})$/g;     // O usuário poderá digitar o telefone da forma que desejar. Contanto que tenha apenas o DDD e 8 ou 9 dígitos.
                        let telValidationMatchesArray = telValidationRegEx.exec(String(operacoes.telefone));

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
                                exemplo: '(012) 1234-1234 / (12) 91234-1234 / 012 1234-1234 / 12 91234-1234 / 01212341234 / 12912341234 / etc...'
                            })
                        }

                        if (telNum.indexOf('9') == 0 && telNum.length == 10){
                            if (telNum.match(/^(?:9?(\d{4})\-\1)$/)){
                                return res.status(400).json({
                                    mensagem: 'TELEFONE - Número de celular com muitos dígitos repetidos.',
                                    code: 'TELEFONE_DIGITS_ARE_REPEATING'
                                })
                            }
                        } else {
                            if (telNum.match(/^(?:(\d{4})\-\1)$/)){
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
                        operacoes.telefone = `(${telDDD}) ${telNum}`


                    }
                };

                // Validação da descrição
                if (operacoes.descricao){
                    if (operacoes.descricao.length > 255){
                        return res.status(400).json({
                            mensagem: 'DESCRICAO - Possui mais do que 255 caracteres.',
                            code: 'INVALID_DESCRICAO_LENGTH'
                        })
                    }
                }

                // Validação para "esta_ativo".
                if (operacoes.esta_ativo){
                    let allowedValues = [
                        '0'
                    ]

                    if (!allowedValues.includes((operacoes.esta_ativo))){
                        return res.status(400).json({
                            mensagem: 'ESTA_ATIVO - Apenas aceitamos os valores (0).',
                            code: 'INVALID_ESTA_ATIVO_INPUT'
                        })
                    }
                }

                // Validação para "ong_ativo".
                if (operacoes.ong_ativo){
                    let allowedValues = [
                        '0',
                        '1'
                    ]

                    if (!allowedValues.includes((operacoes.ong_ativo))){
                        return res.status(400).json({
                            mensagem: 'ONG_ATIVO - Apenas aceitamos os valores (0 ou 1).',
                            code: 'INVALID_ONG_ATIVO_INPUT'
                        })
                    }
                }

                // Validação para "e_admin".
                if (operacoes.e_admin){
                    let allowedValues = [
                        '0',
                        '1'
                    ]

                    if (!allowedValues.includes((operacoes.e_admin))){
                        return res.status(400).json({
                            mensagem: 'E_ADMIN - Apenas aceitamos os valores (0 ou 1).',
                            code: 'INVALID_E_ADMIN_INPUT'
                        })
                    }
                }

                // Validação para "qtd_seguidores"
                if (operacoes.qtd_seguidores){
                    let allowedValues = [
                        '-1',
                        '1'
                    ]

                    if (!allowedValues.includes(operacoes.qtd_seguidores)){
                        return res.status(400).json({
                            mensagem: 'QTD_SEGUIDORES - Para aumentar os seguidores envie o valor 1, para diminuir envie o valor -1.',
                            code: 'INVALID_QTD_SEGUIDORES_INPUT'
                        })
                    }

                    await Usuario.findByPk(req.params.codUsuario, {
                        attributes: ['qtd_seguidores'],
                        raw: true
                    }).then((result) => {
                        if (result.qtd_seguidores == 0 && operacoes.qtd_seguidores == -1){
                            return res.status(406).json({
                                mensagem: 'QTD_SEGUIDORES - Não é possível fazer com que o usuário tenha uma quantidade negativa de seguidores.',
                                code: 'VALUE_GOING_BELLOW_ZERO'
                            });
                        }

                        operacoes.qtd_seguidores = Number(result.qtd_seguidores + Number(operacoes.qtd_seguidores));
                    })
                }

                // Validação para "qtd_seguidos"
                if (operacoes.qtd_seguidos){
                    let allowedValues = [
                        '-1',
                        '1'
                    ]

                    if (!allowedValues.includes(operacoes.qtd_seguidos)){
                        return res.status(400).json({
                            mensagem: 'QTD_SEGUIDOS - Para aumentar a quantidade de seguidos envie o valor 1, para diminuir envie o valor -1.',
                            code: 'INVALID_QTD_SEGUIDOS_INPUT'
                        })
                    }

                    await Usuario.findByPk(req.params.codUsuario, {
                        attributes: ['qtd_seguidos'],
                        raw: true
                    }).then((result) => {
                        if (result.qtd_seguidos == 0 && operacoes.qtd_seguidos == -1){
                            return res.status(406).json({
                                mensagem: 'QTD_SEGUIDOS - Não é possível fazer com que o usuário tenha uma quantidade negativa de seguidos.',
                                code: 'VALUE_GOING_BELLOW_ZERO'
                            });
                        }

                        operacoes.qtd_seguidos = Number(result.qtd_seguidos + Number(operacoes.qtd_seguidos));
                    })
                }

                // Validação para "qtd_seguidos"
                if (operacoes.qtd_denuncias){
                    let allowedValues = [
                        '-1',
                        '1'
                    ]

                    if (!allowedValues.includes(operacoes.qtd_denuncias)){
                        return res.status(400).json({
                            mensagem: 'QTD_DENUNCIAS - Para aumentar a quantidade de denúncias envie o valor 1, para diminuir envie o valor -1.',
                            code: 'INVALID_QTD_DENUNCIAS_INPUT'
                        })
                    }

                    await Usuario.findByPk(req.params.codUsuario, {
                        attributes: ['qtd_denuncias'],
                        raw: true
                    }).then((result) => {
                        if (result.qtd_denuncias == 0 && operacoes.qtd_denuncias == -1){
                            return res.status(406).json({
                                mensagem: 'QTD_DENUNCIAS - Não é possível fazer com que o usuário tenha uma quantidade negativa de denúncias.',
                                code: 'VALUE_GOING_BELLOW_ZERO'
                            });
                        }

                        operacoes.qtd_denuncias = Number(result.qtd_denuncias + Number(operacoes.qtd_denuncias));
                    })
                }
                
            // Fim das validações de alteração de campos.

            // Início da efetivação das alterações.

            await Usuario.update(operacoes, { 
                where: { cod_usuario: req.params.codUsuario },
                limit: 1
            })
            .then((resultUpdate) => {

                // console.log(`PATCH: "/usuarios/${req.params.codUsuario}" - Os dados do usuário foram atualizados: `, resultUpdate);

                Usuario.findByPk(req.params.codUsuario, { raw: true })
                .then((resultFind) => {

                    // console.log(`PATCH: "/usuarios/${req.params.codUsuario}" - Enviando os dados atualizados do usuário: `, resultFind);
                    return res.status(200).json({
                        mensagem: 'Os dados do usuário foram atualizados com sucesso.',
                        usuario: resultFind
                    })

                })
                .catch((error) => {

                    console.error(`Algo inesperado aconteceu ao buscar os dados atualizados do usuário.`, error);

                    let customErr = new Error('Algo inesperado aconteceu ao buscar os dados atualizados do usuário. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return next( customErr );

                })

            })
            .catch((errorUpdate) => {

                console.error(`Algo inesperado aconteceu ao atualizar os dados do usuário. `, errorUpdate);

                let customErr = new Error('Algo inesperado aconteceu ao atualizar os dados do usuário. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';

                return next( customErr );

            })

            // Fim da efetivação das alterações.

        }
        // Fim do tratamento de alterações nos campos.

        //------------------------------------------------------------------------------------------------------
        // Tratando alterações nos arquivos (Imagens).
        if (req.headers['content-type'].includes('multipart/form-data')){

            if (Number(req.headers['content-length']) > (3 * 1024 * 1024)){
                req.pause();
                return res.status(413).json({
                    mensagem: 'O arquivo é grande demais. Suportamos arquivos de até 3mb.',
                    code: 'FILE_SIZE_TOO_LARGE'
                });
            }
            
            let storage = multer.diskStorage({
                destination: (req, file, cb) => {
                    cb(null, path.resolve(__dirname, '../uploads/tmp'))
                },
                filename: (req, file, cb) => {
                    cb(null, `avatar_${uuid.v4()}${path.extname(file.originalname)}`)
                }
            })

            uploadHandler = multer({
                storage: storage,
                limits: {
                    fileSize: 3 * 1024 * 1024,
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
                        // console.log('O mimetype é inválido!');
                        req.pause();
                        res.status(406).json({
                            mensagem: 'Arquivo inválido, não aceitamos esse mimetype.',
                            code: 'INVALID_FILE_MIME'
                        })
                        return cb(null, false);
                    }
                    // Os problemas abaixo só aparecem quando utilizamos a Ferramenta de Desenvolvedor de um navegador para diminuir a velocidade da internet...
                    // Possível Problema 01: Mesmo parando a request, a "cb" Só dispara quando o servidor termina o download do arquivo. Só então a resposta é enviada.
                    // Possível Problema 02: A única forma de parar o upload no front-end prematuramente aparenta ser chamando "req.destroy()" que não entrega uma resposta, mas um erro de Network(net::ERR_CONNECTION_ABORTED).
                    
                    cb(null, true)

                }
            }).fields([
                { name: 'foto_usuario', maxCount: 1 },
                { name: 'banner_usuario', maxCount: 1}
            ]);

            uploadHandler(req, res, async (err) => {
                if (err instanceof multer.MulterError){
                    if (err.code === 'LIMIT_FILE_COUNT'){
                        return res.status(400).json({
                            mensagem: 'Por favor envie um arquivo (imagem) por requisição.',
                            code: err.code
                        })
                    }

                    if (err.code === 'LIMIT_FILE_SIZE'){
                        return res.status(413).json({
                            mensagem: 'O arquivo é grande demais. Suportamos arquivos (imagens) de até 3mb.',
                            code: err.code
                        })
                    }

                    if (err.code === 'LIMIT_UNEXPECTED_FILE'){
                        return res.status(400).json({
                            mensagem: 'Campo de arquivo inválido, por favor envie uma imagem.',
                            code: err.code
                        })
                    }

                    if (err.code === 'LIMIT_FIELD_COUNT'){
                        return res.status(400).json({
                            mensagem: 'Envie apenas campos de arquivos, sem campos de texto.',
                            code: err.code
                        })
                    }

                    console.error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário. - multerError:', err);

                    let customErr = new Error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                    return next( customErr );


                } else if (err) {
                    console.error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário. - commonErr: ', err);

                    let customErr = new Error('Algo inesperado aconteceu ao verificar o arquivo enviado pelo usuário. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                    return next( customErr );
                }

                // console.log('body', req.body)
                // console.log('files', JSON.parse(JSON.stringify(req.files)));

                if (Object.keys(req.files).length === 0){
                    return res.status(400).json({
                        mensagem: 'Campo de arquivo vazio detectado, por favor envie uma imagem.',
                        code: 'INVALID_FILE_INPUT'
                    })
                }

                // console.log('UploadHandler: All green - Files received!');

                // Início do processamento das imagens utilizando a biblioteca 'sharp'.
                if (req.files.foto_usuario){    // Processamento da Foto (avatar) do Usuário.

                    let avatarUsuario = await Usuario.findByPk(req.params.codUsuario, {
                        attributes: ['foto_usuario'],
                        raw: true
                    });

                    // console.log(avatarUsuario);

                    let defaultAvatarName = 'avatar_default.jpeg';
                    
                    let oldUserAvatar = avatarUsuario.foto_usuario;
                    let oldUserAvatarPath = path.resolve(__dirname, '../uploads/images/usersAvatar/', oldUserAvatar);

                    let newFileName = `avatar_${uuid.v4()}-${moment().unix()}.jpeg`;
                    let newFilePath = path.resolve(__dirname, '../uploads/tmp/', newFileName);
                    let finalFileDest = path.resolve(__dirname, '../uploads/images/usersAvatar/', newFileName);

                    // console.log('Iniciando processamento do avatar do usuário');

                    sharp(req.files.foto_usuario[0].path).resize({    // Processamento assíncrono da imagem enviada pelo usuário (Que por padrão tem um nome único, mas não podemos sobrescrevê-lo durante o processamento então vamos criar um arquivo novo e deletar esse depois.).
                        width: 200,
                        height: 200,
                        fit: sharp.fit.cover
                    }).jpeg({   // Otimização para jpeg.
                        quality: 80,    // Default é 80, mas vamos declarar só por desencargo de consciência.
                        chromaSubsampling: '4:4:4'
                    }).toFile(newFilePath, async (err, info) => { // Cria o arquivo otimizado a partir do original enviado pelo usuário.
                        if (err){
                            // console.log('Algo deu errado ao processar o avatar do usuário: ', err);

                            let customErr = new Error('Algo inesperado aconteceu ao processar o avatar do usuário. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                            return next( customErr );

                        } else {

                            fs.unlinkSync(req.files.foto_usuario[0].path);  // Deleta o arquivo original enviado pelo usuário do servidor.
                            
                            await Usuario.update({ 
                                foto_usuario: newFileName,
                                data_modificacao: new Date()
                             }, {   // Atualiza o nome do avatar do usuário no banco de dados.
                                where: { cod_usuario: req.params.codUsuario },
                                limit: 1
                            })
                            .then((result) => {
                                if (oldUserAvatar !== defaultAvatarName){   // Se o avatar não era o padrão, deleta o avatar antigo do usuário.
                                    fs.unlinkSync(oldUserAvatarPath);
                                }
                                
                                mv(newFilePath, finalFileDest, (error) => {
                                    if (error){
                                        console.error('Algo deu errado ao mover o avatar do usuário do diretório temporário para o final.', error);

                                        let customErr = new Error('Algo inesperado aconteceu ao armazenar o avatar do usuário. Entre em contato com o administrador.');
                                        customErr.status = 500;
                                        customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                                        return next( customErr );
                                    }
                                })

                            })
                            .catch((error) => {
                                console.error('Algo deu errado ao atualizar o avatar do usuário no banco de dados: ', error);

                                let customErr = new Error('Algo inesperado aconteceu ao atualizar o avatar do usuário. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR';

                                return next( customErr );
                            })
                            
                            // console.log('Processamento do avatar do usuário concluído!');
                            
                            return res.status(200).json({
                                mensagem: 'O avatar do usuário foi atualizado com sucesso.',
                                avatar: newFileName
                            })
                        }
                    });

                    // Fim do processamento da Foto (avatar) do usuário.

                } else if (req.files.banner_usuario){   // Processamento do Banner do Usuário.
                    
                    let bannerUsuario = await Usuario.findByPk(req.params.codUsuario, {
                        attributes: ['banner_usuario'],
                        raw: true
                    });

                    // console.log(avatarUsuario);

                    let defaultBannerName = 'banner_default.jpeg';
                    
                    let oldUserBanner = bannerUsuario.banner_usuario;
                    let oldUserBannerPath = path.resolve(__dirname, '../uploads/images/usersBanner/', oldUserBanner);

                    let newFileName = `banner_${uuid.v4()}-${moment().unix()}.jpeg`;
                    let newFilePath = path.resolve(__dirname, '../uploads/tmp/', newFileName);
                    let finalFileDest = path.resolve(__dirname, '../uploads/images/usersBanner/', newFileName);

                    // console.log('Iniciando processamento do banner do usuário.');

                    sharp(req.files.banner_usuario[0].path).resize({
                        width: 1920,
                        height: 1080,
                        fit: sharp.fit.cover
                    }).jpeg({   // Otimização para jpeg.
                        quality: 80,
                        chromaSubsampling: '4:4:4'
                    }).toFile(newFilePath, async (err, info) => {
                        if (err){
                            console.error('Algo deu errado ao processar o banner do usuário: ', err);

                            let customErr = new Error('Algo inesperado aconteceu ao processar o banner do usuário. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                            return next( customErr );
                        } else {

                            fs.unlinkSync(req.files.banner_usuario[0].path);  // Deleta o arquivo original enviado pelo usuário do servidor.
                            
                            await Usuario.update({ 
                                banner_usuario: newFileName,
                                data_modificacao: new Date()
                             }, {   // Atualiza o nome do avatar do usuário no banco de dados.
                                where: { cod_usuario: req.params.codUsuario },
                                limit: 1
                            })
                            .then((result) => {
                                if (oldUserBanner !== defaultBannerName){   // Se o avatar não era o padrão, deleta o avatar antigo do usuário.
                                    fs.unlinkSync(oldUserBannerPath);
                                }
                                
                                mv(newFilePath, finalFileDest, (error) => {
                                    if (error){
                                        console.error('Algo deu errado ao mover a imagem de banner do usuário do diretório temporário para o final.', error);

                                        let customErr = new Error('Algo inesperado aconteceu ao armazenar o banner do usuário. Entre em contato com o administrador.');
                                        customErr.status = 500;
                                        customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

                                        return next( customErr );
                                    }
                                })

                            })
                            .catch((error) => {
                                console.error('Algo deu errado ao atualizar o banner do usuário no banco de dados: ', error);

                                let customErr = new Error('Algo inesperado aconteceu ao atualizar o banner do usuário. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR';

                                return next( customErr );
                            })
                            
                            // console.log('Processamento do banner do usuário concluído!');
                            
                            return res.status(200).json({
                                mensagem: 'O banner do usuário foi atualizado com sucesso.',
                                banner: newFileName
                            })
                        }
                    });

                    // Fim do Processamento do Banner do Usuário.
                }

            });

        }
        // Fim do tratamento de alterações nos arquivos (Imagens).

    };

// Exportações.
module.exports = {
    getAll,
    getOne,
    updateOne
}