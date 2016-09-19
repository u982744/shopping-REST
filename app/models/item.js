var mongoose = require('mongoose');

let itemSchema = mongoose.Schema({
    name: String,
    listId: String,
    done: Boolean
});

module.exports = mongoose.model('Item', itemSchema);