// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Model das associações (FKs).
        const Usuario = require('./Usuario');

// Definição do Model 'Animal' para 'tbl_animal'.
    const Animal = connection.define('Animal', {

        cod_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_dono: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        cod_dono_antigo: { type: DataTypes.INTEGER.UNSIGNED, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        estado_adocao: { type: DataTypes.ENUM('Sob protecao', 'Em anuncio', 'Em processo adotivo', 'Adotado'), allowNull: false, defaultValue: 'Sob protecao'},
        nome: { type: DataTypes.STRING(100), allowNull: false },
        foto: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'default_unknown_pet.jpeg' },
        data_nascimento: { type: DataTypes.DATEONLY, allowNull: false },
        especie: { type: DataTypes.ENUM('Cao', 'Gato', 'Outros'), allowNull: false },
        raca: { type: DataTypes.STRING(20), allowNull: false },
        genero: { type: DataTypes.ENUM('M', "F"), allowNull: false },
        porte: { type: DataTypes.ENUM('P', 'M', 'G'), allowNull: false },
        esta_castrado: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
        esta_vacinado: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
        detalhes_comportamento: { type: DataTypes.STRING(255), allowNull: false },
        detalhes_saude: { type: DataTypes.STRING(255), allowNull: false },
        historia: { type: DataTypes.TEXT },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_animal',
    });

    // Associações (FKs).
        Animal.belongsTo(Usuario, {
            as: 'dono',
            foreignKey: 'cod_dono',
            allowNull: false
        });

        Usuario.hasMany(Animal, {
            as: 'dono',
            foreignKey: 'cod_dono',
            allowNull: false
        })

        Animal.belongsTo(Usuario, {
            as: 'dono_antigo',
            foreignKey: 'cod_dono_antigo'
        });

        Usuario.hasMany(Animal, {
            as: 'dono_antigo',
            foreignKey: 'cod_dono_antigo',
            allowNull: false
        })

// Exportação.
module.exports = Animal;