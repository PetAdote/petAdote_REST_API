// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Momento' para 'tbl_momento'.
    const Momento = connection.define('Momento', {

        cod_momento: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        cod_foto_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true ,  // Unique para restringir o uso da mesma foto em múltiplos momentos.
            references: { model: Model.FotoAnimal, key: 'cod_foto_animal' }
        },
        descricao: { type: DataTypes.STRING(255) },
        qtd_visualizacao: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_momento',
    });

// Exportação.
module.exports = Momento;