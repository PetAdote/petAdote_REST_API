// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'AvaliacaoAnuncio' para 'tbl_avaliacao_anuncio'.
    const AvaliacaoAnuncio = connection.define('AvaliacaoAnuncio', {

        cod_avaliacaoAnuncio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_anuncio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Anuncio, key: 'cod_anuncio' }
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        }

    }, {
        tableName: 'tbl_avaliacao_anuncio',
    });

// Exportação.
module.exports = AvaliacaoAnuncio;