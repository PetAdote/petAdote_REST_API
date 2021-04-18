// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
        const AlbumAnimal = require('./AlbumAnimal');

// Definição do Model 'FotoAnimal' para 'tbl_foto'.
    const FotoAnimal = connection.define('FotoAnimal', {

        uid_foto: { type: DataTypes.STRING(255), allowNull: false, unique: true,
            primaryKey: true
        },
        cod_album: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
            references: { model: Model.AlbumAnimal, key: 'cod_album' }
        },
        nome: { type: DataTypes.STRING(100), allowNull: false },
        descricao: { type: DataTypes.STRING(255) },
        ativo: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_foto_animal',
    });

    // Associações (FKs).
        FotoAnimal.belongsTo(AlbumAnimal, {
            foreignKey: {
                name: 'cod_album',
                allowNull: false
            }
        });

        AlbumAnimal.hasMany(FotoAnimal, {
            foreignKey: {
                name: 'cod_album',
                allowNull: false
            }
        });

// Exportação.
module.exports = FotoAnimal;