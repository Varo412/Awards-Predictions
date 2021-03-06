'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const CategorySchema = new Schema({
    name: {
        type: String,
        required: 'Kindly enter the name of the award category'
    },
    nominees: [{
        type: Schema.Types.ObjectId,
        ref: 'Nominees',
    }],
    winner: {
        type: Schema.Types.ObjectId,
        ref: 'Nominees',
    },
    awardEvent: {
        type: Schema.Types.ObjectId,
        ref: 'AwardEvents',
        required: 'To which Award Event belongs this category?'
    },
    creationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: Boolean,
        default: true,
    },
});

module.exports = mongoose.model('Categories', CategorySchema);