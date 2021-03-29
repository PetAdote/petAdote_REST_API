// Importações
    const crypto = require('crypto');

// Geração de Chaves
    const keys = [];
    for (let i = 0; i < 5; i++){
        keys.push(crypto.randomBytes(32).toString('hex'));
    }

    // Lista de chaves com 256 bits. Úteis como Secret para nossos JWTs.
    console.table(keys);

// Fim da geração de chaves - Execute com "node ./path/to/generate_keys.js"