// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Anuncio' para 'tbl_anuncio'.
    const Anuncio = connection.define('Anuncio', {

        cod_anuncio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.Animal, key: 'cod_animal' }
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        cod_foto_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true ,  // Unique para restringir o uso da mesma foto em múltiplos anúncios.
            references: { model: Model.FotoAnimal, key: 'cod_foto_animal' }
        },
        qtd_visualizacao: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_avaliacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        estado_adocao: { type: DataTypes.ENUM('Me adote!', 'Fui adotado!')},
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_anuncio',
    });

// Exportação.
module.exports = Anuncio;