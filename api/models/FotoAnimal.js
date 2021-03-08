// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

const moment = require('moment-timezone');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'FotoAnimal' para 'tbl_foto'.
    const FotoAnimal = connection.define('FotoAnimal', {

        cod_foto_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true,     // Unique pois cada animal terá apenas um Álbum.
            references: { model: Model.Animal, key: 'cod_animal' }
        },
        cod_album_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
            references: { model: Model.AlbumAnimal, key: 'cod_album_animal' }
        },
        nome_unico_foto: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        descricao: { type: DataTypes.STRING(255) },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true).format() }

    }, {
        tableName: 'tbl_foto_animal',
    });

// Exportação.
module.exports = FotoAnimal;