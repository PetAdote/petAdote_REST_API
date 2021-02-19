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
        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        data_candidatura: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        estado_candidatura: { type: DataTypes.ENUM('Em avaliação', 'Candidatura aceita', 'Candidatura rejeitada'), allowNull: false, defaultValue: 'Em avaliação' }

    }, {
        tableName: 'tbl_candidatura',
    });

// Exportação.
module.exports = Candidatura;