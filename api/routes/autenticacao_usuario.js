// Importações.

const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

const ContaLocal = require('../models/ContaLocal');
const ContaFacebook = require('../models/ContaFacebook');
const ContaGoogle = require('../models/ContaGoogle');
const Usuario = require('../models/Usuario');

// Rotas.

router.post('/', async (req, res, next) => {     // Verifica se o usuário está cadastrado para entregar o Token de Acesso.

    // Restrições de acesso à rota --- Apenas as Aplicações Pet Adote poderão autenticar usuários.
    if (!req.dadosAuthToken){   // Se não houver autenticação, não permita o acesso.

        return res.status(401).json({
            mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
            code: 'ACCESS_NOT_ALLOWED'
        });

    } else {

        // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
        if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
            return res.status(401).json({
                mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                code: 'ACCESS_NOT_ALLOWED'
            });
        }

    }
    // Fim das restrições de acesso à rota.

    let usuario = undefined;

    // Verificação de uma Conta Local.
    if (req.body.email){
        await ContaLocal.findOne({ 
            where: {
                email: req.body.email
            },
            include: [{
                model: Usuario,
                attributes: ['esta_ativo', 'ong_ativo', 'e_admin']
            }],
            nest: true,
            raw: true
        }).then((result) => {
            
            console.log(result);

            if (result){

                // O e-mail está vinculado à uma conta. Verifique se a senha está correta.
                if (bcrypt.compareSync(req.body.senha, result.senha)){

                    // A senha é válida, usuário autêntico.
                    usuario = { 
                        cod_usuario: result.cod_usuario,
                        tipo_cadastro: 'local',
                        esta_ativo: result.Usuario.esta_ativo,
                        ong_ativo: result.Usuario.ong_ativo,
                        e_admin: result.Usuario.e_admin
                    }

                } else {

                    // Senha inválida, unauthorized.
                    return res.status(401).json({
                        mensagem: 'Credenciais inválidas, acesso negado.',
                        code: 'INVALID_USER_CREDENTIALS'
                    });

                }


            } else {

                // O e-mail não está vinculado à uma conta, unauthorized.
                return res.status(401).json({
                    mensagem: 'Credenciais inválidas, acesso negado.',
                    code: 'INVALID_USER_CREDENTIALS'
                });

            }
        }).catch((error) => {

            // Erro ao buscar o usuário.
            console.log('Erro ao verificar as credenciais de acesso do usuário: ', error);

            let customErr = new Error('Algo inesperado aconteceu ao verificar as credenciais de acesso do usuário. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';

            next( customErr );
            
        });
    }

    // Verificação de uma Conta Facebook.

        // ToDo...

    // Verificação de uma Conta Google.

        // ToDo...

    console.log('Usuario autenticado:', usuario);

    // Atribuição do Token de Acesso do Usuário.
    if (usuario){

        // O usuário é autêntico. Gerando o Token de Acesso.
        const tokenUsuario = jwt.sign({
            cod_cliente: req.dadosAuthToken.cod_cliente,
            tipo_cliente: req.dadosAuthToken.tipo_cliente,
            usuario: usuario
        }, process.env.JWT_KEY, {
            expiresIn: '6h'
        });

        return res.header('Authorization', `Bearer ${tokenUsuario}`).status(200).json({
            mensagem: 'Usuário autenticado com sucesso.',
            cod_usuario: usuario.cod_usuario,
            token: tokenUsuario
        });

    }

});

// Exportação.
module.exports = router;