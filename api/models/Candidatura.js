// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

const moment = require('moment-timezone');

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
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        data_candidatura: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true) },
        estado_candidatura: { type: DataTypes.ENUM('Em avaliação', 'Candidatura aceita', 'Candidatura rejeitada'), allowNull: false, defaultValue: 'Em avaliação' }

    }, {
        tableName: 'tbl_candidatura',
    });

// Exportação.
module.exports = Candidatura;