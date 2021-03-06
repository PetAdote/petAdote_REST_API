// Importações.
    const express = require('express');
    const router = express.Router();
    
// const controller = require('../controllers/contas');   // TODO...

    // Importação dos Models...

        const Usuario = require('../models/Usuario');
        const ContaLocal = require('../models/ContaLocal');
        const ContaFacebook = require('../models/ContaFacebook');
        const ContaGoogle = require('../models/ContaGoogle');
        const EnderecoUsuario = require('../models/EnderecoUsuario');

    const { EventEmitter } = require('events'); // Gerador de eventos do Node.

    const fs = require('fs');                   // 'fs' do Node para manipular o "file system', gerenciando os arquivos que o servidor receberá.
    const path = require('path');               // 'path' do Node para gerenciar caminhos para arquivos e diretórios.
    const util = require('util');               // 'util' do Node para analisar objetos complexos e outras utilidades.
    const uuid = require('uuid');               // 'uuid' para criar os nomes únicos dos arquivos.

    const sharp = require('sharp');             // 'sharp' para processar imagens.

    const bcrypt = require('bcrypt');           // 'bcrypt' para "hashear" as senhas dos usuários antes de enviá-las ao DB.

    const axios = require('axios').default;     // 'axios' cliente http para realizar chamadas em APIs.

    const sequelize = require('../../configs/database').connection;

// TODO... A maioria dessas importações irão para os controllers. Estão aqui só durante a fase inicial de testes.

// Rotas.
router.get('/', (req, res, next) => {

    // Instância do EventEmitter dessa rota - Permite o uso de custom listeners nessa rota.
    const customListeners = new EventEmitter();

    // Caso 01 - Se apenas "codUsuario" for passado na Query String...
    if ((req.dadosAuthToken && req.dadosAuthToken.tipo_cliente === 'Pet Adote') && req.query.codUsuario){

        if (req.query.codUsuario.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
            let customErr = new Error('Requisição inválida - O ID do Usuário deve conter apenas dígitos.');
            customErr.status = 400;
            customErr.code = 'INVALID_REQUEST_QUERY';
            return next(customErr);
        }

        // Custom Listeners.
        customListeners.on('gotContaDoUsuario', (conta) => {    // Listener disparado quando uma query encontra a conta desse usuário.
            res.status(200).json({
                mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                conta: conta,
                usuario: `${req.protocol}://${req.get('host')}/usuarios/${conta.cod_usuario}`,
            });
        });

        let buscasConcluidas = 0;
        customListeners.on('contaNotFound', () => {     // Listener disparado quando uma query não encontra a conta desse usuário.
            buscasConcluidas ++;
            if (buscasConcluidas >= 3){
                res.status(404).json({
                    mensagem: 'Este ID de Usuário não existe.',
                    code: 'RESOURCE_NOT_FOUND',
                    lista_usuarios: `${req.protocol}://${req.get('host')}/usuarios/`,
                });
            }
        });
        // Fim dos Custom Listeners.

        try {   // Buscando Conta com base na Foreign Key (cod_usuario) do Usuário.

            ContaLocal.findOne({ attributes: ['email', 'email_recuperacao', 'cod_usuario' ], where: { cod_usuario: req.query.codUsuario }, raw: true })
            .then((result) => {
                result ? customListeners.emit('gotContaDoUsuario', result) : customListeners.emit('contaNotFound');
            });

            ContaFacebook.findOne({ where: { cod_usuario: req.query.codUsuario }, raw: true })
            .then((result) => {
                result ? customListeners.emit('gotContaDoUsuario', result) : customListeners.emit('contaNotFound');
            });

            ContaGoogle.findOne({ where: { cod_usuario: req.query.codUsuario }, raw: true })
            .then((result) => {
                result ? customListeners.emit('gotContaDoUsuario', result) : customListeners.emit('contaNotFound');
            })

        } catch (error) {
            console.error('[/contas/?codUsuario=] Algo inesperado aconteceu ao buscar a conta de um usuário.\n', error);

            let customErr = new Error('Algo inesperado aconteceu ao buscar a conta de um usuário. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR'
            return next(customErr)
        }

        return; // Caso tudo dê certo nas condições acima, conclua.

    }

    // Caso 02 - Se "tipoConta & chaveConta" forem passados na Query String. 
    //           "tipoConta" deverá ser passado também, não podemos pesquisar apenas por "chaveConta" pois em casos extremos os IDs dos provedores sociais podem acabar entrando em conflito. 

    if ((req.dadosAuthToken && req.dadosAuthToken.tipo_cliente === 'Pet Adote') && req.query.tipoConta && req.query.chaveConta){

        switch(req.query.tipoConta){
            case 'local':

                return ContaLocal.findByPk(req.query.chaveConta, { attributes: ['email', 'email_recuperacao', 'cod_usuario'], raw: true })
                .then((result) => {
                    if (result) {
                        res.status(200).json({
                            mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                            conta: result,
                            usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`,
                        });
                    } else {
                        res.status(404).json({
                            mensagem: 'Nenhuma conta com esse e-mail foi encontrada.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário com cadastro local.\n', error);

                    let customErr = new Error('Algo inesperado aconteceu ao buscar os dados de um usuário com cadastro local. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return next( customErr );
                });

                break;
            case 'facebook':

                return ContaFacebook.findByPk(req.query.chaveConta, { raw: true })
                .then((result) => {
                    if (result) {
                        res.status(200).json({
                            mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                            conta: result,
                            usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`,
                        });
                    } else {
                        res.status(404).json({
                            mensagem: 'Nenhuma conta cadastrada via Facebook com esse ID foi encontrada.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário cadastrado via Facebook.\n', error);

                    let customErr = new Error('Algo inesperado aconteceu ao buscar os dados do usuário cadastrado via Facebook. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return next( customErr );
                });

                break;
            case 'google':

                return ContaGoogle.findByPk(req.query.chaveConta, { raw: true })
                .then((result) => {
                    if (result) {
                        res.status(200).json({
                            mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                            conta: result,
                            usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`,
                        });
                    } else {
                        res.status(404).json({
                            mensagem: 'Nenhuma conta cadastrada via Google com esse ID foi encontrada.',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário cadastrado via Google.\n', error);

                    let customErr = new Error('Algo inesperado aconteceu ao buscar os dados de um usuário cadastrado via Google. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return next( customErr );
                });

                break;
            default:
                return res.status(400).json({
                    mensagem: 'Busca de conta inválida.',
                    code: 'INVALID_REQUEST_QUERY',
                    exemplo: `${req.protocol}://${req.get('host')}/contas/?tipoConta=['local', 'facebook', 'google']&chaveConta=['email', 'ids sociais']`
                });
                break;
        };

    };

    // Caso 03 - Se nada for passado na Query String ou Cliente não estiver autenticado (Temporário, todo cliente deverá estar autenticado para usar esta REST API).
    Promise.all([
        ContaLocal.findAndCountAll({ attributes: ['email'], raw: true }),
        ContaFacebook.findAndCountAll({ attributes: ['cod_facebook'], raw: true }),
        ContaGoogle.findAndCountAll({ attributes: ['cod_google'], raw: true })
    ])
    .then((resultArr) => {

        let dadosContas = {}

        dadosContas.total_contas = (resultArr[0].count + resultArr[1].count + resultArr[2].count);

        if (dadosContas.total_contas === 0 ){       // Se nenhuma conta está registrada...
            return res.status(200).json({
                mensagem: 'Nenhuma conta está cadastrada.'
            });
        }

        dadosContas.total_contas_locais = resultArr[0].count;
        dadosContas.total_contas_facebook = resultArr[1].count;
        dadosContas.total_contas_google = resultArr[2].count;

        if (req.dadosAuthToken && req.dadosAuthToken.tipo_cliente === 'Pet Adote' && !req.dadosAuthToken.usuario){
            // Se houver Token de Acesso, o tipo de Cliente for "Pet Adote" e não houver um usuário vínculado ao Token (Ou posteriormente, se o usuário vínculado for um Admin...)
            // Exiba dados expandidos sobre a conta.
            // Caso contrário, exiba apenas metadados.

            dadosContas.contas = [];

            resultArr[0].rows.forEach((row) => {
                row.tipo_conta = 'local';
                row.detalhes = `${req.protocol}://${req.get('host')}/contas/?tipoConta=${row.tipo_conta}&chaveConta=${row.email}`,
                dadosContas.contas.push(row);
            });

            resultArr[1].rows.forEach((row) => {
                row.tipo_conta = 'facebook';
                row.detalhes = `${req.protocol}://${req.get('host')}/contas/?tipoConta=${row.tipo_conta}&chaveConta=${row.cod_facebook}`,
                dadosContas.contas.push(row);
            });

            resultArr[2].rows.forEach((row) => {
                row.tipo_conta = 'google';
                row.detalhes = `${req.protocol}://${req.get('host')}/contas/?tipoConta=${row.tipo_conta}&chaveConta=${row.cod_google}`,
                dadosContas.contas.push(row);
            });

            return res.status(200).json({
                mensagem: 'Dados das contas dos usuários.',
                total_contas: dadosContas.total_contas,
                total_contas_locais: dadosContas.total_contas_locais,
                total_contas_facebook: dadosContas.total_contas_facebook,
                total_contas_google: dadosContas.total_contas_google,
                contas: dadosContas.contas
            });

        } else {    // Se o Cliente for de qualquer outro tipo - Exiba apenas meta-dados sobre as contas.       ( RESTRIÇÃO EM TESTE )

            res.status(200).json({
                mensagem: 'Dados das contas dos usuários.',
                total_contas: dadosContas.total_contas,
                total_contas_locais: dadosContas.total_contas_locais,
                total_contas_facebook: dadosContas.total_contas_facebook,
                total_contas_google: dadosContas.total_contas_google
            });

        }

    })
    .catch((error) => {

        console.error('[GET: /contas/] Algo inesperado aconteceu ao buscar os dados das contas dos usuários.\n', error);

        let customErr = new Error('Algo inesperado aconteceu ao buscar os dados das contas dos usuários. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR'

        return next( customErr );

    });

    
});

router.post('/', async (req, res, next) => {   // Cria os dados básicos do usuário: Conta, dados, endereço.

    // Restrições de acesso à rota --- Apenas as Aplicações Pet Adote e Administradores poderão cadastrar novas contas de usuários.
    if (!req.dadosAuthToken){   // Se não houver autenticação, não permita o acesso.
        return res.status(401).json({
            mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
            code: 'ACCESS_TO_RESOURCE_NOT_ALLOWED'
        });
    } else {

        let { usuario } = req.dadosAuthToken;

        // Se o Requisitante possuir um ID diferente do ID requisitado e não for um administrador, não permita o acesso.
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
    let erros = [];     // Lista de Erros

    // Lista de campos obrigatórios.
    let requiredFields = [
        'email',
        'email_recuperacao',
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

    // Verificador de campos obrigatórios.
    requiredFields.forEach((field) => {
        if (!Object.keys(req.body).includes(field)){
            erros.push(`Campo [${field}] não encontrado.`);
        }
    });

    // Se algum dos campos obrigatórios não estiverem presentes no request, responda com a lista de erros.
    if (erros.length > 0){
        console.log('Erros detectados.');

        return res.status(400).json({
            mensagem: 'Campos inválidos ou incompletos foram detectados.',
            code: 'INVALID_REQUEST_FIELDS',
            erros: erros
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
            case 'email': break;
            case 'email_recuperacao': break;
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
    
    // Validação básica do e-mail de recuperação.
        if (req.body.email_recuperacao === req.body.email){
            return res.status(400).json({
                mensagem: 'EMAIL DE RECUPERACAO - Idêntico ao e-mail.',
                code: 'RECOVERY_EMAIL_SAME_AS_EMAIL'
            })
        }

        if (!req.body.email_recuperacao.match(/^([\w\d-+.]{1,64})(@[\w\d-]+)((?:\.\w+)+)$/g)){
            return res.status(400).json({
                mensagem: 'EMAIL DE RECUPERACAO - Formato inválido.',
                code: 'INVALID_RECOVERY_EMAIL_INPUT',
                exemplo: 'emailRecuperacao@dominio.com'
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
                    mensagem: 'DATA DE NASCIMENTO - Ano de nascimento inválido, digite um valor acima de 1900.',
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

        let infoCEP = await axios.get(urlVerificacaoViaCep).then((res) => {
            // console.log(res.data);
            return res.data;
        })
        .catch((err) => {
            return { errCode: err.code,
                errMessage: err.message
            };
        });

    if (infoCEP.erro){
        return res.status(404).json({
            mensagem: 'CEP - O CEP informado parece não existir.',
            code: 'CEP_NOT_FOUND'
        })
    }

    if (infoCEP.errMessage){
        return res.status(500).json({
            mensagem: 'CEP - Algo inesperado aconteceu ao buscar informações sobre o CEP.',
            code: infoCEP.errCode,
            error: infoCEP.errMessage            
        })
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

    // if (!infoCEP.bairro.toLowerCase().includes(req.body.bairro.toLowerCase())){
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

    //------------------------------------------------------------------------------------------------------

    // Início do processamento dos dados para criação da conta do usuário.

        console.log('Dados recebidos com sucesso: ', req.body);

    // Tentativas de solução do problema com o DATETIME nos registros do banco de dados.
        // console.log('newDate ',new Date());
        // console.log('moment', moment());
        // console.log('IANA', Intl.DateTimeFormat().resolvedOptions().hour)
        // console.log('offsetMoment', moment().format('Z'))

        // Problema identificado: Está nas configurações do Sequelize.
        // Problema resolvido: Timezone foi configurado corretamente.

    // Criptografando a senha do usuário. Lembre-se de tratar a criptografia da senha na área de Login (autenticacao_usuario.js).

        try {
            const salt = await bcrypt.genSalt(10);
            console.log('O salt será: ', salt);
            const hashedPassword = await bcrypt.hash(req.body.senha, salt);
            console.log('Senha hasheada: ', hashedPassword);    // 60 caracteres.

            req.body.senha = hashedPassword;    // Atribui a senha pós tratamento à variável.
        } catch (error) {
            console.log('Algo inesperado aconteceu ao criptografar a senha do usuário.')

            let customErr = new Error('Algo inesperado aconteceu ao tratar dados do usuário');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';

            next( customErr );
        }

    // Concluíndo o cadastro.

    let idUsuario = undefined;

    try {
        await sequelize.transaction( async (transaction) => {

            const usuario = await Usuario.create({
                primeiro_nome: req.body.primeiro_nome,
                sobrenome: req.body.sobrenome,
                data_nascimento: req.body.data_nascimento,
                cpf: req.body.cpf,
                telefone: req.body.telefone,
                descricao: req.body.descricao || null
            });

            const contaUsuario = await ContaLocal.create({
                email: req.body.email,
                cod_usuario: usuario.cod_usuario,
                senha: req.body.senha,
                email_recuperacao: req.body.email_recuperacao
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
            // console.log('usuario: ', usuario.get({ plain: true }));
            // console.log('contaUsuario: ', contaUsuario.get({ plain: true }));
            // console.log('endUser: ', endUsuario.get({ plain: true }));
            // console.log('transactionId: ', transaction.id);            

        });

        // Auto-Commit
    } catch (error) {
        // Auto-Rollback
        console.log('Algo inesperado aconteceu ao cadastrar os dados do novo usuário.', error);

        let customErr = new Error('Algo inesperado aconteceu ao cadastrar os dados do novo usuário. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR';

        return next(customErr);
    }
    
    // Coleta do Token de Acesso para autenticação inicial ou inclusão de dados adicionais ao cadastro do usuário pelo Cliente.
    // const accessTokenUsuario = await axios({
    //     method: 'POST',
    //     url: 'http://localhost:3000/autenticacao_usuario',
    //     headers: { 'Authorization': `${req.headers.authorization}`},
    //     data: {
    //         'email': req.body.email,
    //         'senha': req.body.senha
    //     }
    // }).then((result) => {
    //     // console.log(res.data);
    //     return result.data.token;
    // }).catch((error) => {
    //     console.log('Algo inesperado aconteceu ao autenticar o novo usuário.', error);

    //     let customErr = new Error('Algo inesperado aconteceu ao autenticar o novo usuário. Entre em contato com o administrador.');
    //     customErr.status = 500;
    //     customErr.code = 'INTERNAL_SERVER_ERROR'

    //     return next(customErr);
    // })


    // Conclusão da recepção e processamento do formulário de cadastro.
    
    return res.status(200).json({
        mensagem: 'Novo usuário cadastrado com sucesso. Utilize o ID abaixo para incluir dados adicionais ao cadastro do usuário.',
        cod_usuario: idUsuario,
        // tokenUsuario: accessTokenUsuario
    });

});

// router.patch('/'/*, controller.conta_updateOne*/);

// router.delete('/'/*, controller.conta_deleteOne*/);

// Exportação.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
