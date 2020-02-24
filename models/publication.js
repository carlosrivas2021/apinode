'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PublicationsSchema = Schema({
    user: {type: Schema.ObjectId, ref: 'User'},
    text: String,
    file: String,
    created_at: String
});

module.exports = mongoose.model('Publication', PublicationsSchema);