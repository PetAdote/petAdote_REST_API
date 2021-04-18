// Exportações.
/**
 * @description Verifica o IP do requisitante, e o momento no qual a requisição foi feita.
 */
module.exports = (req, res, next) => {
    console.log(`This IP made a call: ${req.ip?.replace(/^.*:/, '')} @ ${new Date().toLocaleString()}`);
    next();
};