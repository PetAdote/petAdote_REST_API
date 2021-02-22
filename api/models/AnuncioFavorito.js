// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'AnuncioFavorito' para 'tbl_anuncio_favorito'.
    const AnuncioFavorito = connection.define('AnuncioFavorito', {

        cod_anuncioFav: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_anuncio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Anuncio, key: 'cod_anuncio' }
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        }

    }, {
        tableName: 'tbl_anuncio_favorito',
    });

// Exportação.
module.exports = AnuncioFavorito;