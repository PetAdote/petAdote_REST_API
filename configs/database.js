// Importações.
    const {Sequelize} = require('sequelize');     // ORM que nos ajudará a lidar com SGBDR MySQL.
    // Atenção, uma das dependências é o Driver de conexão com o MySQL --> Instale via NPM o módulo "mysql2"... [ npm install --save mysql2 ].

    const readlineSync = require('readline-sync');  // [npm/readline-sync] Permite a captura de user input no terminal. Se você está utilizando o "nodemon" para monitorar alterações, vá até "package.json" e execute o processo inicial da segiunte maneira [ nodemon --no-stdin ./server.js ]. Caso contrário os inputs de usuário serão ignorados.

// Instância do Sequelize ORM.

    // let dbUser = readlineSync.question('[Database] Nome de usuario: ');
    // let dbPass = readlineSync.question('[Database] Senha: ', { hideEchoBack: true });

    const connection = new Sequelize('db_petAdote', 'dba', 'dba_petAdote', {
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