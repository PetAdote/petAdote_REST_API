// Exportações.
/**
 * @description Verifica se o requisitante é um usuário inativo de uma aplicação Pet Adote. Usuários inativos podem acessar end-points que exibem dados com o método GET, o uso de outros métodos em end-points deve ser registrado na lista de permissão desse middleware.
 */
module.exports = (req, res, next) => {
    // console.log('Método de Requisição:', req.method);
    // console.log('End-point:', req.url);
    // console.log('Credenciais do Requisitante', req.dadosAuthToken);

    if (req.dadosAuthToken?.usuario?.esta_ativo == 0 && req.method !== 'GET'){
        // Se o verbo HTTP for diferente de GET para a requisição de um usuário inativo...

        // Início da Lista de end-points modificadores permitidos para usuários inativos.
            let allowedCallsRegEx = [
                new RegExp(/^\/autenticacoes\/usuarios\/refresh\/{0,1}$/g),                                                     // Ex: (POST:   /autenticacoes/usuarios/refresh/)
                new RegExp(/^\/usuarios\/(?:(?:\d+[/]?)|(?:\d+[?])|(?:\d+[?][^/]+)|(?:\d+[?][^/]+[/]{1}))$/g),                  // Ex: (PATCH:  /usuarios/codUsuario?setDefault=avatar)
                new RegExp(/^\/usuarios\/enderecos\/(?:(?:\d+[/]?)|(?:\d+[?])|(?:\d+[?][^/]+)|(?:\d+[?][^/]+[/]{1}))$/g),       // Ex: (PATCH:  /usuarios/enderecos/codusuario)
                new RegExp(/^\/contas\/(?:(?:\d+[/]?)|(?:\d+[?])|(?:\d+[?][^/]+)|(?:\d+[?][^/]+[/]{1}))$/g),                    // Ex: (PATCH:  /contas/codUsuario)
                new RegExp(/^\/contas\/ativacao\/(?:(?:[^/]+)|(?:[^/]+[/]{1}))$/g),                                             // Ex: (PATCH:  /contas/ativacao/123t0k3n)
                new RegExp(/^\/contas\/ativacao\/reenvio\/(?:(?:\d+[/]?)|(?:\d+[?])|(?:\d+[?][^/]+)|(?:\d+[?][^/]+[/]{1}))$/g), // Ex: (POST:   /contas/ativacao/reenvio/codUsuario)
            ]
        // Fim da Lista de end-points modificadores permitidos para usuários inativos.
        
        let reqAllowed = false; // Se o end-point estiver na lista de permissões, receberá TRUE.

        // Se o end-point requisitado for encontrado na lista de autorização para usuários não-ativos, atribua TRUE à "reqAllowed" e encerre o loop.
            for (let c = 0; c < allowedCallsRegEx.length; c++){
                // console.log(allowedCallsRegEx[c]);
                // console.log(String(req.url).match(allowedCallsRegEx[c]));
                
                if( String(req.url).match(allowedCallsRegEx[c]) ){
                    reqAllowed = true
                    break;
                };
            }
        // ----------------------------------------------------------------------------------------------------

        if (!reqAllowed){
            // "reqAllowed" false - O uso do end-point é negado para o usuário inativo.
            // console.log('Você não está autorizado à acessar essa rota!');

            return res.status(403).json({
                mensagem: 'Você não possui o nível de acesso adequado.',
                code: 'NOT_ALLOWED'
            });
        }

        // "reqAllowed" true - O uso do end-point é permitido para o usuário inativo.
        // console.log('Você pode acessar essa rota!');
        return next();

    }

    // Se a requisição foi de um Cliente ou um Usuário ativo, simplesmente passe adiante.
    return next();

};