// Importações.
    const express = require('express');     // Importa o framework express no arquivo.
    const app = express();                  // Inicializa o framework express em "app".

    const logger = require('morgan');   // Logger/Profiler que trará informações sobre as requisições e respostas das nossas rotas.

    const bodyParser = require('body-parser');  // Módulo que nos permitirá analisar os campos codificados como (urlencoded) ou (json), enviados nas requisições.

    const db = require('./configs/database');   // Importação da conexão com o Banco de Dados MySQL via ORM Sequelize.
    // const ormModelChecker = require('./helpers/check_orm_models');  // Helper que verifica os Models criados com a ORM para cada tabela no Banco de Dados.

    // const autenticadorJWT = require('./api/middlewares/autenticador-jwt');  // Middleware - Utiliza o módulo "jsonwebtoken" para verificar em cada requisição se uma rota possui restrições de acesso e se o Token de Acesso está presente nos Headers e é válido.
    
    const { verifyAccessToken } = require('./helpers/manage_jwt');  // Middleware - Utiliza o módulo "jsonwebtoken" para verificar em cada requisição se uma rota possui restrições de acesso e se o Token de Acesso está presente nos Headers e é válido.

    const redisClient = require('./configs/redis_connection');    // Inicia a conexão com o Redis por meio do Client estabelecido em "./configs/redis_conn".

    const schedule = require('node-schedule');

// Conexão com o Banco de Dados MySQL.
    db.connection;          // Instância da conexão atual.
    db.checkConnection();   // Verificação da conexão.
    // ormModelChecker();   // Realiza um [ SELECT * ] limitado à 1 resultado em cada um dos models da lista "./api/models".

// Tarefas Agendadas (Cron Jobs).

    // let rmvExpiredTokens = schedule.scheduleJob('0 * * * *', () => {
    //     let Token = require('./api/models/Token');
    //     let { Op } = require('sequelize');

    //     Token.destroy({
    //         where: {
    //             data_limite: {
    //                 [ Op.lt ]: new Date()
    //             }
    //         },
    //         logging: false
    //     })
    //     .then((result) => {
    //         console.log('Quantidade de Tokens Expirados removidos durante a remoção agendada: ', result);
    //     })
    //     .catch((error) => {
    //         console.log('Algo inesperado aconteceu durante a remoção agendada dos tokens expirados.', error);
    //     })
    // });

// Fim das tarefas agendadas.

// Importação dos grupos de rotas.
    const rotaAutenticacaoAPI = require('./api/routes/autenticacao_api');
    const rotaAutenticacaoUsuario = require('./api/routes/autenticacao_usuario');

    const rotaContas = require('./api/routes/contas');
    const rotaUsuarios = require('./api/routes/usuarios');
    const rotaEnderecos = require('./api/routes/enderecos');

// Middlewares.
    app.use(logger('dev'));     // Em todas as requisições, Morgan fará a análise e entregará dados sobre ela no console do servidor, por fim passará a requisição adiante.

    app.use((req, res, next) => {      // Configuração CORS - Note que esse Middleware não enviará a resposta, apenas ajustará algumas configurações, para que quando a resposta seja de fato enviada, ela vá com tais configurações.

        res.header('Access-Control-Allow-Origin', '*');     // Aceite todas origens '*', ou por exemplo: 'http://localhost:4000' - minha aplicação web (client web) local que roda na porta 4000.
        res.header('Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, File-Size')    // '*' ou Restrição de quais HTTP Headers podem ser adicionados ao request.

        if (req.method === 'OPTIONS'){  // Sempre que um request modificador (POST, PUT, ...) é enviado, um método OPTIONS é enviado primeiro pelos navegadores, para identificar se tal request pode ser feito ou não.
            res.header('Access-Control-Allow-Methods',
            'GET, POST, PUT, PATCH, DELETE');

            return res.status(200).json({});        // Como nesse caso, o navegador só quer uma resposta dos métodos HTTP que ele pode utilizar. Respondemos apenas com a modificação do Header.
        }

        next();     // Passa a requisição adiante para o próximo "handler".

        /* Observação:  Erros CORS acontecem nos navegadores, pois é um mecanismo de segurança fornecido pelos navegadores.
                        Mesmo se restringirmos apenas a origem sendo nossa aplicação, ferramentas como o POSTMAN poderão enviar as requisições sem problemas.

                        Pesquise como restringir requisições por outras ferramentas no futuro, para garantir uma maior segurança à API.
        */

    });

    app.use(verifyAccessToken);

    app.use(express.urlencoded({ extended: true }));     // Se false, não receberá "rich data" (Textos RTF???).
    app.use(express.json());                             // Extrai os campos da requisição no formato JSON para o objeto "req.body".

// Rotas que vão gerenciar as requisições.
    app.get('/', async (req, res, next) => {

        const userTokenGenerator = require('./helpers/generate_userToken');

        // const randomize = require('randomatic');

        // const Usuario = require('./api/models/Usuario');

        // // Verificando se o usuário possui um Token de Ativação em Vigência.
        // /**
        //  * @param {*} cod_usuario Código do usuário que estará vinculado ao Token.
        //  * @param {('atv'|'rec')} tokenType Tipo do Token (Atv = Ativação), (Rec = Recuperação).
        //  * @param {Number} expirationTimeInSeconds Tempo de expiração em segundos. Padrão = 15 minutos (15 * 60).
        //  * @description Retorna um objeto {token, data_expiracao}. Caso algo dê errado, retorna o erro contendo {message, data_expiracao?, status, code}
        //  */
        // let generateUserToken = async (cod_usuario, tokenType, expirationTimeInSeconds = 15 * 60) => {


        //     // Verificação dos parâmetros.
        //     let allowedTokenTypes = [
        //         'atv',
        //         'rec',
        //     ];
        
        //     let invalidTokenType = false;
        
        //     // Verificando se o objeto recebido contém os dados necessários.
        //     if (!allowedTokenTypes.includes(tokenType)){
        //         invalidTokenType = true
        //     };

        //     if (!Number(cod_usuario) || !Number(expirationTimeInSeconds) || invalidTokenType){

        //         let customErr = new Error('O valor passado para algum dos parâmetros é inválido.');
        //         customErr.status = 400;
        //         customErr.code = 'INVALID_PARAM';
        
        //         throw customErr;

        //     }
        //     // Fim da verificação dos parâmetros.

        //     // Normalização dos parâmetros.
        //     cod_usuario = Number(cod_usuario);  // Evita a entrada de um número como string.
        //     expirationTimeInSeconds = Number(expirationTimeInSeconds);
        //     // Fim da normalização dos parâmetros.

        //     return new Promise((resolve, reject) => {

        //         let token = randomize('Aa0', 8);    // Código de 8 caracteres alfanuméricos.
        //         let secondsToExpire = expirationTimeInSeconds;
        //         let data_expiracao = new Date().getTime() + secondsToExpire * 1000; // Timestamp.

        //         let hashKey = `tokens:${tokenType}:user_${cod_usuario}`;

                
        //         // Verificando se existe algum Token (atv/rec) vigente para o usuário.
        //         redisClient.HGETALL(hashKey, (errorHGETALL, resultHGETALL) => {
        //             if (errorHGETALL){
        //                 console.log('Algo inesperado aconteceu ao verificar se um Token de Ativação está em vigência.', errorHGETALL);
        
        //                 let customErr = new Error('Algo inesperado aconteceu ao verificar se um Token de Ativação está em vigência. Entre em contato com o administrador.');
        //                 customErr.status = 500;
        //                 customErr.code = 'INTERNAL_SERVER_ERROR';
        
        //                 return reject(customErr);
        //             };

        //             console.log(`Algum Token do tipo ['${tokenType}'] foi encontrado?`, resultHGETALL);
        
        //             if (resultHGETALL){
        //                 let dataExpiracaoToken = Number(resultHGETALL.data_expiracao);
        
        //                 if (dataExpiracaoToken > new Date()){
        //                     // Se o usuário possuir um Token de Ativação em vigência não permita que ele crie um novo.
        //                     let customErr = new Error('Ainda existe um Token de Ativação vigente para esse usuário');
        //                     customErr.data_expiracao = new Date(dataExpiracaoToken).toLocaleString();
        //                     customErr.status = 403;
        //                     customErr.code = 'USER_HAS_ACTIVE_TOKEN';
        
        //                     return reject(customErr);
        //                 }

        //             }

        //             // Nenhum Token vigente encontrado: Verificando se o usuário existe.
        //             Usuario.findByPk(cod_usuario, { 
        //                 attributes: ['cod_usuario'],
        //                 raw: true
        //             })
        //             .then((result) => {
        //                 if (!result){   // Se o usuário não existir, não continue.
        //                     let customErr = new Error('Nenhum usuário com o ID informado foi encontrado.');
        //                     customErr.status = 404;
        //                     customErr.code = 'RESOURCE_NOT_FOUND';

        //                     return reject(customErr);
        //                 };

        //                 // Se a verificação do Token de Ativação em vigência, não retornou o erro e o usuário existe, crie um novo Token de Ativação.
        //                 redisClient.HSET(hashKey, [
        //                     'token', token,
        //                     'data_expiracao', data_expiracao
        //                 ],
        //                 (errorHSET, resultHSET) => {
        //                     if (errorHSET){
        //                         console.log('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário.', errorHSET);
                
        //                         let customErr = new Error('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário. Entre em contato com o administrador.');
        //                         customErr.status = 500;
        //                         customErr.code = 'INTERNAL_SERVER_ERROR';
                
        //                         return reject(customErr);
        //                     }

        //                     console.log(`Quantos campos em [${hashKey}] foram atribuídos?`, resultHSET);

        //                     // Adiciona o tempo de expiração do Token.
        //                     redisClient.EXPIRE(hashKey, secondsToExpire, (errorEXP, resultEXP) => {
        //                         if (errorEXP){
        //                             console.log('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário.', errorEXP);
                    
        //                             let customErr = new Error('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário. Entre em contato com o administrador.');
        //                             customErr.status = 500;
        //                             customErr.code = 'INTERNAL_SERVER_ERROR';
                    
        //                             return reject(customErr);
        //                         }
                    
        //                         console.log('TTL foi adicionado?', resultEXP);

        //                         return resolve({
        //                             token: token,
        //                             data_expiracao: new Date(data_expiracao)
        //                         }); // returning resolve.

        //                     }); // ending redisClient.EXPIRE()
                
        //                 }); // ending redisClient.HSET()

        //             })
        //             .catch((error) => {
        //                 console.log('Algo inesperado ocorreu ao buscar os dados do usuário para atribuir o Token de Ativação.', errorFindUser);

        //                 let customErr = new Error('Algo inesperado ocorreu ao buscar os dados do usuário para atribuir o Token de Ativação. Entre em contato com o administrador.');
        //                 customErr.status = 500;
        //                 customErr.code = 'INTERNAL_SERVER_ERROR';

        //                 return reject(customErr);
        //             }); // ending Usuario.findByPk()

        //         }); // ending redisClient.HGETALL()

        //     }); // ending promise.

        // };

        try {
            let tokenObj = await userTokenGenerator('1', 'rec', 30);

            console.log('tokenNoFinal', tokenObj);
            if (tokenObj){
                return res.status(200).json({
                    token: tokenObj.token,
                    data_expiracao: tokenObj.data_expiracao.toLocaleString()
                })
            }
        } catch (e){
            if (e.code == 'USER_HAS_ACTIVE_TOKEN'){
                return res.status(e.status).json({
                    mensagem: e.message,
                    data_expiracao: e.data_expiracao,
                    code: e.code
                });
            }
            if (e.code = 'RESOURCE_NOT_FOUND'){
                return res.status(e.status).json({
                    mensagem: e.message,
                    code: e.code
                });
            }
            next(e);
        };

        

        

        //

        // redisClient.HSET('tokensUser:1', [
        //     'token:ativacao', 'ApxlKi10' , 
        //     'data_limite:ativacao', (new Date().getTime() + 15 * 60 * 1000)
        // ],
        // (error, result) => {
        //     if (error){
        //         console.log('hset01 error: ', error);
        //     }
        //     console.log('Token Ativacao Registrado: ', result);
        // });

        // redisClient.HSET('tokensUser:1', [
        //     'token:recuperacao', 'x02pLUKq',
        //     'data_limite:recuperacao', (new Date().getTime() + 15 * 60 * 1000)
        // ],
        // (error, result) => {
        //     if (error){
        //         console.log('hset02 error: ', error);
        //     }
        //     console.log('Token Recuperacao Registrado: ', result);
        // });

        // redisClient.HDEL('tokensUser:1', [
        //     'token:recuperacao', 
        //     'data_limite:recuperacao'
        // ], (error, result) => {
        //     if (error){
        //         console.log('hkey error: ', error);
        //     }
        //     console.log('Result Redis DEL HKEYS: ', result);
        // });

        // redisClient.EXPIRE('tokensUser:1', 15 * 60, (error, result) => {
        //     if (error){
        //         console.log('Expire HSET error:', error);
        //     }
        //     console.log('Redis expire Ok?', result)
        // });

        // redisClient.HGETALL('tokensUser:1', (error, result) => {
        //     if (error){
        //         console.log('hkey error: ', error);
        //     }
        //     console.log('Result Redis HKEYS: ', result);
        // });
        

    });

    app.use('/autenticacao_api', rotaAutenticacaoAPI);
    app.use('/autenticacao_usuario', rotaAutenticacaoUsuario);

    app.use('/contas', rotaContas);
    app.use('/usuarios/enderecos', rotaEnderecos);
    app.use('/usuarios', rotaUsuarios);

    /* Observações sobre Conflito de Rotas

       Três formas de resolver rotas conflitantes:
       Caso 01 - Se "/usuarios/" estiver acima de "/usuario/enderecos", use RegEx para a requisição adiante caso o parâmetro não fique de acordo com o dado esperado em "usuarios/:parametro").
       Caso 02 - Se não queira ou possa utilizar a solução acima, coloque as rotas mais específicas como "/usuarios/enderecos" ou "usuarios/anuncios" acima das menos específicas.
       Caso 03 - O uso de Nesting de Routers também é possível, porém apenas em casos como "/usuarios/:idUsuario/anuncios/:idAnuncio". Como estamos usando muitas Query Strings, isso não nos ajuda.
    */
 

// Middlewares Gerenciadores de Erros.

    // Se uma requisição procurou por uma rota que não existe na lista acima, entregaremos um erro 404 (Recurso não encontrado).
    app.use((req, res, next) => {  
        const error = new Error('Recurso não encontrado.');

        error.status = 404;     // Perceba que estamos atribuindo uma das propriedades de "Error", status, como 404 (Not found).
        error.code = 'RESOURCE_NOT_FOUND'

        next(error);            // Em situações onde erros existem, é necessário passá-lo como parâmetro para o middleware em "next();".
    });

    /* 
        Esse middleware trata erros enviados via "next()" durante os blocos [ catch ] das rotas acima.

        É extremamente útil quando você não sabe exatamente qual tipo de erro pode acontecer em um processamento nas rotas,
        quando aplicado nos blocos [ catch ], permite capturar esses erros inesperados.

        A utilização de um middleware com 4 parâmetros é uma característica dos Error Handlers do Express.
    */
    app.use((error, req, res, next) => {    // Perceba: Middleware com 4 parâmetros, o 1º sendo "error".

        console.error('Um erro inesperado ocorreu!\n', error);

        req.pause();
        res.status(error.status || 500);    // Se o erro gerado não apresentar um código de status http, use 500 - (Internal Server Error).

        res.json({      // Aqui é a resposta que entregaremos à aplicação em caso de erro, pode ser personalizada.

            error: {
                mensagem: error.message,  // O atributo "message" de erros quase sempre estara presente, não gerando exceções.
                code: error.code || null
            }

        });

    })

// Exportação.
    module.exports = app;