// Importações.

    const express = require('express');
    const router = express.Router();

    const clientesAutorizados = require('../../configs/clientes');      // Simulação do banco de dados da autenticação de Aplicações Clientes.

    const jwt = require('jsonwebtoken');

// Rotas.

router.get('/', (req, res, next) => {     // Entrega o Token de autenticação aos clientes registrados.

    // console.log('[Router_clientes] Verificando se cliente existe para atribuir o JWToken. ');

    let cliente = clientesAutorizados.find( (cliente) => {
        if (cliente.cod_cliente === req.query.cliente && cliente.senha === req.query.senha){
            return cliente;
        }
    });

    if (cliente){

        // console.log('Cliente válido! Entregando Token...');

        const tokenAcesso = jwt.sign({      // Conteúdo acessível que estará dentro Token. (Não envie senhas!)
            cod_cliente: cliente.cod_cliente,
            tipo_cliente: cliente.tipo_cliente
        },
        process.env.JWT_KEY,    // Assinatura particular do Token (Isso só a REST API saberá).
        {
            expiresIn: '1h'     // Tempo de expiração desse Token. (O cliente precisará verificar se o token expirou e fazer um novo "login");
        });

        return res.status(200).json({
            mensagem: 'Cliente válido! O Token de acesso foi entregue.',
            token: tokenAcesso
        });
    } else {
        return res.status(401).json({
            mensagem: 'Autenticação inválida!',
            code: 'INVALID_API_CREDENTIALS',
            exemplo: `${req.protocol}://${req.get('host')}/autenticacao_api/?cliente=SeuID&senha=SuaSenha`
        });
    }

});

// Exportação.
module.exports = router;