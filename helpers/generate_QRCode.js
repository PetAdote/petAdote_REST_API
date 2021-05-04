// Importações.
    const QRCode = require('qrcode');

// Exportações.
/**
 * 
 * @param {*} data 
 * @returns Uma URI de Dados para o QR Code contendo os dados enviados via parâmetros.
 */
module.exports = async (data) => {

    return new Promise((resolve, reject) => {

        QRCode.toDataURL(data, (error, url) => {
            if (error) { return reject(new Error(error)); };
            return resolve(url);
        });

    });

}