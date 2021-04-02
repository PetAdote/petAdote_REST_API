// Importações.
    const express = require('express');     // Importa o framework express no arquivo.
    const app = express();                  // Inicializa o framework express em "app".

    const logger = require('morgan');   // Logger/Profiler que trará informações sobre as requisições e respostas das nossas rotas.

    const bodyParser = require('body-parser');  // Módulo que nos permitirá analisar os campos codificados como (urlencoded) ou (json), enviados nas requisições.

    const database = require('./configs/database');   // Importação da conexão com o Banco de Dados MySQL via ORM Sequelize.
    // const ormModelChecker = require('./helpers/check_orm_models');  // Helper que verifica os Models criados com a ORM para cada tabela no Banco de Dados.

    // const autenticadorJWT = require('./api/middlewares/autenticador-jwt');  // Middleware - Utiliza o módulo "jsonwebtoken" para verificar em cada requisição se uma rota possui restrições de acesso e se o Token de Acesso está presente nos Headers e é válido.
    
    const { verifyAccessToken } = require('./helpers/manage_jwt');  // Middleware - Utiliza o módulo "jsonwebtoken" para verificar em cada requisição se uma rota possui restrições de acesso e se o Token de Acesso está presente nos Headers e é válido.

    const redisClient = require('./configs/redis_connection');    // Inicia a conexão com o Redis por meio do Client estabelecido em "./configs/redis_conn".

    const schedule = require('node-schedule');

// Conexão com o Banco de Dados MySQL.
    database.connection;          // Instância da conexão atual.
    database.checkConnection();   // Verificação da conexão.
    // ormModelChecker();   // Realiza um [ SELECT * ] limitado à 1 resultado em cada um dos models da lista "./api/models".

// Importação dos grupos de rotas.
    // const rotaAutenticacaoAPI = require('./api/routes/autenticacao_api');
    // const rotaAutenticacaoUsuario = require('./api/routes/autenticacao_usuario');

    const rotaAutenticacoes = require('./api/routes/autenticacoes');

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
        // Rota livre para testes simples durante a fase de desenvolvimento.
    });

    app.use('/autenticacoes', rotaAutenticacoes);

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