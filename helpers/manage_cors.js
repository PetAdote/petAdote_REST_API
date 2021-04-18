// Exportações.
module.exports = (req, res, next) => {      // Configuração CORS - Note que esse Middleware não enviará a resposta, apenas ajustará algumas configurações, para que quando a resposta seja de fato enviada, ela vá com tais configurações.

    res.header('Access-Control-Allow-Origin', '*');     // Aceite todas origens '*', ou por exemplo: 'http://localhost:4000' - minha aplicação web (client web) local que roda na porta 4000.
    res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization')    // '*' ou Restrição de quais HTTP Headers podem ser adicionados ao request.

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

};