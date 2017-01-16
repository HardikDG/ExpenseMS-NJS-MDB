const User = require('../models/user');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const smtpTransport = require('nodemailer-smtp-transport');
const bcrypt = require('bcrypt');
const validate = require('../helper/validate');
const config = require('../config');
var multer = require('multer')
var upload = multer({ dest: 'uploads/' })
var request = require('superagent');
const saltRounds = 5;

var mailchimpInstance = 'us14',
    listUniqueId = 'd974dea8d2',
    mailchimpApiKey = '5a5a25fb6be75801c68330300cf4dd11-us14';

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

    request
        .post('https://' + mailchimpInstance + '.api.mailchimp.com/3.0/lists/' + listUniqueId + '/members/')
        .set('Content-Type', 'application/json;charset=utf-8')
        .set('Authorization', 'Basic ' + new Buffer('any:' + mailchimpApiKey).toString('base64'))
        .send({
            'email_address': req.body.email,
            'status': 'subscribed',
            'merge_fields': {
                'FNAME': req.body.firstName,
                'LNAME': req.body.lastName
            }
        })
        .end(function (err, response) {
            if (response.status < 300 || (response.status === 400 && response.body.title === "Member Exists")) {
                // res.send('Signed Up!');
                console.log("Mail from mailchimp sent");
            } else {
                console.log('mailchimp mail failed :(');
            }
        });

    // var upload = multer().single('avatar');
    // console.log("File received");
    // upload(req, res, function (err) {
    //     if (err) {
    //         // An error occurred when uploading 
    //         console.log("Error while uploading image" + err);
    //         return
    //     } else {
    //         console.log("File saved");
    //     }
    //     // Everything went fine 
    // })

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

            // bcrypt.genSalt(saltRounds, function (err, salt) {
            //     if (err){
            //         console.log("Error in salt creation");   
            //     }
            //     bcrypt.hash(req.body.password, salt, function (err, hash) {
            //         if (err){
            //         console.log("Error in hash creation");   
            //     }
            //         password = hash;
            //         console.log("Hash :" + hash);
            //     });
            // });

            var salt = bcrypt.genSaltSync(saltRounds);
            var hash = bcrypt.hashSync(req.body.password, salt);

            var fullName = req.body.fullName;
            var email = req.body.email;
            var phoneno = req.body.phoneNo;
            var password = hash;
            var admin = req.body.isAdmin || false;

            var tempUserData = new User({
                fullName: fullName,
                email: email,
                phone_no: phoneno,
                password: password,
                isAdmin: admin
            });
            tempUserData.save(function (err, createdUser) {
                if (err) {
                    console.log("Error: " + err);
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

    var email = req.body.email;
    User.find({ email: email }, function (err, users) {
        if (err) throw err;

        console.log(users);
        var user = users[0];
        if (users.length > 0) {

            var smtpConfig = {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true, // use SSL 
                auth: {
                    user: 'hardik.chauhan.sa@gmail.com',
                    pass: 'Hardik@sa123'
                }
            };

            var transporter = nodemailer.createTransport(smtpConfig);

            var mailOptions = {
                from: '"Hardik Chauhan" <hardik.chauhan.sa@gmail.com>',
                to: user.email,
                subject: 'Forgot password request',
                text: 'Hello ' + user.fullName + ', here is you current password, \n password ==> ' + user.password
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: ' + info.response);
                res.json({ success: true, message: 'Password sent to your mail address.', token: token });
            });

        }
        else {
            res.status(404).json({ success: false, message: 'User not found' });
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