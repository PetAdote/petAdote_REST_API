// Importações.
    const express = require('express');
    const router = express.Router();
    
// const controller = require('../controllers/contas');   // TODO...

    // Importação dos Models...

        const Usuario = require('../models/Usuario');
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

// TODO... A maioria dessas importações irão para os controllers. Estão aqui só durante a fase inicial de testes.

// Rotas.
router.get('/', (req, res, next) => {

    // Instância do EventEmitter dessa rota - Permite o uso de custom listeners nessa rota.
    const customListeners = new EventEmitter();

    // Caso 01 - Se apenas "codUsuario" for passado na Query String...
    if ((req.dadosCliente && req.dadosCliente.tipo_cliente === 'Pet Adote') && req.query.codUsuario){

        if (req.query.codUsuario.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos."
            });
        }

        // Custom Listeners.
        customListeners.on('gotContaDoUsuario', (conta) => {    // Listener disparado quando uma query encontra a conta desse usuário.
            res.status(200).json({
                mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                conta: conta,
                usuario: `${req.protocol}://${req.get('host')}/usuarios/${conta.cod_usuario}`,
            });
        });

        let buscasConcluidas = 0;
        customListeners.on('contaNotFound', () => {     // Listener disparado quando uma query não encontra a conta desse usuário.
            buscasConcluidas ++;
            if (buscasConcluidas >= 3){
                res.status(404).json({
                    mensagem: 'Este ID de Usuário não existe.',
                    lista_usuarios: `${req.protocol}://${req.get('host')}/usuarios/`,
                });
            }
        });
        // Fim dos Custom Listeners.

        try {   // Buscando Conta com base na Foreign Key (cod_usuario) do Usuário.

            ContaLocal.findOne({ attributes: ['email', 'email_recuperacao', 'cod_usuario' ], where: { cod_usuario: req.query.codUsuario }, raw: true })
            .then((result) => {
                result ? customListeners.emit('gotContaDoUsuario', result) : customListeners.emit('contaNotFound');
            });

            ContaFacebook.findOne({ where: { cod_usuario: req.query.codUsuario }, raw: true })
            .then((result) => {
                result ? customListeners.emit('gotContaDoUsuario', result) : customListeners.emit('contaNotFound');
            });

            ContaGoogle.findOne({ where: { cod_usuario: req.query.codUsuario }, raw: true })
            .then((result) => {
                result ? customListeners.emit('gotContaDoUsuario', result) : customListeners.emit('contaNotFound');
            })

        } catch (error) {
            console.error('[/contas/?codUsuario=] Algo inesperado aconteceu ao buscar a conta de um usuário.\n', error);
            return next( new Error('Algo inesperado aconteceu ao buscar a conta de um usuário. Entre em contato com o administrador.'));
        }

        return; // Caso tudo dê certo nas condições acima, conclua.

    }

    // Caso 02 - Se "tipoConta & chaveConta" forem passados na Query String. 
    //           "tipoConta" deverá ser passado também, não podemos pesquisar apenas por "chaveConta" pois em casos extremos os IDs dos provedores sociais podem acabar entrando em conflito. 

    if ((req.dadosCliente && req.dadosCliente.tipo_cliente === 'Pet Adote') && req.query.tipoConta && req.query.chaveConta){

        switch(req.query.tipoConta){
            case 'local':

                return ContaLocal.findByPk(req.query.chaveConta, { attributes: ['email', 'email_recuperacao', 'cod_usuario'], raw: true })
                .then((result) => {
                    if (result) {
                        res.status(200).json({
                            mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                            conta: result,
                            usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`,
                        });
                    } else {
                        res.status(404).json({
                            mensagem: 'Nenhuma conta com esse e-mail foi encontrada.'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário com cadastro local.\n', error);
                    return next( new Error('Algo inesperado aconteceu ao buscar os dados de um usuário com cadastro local. Entre em contato com o administrador.') );
                });

                break;
            case 'facebook':

                return ContaFacebook.findByPk(req.query.chaveConta, { raw: true })
                .then((result) => {
                    if (result) {
                        res.status(200).json({
                            mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                            conta: result,
                            usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`,
                        });
                    } else {
                        res.status(404).json({
                            mensagem: 'Nenhuma conta cadastrada via Facebook com esse ID foi encontrada.'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário cadastrado via Facebook.\n', error);
                    return next( new Error('Algo inesperado aconteceu ao buscar os dados do usuário cadastrado via Facebook. Entre em contato com o administrador.') );
                });

                break;
            case 'google':

                return ContaGoogle.findByPk(req.query.chaveConta, { raw: true })
                .then((result) => {
                    if (result) {
                        res.status(200).json({
                            mensagem: 'Conta encontrada, para mais informações acesse os dados do usuário.',
                            conta: result,
                            usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`,
                        });
                    } else {
                        res.status(404).json({
                            mensagem: 'Nenhuma conta cadastrada via Google com esse ID foi encontrada.'
                        });
                    };
                })
                .catch((error) => {
                    console.error('[/contas/?tipoConta=&chaveConta=] Algo inesperado ocorreu ao buscar os dados de um usuário cadastrado via Google.\n', error);
                    return next( new Error('Algo inesperado aconteceu ao buscar os dados de um usuário cadastrado via Google. Entre em contato com o administrador.') );
                });

                break;
            default:
                return res.status(400).json({
                    mensagem: 'Busca de conta inválida...',
                    exemplo: `${req.protocol}://${req.get('host')}/contas/?tipoConta=['local', 'facebook', 'google']&chaveConta=['email', 'ids sociais']`
                });
                break;
        };

    };

    // Caso 03 - Se nada for passado na Query String ou Cliente não estiver autenticado (Temporário, todo cliente deverá estar autenticado para usar esta REST API).
    Promise.all([
        ContaLocal.findAndCountAll({ attributes: ['email'], raw: true }),
        ContaFacebook.findAndCountAll({ attributes: ['cod_facebook'], raw: true }),
        ContaGoogle.findAndCountAll({ attributes: ['cod_google'], raw: true })
    ])
    .then((resultArr) => {

        let dadosContas = {}

        dadosContas.total_contas = (resultArr[0].count + resultArr[1].count + resultArr[2].count);

        if (dadosContas.total_contas === 0 ){       // Se nenhuma conta está registrada...
            return res.status(200).json({
                mensagem: 'Nenhuma conta está cadastrada.',
            });
        }

        dadosContas.total_contas_locais = resultArr[0].count;
        dadosContas.total_contas_facebook = resultArr[1].count;
        dadosContas.total_contas_google = resultArr[2].count;

        if (req.dadosCliente && req.dadosCliente.tipo_cliente === 'Pet Adote'){     // Se o Cliente autenticado é do tipo Pet Adote - Mostre a lista de contas com senhas (Criptografadas) e detalhes.

            dadosContas.contas = [];

            resultArr[0].rows.forEach((row) => {
                row.tipo_conta = 'local';
                row.detalhes = `${req.protocol}://${req.get('host')}/contas/?tipoConta=${row.tipo_conta}&chaveConta=${row.email}`,
                dadosContas.contas.push(row);
            });

            resultArr[1].rows.forEach((row) => {
                row.tipo_conta = 'facebook';
                row.detalhes = `${req.protocol}://${req.get('host')}/contas/?tipoConta=${row.tipo_conta}&chaveConta=${row.cod_facebook}`,
                dadosContas.contas.push(row);
            });

            resultArr[2].rows.forEach((row) => {
                row.tipo_conta = 'google';
                row.detalhes = `${req.protocol}://${req.get('host')}/contas/?tipoConta=${row.tipo_conta}&chaveConta=${row.cod_google}`,
                dadosContas.contas.push(row);
            });

            return res.status(200).json({
                mensagem: 'Dados das contas dos usuários.',
                total_contas: dadosContas.total_contas,
                total_contas_locais: dadosContas.total_contas_locais,
                total_contas_facebook: dadosContas.total_contas_facebook,
                total_contas_google: dadosContas.total_contas_google,
                contas: dadosContas.contas
            });

        } else {    // Se o Cliente for de qualquer outro tipo - Exiba apenas meta-dados sobre as contas.       ( RESTRIÇÃO EM TESTE )

            res.status(200).json({
                mensagem: 'Dados das contas dos usuários.',
                total_contas: dadosContas.total_contas,
                total_contas_locais: dadosContas.total_contas_locais,
                total_contas_facebook: dadosContas.total_contas_facebook,
                total_contas_google: dadosContas.total_contas_google
            });

        }

    })
    .catch((error) => {

        console.error('[GET: /contas/] Algo inesperado aconteceu ao buscar os dados das contas dos usuários.\n', error);
        return next( new Error('Algo inesperado aconteceu ao buscar os dados das contas dos usuários. Entre em contato com o administrador.') );

    });

    
});

router.post('/', (req, res, next) => {   // Cria os dados básicos do usuário: Conta, dados, endereço.

    /*  Validação do tamanho do conteúdo do Request via Headers. (Verifica apenas o Content-Length - Header que pode ser adulterado por usuários mal intencionados)
        Se essa validação permitir que o arquivo passe, o Formidable vai iniciar o download do arquivo...

        Porém a mesma restrição é aplicada diretamente na verificação do progresso do upload, se o progresso ultrapassar o limite de tamanho
        o usuário receberá uma mensagem de falha com Status 413 (Payload Too Large). */
    if (Number(req.headers['content-length']) > (1.5 * 1024 * 1024)){
        req.pause();
        res.status = 400;
        return res.json({
            mensagem: 'O arquivo é grande demais. Suportamos arquivos de até 1mb.'
        });
    }

    //  Instância de recebimento de um formulário (multipart/form-data) com o Formidable.
    const incomingForm = new formidable.IncomingForm({ 
        uploadDir: path.resolve(__dirname, '../uploads/tmp'),
        maxFileSize: 1 * 1024 * 1024,                           // Limita o tamanho do arquivo em Megabytes. Envia um erro.
        keepExtensions: true 
    });


    /*  'fileFieldName' vai receber o nome do campo de arquivo do formulário que iniciou essa requisição.
        Isso será extremamente importante para acessarmos diretamente os dados do arquivo enviado em um objeto, diminuindo redundâncias. 
        Essa parte é atribuída ao detectar um arquivo no Chunk do Buffer de Request do Multipart/form-data.
        Lembrando que receberemos apenas 1 arquivo nessa rota. */

    var fileFieldName = undefined;    
    


    /*  Sobrescrevendo o tratamento do Formidable sobre o Buffer enviado pelo formulário do tipo Multipart/form-data...
        Essa parte é similar à um Event Listener para cada "Chunk" do Buffer do Request e só é executada se a função "parse" do Formidable estiver presente. */
    incomingForm.onPart = (part) => {
        let validMimes = [
            "image/jpeg",
            "image/gif",
            "image/png",
            "image/bmp"
        ];

        if(part.mime !== null && !validMimes.includes(part.mime)){

            console.log('Nome Original do arquivo inválido: ', part.filename);
            console.log('Mimetype do arquivo inválido: ', part.mime);

            req.pause();                                                                            // Pausa a Request Stream.
            return res.status(406).json({                                                           // Retorna uma mensagem "return" evita a execução de processos posteriores.
                mensagem: 'O arquivo não aparenta ser uma imagem. Por favor, envie uma imagem.'
            });
            // FINALMENTE UM MÉTODO EFICAZ DE ENVIAR UMA MENSAGEM E ACABAR COM A REQUEST \o/

        }
        
        if (part.filename === ''){
            return false;                   // Se a parte enviar um campo de arquivo vazio/nulo... Simplesmente ignoramos.
        }

        if(part.filename !== undefined){    // É necessário pegar o nome do campo que enviou o arquivo para facilitar o tratamento dos dados posteriormente.
            fileFieldName = part.name;
            console.log('fileFieldName: ', part.name);
        }

        incomingForm.handlePart(part);  // É importante deixar que o Formidable gerencie as outras partes da Stream do Buffer da requisição.

    };

    /*  Nesse ponto a requisição terá concluído a recepção do Buffer e poderemos analisar/efetivar os dados.
        Inclusive, aqui podemos tratar erros específicos ou desconhecidos.
        
        O ideal é fazer os processamentos/efetivação dos dados na finalização do tratamento do Formidable.  */
    incomingForm.parse(req, (err, fields, files) => {
        if (err) {

            if(err.message.indexOf('maxFileSize exceeded') !== -1){
                console.log('Parser Error: Arquivo grande demais sendo limitado!')

                req.pause();
                return res.status(413).json({
                    mensagem: 'ParseError: O tamanho do arquivo enviado é grande demais. Aceitamos arquivos de até 1mb.'
                });
                
            }

            console.log('Parser Error: ', err.message);

        }

        console.log('Fields: ', fields);
        console.log('Files: ', files[fileFieldName] ? files[fileFieldName].name : files);

        req.body.fields = fields;
        req.body.files = files[fileFieldName] ? files[fileFieldName] : files;
    })

    /*  Verificação do Progresso do Upload do multipart/form-data.
        Pode ser utilizada para criar barras de progresso.          */

    incomingForm.on('progress', (bytesReceived, bytesExpected) => {
        if (bytesReceived === 0){
            console.log('bytesExpected: ', bytesExpected);
        }
        console.log('bytesReceived: ', bytesReceived);
    })
    
    /*  Após as validações do "incomingForm.parse" terminarem temos certeza de que os dados estão em nossas mãos
        assim, podemos realizar qualquer procedimento posterior para efetivar esses dados na conta do usuário.       */
    incomingForm.on('end', () => {
        console.log('Body: ', req.body);

        /*  Realize o processamento da imagem e armazene ela no diretório final "imagens".
            Aqui é interessante verificar os binários do arquivo para identificar se realmente é uma imagem antes de fazer qualquer processamento nela.
            Se não o usuário forjou os dados e o arquivo não for uma imagem, envie a resposta de arquivos inválidos e remova o arquivo da pasta tmp.    */
        

        // Retorne a resposta após concluir tudo.
        res.status(200).json({
            mensagem: 'A entrega do formulário foi concluída em contas.js na REST API.'
        });
    })
    

});

// router.patch('/'/*, controller.conta_updateOne*/);

// router.delete('/'/*, controller.conta_deleteOne*/);

// Exportação.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
