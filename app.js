// Importações.
    const express = require('express');     // Importa o framework express no arquivo.
    const app = express();                  // Inicializa o framework express em "app".

    const logger = require('morgan');   // Logger/Profiler que trará informações sobre as requisições e respostas das nossas rotas.

    const bodyParser = require('body-parser');  // Módulo que nos permitirá analisar os campos codificados como (urlencoded) ou (json), enviados nas requisições.

    const db = require('./configs/database');   // Importação da conexão com o Banco de Dados MySQL via ORM Sequelize.
    // const ormModelChecker = require('./helpers/orm_model_checker');  // Helper que verifica os Models criados com a ORM para cada tabela no Banco de Dados.

    const autenticadorJWT = require('./api/middlewares/autenticador-jwt');  // Middleware - Utiliza o módulo "jsonwebtoken" para verificar em cada requisição se uma rota possui restrições de acesso e se o Token de Acesso está presente nos Headers e é válido.

// Conexão com o Banco de Dados MySQL.
    db.connection;  // Instância da conexão atual.
    db.checkConnection();   // Verificação da conexão.
    // ormModelChecker();   // Realiza um [ SELECT * ] limitado à 1 resultado em cada um dos models da lista "./api/models".

// Importação dos grupos de rotas.
    const rotaPerfis = require('./api/routes/perfis');
    const rotaAutenticacaoAPI = require('./api/routes/autenticacao_api');

// Middlewares.
    app.use(logger('dev'));     // Em todas as requisições, Morgan fará a análise e entregará dados sobre ela no console do servidor, por fim passará a requisição adiante.

    app.use((req, res, next) => {      // Configuração CORS - Note que esse Middleware não enviará a resposta, apenas ajustará algumas configurações, para que quando a resposta seja de fato enviada, ela vá com tais configurações.

        res.header('Access-Control-Allow-Origin', '*');     // Aceite todas origens '*', ou por exemplo: 'http://localhost:4000' - minha aplicação web (client web) local que roda na porta 4000.
        res.header('Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept, Authorization')    // '*' ou Restrição de quais HTTP Headers podem ser adicionados ao request.

        if (req.method === 'OPTIONS'){  // Sempre que um request modificador (POST, PUT, ...) é enviado, um método OPTIONS é enviado primeiro pelos navegadores, para identificar se tal request pode ser feito ou não.
            res.header('Access-Control-Allow-Methods',
            'GET, POST, PUT, PATCH, DELETE, ');

            return res.status(200).json({});        // Como nesse caso, o navegador só quer uma resposta dos métodos HTTP que ele pode utilizar. Respondemos apenas com a modificação do Header.
        }

        next();     // Passa a requisição adiante para o próximo "handler".

        /* Observação:  Erros CORS acontecem nos navegadores, pois é um mecanismo de segurança fornecido pelos navegadores.
                        Mesmo se restringirmos apenas a origem sendo nossa aplicação, ferramentas como o POSTMAN poderão enviar as requisições sem problemas.

                        Pesquise como restringir requisições por outras ferramentas no futuro, para garantir uma maior segurança à API.
        */

    });

    app.use(autenticadorJWT);

    app.use(bodyParser.urlencoded({ extended: false }));    // Se false, não receberá "rich data" (Textos RTF???).
    app.use(bodyParser.json());                             // Extrai os campos da requisição no formato JSON.

// Rotas que vão gerenciar as requisições.
    app.use('/perfis', rotaPerfis);
    app.use('/autenticacao_api', rotaAutenticacaoAPI);

// Middlewares Gerenciadores de Erros.

    // Se a aplicação procurou por uma rota que não existe na lista acima, entregaremos um erro.
    app.use((req, res, next) => {  
        const error = new Error('Recurso não encontrado.');

        error.status = 404;     // Perceba que estamos atribuindo uma das propriedades de "Error", status, como 404 (Not found).

        next(error);            // Em situações onde erros existem, é necessário passá-lo como parâmetro para o middleware em "next();".
    });

    // Se alguma requisição respondeu com um erro, trataremos esse erro de forma personalizada. (Express errorHandling)
    app.use((error, req, res, next) => {    // Perceba: Middleware com 4 parâmetros, o 1º sendo "error".

        console.error('Um erro inesperado ocorreu!\n', error);

        res.status(error.status || 500);    // Se o erro gerado, não apresentar um código de status http, use 500 - (Internal Server Error).

        res.json({      // Aqui é a resposta que entregaremos à aplicação em caso de erro, pode ser personalizada.

            error: {
                mensagem: error.message  // O atributo "message" de erros quase sempre estara presente, não gerando exceções.
            }

        });

    })

// Exportação.
    module.exports = app;