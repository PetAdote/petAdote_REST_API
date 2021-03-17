// Importações.
    const jwt = require('jsonwebtoken');

    const nodemailer = require('nodemailer');   // "nodemailer" para enviar as mensagens utilizando o protocolo Simple Mail Transfer Protocol (SMTP)
    const { google } = require('googleapis');   // "googleapis" para gerenciar a autenticação OAuth2 na API necessária do Google.

// Exportações.

/**
 * @param {*} cod_usuario 
 * @param {number=} expirationTimeInMinutes
 * @description É necessário estar em uma rota com os parâmetros (request, response, next).
 */
module.exports = async (req, res, next, cod_usuario, expirationTimeInMinutes = 15) => {

    jwt.sign({
        cod_usuario: cod_usuario
    },
    process.env.JWT_MAILVALIDATION_KEY,
    { 
        expiresIn: Number.parseInt(expirationTimeInMinutes) * 60,  // O token de ativação da conta pós-login expira em 15 minutos.
    },
    async (error, mailToken) => {
        if (error) {
            console.log('Algo inesperado aconteceu ao preparar o endereço de ativação da conta do usuário.', error);

            let customErr = new Error('Algo inesperado aconteceu ao preparar o endereço de ativação da conta do usuário. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = "INTERNAL_SERVER_MODULE_ERROR";

            return next( customErr );
        }

        let dataAtual = new Date();
        let dataExpiracao = new Date(dataAtual.getTime() + expirationTimeInMinutes * 60 * 1000);

        // Início das configurações do Nodemailer para enviar o e-mail.
        try{

            const oAuth2Client = new google.auth.OAuth2(process.env.G_OAUTH2_MAIL_CLIENT_ID, process.env.G_OAUTH2_MAIL_CLIENT_SECRET, process.env.G_OAUTH2_MAIL_REDIRECT_URI);
            oAuth2Client.setCredentials({ refresh_token: process.env.G_OAUTH2_MAIL_REFRESH_TOKEN });

            const accessToken = await oAuth2Client.getAccessToken();

            const transport = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.G_OAUTH2_MAIL,
                    clientId: process.env.G_OAUTH2_MAIL_CLIENT_ID,
                    clientSecret: process.env.G_OAUTH2_MAIL_CLIENT_SECRET,
                    refreshToken: process.env.G_OAUTH2_MAIL_REFRESH_TOKEN,
                    accessToken: accessToken
                }
            });

            const mailOptions = {
                from: `Sistemas PetAdote 🐾 <${process.env.G_OAUTH2_MAIL}>`,
                to: `${process.env.G_OAUTH2_MAIL}`,
                subject: 'Email de teste',
                text: `Utilize o endereço abaixo para realizar a ativação da conta do usuário. Link de Ativação da conta: ${req.protocol}://${req.get('host')}/contas/ativacao/${mailToken}`,
                html: `<h1>Ativação da conta</h1>
                <p>Utilize o endereço abaixo para realizar a ativação da conta do usuário.</p>
                <p>Link de Ativação da conta: ${req.protocol}://${req.get('host')}/contas/ativacao/${mailToken}</p>`
            }

            await transport.sendMail(mailOptions)

            return res.status(200).json({
                mensagem: 'E-mail enviado com sucesso'
            });

        } catch (error) {
            console.log(error);
            
            return res.status(500).json({
                mensagem: 'Algo deu errado ao enviar o e-mail'
            });

        }
        // Fim das configurações de envio do e-mail.

        // return res.status(200).json({
        //     mensagem: 'Utilize o endereço abaixo para realizar a ativação da conta do usuário.',
        //     url_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/${mailToken}`,
        //     expira_em: dataExpiracao.toString()
        // })
    });

}
