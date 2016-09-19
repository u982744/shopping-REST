var mongoose = require('mongoose');

let listSchema = mongoose.Schema({
    name: String,
    userIds: [String]
});

module.exports = mongoose.model('List', listSchema);