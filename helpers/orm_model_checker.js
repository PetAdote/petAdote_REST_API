// Importações.
    const PerfilUsuario = require('../api/models/PerfilUsuario');
    const AcessoLocal = require('../api/models/AcessoLocal');
    const AcessoFacebook = require('../api/models/AcessoFacebook');
    const AcessoGoogle = require('../api/models/AcessoGoogle');
    const EnderecoUsuario = require('../api/models/EnderecoUsuario');

    const Animal = require('../api/models/Animal');
    const AlbumAnimal = require('../api/models/AlbumAnimal');
    const FotoAnimal = require('../api/models/FotoAnimal');

    const Anuncio = require('../api/models/Anuncio');
    const Momento = require('../api/models/Momento');
    const Postagem = require('../api/models/Postagem');
    const FotoPostagem = require('../api/models/FotoPostagem');

    const AvaliacaoPostagem = require('../api/models/AvaliacaoPostagem');
    const AvaliacaoAnuncio = require('../api/models/AvaliacaoAnuncio');
    const AnuncioFavorito = require('../api/models/AnuncioFavorito');
    const Candidatura = require('../api/models/Candidatura');
    const Seguida = require('../api/models/Seguida');
    const Conversa = require('../api/models/Conversa');
    const Resposta = require('../api/models/Resposta');
    const AnexoResposta = require('../api/models/AnexoResposta');
    const Denuncia = require('../api/models/Denuncia');
    const Bloqueio = require('../api/models/Bloqueio');

// Exportação da função de verificação de cada um dos Models.
module.exports = () => {
    PerfilUsuario.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/PerfilUsuario] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/PerfilUsuario] Erro: ', error);
    });

    AcessoLocal.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/AcessoLocal] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/AcessoLocal] Erro: ', error);
    });

    AcessoFacebook.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/AcessoFacebook] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/AcessoFacebook] Erro: ', error);
    });

    AcessoGoogle.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/AcessoGoogle] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/AcessoGoogle] Erro: ', error);
    });

    EnderecoUsuario.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/EnderecoUsuario] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/EnderecoUsuario] Erro: ', error);
    });

    Animal.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Animal] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Animal] Erro: ', error);
    });

    AlbumAnimal.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/AlbumAnimal] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/AlbumAnimal] Erro: ', error);
    });

    FotoAnimal.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/FotoAnimal] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/FotoAnimal] Erro: ', error);
    });

    Anuncio.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Anuncio] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Anuncio] Erro: ', error);
    });

    Momento.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Momento] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Momento] Erro: ', error);
    });

    Postagem.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Postagem] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Postagem] Erro: ', error);
    });

    FotoPostagem.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/FotoPostagem] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/FotoPostagem] Erro: ', error);
    });

    AvaliacaoPostagem.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/AvaliacaoPostagem] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/AvaliacaoPostagem] Erro: ', error);
    });

    AvaliacaoAnuncio.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/AvaliacaoAnuncio] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/AvaliacaoAnuncio] Erro: ', error);
    });

    AnuncioFavorito.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/AnuncioFavorito] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/AnuncioFavorito] Erro: ', error);
    });

    Candidatura.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Candidatura] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Candidatura] Erro: ', error);
    });

    Seguida.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Seguida] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Seguida] Erro: ', error);
    });

    Conversa.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Conversa] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Conversa] Erro: ', error);
    });

    Resposta.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Resposta] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Resposta] Erro: ', error);
    });

    AnexoResposta.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/AnexoResposta] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/AnexoResposta] Erro: ', error);
    });

    Denuncia.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Denuncia] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Denuncia] Erro: ', error);
    });

    Bloqueio.findAll({ raw: true, limit: 1 }).then((result) => {
        console.log('[ORM/Bloqueio] Resultado: ', result);
    }).catch((error) => {
        console.log('[ORM/Bloqueio] Erro: ', error);
    });
}