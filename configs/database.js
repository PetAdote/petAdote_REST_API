// Importações.
    const {Sequelize} = require('sequelize');     // ORM que nos ajudará a lidar com SGBDR MySQL.
    // Atenção, uma das dependências é o Driver de conexão com o MySQL --> Instale via NPM o módulo "mysql2"... [ npm install --save mysql2 ].

    const readlineSync = require('readline-sync');  // [npm/readline-sync] Permite a captura de user input no terminal. Se você está utilizando o "nodemon" para monitorar alterações, vá até "package.json" e execute o processo inicial da segiunte maneira [ nodemon --no-stdin ./server.js ]. Caso contrário os inputs de usuário serão ignorados.

// Instância do Sequelize ORM.

    let dbUser = readlineSync.question('[Database] Nome de usuario: ');
    let dbPass = readlineSync.question('[Database] Senha: ', { hideEchoBack: true });

    const connection = new Sequelize('db_petAdote', dbUser, dbPass, {
        host: '127.0.0.1',
        port: '3316',       // Porta de Reverse Proxy -- Direciona ao serviço corrente na porta 3306 (mysql) na máquina virtual.
        dialect: 'mysql',
        pool: {
            max: 100,
            min: 0,
            acquire: 1000 * 30,
            idle: 1000 * 10
        },
        define: {   // Opções das definições de Models.
            freezeTableName: true,
            timestamps: false
        },
        logging: (msg) => { console.log(msg) }
    });

    const checkConnection = () => {
        connection.authenticate()
        .then((res) => {
            console.log('[DB] Conexão estabelecida...');
        })
        .catch((error) => {
            console.error('[DB] Conexão falhou, reinicie o servidor...\n', error);
            process.exit(0);    // Finaliza a execução do Node.js se algum erro acontecer ao conectar ao Banco de Dados.
        });
    }

// Exportação.
module.exports = {
    connection,
    checkConnection
};