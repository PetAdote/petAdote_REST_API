// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'AvaliacaoPostagem' para 'tbl_avaliacao_postagem'.
    const AvaliacaoPostagem = connection.define('AvaliacaoPostagem', {

        cod_avaliacaoPostagem: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_postagem: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Postagem, key: 'cod_postagem' }
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        }

    }, {
        tableName: 'tbl_avaliacao_postagem',
    });

// Exportação.
module.exports = AvaliacaoPostagem;