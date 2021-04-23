// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Candidatura' para 'tbl_candidatura'.
    const Candidatura = connection.define('Candidatura', {

        cod_candidatura: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_anuncio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Anuncio, key: 'cod_anuncio' }
        },
        cod_candidato: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        estado_candidatura: { type: DataTypes.ENUM('Em avaliacao', 'Candidatura aceita', 'Candidatura rejeitada'), allowNull: false, defaultValue: 'Em avaliacao' },
        ativo: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_candidatura',
    });

// Exportação.
module.exports = Candidatura;