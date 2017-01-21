const User = require('../models/user');
const Expense = require('../models/expense');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const _ = require('lodash');
const async = require('async');
const validate = require('../helper/validate');

/**
 * POST /expense/add-expense
 * Add main expense entry 
 */

exports.addExpense = function(req, res) {

    if (validate.isEmpty(req.body.payerId)) {
        res.status(400).json({ success: false, message: 'Please select the payer' });
    } else if (validate.isEmpty(req.body.debtor) || (req.body.debtor.length === 0)) {
        res.status(400).json({ success: false, message: 'Please select proper debtors' });
    } else if (validate.isEmpty(req.body.description)) {
        res.status(400).json({ success: false, message: 'Please enter expense description' });
    } else if (validate.isEmpty(req.body.totalAmount)) {
        res.status(400).json({ success: false, message: 'Please enter total expense' });
    } else if (validate.isEmpty(req.body.expnId) && (req.path === "/expense/update-expense")) {
        res.status(400).json({ success: false, message: 'Please send expense id to update' });
    }

    var debt = req.body.debtor;
    var dividedSum = _.sumBy(debt, 'amount');

    var remain = Number(req.body.totalAmount) - dividedSum;

    console.log("remain Debt:" + dividedSum);

    if (remain < 0) {
        res.status(400).json({ success: false, message: 'Please re-calculate the per head expense' });
    }
    remain = remain / debt.length;
    console.log("remain :" + remain);
    _.forEach(debt, function(value) {
        if (value.amount) {
            value.amount = Number(value.amount);
            value.amount += remain;
        } else {
            value.amount = remain;
        }
    });
    req.updatedDebt = debt;

    console.log("Updated Debt:" + JSON.stringify(debt));

    if (req.path === "/expense/update-expense") {
        Expense.findById(req.expnIs, (err, expense) => {
            if (err) {
                console.log("Update error " + err);
                res.status(404).json({ success: false, message: 'No expense found with the given token' });
            }
            if (expense) {
                expense.payer = req.body.payer || expense.payer;
                expense.payerId = req.body.payerId || expense.payerId;
                expense.debtor = debt || expense.debtor;
                expense.totalAmount = req.body.totalAmount || expense.totalAmount;
                expense.description = req.body.description || expense.description;
                expense.save((err) => {
                    if (err) {
                        console.log("Save error " + err);
                        res.status(500).json({ success: false, message: 'Something went wrong' });
                    }
                    res.status(200).json({ success: true, message: 'Expense successfully updated' });
                });
            } else {
                res.status(404).json({ success: false, message: 'No user found with the given token' });
            }
        });
    } else {
        var tempExpense = new Expense({
            createdBy: req.userId,
            payer: req.body.payer,
            payerId: req.body.payerId,
            debtor: debt,
            totalAmount: req.body.totalAmount,
            description: req.body.description
        });

        tempExpense.save(function(err, createdExpense) {
            if (err) {
                console.error(err);
                res.status(400).json({ message: 'Error creating expense!!!' });
            }
            updateExpenseforUser(req, res);
        });
    }
};

/**
 * POST /expense/add-expense  cont...
 * update balance for the users
 */

function updateExpenseforUser(req, res) {
    let debt = req.updatedDebt;
    var debtIds = _.map(debt, 'debtId');

    User.findById(req.body.payerId, (err, user) => {
        if (err) {
            res.status(404).json({ success: false, message: 'No used found with the given payerId' });
        }
        if (user) {
            if (req.isDelete === true) {
                user.balance -= Number(req.body.totalAmount);
            } else {
                console.log("old balance: " + user.balance);
                user.balance += Number(req.body.totalAmount);
                console.log("New balance: " + user.balance);
            }
            user.save((err) => {
                if (err) {
                    console.log("Save error " + err);
                    res.status(500).json({ success: false, message: 'Something went wrong' });
                }
                console.log("Expense added in " + req.body.payerId);
            });
        } else {
            res.status(404).json({ success: false, message: 'No user found with the given payerId' });
        }
    });

    User.find()
        .where('_id')
        .in(debtIds)
        .exec(function(err, users) {
            if (err) {
                res.send(err);
            }
            if (users.length > 0) {
                for (i = 0; i < users.length; i++) {
                    let obj = _.find(debt, { 'debtId': users[i]._id.toString() });
                    // console.log("ID :" + obj.debtId + "  Amount:  " + obj.amount);
                    let isLast = false;
                    let isDelete = false;
                    if (i === users.length - 1) {
                        isLast = true;
                    }
                    if (req.isDelete === true) {
                        isDelete = true;
                        obj.amount = -Math.abs(obj.amount);
                    }

                    let options = {
                        user: users[i],
                        amount: obj.amount,
                        res: res,
                        isLast: isLast,
                        isDelete: isDelete,
                        req: req
                    }

                    console.log("Prev Amt: " + users[i].balance);
                    users[i].balance -= obj.amount;
                    console.log("New Amt: " + users[i].balance + " Obj Amt: " + obj.amount);
                    users[i].save((err) => {
                        if (err) {
                            res.status(500).json({ success: false, message: 'Something went wrong' });
                            console.log(err);
                            //TODO: Fallback event entry
                        }
                        if (isLast === true) {
                            if (isDelete === true) {
                                removeExpenseEntry(options);
                            } else {
                                res.status(200).json({ message: "Expense added successfully" });
                            }
                            //TODO: Send email to payer and debtor on success
                        }
                    });
                }
            }
        });
};

/**
 * Delete the expense from the main expense entry
 */

function removeExpenseEntry(options) {
    Expense.findOneAndRemove({
        _id: options.req.body.expnId
    }, function(err, expense) {
        if (err) {
            console.log("Expense delete error:  " + err);
            options.res.status(500).json({ success: false, message: 'Expense not deleted' });
        } else {
            if (expense) {
                options.res.json({ success: true, message: 'Expense deleted' });
            } else {
                options.res.status(404).json({ success: true, message: 'Expense not found' });
            }
        }
    })
}

function updateDebtBalance(options) {
    return function() {
        options.user.balance -= options.amount;
        options.user.save((err) => {
            if (err) {
                options.res.status(500).json({ success: false, message: 'Something went wrong' });
                console.log(err);
                //TODO: Fallback event entry
            }
            if (options.isLast === true) {
                if (options.isDelete === true) {
                    removeExpenseEntry(options);
                } else {
                    options.res.status(200).json({ message: "Expense added successfully" });
                }
                //TODO: Send email to payer and debtor on success
            }
        });
    }
}

/**
 * POST /expense/get-expense
 * Get all the expense for the given user, optionally with date range
 */

exports.getExpense = function(req, res) {

    //"2016-09-24T23:44:56.366Z" date.toJSON()    

    if (req.body.start || req.body.end) {
        if (validate.isEmpty(req.body.start) || validate.isEmpty(req.body.end)) {
            res.status(400).json({ message: "Please select start date and end date" });
        } else if (!validate.isValidDate(req.body.start) || !validate.isValidDate(req.body.end)) {
            res.status(400).json({ message: "Please select valid start date and end date" });
        } else if (validate.daysBetween(req.body.start, req.body.end) < 0 || isNaN(validate.daysBetween(req.body.start, req.body.end))) {
            res.status(400).json({ message: "End date must be greater than start date" });
        }
    }

    var date = {};
    if (req.body.start) {
        date = { "expenseDate": { "$gte": req.body.start, "$lt": req.body.end } };
    }
    validate.isAdmin(req.userId, function(isAdmin) {
        if (isAdmin === true) {
            Expense.find(date, {}, { limit: 10 }).sort('-expenseDate').lean().exec(function(err, users) {
                if (err) {
                    console.log("Err: " + err);
                    res.status(500).json({ message: "Something went wrong" });
                }
                if (users.length > 0) {
                    users.forEach(function(user) {
                        user.isEditable = true;
                        user.isDeleteable = true;
                    });
                }
                res.status(200).json(users);
            });
        } else {
            Expense.find(date, {}, { limit: 10 }).or([{ payerId: req.userId }, { 'debtor.debtId': req.userId }, { createdBy: req.userId }]).sort('-expenseDate').lean().exec(function(err, users) {
                if (err) {
                    console.log("Err: " + err);
                }
                users.forEach(function(user) {
                    if (user.createdBy === req.userId) {
                        user.isEditable = true;
                        user.isDeleteable = true;
                    }
                });
                res.status(200).json(users);
            });
        }
    });
};

/**
 * DELETE /expense/delete-expense
 * Delete the expense from the given user's balance
 */

exports.deleteExpense = function(req, res, next) {
    if (validate.isEmpty(req.body.expnId)) {
        res.status(400).json({ message: "Please send expense id to delete" })
    }

    Expense.findById(req.body.expnId, (err, expense) => {
        if (err) {
            res.status(500).json({ message: "something went wrong while deleting expense" });
        }
        if (expense) {
            req.updatedDebt = expense.debtor;
            req.body.totalAmount = expense.totalAmount;
            req.body.payerId = expense.payerId;
            req.isDelete = true;
            updateExpenseforUser(req, res);
        } else {
            res.status(404).json({ message: "expense not found with the given id" });
        }
    });
};