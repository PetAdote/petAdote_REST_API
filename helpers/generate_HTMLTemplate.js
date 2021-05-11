// Importações.

    const ejs = require('ejs');

// Exportações.
/**
 * 
 * @param {*} dataObj 
 * @param {*} pathToTemplate 
 * @returns Uma representação em String do seu template HTML criado com a Template Engine EJS.
 */
module.exports = async (dataObj, pathToTemplate) => {

    return new Promise ((resolve, reject) => {

        ejs.renderFile(pathToTemplate, { dataObj }, async (error, html) => {
            if (error) { return reject(new Error(error)); };
            return resolve(html);                    
        });

    });

};