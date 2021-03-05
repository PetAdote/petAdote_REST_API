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

    const formidable = require('formidable');   // 'formidable' para receber dados via POST de um formulário com encode 'multipart/form-data' (XMLHttpRequest).

    const sharp = require('sharp');             // 'sharp' para processar imagens.

    const bcrypt = require('bcrypt');           // 'bcrypt' para "hashear" as senhas dos usuários antes de enviá-las ao DB.

    const axios = require('axios').default;     // 'axios' cliente http para realizar chamadas em APIs.

    const sequelize = require('../../configs/database').connection;

    const jwt = require('jsonwebtoken');

// TODO... A maioria dessas importações irão para os controllers. Estão aqui só durante a fase inicial de testes.

// Rotas.
router.get('/', (req, res, next) => {

    // Instância do EventEmitter dessa rota - Permite o uso de custom listeners nessa rota.
    const customListeners = new EventEmitter();

    // Caso 01 - Se apenas "codUsuario" for passado na Query String...
    if ((req.dadosAuthToken && req.dadosAuthToken.tipo_cliente === 'Pet Adote') && req.query.codUsuario){

        if (req.query.codUsuario.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos."
            });
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
            return next( new Error('Algo inesperado aconteceu ao buscar a conta de um usuário. Entre em contato com o administrador.'));
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
                            mensagem: 'Nenhuma conta com esse e-mail foi encontrada.'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário com cadastro local.\n', error);
                    return next( new Error('Algo inesperado aconteceu ao buscar os dados de um usuário com cadastro local. Entre em contato com o administrador.') );
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
                            mensagem: 'Nenhuma conta cadastrada via Facebook com esse ID foi encontrada.'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário cadastrado via Facebook.\n', error);
                    return next( new Error('Algo inesperado aconteceu ao buscar os dados do usuário cadastrado via Facebook. Entre em contato com o administrador.') );
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
                            mensagem: 'Nenhuma conta cadastrada via Google com esse ID foi encontrada.'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário cadastrado via Google.\n', error);
                    return next( new Error('Algo inesperado aconteceu ao buscar os dados de um usuário cadastrado via Google. Entre em contato com o administrador.') );
                });

                break;
            default:
                return res.status(400).json({
                    mensagem: 'Busca de conta inválida...',
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
                mensagem: 'Nenhuma conta está cadastrada.',
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
        return next( new Error('Algo inesperado aconteceu ao buscar os dados das contas dos usuários. Entre em contato com o administrador.') );

    });

    
});

router.post('/', async (req, res, next) => {   // Cria os dados básicos do usuário: Conta, dados, endereço.

    // Início da validação dos campos.
    let erros = [];     // Lista de Erros

    // Lista de campos obrigatórios.
    let requiredFields = [
        'email',
        'emailRec',
        'senha',
        'confirmaSenha',
        'primeiroNome',
        'sobrenome',
        'dataNascimento',
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
            erros: erros
        });
    }

    //------------------------------------------------------------------------------------------------------
    // Validação dos Campos Obrigatórios.

    // Campos relacionados à CONTA DO USUÁRIO.
    // Validação básica do e-mail.
        if (req.body.email.length === 0 || req.body.email.length > 255){
            // console.log('Erro: E-mail vazio ou ultrapassa 255 caracteres.')
            return res.status(400).json({
                mensagem: 'EMAIL - Vazio ou ultrapassa 255 caracteres'
            })
        }

        if (!req.body.email.match(/^([\w\d-+.]{1,64})(@[\w\d-]+)((?:\.\w+)+)$/g)){
            // console.log('Erro: O formato do e-mail está diferente do esperado.');
            return res.status(400).json({
                mensagem: 'EMAIL - Formato invalido',
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
                mensagem: 'EMAIL - Em Uso'
            });
        }
    
    // Validação básica do e-mail de recuperação.
        if (req.body.emailRec === req.body.email){
            return res.status(400).json({
                mensagem: 'EMAIL DE RECUPERACAO - Identico ao email'
            })
        }

        if (!req.body.emailRec.match(/^([\w\d-+.]{1,64})(@[\w\d-]+)((?:\.\w+)+)$/g)){
            return res.status(400).json({
                mensagem: 'EMAIL DE RECUPERACAO - Formato invalido',
                exemplo: 'emailRecuperacao@dominio.com'
            });
        }
    
    // Validação senha.
        if (req.body.senha.length < 4 || req.body.senha.length > 100) {
            // console.log('Erro: Senha pequena demais ou ultrapassa 100 caracteres.')
            return res.status(400).json({
                mensagem: 'SENHA - Possui menos que 4 ou mais que 100 caracteres'
            });
        }

        if (!req.body.senha.match(/\d+/g)){
            // console.log('Erro: A senha não possui dígitos.');
            return res.status(400).json({
                mensagem: 'SENHA - Nao possui digitos'
            })
        }

        if (!req.body.senha.match(/[A-Z]+/g)){
            // console.log('Erro: A senha não possui letras maiúsculas.');
            return res.status(400).json({
                mensagem: 'SENHA - Nao possui letras maiusculas'
            })
        }

        if (!req.body.senha.match(/[a-z]+/g)){
            // console.log('Erro: A senha não possui letras minúsculas.');
            return res.status(400).json({
                mensagem: 'SENHA - Nao possui letras minusculas'
            })
        }

        if (req.body.senha != req.body.confirmaSenha){
            // console.log('Erro: A confirmação de senha está diferente da senha.');
            return res.status(400).json({
                mensagem: 'CONFIRMACAO SENHA - Esta diferente da senha'
            })
        }

    // Campos relacionados aos DADOS DO USUÁRIO.
    // Validação do primeiro nome.
        if (req.body.primeiroNome.length === 0){
            // console.log('Erro: Nome vazio.');
            return res.status(400).json({
                mensagem: 'PRIMEIRO NOME - Esta vazio'
            })
        } else {
            // console.log('Nome: [' + req.body.primeiroNome + ']');

            if (req.body.primeiroNome.match(/\s{2}|[^A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){  // Anterior: /\s{2}|[^a-zà-ü ,.'-]+/gi
                // console.log('Erro: Espaços excessivos ou caracteres inválidos detectados!');
                return res.status(400).json({
                    mensagem: 'PRIMEIRO NOME - Espacos excessivos ou caracteres invalidos detectados'
                })
            }

        }

    // Validação do sobrenome.
        if (req.body.sobrenome.length === 0){
            // console.log('Erro: Sobrenome vazio.');
            return res.status(400).json({
                mensagem: 'SOBRENOME - Esta vazio'
            })
        } else {
            // console.log('Sobrenome: [' + req.body.sobrenome + ']');
            
            if (req.body.sobrenome.match(/\s|[^A-Za-zÀ-ÖØ-öø-ÿ ,.'-]+/g)){  // Anterior: /\s{2}|[^a-zà-ü ,.'-]+/gi
                // console.log('Erro: Espaços excessivos ou caracteres inválidos detectados!');
                return res.status(400).json({
                    mensagem: 'SOBRENOME - Espacos excessivos ou caracteres invalidos detectados'
                })
            }

        }

    // Validação da data de nascimento.
        if (req.body.dataNascimento.length === 0){
            // console.log('Erro: Data de nascimento vazia.');
            return res.status(400).json({
                mensagem: 'DATA DE NASCIMENTO - Esta vazia'
            })
        } else {
            // console.log('Data de Nascimento: [' + req.body.dataNascimento + ']');
            if (!req.body.dataNascimento.match(/^(\d{4})\-([1][0-2]|[0][1-9])\-([0][1-9]|[1-2]\d|[3][0-1])$/g)){
                // console.log('Erro: Formato inválido de data!');
                return res.status(400).json({
                    mensagem: 'DATA DE NASCIMENTO - Formato invalido de data',
                    exemplo: 'aaaa-mm-dd'
                })
            }

            // Verificação de ano bissexto
            let dataNascimento = req.body.dataNascimento.split('-');
            if(dataNascimento[0][2] == 0 && dataNascimento[0][3] == 0){
                if (dataNascimento[0] % 400 == 0){
                    // console.log('Ano bissexto % 400');
                    if (dataNascimento[1] == 02 && dataNascimento[2] > 29){
                        return res.status(400).json({
                            mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano bissexto.',
                        });
                    }
                } else {
                    // console.log('Ano não-bissexto % 400');
                    if (dataNascimento[1] == 02 && dataNascimento[2] > 28){
                        return res.status(400).json({
                            mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano não-bissexto.',
                        });
                    }
                }
            } else {
                if (dataNascimento[0] % 4 == 0){
                    // console.log('Ano bissexto % 4');
                    if (dataNascimento[1] == 02 && dataNascimento[2] > 29){
                        return res.status(400).json({
                            mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano bissexto.',
                        });
                    }
                } else {
                    // console.log('Ano não-bissexto % 4');
                    if (dataNascimento[1] == 02 && dataNascimento[2] > 28){
                        return res.status(400).json({
                            mensagem: 'DATA DE NASCIMENTO - Dia inválido para ano não-bissexto.',
                        });
                    }
                }
            }
            // Fim da verificação de ano bissexto.

            // Verificação de idade do usuário. Se tive menos que 10 anos não poderá se cadastrar.
            if (dataNascimento[0] > (new Date().getFullYear() - 10)){
                return res.status(400).json({
                    mensagem: 'DATA DE NASCIMENTO - Usuário possui menos que 10 anos, portanto nao podera cadastrar',
                });
            }
        }

    // Validação de CPF.
    if (req.body.cpf.length !== 14){
        // console.log('Erro: CPF vazio ou incompleto.');
        return res.status(400).json({
            mensagem: 'CPF - Esta vazio ou incompleto',
            exemplo: '123.123.123-12'
        })
    } else {
        // console.log('CPF: [' + req.body.cpf + ']');
        
        // Análise do CPF digitado pelo usuário.

        let cpfDigits = req.body.cpf.replace(/\D/g, '');
        // console.log(`Dígitos do CPF: ${cpfDigits}`);

        if (cpfDigits.match(/^(.)\1{2,}$/g)){
            // console.log('Erro: Todos os dígitos são iguais.');
            return res.status(400).json({
                mensagem: 'CPF - Invalido, todos os digitos sao iguais'
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

            // Verificação do [ORM] sobre o CPF -- Caso o CPF já tenha sido utilizado, o usuário não poderá continuar o cadastro.
            const isCPFLivre = await Usuario.findOne({ where: { cpf: req.body.cpf } }).then((res) => {
                if (res === null || res === undefined || res === ''){
                    // console.log('[ORM] CPF livre!');
                    return true;
                } else {
                    // console.log('[ORM] Esse CPF não está livre!');
                    return false;
                }
            });

            // console.log('[ORM] O CPF está livre? ', isCPFLivre);

            if (!isCPFLivre){
                // console.log('O CPF não está livre. Enviando resposta ao front-end');
                return res.status(409).json({
                    mensagem: 'CPF - Em Uso'
                });
            }
            
        } else {
            console.log(`Erro: O CPF [${req.body.cpf}] é inválido!`)
            return res.status(400).json({
                mensagem: 'CPF - Invalido'
            })
        }

        // console.log('OK: O CPF está validado e formatado corretamente!');
        // console.log('-------------------------------------------------');
    }

    // Validação do telefone.
    if (!(req.body.telefone.length === 15 || req.body.telefone.length === 14 )){
        // console.log('Erro: Telefone vazio ou incompleto.');
        return res.status(400).json({
            mensagem: 'TELEFONE - Esta vazio ou incompleto',
            exemplo: '(12) 91234-1234 ou (12) 1234-1234'
        })
    } else {
        // console.log('Telefone: [' + req.body.telefone + ']');
        
        // Outra forma de utilizar RegEx. :D
        let telValidationRegEx = /^\((\d{2})\) ((?:[9])?\d{4}-\d{4})$/g;   // Entrada esperada: "(00) 91234-1234" ou "(00) 1234-1234";
        let telValidationMatchesArray = telValidationRegEx.exec(String(req.body.telefone));

        let telDDD;
        let telNum;

        if (telValidationMatchesArray){
            telDDD = telValidationMatchesArray[1];  // Capturando os agrupamentos da RegEx.
            telNum = telValidationMatchesArray[2];
        } else {
            // console.log('Erro: O formato do número está incorreto!');
            return res.status(400).json({
                mensagem: 'TELEFONE - Formato invalido, verifique o numero pos DDD, celulares possuem o digito 9 e residenciais nao.',
                exemplo: '(12) 91234-1234 ou (12) 1234-1234'
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
                    mensagem: 'TELEFONE - Numero de celular com muitos digitos repetidos'
                })
            }
        } else {
            // console.log('O número é de um aparelho fixo.');

            if (telNum.match(/^(?:(\d{4})\-\1)$/)){
                // console.log('Erro: Número fixo com muitos dígitos repetidos.');
                return res.status(400).json({
                    mensagem: 'TELEFONE - Numero fixo com muitos digitos repetidos'
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
                mensagem: 'TELEFONE - O DDD nao pertence a nenhum estado brasileiro'
            })
        }

    }

    // Campos relacionados ao ENDEREÇO DO USUÁRIO.
    // Validação simples do CEP
    if (!req.body.cep.match(/^\d{5}(?:\-?)\d{3}$/)){
        return res.status(400).json({
            mensagem: 'CEP - Formato invalido',
            exemplo: '12345-123 ou 12345123'
        })
    }

    if (req.body.cep.length === 9){
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
        return res.status(400).json({
            mensagem: 'CEP - O CEP informado parece nao existir'
        })
    }

    if (infoCEP.errMessage){
        return res.status(500).json({
            mensagem: 'CEP - Algo inesperado aconteceu ao buscar informacoes sobre o CEP',
            errMsg: infoCEP.errMessage,
            errCode: infoCEP.errCode
        })
    }

    // Validação de logradouro
    if (req.body.logradouro.length === 0 || req.body.logradouro.length > 100){
        return res.status(400).json({
            mensagem: 'LOGRADOURO - Esta vazio ou possui mais do que 100 caracteres'
        })
    }

    // Validação do bairro
    if (req.body.bairro.length === 0 || req.body.bairro.length > 100){
        return res.status(400).json({
            mensagem: 'BAIRRO - Esta vazio ou possui mais do que 100 caracteres'
        })
    }

    if (!infoCEP.bairro.toLowerCase().includes(req.body.bairro.toLowerCase())){
        return res.status(400).json({
            mensagem: 'BAIRRO - O bairro informado nao esta de acordo com o CEP'
        })
    }

    // Validação da cidade
    if (req.body.cidade.length === 0 || req.body.cidade.length > 100){
        return res.status(400).json({
            mensagem: 'CIDADE - Esta vazia ou possui mais do que 100 caracteres',
            exemplo: 'São Paulo'
        })
    }

    if (!infoCEP.localidade.toLowerCase().includes(req.body.cidade.toLowerCase())){
        return res.status(400).json({
            mensagem: 'CIDADE - A cidade informada nao esta de acordo com o CEP'
            
        })
    }

    // Validação do estado
    if (req.body.estado.length === 0 || req.body.estado.length > 100){
        return res.status(400).json({
            mensagem: 'ESTADO - Esta vazio ou possui mais do que 100 caracteres',
            exemplo: 'SP'
        })
    }

    if (!infoCEP.uf.toLowerCase().includes(req.body.estado.toLowerCase())){
        return res.status(400).json({
            mensagem: 'ESTADO - O estado informado nao esta de acordo com o CEP'
        })
    }

    // Fim da validação dos campos obrigatórios.
    // Validação de campos opcionais.
    if (req.body.descricao && req.body.descricao.length > 255){
        return res.status(400).json({
            mensagem: 'DESCRICAO - Possui mais do que 255 caracteres.'
        })
    }
    //
    //------------------------------------------------------------------------------------------------------

    // Início do processamento dos dados para criação da conta do usuário.
    // console.log('Dados recebidos com sucesso: ', req.body);

    // Criptografando a senha do usuário...

    // Concluíndo o cadastro.
    try {
        const result = await sequelize.transaction( async (transaction) => {

            const usuario = await Usuario.create({
                primeiro_nome: req.body.primeiroNome,
                sobrenome: req.body.sobrenome,
                data_nascimento: req.body.dataNascimento,
                cpf: req.body.cpf,
                telefone: req.body.telefone,
                descricao: req.body.descricao || null
            });

            const contaUsuario = await ContaLocal.create({
                email: req.body.email,
                cod_usuario: usuario.cod_usuario,
                senha: req.body.senha,
                email_recuperacao: req.body.emailRec
            });

            const endUsuario = await EnderecoUsuario.create({
                cod_usuario: usuario.cod_usuario,
                cep: req.body.cep,
                logradouro: req.body.logradouro,
                bairro: req.body.bairro,
                cidade: req.body.cidade,
                estado: req.body.estado
            });

            console.log('usuario: ', usuario.get({ plain: true }));
            console.log('contaUsuario: ', contaUsuario.get({ plain: true }));
            console.log('endUser: ', endUsuario.get({ plain: true }));
            console.log('transactionId: ', transaction.id)            

        });
        // Auto-Commit
    } catch (err) {
        // Auto-Rollback
        console.log(err);
    }
    
    // Coleta do Token de Acesso para autenticação inicial ou inclusão de dados adicionais ao cadastro do usuário pelo Cliente.
    const accessTokenUsuario = await axios({
        method: 'POST',
        url: 'http://localhost:3000/autenticacao_usuario',
        headers: { 'Authorization': `${req.headers.authorization}`},
        data: {
            'email': req.body.email,
            'senha': req.body.senha
        }
    }).then((res) => {
        // console.log(res.data);
        return res.data.token;
    }).catch((err) => {
        console.log(err);
    })


    // Conclusão da recepção e processamento do formulário de cadastro.
    
    return res.status(200).json({
        mensagem: 'Novo usuário cadastrado com sucesso. Utilize o Token temporário abaixo para incluir dados adicionais ao cadastro do usuário.',
        tokenUsuario: accessTokenUsuario
    });
    

});

// router.patch('/'/*, controller.conta_updateOne*/);

// router.delete('/'/*, controller.conta_deleteOne*/);

// Exportação.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
