// Importações.
    const http = require('http');
    const app = require('./app');
    const fs = require('fs');
    const path = require('path');

// Configurações do servidor http e do ambiente.
    const port = process.env.PORT || 3000;      // Caso esteja em produção, poderemos configurar uma variável de ambiente PORT, se ela não estiver configurada, o padrão será 3000.

    process.env.JWT_KEY = 'SenhaSecretaDaNossaAssinaturaJWT';

    const server = http.createServer(app);     // "server" recebe a inicialização do servidor http. "app" possui nossos requestListeners, nosso monitoramento de rotas.

// Verificações pré-inicialização.

    // Realiza a remoção de arquivos temporários remanecentes de processos que falharam.
    fs.rmSync(path.resolve(__dirname, "api", "uploads", "tmp"), { recursive: true, force: true });
    fs.mkdirSync(path.resolve(__dirname, "api", "uploads", "tmp"));

// Inicialização do servidor http.

    server.listen(port, () => {
        console.log('Servidor rodando em "http://localhost:3000".');
    });    // O "server" observará requisições à porta definida em "port".



