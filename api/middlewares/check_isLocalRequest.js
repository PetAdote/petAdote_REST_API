// Importações.

// Exportações.
/**
 * @description Só permite o avanço na requisição se o IP requisitante for do host local. Útil para end-points que servem arquivos estáticos.
 */
module.exports = (req, res, next) => {
    if (req.socket.localAddress === req.socket.remoteAddress){
        next();
    } else {
        return res.status(404).end();
    }
}