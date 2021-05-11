// Importações.

    const puppeteer = require('puppeteer');

// Exportações.
/**
 * 
 * @param {*} htmlTemplate Uma representação em String de um HTML.
 * @param {*} newPDFPath Um path (caminho) até o diretório onde o arquivo será salvo, deve incluir o nome pro arquivo e a extensão ".pdf". Exemplo: "C:/projeto/caminho/para/um/novodocumento.pdf"
 */
module.exports = async (htmlTemplate, newPDFPath) => {

    try {

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.setContent(htmlTemplate);
        await page.emulateMediaType('screen');
        await page.pdf({ 
            path: newPDFPath,
            format: 'A4',
            printBackground: true
        });

        // console.log('PDF Gerado!');

        await browser.close();

    } catch (error) {

        throw new Error(error);

    }

}