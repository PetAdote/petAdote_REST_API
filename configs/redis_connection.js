// Importações.
    const redis = require('redis');

    const client = redis.createClient({
        port: 6379,
        host: "127.0.0.1"
    });

// Verificações.

    client.on('connect', () => {
        console.log('Conectando ao Redis...');
    });

    client.on('ready', () => {
        console.log('A conexão com o Redis foi estabelecida e está pronta para uso.');
    });

    client.on('error', (error) => {
        console.log('Algo inesperado aconteceu no Redis.', error);
    });

    client.on('end', () => {
        console.log('Cliente desconectado do Redis.');
    });

// Exportação do Client, para usá-lo no sistema.
module.exports = client;

    