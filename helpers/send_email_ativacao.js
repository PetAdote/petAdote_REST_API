// Importações.
    const nodemailer = require('nodemailer');   // "nodemailer" para enviar as mensagens utilizando o protocolo Simple Mail Transfer Protocol (SMTP)

// Exportações.

/**
 * @param {object} tokenAtivacao Token Temporário de Ativação da conta do usuário.
 * @param {string} email O e-mail do usuário requisitante.
 * @description Retornará uma mensagem de sucesso caso o e-mail contendo o Token temporário de ativação da conta for enviado, caso algo inesperado aconteça enviará o motivo da falha.
 */
module.exports = async (tokenAtivacao, email) => {

    // Verificação dos Parâmetros.
    let requiredFields = [
        'token',
        'data_expiracao'
    ];

    let missingFields = [];

    // Verificando se o objeto recebido contém os dados necessários.
    requiredFields.forEach((field) => {
        if (!Object.keys(tokenAtivacao).includes(field)){
            missingFields.push(field);
        }
    });

    if (missingFields.length > 0){
        // console.log('missingFields detectados, campos obrigatórios estão faltando.');

        let customErr = new Error('Campos inválidos ou incompletos foram detectados no 1º parâmetro.');
        customErr.status = 400;
        customErr.code = 'INVALID_REQUEST_FIELDS';
        customErr.missing_fields = missingFields;

        throw customErr;

        // return res.status(400).json({
        //     mensagem: 'Campos inválidos ou incompletos foram detectados.',
        //     code: 'INVALID_REQUEST_FIELDS',
        //     missing_fields: missingFields
        // });
    }
    // Fim da Verificação dos Parâmetros.

    // Normalização dos parâmetros.
    email = String(email).trim();   // Remove espaços excessivos.
    // Fim da normalização dos parâmetros.

    // Início das configurações do Nodemailer para enviar o e-mail.
    try{

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.G_MAIL,
                pass: process.env.G_MAIL_PASS
            }
        });

        const mailOptions = {
            from: `Sistemas PetAdote 🐾 <${process.env.G_OAUTH2_MAIL}>`,
            to: `${email}`,
            subject: 'A Chave de Ativação da sua conta Pet Adote chegou.',
            text: `Ao fazer o primeiro acesso, utilize o código abaixo para realizar a ativação da sua conta, mas atenção, essa chave só dura até às ${tokenAtivacao.data_expiracao.toLocaleTimeString()} do dia ${tokenAtivacao.data_expiracao.toLocaleDateString()}. Chave de Ativação: ${tokenAtivacao.token}`,
            html: `
            <div style="font-family: sans-serif">
                <h1 style="text-align: center">Ativação da conta Pet Adote.</h1>
                <hr>
                <div style="padding: 0px 10px; font-size: 13pt;">
                    <p>Ao fazer o primeiro acesso, utilize o código abaixo para realizar a ativação da sua conta.</p>
                    <p>Mas <b>atenção</b>, essa chave só funciona até às <b>${tokenAtivacao.data_expiracao.toLocaleTimeString()}</b> do dia <b>${tokenAtivacao.data_expiracao.toLocaleDateString()}</b>.</p>
                    <h2><strong>Chave de Ativação: ${tokenAtivacao.token}</strong></h2>
                </div>
                <hr>
            </div>`
        }

        await transport.sendMail(mailOptions);

        return String('E-mail enviado com sucesso');
        
        // res.status(200).json({
        //     mensagem: 'E-mail enviado com sucesso.'
        // });

    } catch (error) {
        console.error('Algo inesperado aconteceu ao enviar o e-mail do Token de Ativação da conta do usuário.', error);

        let customErr = new Error('Algo inesperado aconteceu ao enviar o e-mail do Token de Ativação da conta do usuário. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR';

        throw customErr;

        // let customErr = new Error('Algo inesperado aconteceu ao enviar o e-mail do Token de Ativação da conta do usuário. Entre em contato com o administrador.');
        // customErr.status = 500;
        // customErr.code = 'INTERNAL_SERVER_ERROR';

        // return next( customErr );
        
    }
    // Fim das configurações de envio do e-mail.

}