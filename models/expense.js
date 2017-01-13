const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ExpenseSchema = new Schema({
    payer: {
        type: String,
        required: true
    },
    payerId: {
        type: String,
        required: true
    },
    debtor: [{
        debtId: {
            type: String,
            required: true
        },debtName: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        }
    }],
    dueDate: Date,
    totalAmount: {
        type: Number,
        required: true
    },
    description: {
        type:String,
        required:true
    },
    expenseDate: {
        type: Date,
        default: Date.now
    }, createdBy: {
        type:String,
        required:true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', ExpenseSchema);
