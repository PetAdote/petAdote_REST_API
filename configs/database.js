// Importações.
    const {Sequelize} = require('sequelize');     // ORM que nos ajudará a lidar com SGBDR MySQL.
    // Atenção, uma das dependências é o Driver de conexão com o MySQL --> Instale via NPM o módulo "mysql2"... [ npm install --save mysql2 ].

    const readlineSync = require('readline-sync');  // [npm/readline-sync] Permite a captura de user input no terminal. Se você está utilizando o "nodemon" para monitorar alterações, vá até "package.json" e execute o processo inicial da segiunte maneira [ nodemon --no-stdin ./server.js ]. Caso contrário os inputs de usuário serão ignorados.

    const moment = require('moment');

// Instância do Sequelize ORM.

    // let dbUser = readlineSync.question('[Database] Nome de usuario: ');
    // let dbPass = readlineSync.question('[Database] Senha: ', { hideEchoBack: true });

    const connection = new Sequelize('db_petAdote', process.env.DB_USER, process.env.DB_PASS, {
        host: '127.0.0.1',
        port: '3316',       // Porta de Reverse Proxy -- Direciona ao serviço corrente na porta 3306 (mysql) na máquina virtual.
        dialect: 'mysql',
        // dialectOptions: {
        //     typeCast: (field, next) => {            // Por padrão, uma consulta com o Sequelize que retorna um DATETIME entregará o dado no padrão ISO8601 (UTC). Desejamos receber os dados sempre da forma que estão no banco de dados, então devemos sobrepor a entrega desse tipo de campo.
        //         if (field.type === 'DATETIME'){
        //             return field.string()
        //         }
        //         return next()
        //     }
        // },
        pool: {
            max: 100,
            min: 0,
            acquire: 1000 * 30,
            idle: 1000 * 10
        },
        define: {   // Opções das definições de Models.
            freezeTableName: true,
            timestamps: false,
        },
        timezone: moment().format('Z'),     // Ajusta o horário salvo no banco de dados conforme o offset local (No caso do horário BR: GMT-03:00). O moment detecta horário de verão.
        logging: (msg) => { console.log(msg) }
    });

    const checkConnection = () => {
        connection.authenticate()
        .then((res) => {
            console.log('[Database] Conexão estabelecida...');
        })
        .catch((error) => {
            
            if (error.original['code'] === 'ER_ACCESS_DENIED_ERROR') {
                readlineSync.question('[DatabaseError] Credenciais invalidas, tente novamente ao reiniciar o servidor. Pressione [Enter] para encerrar o servidor.');
                return process.exit(0);    // Finaliza a execução do Node.js se algum erro acontecer ao conectar ao Banco de Dados.
            }
            
            console.error('[DatabaseError] A conexao falhou, verifique o erro e reinicie o servidor...\n', error);
            readlineSync.question('Por favor, pressione [Enter] para encerrar o servidor.');
            process.exit(0);    // Finaliza a execução do Node.js se algum erro acontecer ao conectar ao Banco de Dados.
            
        });
    }

// Exportação.
module.exports = {
    connection,
    checkConnection
};