const User = require('../models/user');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const smtpTransport = require('nodemailer-smtp-transport');
const bcrypt = require('bcrypt');
const validate = require('../helper/validate');
const config = require('../config');
const secret_const = require('../config/secrets');
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const superagent = require('superagent');
const async = require('async');
const crypto = require('crypto');
const gravatar = require('gravatar');
const utils = require('../helper/utils');
const saltRounds = 5;

var userExclusion = {
    __v: false,
    password: false,
    isAdmin: false,
    isDeleted: false,
    lastLogin: false
};

/**
 * POST /user/login
 * Login users to the system .
 */

exports.login = function (req, res) {
    var email = req.body.email;
    var password = req.body.password;

    if (validate.isEmpty(req.body.email) || !validate.isEmail(req.body.email)) {
        res.status(400).json({ success: false, message: 'Please enter valid email' });
    } else if (validate.isEmpty(req.body.password)) {
        res.status(400).json({ success: false, message: 'Please enter password' });
    }

    User.find({ email: email }, function (err, users) {
        if (err) res.json({ success: false, message: 'Login failed!!! ' });
        console.log(users);
        if (users.length > 0) {
            if (bcrypt.compareSync(password, users[0].password)) {
                var token = jwt.sign({ id: users[0].id }, config.secret);
                res.json({ success: true, message: 'Successful login!!!', user: users[0], token: token });
            } else {
                res.status(400).json({ success: false, message: 'Please check username/password' });
            }
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    });
};

/**
 * POST /user/register
 * Register new users to the system .
 */

exports.register = function (req, res) {

    // mailchimp mail subscription
    superagent
        .post('https://' + secret_const.MAILCHIMP.SERVER_INSTANCE + '.api.mailchimp.com/3.0/lists/' + secret_const.MAILCHIMP.LIST_UNIQUE_ID + '/members/')
        .set('Content-Type', 'application/json;charset=utf-8')
        .set('Authorization', 'Basic ' + new Buffer('any:' + secret_const.MAILCHIMP.API_KEY).toString('base64'))
        .send({
            'email_address': req.body.email,
            'status': 'subscribed',
            'merge_fields': {
                'FNAME': req.body.firstName,
                'LNAME': req.body.lastName
            }
        })
        .end(function (err, response) {
            console.log("Err: " + err);
            if (response.status < 300 || (response.status === 400 && response.body.title === "Member Exists")) {
                res.send('Signed Up!');
            } else {
                res.send('Sign Up Failed :(');
            }
        });

    if (validate.isEmpty(req.body.email) || !validate.isEmail(req.body.email)) {
        res.status(400).json({ success: false, message: 'Please enter valid email' });
    } else if (validate.isEmpty(req.body.password)) {
        res.status(400).json({ success: false, message: 'Please enter password' });
    } else if (validate.isEmpty(req.body.fullName)) {
        res.status(400).json({ success: false, message: 'Please enter full name' });
    }

    var email = req.body.email;
    User.find({ email: email }, function (err, users) {
        if (err) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }

        console.log(users);
        if (users.length > 0) {
            res.status(409).json({ success: false, message: 'User already exists!!!' });
        }
        else {

            var salt = bcrypt.genSaltSync(saltRounds);
            var hash = bcrypt.hashSync(req.body.password, salt);

            var fullName = req.body.fullName;
            var email = req.body.email;
            var phoneno = req.body.phoneNo;
            var password = hash;
            var admin = req.body.isAdmin || false;


            var profileGravatar = gravatar.url(req.body.email, {s: '100', r: 'g', d: 'retro'}, true);

            var tempUserData = new User({
                fullName: fullName,
                email: email,
                phone_no: phoneno,
                password: password,
                isAdmin: admin,
                userPic: profileGravatar
            });
            tempUserData.save(function (err, createdUser) {
                if (err) {
                    res.json({ success: false, message: 'User not created!!!' });
                }
                console.log(createdUser);
                res.json({ success: true, message: 'User Successfully registered!!!' });
            });
        }
    });
};

/**
 * POST /user/forgot-password
 * User request for forgot password/ Send mail to the given user .
 */
exports.forgetPassword = function (req, res) {
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            User.findOne({ email: req.body.email }, function (err, user) {
                if (!user) {
                    res.status(404).json({ success: false, message: 'User not found' });
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + (3600000 * 24); // 24 hour

                user.save(function (err) {
                    if (!err) {
                        done(err, token, user);
                    } else {
                        res.status(500).json({ success: false, message: 'Fail to generate reset the token, please try again' });
                    }
                });
            });
        },
        function (token, user, done) {
            var transporter = nodemailer.createTransport({
                service: secret_const.MAIL_CONFIG.DOMAIN,
                auth: {
                    user: secret_const.MAIL_CONFIG.EMAIL,
                    pass: secret_const.MAIL_CONFIG.PASSWORD
                }
            });

            transporter.sendMail({
                from: secret_const.MAIL_CONFIG.FROM,
                to: user.email,
                subject: secret_const.MAIL_CONFIG.FORGOT_SUBJECT,
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://localhost:9090/api/v1/user/reset/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            }, function (error, info) {
                if (error) {
                    console.log(error);
                    res.status(500).json({ success: false, message: 'Mail not sent, please try again later' });
                } else {
                    console.log('Message sent: ' + info.response);
                    res.status(200).json({ success: true, message: 'Mail sent, Please check your mailbox' });
                }
            });
        }
    ], function (err) {
        if (err) return next(err);
    });
};

/**
 * POST /user/forgot-password
 * User request for forgot password/ Send mail to the given user .
 */

exports.forgetPassword_old = function (req, res) {

    var email = req.body.email;
    User.find({ email: email }, function (err, users) {
        if (err) throw err;

        var user = users[0];
        if (users.length > 0) {

            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: secret_const.MAIL_CONFIG.EMAIL,
                    pass: secret_const.MAIL_CONFIG.PASSWORD
                }
            });

            transporter.sendMail({
                from: '"Pyro EMS" <pyrolr@gmail.com>',
                to: user.email,
                subject: "forgot password",
                text: 'Hello ' + user.fullName + ', here is you current password, \n password ==> ' + user.password
            }, function (error, info) {
                if (error) {
                    console.log(error);
                    res.status(500).json({ success: false, message: 'Mail not sent, please try again later' });
                } else {
                    console.log('Message sent: ' + info.response);
                    res.status(200).json({ success: true, message: 'Mail sent, Please check your mailbox' });
                }
            });
        }
        else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    });
};

/**
 * GET /user/reset password
 * User request for forgot password/ Send mail to the given user .
 */

exports.resetPassword = function (req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
            res.status(401).json({ success: false, message: 'Password reset token is invalid or has expired.' });
        }
        else {
            res.status(200).json({ success: false, message: 'Token found send req for new password' });
        }
    });
};

exports.resetWithNewPassword = function (req, res) {

    User.findOne({ resetPasswordToken: req.body.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
            res.status(401).json({ success: false, message: 'Password reset token is invalid or has expired.' });
            return;
        }
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        if (bcrypt.compareSync(req.body.currentPassword, user.password)) {
            var salt = bcrypt.genSaltSync(saltRounds);
            var hash = bcrypt.hashSync(req.body.newPassword, salt);
            user.password = hash;
            user.save((err) => {
                if (err) {
                    console.log("Save error " + err);
                    res.status(500).json({ success: false, message: 'Something went wrong' });
                }
                res.status(200).json({ success: true, message: 'Password successfully updated' });
                utils.sendSMTPMail(user.email, "Password changed confirmation", "Your password changed sucessfully.", function (error, isSent) {
                    if (isSent) {
                        console.log("Mail sent for password changed confirmation");
                    } else {
                        console.log("Mail not sent for password changed confirmation" + error);
                    }
                })
            });
        } else {
            res.status(401).json({ success: false, message: 'Current password did not match.' });
        }
    });
};

/**
 * POST /user/get-all-users
 * Get all the user from the system optionally with fields.
 */

exports.getAllUsers = function (req, res) {

    if (req.body.fields) {
        if (req.body.fields.length < 1) {
            res.status(400).json({ success: false, message: 'Please enter fields name to search' });
        }
    }

    let selectedFields = '';
    if (req.body.fields) {
        selectedFields = validate.getValidFields(req.body.fields);
    } else {
        selectedFields = userExclusion;
    }

    User.find({}, selectedFields, function (err, users) {
        if (err) {
            res.status(500).json({ success: false, message: 'Some error occured in retrival of users' });
            console.log("All users error:  " + err);
        } else {
            res.status(200).json(users);
        }
    });
};

/**
 * PUT /user/get-userbyid
 * Get the information for the given user based on the userId
 */

exports.getUserInfobyId = function (req, res) {

    if (validate.isEmpty(req.body.id)) {
        res.status(400).json({ message: "Please send user id to get details" })
    }

    User.findOne({
        _id: req.body.id
    }, userExclusion).exec(function (err, user) {
        if (err) {
            console.log("getUserInfo :" + err);
            res.json({ success: false, message: 'Some error occured in retrival of the given user' });
        } else {
            if (user) {
                res.json(user);
            } else {
                res.status(404).json({ sucess: false, message: "User not found" });
            }
            console.log("Resp:  " + user);

        }
    });
};

/**
 * PUT /user/update-userbyid || /user/update-user
 * Update user information for the given user based on user id
 */

exports.updateUserbyId = function (req, res) {
    let userid = "";
    if (req.admin === true) {
        if (validate.isEmpty(req.body.id)) {
            res.status(400).json({ success: false, message: 'Please enter the user id you want to update' });
        } else {
            userid = req.body.id;
        }
    } else {
        userid = req.userId;
    }

    User.findById(userid, userExclusion, (err, user) => {
        if (err) {
            console.log("Update error " + err);
            res.status(404).json({ success: false, message: 'No user found with the given token' });
        }
        if (user) {
            user.email = req.body.email || user.email;
            user.fullName = req.body.fullName || user.fullName;
            user.balance = Number(req.body.balance) || user.balance;
            user.phoneNo = req.body.phoneNo || user.phoneno;
            user.isAdmin = req.body.admin || user.isAdmin;
            user.save((err) => {
                if (err) {
                    console.log("Save error " + err);
                    if (err.code === 11000) {
                        res.status(400).json({ success: false, message: 'The email address you have entered is already associated with an account.' });
                    } else {
                        res.status(500).json({ success: false, message: 'Something went wrong' });
                    }
                }
                res.status(200).json({ success: true, message: 'User profile successfully updated' });
            });
        } else {
            res.status(404).json({ success: false, message: 'No user found with the given token' });
        }
    });
};

/**
 * PUT /user/update-password
 * Update password of current user
 */

exports.updatePassword = function (req, res) {

    if (validate.isEmpty(req.body.currentPassword)) {
        res.status(400).json({ success: false, message: 'Please enter current password' });
    } else if (validate.isEmpty(req.body.newPassword)) {
        res.status(400).json({ success: false, message: 'Please enter new password' });
    }

    User.findById(req.userId, (err, user) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Something went wrong' });
        }
        if (user) {
            if (bcrypt.compareSync(req.body.currentPassword, user.password)) {
                user.password = req.body.newPassword;
                user.save((err) => {
                    if (err) {
                        console.log("Save error " + err);
                        res.status(500).json({ success: false, message: 'Something went wrong' });
                    }
                    res.status(200).json({ success: true, message: 'Password successfully updated' });
                });
            } else {
                res.status(401).json({ success: false, message: 'Current password did not match.' });
            }
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    });
};

/**
 * POST /user/update-due-payments
 * Update the remaining due amounts for the given user id
 */

exports.updateDuePayments = function (req, res) {
    if (validate.isEmpty(req.body.debtUserId)) {
        res.status(400).json({ success: false, message: 'Please enter userId to update the due balance' });
    } else if (validate.isEmpty(req.body.amount)) {
        res.status(400).json({ success: false, message: 'Please enter the amount to update the due balance' });
    }

    User.findById(req.body.debtUserId, (err, user) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Something went wrong' });
        }
        if (user) {
            user.balance += Number(req.body.amount);
            user.save((err) => {
                if (err) {
                    console.log("Save error " + err);
                    res.status(500).json({ success: false, message: 'Something went wrong' });
                }
                res.status(200).json({ success: true, message: 'Due amount successfully updated' });
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    });
};

/**
 * DELETE /user/delete-user
 * Delete user based given user id
 */

exports.deleteUser = function (req, res) {
    if (validate.isEmpty(req.body.id)) {
        res.status(400).json({ message: "Please send user id to delete" })
    }

    User.findOneAndRemove({
        _id: req.body.id
    }, function (err, user) {
        if (err) {
            console.log("User delete error:  " + err);
            res.status(400).json({ success: false, message: 'User not deleted, please check user id' });
        } else {
            if (user) {
                console.log(user);
                res.json({ success: true, message: 'User deleted' });
            } else {
                res.status(404).json({ success: true, message: 'User not found' });
            }
        }
    })
}