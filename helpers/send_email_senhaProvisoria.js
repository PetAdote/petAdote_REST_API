// Importações.
    const nodemailer = require('nodemailer');   // "nodemailer" para enviar as mensagens utilizando o protocolo Simple Mail Transfer Protocol (SMTP)

// Exportações.

/**
 * @param {string} senhaProvisoria Senha provisória do usuário.
 * @param {string} email O e-mail do usuário requisitante.
 * @description Retornará uma mensagem de sucesso caso o e-mail contendo a senha provisória do usuário for enviada, caso algo inesperado aconteça enviará o motivo da falha.
 */
module.exports = async (senhaProvisoria, email) => {

    // Normalização dos parâmetros.
        senhaProvisoria = String(senhaProvisoria).trim();
        email = String(email).trim();
    // Fim da normalização dos parâmetros.

    // Verificação dos Parâmetros.
    
        if (senhaProvisoria.length != 16){
            let customErr = new Error('A senha provisória que será informada no e-mail deve possuir 16 caracteres.');
            customErr.status = 400;
            customErr.code = 'INVALID_PARAM';

            throw customErr;
        }

        if (!email.match(/^([\w\d-+.]{1,64})(@[\w\d-]+)((?:\.\w+)+)$/g)){
            let customErr = new Error('O e-mail está em um formato inválido.');
            customErr.status = 400;
            customErr.code = 'INVALID_PARAM';

            throw customErr;
        }

    // Fim da Verificação dos Parâmetros.

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
            subject: 'A senha provisória da sua conta Pet Adote chegou.',
            text: `Recuperação de senha da conta Pet Adote. A senha da sua conta Pet Adote foi redefinida. Recomendamos que você altere sua senha para uma senha de sua preferência ao acessar sua conta após essa redefinição. Senha provisória: ${senhaProvisoria}`,
            html: `
            <div style="font-family: sans-serif">
                <h1 style="text-align: center">Recuperação de senha da conta Pet Adote.</h1>
                <hr>
                <div style="padding: 0px 10px; font-size: 13pt;">
                    <p>A senha da sua conta Pet Adote foi redefinida.</p>
                    <p>Recomendamos que você altere sua senha para uma senha forte de sua preferência ao acessar sua conta.</p>
                    <br>
                    <p>• Senha provisória: <strong>${senhaProvisoria}</strong></p>
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
        console.log('Algo inesperado aconteceu ao enviar o e-mail com a senha provisória da conta do usuário.', error);

        let customErr = new Error('Algo inesperado aconteceu ao enviar o e-mail com a senha provisória da conta do usuário. Entre em contato com o administrador.');
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