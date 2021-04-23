// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
        const Animal = require('./Animal');
        const FotoAnimal = require('./FotoAnimal');
        const Usuario = require('./Usuario');

// Definição do Model 'Anuncio' para 'tbl_anuncio'.
    const Anuncio = connection.define('Anuncio', {

        cod_anuncio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.Animal, key: 'cod_animal' }
        },
        cod_anunciante: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        uid_foto_animal: { type: DataTypes.STRING(255), allowNull: false,
            references: { model: Model.FotoAnimal, key: 'cod_foto' }
        },
        qtd_visualizacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_avaliacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        estado_anuncio: { type: DataTypes.ENUM('Aberto', 'Concluido', 'Fechado'), allowNull: false, defaultValue: 'Aberto' },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_anuncio',
    });

    // Associações (FKs).
        Anuncio.belongsTo(Animal, {
            foreignKey: {
                name: 'cod_animal',
                allowNull: false
            }
        });

        Animal.hasOne(Anuncio, {
            foreignKey: {
                name: 'cod_animal',
                allowNull: false
            }
        });

        Anuncio.belongsTo(FotoAnimal, {
            foreignKey: {
                name: 'uid_foto_animal',
                allowNull: false
            }
        });

        FotoAnimal.hasOne(Anuncio, {
            foreignKey: {
                name: 'uid_foto_animal',
                allowNull: false
            }
        })

        Anuncio.belongsTo(Usuario, {
            foreignKey: {
                name: 'cod_anunciante',
                allowNull: false
            }
        });

        Usuario.hasMany(Anuncio, {
            foreignKey: {
                name: 'cod_anunciante',
                allowNull: false
            }
        })

// Exportação.
module.exports = Anuncio;