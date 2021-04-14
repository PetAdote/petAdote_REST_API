// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'FotoPostagem' para 'tbl_foto_postagem'.
    const FotoPostagem = connection.define('FotoPostagem', {

        cod_foto_postagem: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_postagem: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
            references: { model: Model.Postagem, key: 'cod_postagem' }
        },
        uid_foto_animal: { type: DataTypes.STRING(255), allowNull: false, 
            references: { model: Model.FotoAnimal, key: 'uid_foto' }
        }

    }, {
        tableName: 'tbl_foto_postagem',
    });

// Exportação.
module.exports = FotoPostagem;