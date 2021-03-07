// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

const moment = require('moment-timezone');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'AlbumAnimal' para 'tbl_album'.
    const AlbumAnimal = connection.define('AlbumAnimal', {

        cod_album_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true,     // Unique pois cada animal terá apenas um Álbum.
            references: { model: Model.Animal, key: 'cod_animal' }
        },
        titulo_album: { type: DataTypes.STRING(100), allowNull: false },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true) }

    }, {
        tableName: 'tbl_album_animal',
    });

// Exportação.
module.exports = AlbumAnimal;