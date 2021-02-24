const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { request } = require('express');

module.exports = {
    dest: path.resolve(__dirname, '../uploads'),
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.resolve(__dirname, '../uploads'))
        },
        filename: (req, file, cb) => {
            crypto.randomBytes(6, (err, hash) => {
                if (err){
                    cb(err)
                }

                const fileName = `${hash.toString('hex')}-${file.originalname}`;
                cb(null, fileName);
                
            })
        }
    }),
    limits: {
        fileSize: 1 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg',
            'image/pjpeg',
            'image/png'
        ]

        // if (Number(req.headers['content-length']) > (1.5 * 1024 * 1024)){
        //     req.pause();
        //     res.status = 400;
        //     return res.json({
        //         mensagem: 'O arquivo é grande demais. Suportamos arquivos de até 1mb.'
        //     });
        // }

        if (allowedMimes.includes(file.mimetype)){
            console.log('AllowedMimes Ok? ', allowedMimes.includes(file.mimetype))
            cb(null, true);
        } else {
            console.log('AllowedMimes Ok? ', allowedMimes.includes(file.mimetype))
            cb(new Error("MulterFile-MimeInvalido"))
        }

    }
}