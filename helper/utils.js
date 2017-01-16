var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var secrets = require(basePath + 'config/secrets');
var User = require(basePath + 'models/user');

module.exports = {
    sendResponse: function (res, response, status) {
        var response = JSON.stringify(response);
        var status = !validate.isEmpty(status) ? status : 200;
        if (status != "200") {
            require(basePath + 'helper/utils').sendSMTPMail("anish.agarwal.sa@gmail.com", "Error comes local", response);
        }
        res.setHeader('Content-Type', 'application/json');
        res.status(status)
        res.end(response);
    },
    sendEmail: function (toEmail, subject, body, callback) {
        smtpTransport = nodemailer.createTransport();
        var isEmailSent = false;
        smtpTransport.sendMail({
            from: "test@example.com",
            to: toEmail,
            subject: subject,
            html: body
        }, function (error, response) {
            if (error) {
                isEmailSent = true;
            } else {
                isEmailSent = false;
            }
            callback(null, isEmailSent);
        });
    },
    //remove all spaces and zero from starting of number
    getOnlyMobileNumber: function (mobile_number) {
        var s = mobile_number.replace(/[^0-9]+/gi, "");
        while (s.charAt(0) == '0') {
            if (s.length == 1) { break };
            if (s.charAt(1) == '.') { break };
            s = s.substr(1, s.length - 1)
        }
        return s;
    },

    //send forgot password mail on users email
    sendSMTPMail: function (email, subject, body) {
        var nodemailer = require('nodemailer');
        var smtpTransport = require('nodemailer-smtp-transport');

        var from = secrets.MAIL_CONFIG.EMAIL;
        var pwd = secrets.MAIL_CONFIG.PASSWORD;
        var to = email;

        // create reusable transporter object using the default SMTP transport
        var transporter = nodemailer.createTransport(
            smtpTransport(secrets.MAIL_CONFIG.PROTOCOL + '://' + from + ':' + pwd + secrets.MAIL_CONFIG.DOMAIN)
        );

        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: secrets.MAIL_CONFIG.FROM + '<' + from + '>', // sender address
            to: to, // list of receivers
            subject: subject, // Subject line    
            html: body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: ' + info.response);
        });
    },
    getMobileOtp: function () {
        return Math.floor(Math.random() * 900000) + 100000;

    },
    getExtension: function (fileName) {
        var ext = path.extname(fileName || '').split('.');
        return ext[ext.length - 1];
    }
};
