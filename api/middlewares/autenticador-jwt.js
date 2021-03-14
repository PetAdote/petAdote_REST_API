// Importações
const jwt = require('jsonwebtoken');

/* Observações...
    A autenticação JWT envolve a variável de ambiente [ JWT_KEY ].
    A rota pública de autenticação dos clientes.
    A utilização desse middleware como um middleware de nível global (inserido em app.js) devido às restrições do negócio, porém é
    possível aplicá-lo à rotas específicas.

    Com a autenticaão JWT em ação, clientes deverão pedir um Token de Acesso na rota de autenticação para realizarem requisições à REST API.
        > [ http://localhost:3000/autenticacao_api/?cliente=MeuIdComoCliente&senha=MinhaSenhaComoCliente ]

    Devem também verificar se o Token expirou antes de fazer tais requisições. (Atualmente o Token é válido por 1 hora).

    ------------------------------------------------------------------------------------------------------------------------------------------
    É interessante que a REST armazene os Tokens que foram entregues temporáriamente na memória local, utilizando por exemplo o Redis.
    Assim podemos controlar melhor os Tokens e fazer sistemas de Logout, onde o usuário, ao se desconectar de um Cliente, teria seu Token de Acesso revogado na REST.
    Até que o mesmo alcance a data de expiração, onde poderiamos excluí-lo da memória.
    
*/


// Exportação.
module.exports = (req, res, next) => {

    if (req.url.match(/^\/autenticacao_api/)){   // Como a rota de autenticação deverá ser a única rota acessível à qualquer um, simplesmente passamos ela adiante, caso uma requisição chegue para ela.
        return next();
    }

    try {

        /* Caso 01: Recebendo o Token por meio do BODY do Request. Não é o mais comum/recomendado. */
        // const decodedToken = jwt.verify(req.body.token, process.env.JWT_KEY);   // Agora a aplicação/cliente deverá enviar no request o Token de acesso para acessar as rotas da REST API.

        /* Caso 02: Recebendo o Token por meio dos Request Headers. É o modo recomendado. */
        const token = req.headers.authorization.split(" ")[1];      // Separa o Token, do indicador comum de authorização "Bearer " que nada mais é que uma convenção usada nesses sistemas para indicar que o Header "authorization" se trata de um Token de um cliente.

        const decoded = jwt.verify(token, process.env.JWT_KEY);     // O módulo "jsonwebtoken" verifica o token de acesso e retorna os dados do token.

        req.dadosAuthToken = decoded;     // Agora o objeto 'dadosAuthToken' da requisição possuirá os dados do usuário "autenticado" atribuidos ao Token na rota "autenticacao_api.js" e esses dados poderão ser usados nas rotas protegidas.

        // console.log('[Middleware_autenticadorJWT] dadosAuthToken:', req.dadosAuthToken);

        return next();

    } catch (error) {

        req.pause();
        return res.status(401).json({
            mensagem: 'A autenticação do cliente falhou ou está inválida.',
            code: 'INVALID_OR_EXPIRED_AUTH'
        });

    }

}