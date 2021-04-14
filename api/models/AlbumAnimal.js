// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
        const Animal = require('./Animal');

// Definição do Model 'AlbumAnimal' para 'tbl_album'.
    const AlbumAnimal = connection.define('AlbumAnimal', {

        cod_album: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true,     // Unique pois cada animal terá apenas um Álbum.
            references: { model: Model.Animal, key: 'cod_animal' }
        },
        titulo: { type: DataTypes.STRING(100), allowNull: false },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_album_animal',
    });

    // Associações (FKs).
        AlbumAnimal.belongsTo(Animal, {
            foreignKey: {
                name: 'cod_animal',
                allowNull: false
            }
        });

        Animal.hasOne(AlbumAnimal, {
            foreignKey: {
                name: 'cod_animal',
                allowNull: false
            }
        });

// Exportação.
module.exports = AlbumAnimal;