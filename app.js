// Importações.

    // Framework.
        const express = require('express');     // Importa o framework express no arquivo.
        const app = express();                  // Inicializa o framework express em "app".

    // Conexões.
        const database = require('./configs/database');                 // Importação da conexão com o Banco de Dados MySQL via ORM Sequelize.
        const redisClient = require('./configs/redis_connection');      // Inicia a conexão com o Redis por meio do Client estabelecido em "./configs/redis_conn".

    // Middlewares.
        const { verifyAccessToken } = require('./helpers/manage_jwt');                              // Utiliza o módulo "jsonwebtoken" para verificar em cada requisição se uma rota possui restrições de acesso e se o Token de Acesso está presente nos Headers e é válido.
        const checkInactiveUserPermissions = require('./helpers/check_InactiveUserPermissions');    // Se o requisitante for o usuário de uma aplicação, determina se ele pode ou não requisitar algo à um end-point não-GET.
        const checkRequester = require('./helpers/check_requester');                                // Verifica o IP do requisitante.
        const manageCORS = require('./helpers/manage_cors');                                        // Gerencia as respostas de Cross-Origin Resource Sharing para navegadores.
        const checkLocalRequest = require('./api/middlewares/check_isLocalRequest');                // Verifica se a requisição veio do host local.

    // Utilidades.
        const logger = require('morgan');                                   // Logger/Profiler que trará informações sobre as requisições e respostas das nossas rotas.
                                                                            // Em todas as requisições, Morgan fará a análise e entregará dados sobre ela no console do servidor, por fim passará a requisição adiante.

        // const bodyParser = require('body-parser');                       // Módulo que nos permitirá analisar os campos codificados como (urlencoded) ou (json), enviados nas requisições.
        // const ormModelChecker = require('./helpers/check_orm_models');   // Helper que verifica os Models criados com a ORM para cada tabela no Banco de Dados.
        // const schedule = require('node-schedule');                       // Permite a utilização de Cron-jobs para realizar o agendamento de tarefas.

        const path = require('path');                                       // Facilita a aquisição de caminhos até certos diretórios e arquivos no sistema.

    // Agrupamento de Rotas.
        const rotaAutenticacoes = require('./api/routes/autenticacoes');

        // const rotaTestes = require('./api/routes/testes');

        const rotaContas = require('./api/routes/contas');
        const rotaUsuarios = require('./api/routes/usuarios');
            const rotaEnderecos = require('./api/routes/enderecos');
            const rotaAnimais = require('./api/routes/animais');
                const rotaAlbuns = require('./api/routes/animais_albuns');
                    const rotaFotos = require('./api/routes/animais_fotos');

        const rotaAnuncios = require('./api/routes/anuncios');
            const rotaCandidaturas = require('./api/routes/anuncios_candidaturas');

// Instânciamentos.

    // Conexão com o Banco de Dados MySQL.
        database.connection;            // Instância da conexão atual.
        database.checkConnection();     // Verificação da conexão.
        // ormModelChecker();           // Realiza um [ SELECT * ] limitado à 1 resultado em cada um dos models da lista "./api/models".

// Middlewares.
    app.use(checkRequester);
    app.use(logger('dev'));

    app.use(manageCORS);

    app.use(verifyAccessToken);

    app.use(checkInactiveUserPermissions);

    app.use(express.urlencoded({ extended: true }));     // Se false, não receberá "rich data" (Textos RTF???).
    app.use(express.json());                             // Extrai os campos da requisição no formato JSON para o objeto "req.body".

    app.use('/favicon.ico', express.static( path.resolve(__dirname, "./api/uploads/images/favicon.ico") ) );
    app.use('/styles.css', checkLocalRequest, express.static( path.resolve(__dirname, "./api/docs/templates/styles/bootstrap.css") ) );
    app.use('/styles.js', checkLocalRequest, express.static( path.resolve(__dirname, "./api/docs/templates/styles/bootstrap.bundle.js") ) );

// Rotas que vão gerenciar as requisições.
    app.get('/', async (req, res, next) => {
        // Rota livre para testes simples durante a fase de desenvolvimento.

        console.log('Oi, eu sou uma rota de testes!');

        const generate_QRCode = require('./helpers/generate_QRCode');
        const generate_Template = require('./helpers/generate_HTMLTemplate');
        const generate_PDF = require('./helpers/generate_PDF');

        try {

            const path_template = path.resolve(__dirname, './api/docs/templates', 'TemplateTest.ejs');
            const path_newPdf = path.resolve(__dirname, './api/docs/tmp', 'secondPdf.pdf');

            const qrc = await generate_QRCode('http://www.google.com/');

            const path_catImg = path.resolve(__dirname, './api/uploads/images/usersAnimalPhotos/', 'default_cat_01.jpeg');

            let dataObj = [
                {
                    qrcode: qrc,
                    catImg: 'http://localhost:3000/usuarios/animais/albuns/fotos/default_cat_01.jpeg'
                },
                {
                    styles: {
                        css_url:`${req.protocol}://${req.get('host')}/styles.css`, 
                        js_url: `${req.protocol}://${req.get('host')}/styles.js`
                    }
                }
            ]

            const template = await generate_Template(dataObj, path_template);

            await generate_PDF(template, path_newPdf);

        } catch (error) {
            
            console.error('Criação de PDF falhou', error);

            return res.status(500).json({
                mensagem: 'Algo deu errado'
            })
        }
        

        return res.status(200).json({
            mensagem: 'PDF criado com sucesso'
        });

        // ---------------------------------------------------------------------------------

        // const a = require('randomatic')('0', 5) + require('moment')().unix();
        // console.log(a);

        // const Candidatura = require('./api/models/Candidatura');
        // const Anuncio = require('./api/models/Anuncio');
        // const Usuario = require('./api/models/Usuario');
        // const Animal = require('./api/models/Animal');
        // const DocResponsabilidade = require('./api/models/DocResponsabilidade');
        // const PontoEncontro = require('./api/models/PontoEncontro');

        // let candidatura = await Candidatura.findOne({
        //     include: [{
        //         model: Anuncio,
        //         include: [{
        //             model: Usuario
        //         }, {
        //             model: Animal
        //         }]
        //     }, {
        //         model: Usuario
        //     }, {
        //         model: DocResponsabilidade,
        //         as: 'DocAnunciante'
        //     }, {
        //         model: DocResponsabilidade,
        //         as: 'DocCandidato'
        //     }, {
        //         model: PontoEncontro,
        //         required: false,
        //         where: {
        //             ativo: 1
        //         }
        //     }],
        //     where: { 
        //         cod_candidatura: 1
        //     }
        // });

        // candidatura = candidatura.get({ plain: true });

        // return res.status(200).json({
        //     candidatura
        // })

        // ---------------------------------------------------------------------------------
        
        // next();

        // Criação do QR CODE.

        // let QRCode = require('qrcode');
        
        // QRCode.toDataURL('http://localhost:3000/' , (error, url) => {
        //     console.log(url);
        // });

        // return res.status(200).json({
        //     mensagem: "QR CODE Feito!"
        // });

        // Fim da Criação do QR Code.

        // Criação do arquivo PDF utilizando HTML personalizado.

        // const fs = require('fs');
        // const path = require('path');

        // const generateQRCode = async (data) => {

        //     return new Promise((resolve, reject) => {

        //         const QRCode = require('qrcode');

        //         QRCode.toDataURL(data, (error, url) => {
        //             if (error) { return reject(new Error(error)); };
        //             return resolve(url);
        //         });

        //     });

        // }

        // const generateTemplate = async (dataObj, pathToTemplate) => {

        //     const ejs = require('ejs');

        //     return new Promise ((resolve, reject) => {

        //         ejs.renderFile(pathToTemplate, { dataObj }, async (error, html) => {
        //             if (error) { return reject(new Error(error)); };
        //             return resolve(html);                    
        //         });

        //     });

        // };

        // const generatePDF = async (htmlTemplate, newPDFPath) => {

        //     try {
        //         const puppeteer = require('puppeteer');

        //         const browser = await puppeteer.launch();
        //         const page = await browser.newPage();

        //         await page.setContent(htmlTemplate);
        //         await page.emulateMediaType('screen');
        //         await page.pdf({ 
        //             path: newPDFPath,
        //             format: 'A4',
        //             printBackground: true
        //         });

        //         console.log('PDF Gerado!');
        //         await browser.close();

        //     } catch (error) {
        //         console.error('PDF Generator error:', error);
        //     }

        // }

        // return (async () => { 

        //     try {

        //         const generateQRCode = require('./helpers/generate_QRCode');
        //         const generateTemplate = require('./helpers/generate_HTMLTemplate');
        //         const generatePDF = require('./helpers/generate_PDF');

        //         const theQRCode = await generateQRCode('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        //         let dataObj = [
        //             {
        //                 usuario: {
        //                     nome: 'Testencio',
        //                     idade: '18',
        //                     qrc: theQRCode
        //                 }
        //             },
        //             {
        //                 styles: {
        //                     css_url:`${req.protocol}://${req.get('host')}/styles.css`, 
        //                     js_url: `${req.protocol}://${req.get('host')}/styles.js`
        //                 }
        //             }
        //         ];

        //         const pathToTemplate = path.resolve(__dirname, './api/docs/templates', 'firstTemplate.ejs');
        //         const theHtmlTemplate = await generateTemplate(dataObj, pathToTemplate);

        //         const pdfPath = path.resolve(__dirname, './api/docs/tmp', 'firstPdf.pdf');
        //         await generatePDF(theHtmlTemplate, pdfPath);

        //         return res.status(200).json({
        //             mensagem: "PDF Feito!"
        //         });

        //     } catch (error) {
        //         console.error('PDF Generator error:', error);
        //     }

        // })();

        // Fim da criação do arquivo PDF utilizando HTML personalizado.

        // ---------------------------------------------------------------------------------
        
    });

    // app.use('/testes', rotaTestes);

    app.use('/autenticacoes', rotaAutenticacoes);

    app.use('/contas', rotaContas);

    // Entrega dos arquivos de imagem.
    app.use('/usuarios/animais/albuns/fotos', express.static( path.resolve(__dirname, "./api/uploads/images/usersAnimalPhotos") ) );
    app.use('/usuarios/avatars', express.static( path.resolve(__dirname, "./api/uploads/images/usersAvatar") ) );
    app.use('/usuarios/banners', express.static( path.resolve(__dirname, "./api/uploads/images/usersbanner") ) );
    // -------------------------------------------------------

    app.use('/usuarios/animais/albuns/fotos', rotaFotos);
    app.use('/usuarios/animais/albuns', rotaAlbuns);
    app.use('/usuarios/animais', rotaAnimais);
    app.use('/usuarios/enderecos', rotaEnderecos);
    app.use('/usuarios', rotaUsuarios);

    app.use('/anuncios/candidaturas', rotaCandidaturas);
    app.use('/anuncios', rotaAnuncios);

    /* Observações sobre Conflito de Rotas

       Três formas de resolver rotas conflitantes:
       Caso 01 - Se "/usuarios/" estiver acima de "/usuario/enderecos", use RegEx para a requisição adiante caso o parâmetro não fique de acordo com o dado esperado em "usuarios/:parametro").
       Caso 02 - Se não queira ou possa utilizar a solução acima, coloque as rotas mais específicas como "/usuarios/enderecos" ou "usuarios/anuncios" acima das menos específicas.
       Caso 03 - O uso de Nesting de Routers também é possível, porém apenas em casos como "/usuarios/:idUsuario/anuncios/:idAnuncio". Como estamos usando muitas Query Strings, isso não nos ajuda.
    */
 

// Middlewares Gerenciadores de Erros.

    // Se uma requisição procurou por uma rota que não existe na lista acima, entregaremos um erro 404 (Recurso não encontrado).
    app.use((req, res, next) => {  
        const error = new Error('Recurso não encontrado.');

        error.status = 404;     // Perceba que estamos atribuindo uma das propriedades de "Error", status, como 404 (Not found).
        error.code = 'RESOURCE_NOT_FOUND'

        next(error);            // Em situações onde erros existem, é necessário passá-lo como parâmetro para o middleware em "next();".
    });

    /* 
        Esse middleware trata erros enviados via "next()" durante os blocos [ catch ] das rotas acima.

        É extremamente útil quando você não sabe exatamente qual tipo de erro pode acontecer em um processamento nas rotas,
        quando aplicado nos blocos [ catch ], permite capturar esses erros inesperados.

        A utilização de um middleware com 4 parâmetros é uma característica dos Error Handlers do Express.
    */
    app.use((error, req, res, next) => {    // Perceba: Middleware com 4 parâmetros, o 1º sendo "error".

        console.error('Um erro inesperado ocorreu!\n', error);

        req.pause();
        res.status(error.status || 500);    // Se o erro gerado não apresentar um código de status http, use 500 - (Internal Server Error).

        res.json({      // Aqui é a resposta que entregaremos à aplicação em caso de erro, pode ser personalizada.

            error: {
                mensagem: error.message,  // O atributo "message" de erros quase sempre estara presente, não gerando exceções.
                code: error.code || null
            }

        });

    })

// Exportação.
    module.exports = app;