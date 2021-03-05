// Importações.

const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');

const ContaLocal = require('../models/ContaLocal');
const ContaFacebook = require('../models/ContaFacebook');
const ContaGoogle = require('../models/ContaGoogle');
const Usuario = require('../models/Usuario');

// Rotas.

router.post('/', async (req, res, next) => {     // Verifica se o usuário está cadastrado para entregar o Token de Acesso.

    let usuario = undefined;

    // Verificação de uma Conta Local.
    if (req.body.email && req.body.senha){
        await ContaLocal.findOne({ 
            where: {    email: req.body.email,
                        senha: req.body.senha 
            },
            attributes: ['cod_usuario'],
            include: [{
                model: Usuario,
                attributes: ['esta_ativo', 'ong_ativo', 'e_admin']
            }]
            ,
            nest: true,
            raw: true
        }).then((res) => {
            // Usuário encontrado.
            // console.log(res);
            usuario = { 
                cod_usuario: res.cod_usuario,
                tipo_cadastro: 'local',
                esta_ativo: res.Usuario.esta_ativo,
                ong_ativo: res.Usuario.ong_ativo,
                e_admin: res.Usuario.e_admin
            }
        }).catch((err) => {
            // Usuário não encontrado.
            console.log(err);
        })
    }

    // Verificação de uma Conta Facebook.

    // Verificação de uma Conta Google.

    console.log(usuario);

    // Atribuição do Token de Acesso do Usuário.
    if (usuario){

        const tokenUsuario = jwt.sign({
            cod_cliente: req.dadosAuthToken.cod_cliente,
            tipo_cliente: req.dadosAuthToken.tipo_cliente,
            usuario: usuario
        }, process.env.JWT_KEY, {
            expiresIn: '6h'
        });

        return res.header('Authorization', `Bearer ${tokenUsuario}`).status(200).json({
            mensagem: 'Usuário autenticado com sucesso.',
            token: tokenUsuario
        });

    } else {
        return res.status(401).json({
           mensagem: 'Credenciais inválidas.'
        });
    }

});

// Exportação.
module.exports = router;