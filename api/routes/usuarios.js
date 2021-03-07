/* Observações: Como desenvolvedores, ao construir uma REST API, devemos documentar de forma clara e consistente
                quais campos são necessários às rotas de nossa API.
*/

// Importações.
    const express = require('express');
    const router = express.Router();

    // const controller = require('../controllers/usuarios');   // TODO...

    // Importação dos Models...

        const Usuario = require('../models/Usuario');
        const Bloqueio = require('../models/Bloqueio');

        const ContaLocal = require('../models/ContaLocal');
        const ContaFacebook = require('../models/ContaFacebook');
        const ContaGoogle = require('../models/ContaGoogle');
        const EnderecoUsuario = require('../models/EnderecoUsuario');

    const { EventEmitter } = require('events'); // Gerador de eventos do Node.

    const fs = require('fs');                   // 'fs' do Node para manipular o "file system', gerenciando os arquivos que o servidor receberá.
    const path = require('path');               // 'path' do Node para gerenciar caminhos para arquivos e diretórios.
    const util = require('util');               // 'util' do Node para analisar objetos complexos e outras utilidades.
    const uuid = require('uuid');               // 'uuid' para criar os nomes únicos dos arquivos.

    const formidable = require('formidable');   // 'formidable' para receber dados via POST de um formulário com encode 'multipart/form-data' (XMLHttpRequest).

    const sharp = require('sharp');             // 'sharp' para processar imagens.

    const bcrypt = require('bcrypt');           // 'bcrypt' para "hashear" as senhas dos usuários antes de enviá-las ao DB.

    const moment = require('moment-timezone');  // 'moment-timezone' para capturar o horário local do sistema (não UTC).

    const multer = require('multer');

    // TODO... A maioria dessas importações irão para os controllers. Estão aqui só durante a fase inicial de testes.

// Rotas.
    router.get('/', (req, res, next) => {

        Usuario.findAll({ attributes: ['cod_usuario'], raw: true })
        .then((resultArr) => {

            if (resultArr.length === 0){
                return res.status(200).json({
                    mensagem: 'Nenhum usuário está registrado.'
                });
            }

            resultArr.forEach((row) => {
                row.conta = `${req.protocol}://${req.get('host')}/contas/?codUsuario=${row.cod_usuario}`,
                row.detalhes = `${req.protocol}://${req.get('host')}/usuarios/${row.cod_usuario}`
            });

            res.status(200).json({
                total_usuarios: resultArr.length,
                mensagem: 'Lista de usuários registrados.',
                usuarios: resultArr
            });

        })
        .catch((error) => {

            console.log(`GET: '/usuarios/' - Algo deu errado... \n`, error);
            return next( new Error('Algo inesperado aconteceu ao buscar a lista de usuários. Entre em contato com o administrador.') );

        });

    });

    router.get('/:codUsuario', async (req, res, next) => {

        if (req.params.codUsuario.match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos."
            });
        }

        /* Verificar a lista de bloqueados desse usuário.
        Se o usuário requisitante estiver na lista de bloqueados, retornar status 401. */
        if (req.dadosAuthToken.usuario && req.dadosAuthToken.usuario.e_admin === 0){
            const estaBloqueado = await Bloqueio.findOne({ 
                where: { 
                    bloqueante: req.params.codUsuario,
                    bloqueado: req.dadosAuthToken.usuario.cod_usuario
                },
                raw: true
            })
            .then((result) => {
                if (result) {
                    // Usuário requisitante está bloqueado de acessar os dados desse usuário.
                    return true;
                    

                } else {
                    return false;
                }
            })
            .catch((error) => {
                console.log(`GET: '/usuarios/:codUsuario' - Algo deu errado... \n`, error);
                return next( new Error('Algo inesperado aconteceu ao verificar se o usuário requisitante está bloqueado. Entre em contato com o administrador.') );
            });

            if (estaBloqueado) {
                return res.status(401).json({
                    mensagem: "Não foi possível acessar os dados desse usuário."
                });
            }
        }

        Usuario.findByPk(req.params.codUsuario, { raw: true })
        .then((result) => {

            if (result) {

                /* Exibir lista de rotas com base nos níveis de acesso.
                Cliente (API); Usuário Admin; Usuário dono do recurso; Usuário visitante do recurso. */

                if (req.dadosAuthToken.cod_cliente && (!req.dadosAuthToken.usuario || req.dadosAuthToken.usuario.e_admin == 1)) {
                    // Chamada da API ou de um Admin.

                    return res.status(200).json({
                        conta: `${req.protocol}://${req.get('host')}/contas/?codUsuario=${result.cod_usuario}`,
                        usuario: result,
                        endereco: `${req.protocol}://${req.get('host')}/usuarios/enderecos/?codUsuario=${result.cod_usuario}`,
                        seguidos: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidos=${result.cod_usuario}`,
                        seguidores: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidores=${result.cod_usuario}`,
                        denunciados: `${req.protocol}://${req.get('host')}/usuarios/denuncias/?denunciados=${result.cod_usuario}`,
                        denunciantes: `${req.protocol}://${req.get('host')}/usuarios/denuncias/?denunciantes=${result.cod_usuario}`,
                        bloqueados: `${req.protocol}://${req.get('host')}/usuarios/bloqueios/?bloqueados=${result.cod_usuario}`,
                        bloqueantes: `${req.protocol}://${req.get('host')}/usuarios/bloqueios/?bloqueantes=${result.cod_usuario}`,
                        animais: `${req.protocol}://${req.get('host')}/animais/?codDono=${result.cod_usuario}`,
                        momentos: `${req.protocol}://${req.get('host')}/momentos/?codUsuario=${result.cod_usuario}`,
                        postagens: `${req.protocol}://${req.get('host')}/postagens/?codUsuario=${result.cod_usuario}`,
                        postagens_avaliadas: `${req.protocol}://${req.get('host')}/postagens/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        anuncios: `${req.protocol}://${req.get('host')}/anuncios/?codUsuario=${result.cod_usuario}`,
                        anuncios_favoritos: `${req.protocol}://${req.get('host')}/anuncios/favoritos/?codUsuario=${result.cod_usuario}`,
                        anuncios_avaliados: `${req.protocol}://${req.get('host')}/anuncios/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        candidaturas: `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?codUsuario=${result.cod_usuario}`,
                        conversas: `${req.protocol}://${req.get('host')}/conversas/?codUsuario=${result.cod_usuario}`
                    });
                } else if (req.dadosAuthToken.usuario && req.dadosAuthToken.usuario.cod_usuario != req.params.codUsuario){
                    // Chamada de um Usuário visitante.

                    return res.status(200).json({
                        conta: `${req.protocol}://${req.get('host')}/contas/?codUsuario=${result.cod_usuario}`,
                        usuario: result,
                        seguidos: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidos=${result.cod_usuario}`,
                        seguidores: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidores=${result.cod_usuario}`,
                        animais: `${req.protocol}://${req.get('host')}/animais/?codDono=${result.cod_usuario}`,
                        momentos: `${req.protocol}://${req.get('host')}/momentos/?codUsuario=${result.cod_usuario}`,
                        postagens: `${req.protocol}://${req.get('host')}/postagens/?codUsuario=${result.cod_usuario}`,
                        postagens_avaliadas: `${req.protocol}://${req.get('host')}/postagens/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        anuncios: `${req.protocol}://${req.get('host')}/anuncios/?codUsuario=${result.cod_usuario}`,
                        anuncios_favoritos: `${req.protocol}://${req.get('host')}/anuncios/favoritos/?codUsuario=${result.cod_usuario}`,
                        anuncios_avaliados: `${req.protocol}://${req.get('host')}/anuncios/avaliacoes/?codUsuario=${result.cod_usuario}`,
                    });

                } else if (req.dadosAuthToken.usuario && req.dadosAuthToken.usuario.cod_usuario == req.params.codUsuario){
                    // Chamada do Usuário dono do recurso.

                    return res.status(200).json({
                        conta: `${req.protocol}://${req.get('host')}/contas/?codUsuario=${result.cod_usuario}`,
                        usuario: result,
                        endereco: `${req.protocol}://${req.get('host')}/usuarios/enderecos/?codUsuario=${result.cod_usuario}`,
                        seguidos: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidos=${result.cod_usuario}`,
                        seguidores: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidores=${result.cod_usuario}`,
                        denunciados: `${req.protocol}://${req.get('host')}/usuarios/denuncias/?denunciados=${result.cod_usuario}`,
                        bloqueados: `${req.protocol}://${req.get('host')}/usuarios/bloqueios/?bloqueados=${result.cod_usuario}`,
                        animais: `${req.protocol}://${req.get('host')}/animais/?codDono=${result.cod_usuario}`,
                        momentos: `${req.protocol}://${req.get('host')}/momentos/?codUsuario=${result.cod_usuario}`,
                        postagens: `${req.protocol}://${req.get('host')}/postagens/?codUsuario=${result.cod_usuario}`,
                        postagens_avaliadas: `${req.protocol}://${req.get('host')}/postagens/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        anuncios: `${req.protocol}://${req.get('host')}/anuncios/?codUsuario=${result.cod_usuario}`,
                        anuncios_favoritos: `${req.protocol}://${req.get('host')}/anuncios/favoritos/?codUsuario=${result.cod_usuario}`,
                        anuncios_avaliados: `${req.protocol}://${req.get('host')}/anuncios/avaliacoes/?codUsuario=${result.cod_usuario}`,
                        candidaturas: `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?codUsuario=${result.cod_usuario}`,
                        conversas: `${req.protocol}://${req.get('host')}/conversas/?codUsuario=${result.cod_usuario}`
                    });

                }

            } else {
                return res.status(404).json({
                    mensagem: 'Nenhum usuário com esse ID foi encontrado.'
                });
            }

        })
        .catch((error) => {
            console.log(`GET: '/usuarios/:codUsuario' - Algo deu errado... \n`, error);
            return next( new Error('Algo inesperado aconteceu ao buscar os dados do usuário. Entre em contato com o administrador.') );
        });

    });

    router.patch('/:codUsuario', async (req, res, next) => {  /*, controller.usuario_updateOne*/

        if (req.params.codUsuario.match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos."
            });
        }

        // TODO... Limitar acesso apenas ao dono do recurso

        // Tratando alterações nos campos.
        // if (!req.headers['content-type'].includes('multipart/form-data')){

        //     let operacoes = {
        //         data_modificacao: moment().utc(true)
        //     };

        //     let allowedFields = [
        //         'primeiro_nome',
        //         'sobrenome',
        //         'cpf',
        //         'telefone',
        //         'data_nascimento',
        //         'descricao',
        //         'esta_ativo',
        //         'ong_ativo',
        //         'e_admin',
        //         'qtd_seguidores',
        //         'qtd_seguidos',
        //         'qtd_denuncias'
        //     ]

        //     // console.log('body', req.body);

        //     Object.entries(req.body).forEach((pair) => {
        //         if (allowedFields.includes(pair[0])){       // Não será possível modificar valores que não estiverem na lista "allowedFields" via Clientes.
        //             operacoes[pair[0]] = pair[1];
        //         }
        //     });

        //     // console.log('Operacoes de atualização: ', operacoes);

        //     return await Usuario.update(operacoes, { 
        //         where: { cod_usuario: req.params.codUsuario },
        //         limit: 1
        //     })
        //     .then((resultUpdate) => {

        //         // console.log(`PATCH: "/usuarios/${req.params.codUsuario}" - Os dados do usuário foram atualizados: `, resultUpdate);

        //         Usuario.findByPk(req.params.codUsuario, { raw: true })
        //         .then((resultFind) => {

        //             // console.log(`PATCH: "/usuarios/${req.params.codUsuario}" - Enviando os dados atualizados do usuário: `, resultFind);
        //             return res.status(200).json({
        //                 mensagem: 'Os dados do usuário foram atualizados com sucesso.',
        //                 usuario: resultFind
        //             })

        //         })
        //         .catch((error) => {

        //             // console.log(`PATCH: "/usuarios/${req.params.codUsuario}" - Algo inesperado aconteceu ao buscar os dados atualizados do usuário: `, error);
        //             return next( new Error('Algo inesperado aconteceu ao buscar os dados atualizados do usuário. Entre em contato com o administrador.') );

        //         })

        //     })
        //     .catch((errorUpdate) => {

        //         // console.log(`PATCH: "/usuarios/${req.params.codUsuario}" - Algo inesperado aconteceu: `, errorUpdate);
        //         return next( new Error('Algo inesperado aconteceu ao atualizar os dados do usuário. Entre em contato com o administrador.') );

        //     })

        // }
        // Fim do tratamento de alterações nos campos.

        // Tratando alterações nos arquivos (Imagens).
        if (req.headers['content-type'].includes('multipart/form-data')){

            if (Number(req.headers['content-length']) > (1.5 * 1024 * 1024)){
                req.pause();
                return res.status(413).json({
                    mensagem: 'O arquivo é grande demais. Suportamos arquivos de até 1mb.'
                });
            }
            
            let storage = multer.diskStorage({
                destination: (req, file, cb) => {
                    cb(null, path.resolve(__dirname, '../uploads/tmp'))
                },
                filename: (req, file, cb) => {
                    cb(null, `avatar_${uuid.v4()}${path.extname(file.originalname)}`)
                }
            })

            uploadHandler = multer({
                storage: storage,
                limits: {
                    fileSize: 1.5 * 1024 * 1024,
                    files: 1,
                    fields: 0
                },
                fileFilter: (req, file, cb) => {
                    let validMimes = [      
                        'image/jpeg',
                        'image/gif',
                        'image/png',
                        'image/bmp'
                    ];

                    if (!validMimes.includes(file.mimetype)){
                        console.log('O mimetype é inválido!');
                        req.pause();
                        res.status(406).json({
                            mensagem: 'Arquivo inválido, não aceitamos esse mimetype.'
                        })
                        return cb(null, false);
                    }
                    // Os problemas abaixo só aparecem quando utilizamos a Ferramenta de Desenvolvedor de um navegador para diminuir a velocidade da internet...
                    // Possível Problema 01: Mesmo parando a request, a "cb" Só dispara quando o servidor termina o download do arquivo. Só então a resposta é enviada.
                    // Possível Problema 02: A única forma de parar o upload no front-end prematuramente aparenta ser chamando "req.destroy()" que não entrega uma resposta, mas um erro de Network(net::ERR_CONNECTION_ABORTED).
                    
                    cb(null, true)

                }
            }).fields([
                { name: 'foto_usuario', maxCount: 1 },
                { name: 'background_perfil', maxCount: 1}
            ]);

            uploadHandler(req, res, (err) => {
                if (err instanceof multer.MulterError){
                    return console.log('multerError:', err);
                } else if (err) {
                    return console.log('commonErr: ', err)
                }

                console.log('body', req.body)
                console.log('files', req.files)
                console.log('All green');

            })

        }
        // Fim do tratamento de alterações nos arquivos (Imagens).
        

        // console.log('headers: ', req.headers);
        // console.log('body: ', req.body);

    });

    // router.delete('/:codUsuario'/*, controller.usuario_deleteOne*/);

// Exportação.
    module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
