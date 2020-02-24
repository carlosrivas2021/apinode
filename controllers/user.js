'use strict'

var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-pagination');
var fs = require('fs');
var path = require('path');

var User = require('../models/user');
var Follow = require('../models/follow');

var jwt = require('../services/jwt');


//Metodos de prueba
function home(req, res) {
    res.status(200).send({
        message: 'Hola mundo en el servidor Nodejs'
    });
}

function pruebas(req, res) {
    console.log(req.body);
    res.status(200).send({
        message: 'Acción de pruebas en el servidor Nodejs'
    });
}

//Registro de usuario
function saveUser(req, res) {
    var params = req.body;
    var user = new User();

    if (params.name && params.surname && params.nick && params.email && params.password) {
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        //Comprobar usuarios duplicados
        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: 'Error en la peticion de usuarios' });

            if (users && users.length >= 1) {
                return res.status(200).send({
                    message: 'El usuario que intenta registrar ya existe'
                });
            } else {
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;

                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: 'Error al guardar el usuario' });
                        if (userStored) {
                            res.status(200).send({ user: userStored });
                        } else {
                            res.status(404).send({ message: 'No se ha registrado el usuario' });
                        }
                    });
                });
            }
        });



    } else {
        res.status(200).send({
            message: 'Envia todos los campos necesarios'
        })
    }

}


//Login
function loginUser(req, res) {
    var params = req.body;

    var email = params.email;
    var password = params.password;

    User.findOne({ email: email }, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la petición' });

        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {
                    //Devolver datos de usuario
                    if (params.gettoken) {
                        //generar y devolver el token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });
                    } else {
                        //devolver datos del usuario
                        user.password = undefined;
                        return res.status(200).send({ user })
                    }

                } else {
                    return res.status(404).send({ message: 'El usuario no se ha podido identificar' });
                }
            });
        } else {
            return res.status(404).send({ message: 'El usuario no se ha podido identificar!!' });
        }
    });
}

//Conseguir datos de un usuario
function getUser(req, res) {
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la peticion' });

        if (!user) return res.status(404).send({ message: 'El usuario no existe' })
        
        followThisUser(req.user.sub, userId).then((value) => {
          
            return res.status(200).send({ user, value });
        });






    });
}

async function followThisUser(identity_user_id, user_id){
    try {
        var following = await Follow.findOne({ user: identity_user_id, followed: user_id}).exec()
            .then((following) => {
                return following;
            })
            .catch((err)=>{
                return handleError(err);
            });
        var followed = await Follow.findOne({ user: user_id, followed: identity_user_id}).exec()
            .then((followed) => {
                return followed;
            })
            .catch((err)=>{
                return handleError(err);
            });
        return {
            following: following,
            followed: followed
        }
    } catch(err){
        return handleError(err);
    }
}

// Devolver un listado de usuario paginado
function getUsers(req, res) {
    var identity_user_id = req.user.sub;
    var page = 1;
    if (req.params.page) {
        page = req.params.page;
    }

    var itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if (err) return res.status(500).send({ message: 'Error en la peticion' });

        if (!users) return res.status(404).send({ message: 'No hay usuarios disponibles' });

        return res.status(200).send({
            users,
            total,
            pages: Math.ceil(total / itemsPerPage)
        });
    });
}

//Edicion de datos de usuario
function updateUser(req, res) {
    var userId = req.params.id;
    var update = req.body;

    //borar propiedad password

    delete update.password;

    if (userId != req.user.sub) {
        return res.status(500).send({ message: 'No tienes permisos para actualizar los datos del usuario' });
    }

    User.findByIdAndUpdate(userId, update, { new: true }, (err, userUpdated) => {
        if (err) return res.status(500).send({ message: 'Error en la peticion' });

        if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

        return res.status(200).send({ user: userUpdated });
    });
}

//Subir archivos de imagen/avatar de usuario
function uploadImage(req, res) {
    var userId = req.params.id;



    if (req.files) {
        var file_path = req.files.image.path;
        console.log(file_path);
        var file_split = file_path.split('\/');
        console.log(file_split);

        var file_name = file_split[2];
        console.log(file_name);

        var ext_split = file_name.split('\.');
        console.log(ext_split);

        var file_ext = ext_split[1];
        console.log(file_ext);

        if (userId != req.user.sub) {
            return removeFilesUploads(res, file_path, 'No tienes permisos para actualizar los datos del usuario');

        }

        if (file_name == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif') {
            //Actualizar documento de usuario logeado
            User.findByIdAndUpdate(userId, { image: file_name }, { new: true }, (err, userUpdated) => {
                if (err) return res.status(500).send({ message: 'Error en la peticion' });

                if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

                return res.status(200).send({ user: userUpdated });
            });
        } else {
            return removeFilesUploads(res, file_path, 'Extensión no permitida');

        }
    } else {
        return res.status(200).send({ message: 'No se han subido imagenes' });
    }
}

function removeFilesUploads(res, file_path, message) {
    fs.unlink(file_path, (err) => {
        return res.status(200).send({ message: message });
    });
}

function getImageFile(req, res) {
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: 'No existe la imagen' });
        }
    });
}

module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    updateUser,
    uploadImage,
    getImageFile
}