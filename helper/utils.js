const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const secret_const = require('../config/secrets');
const User = require('../models/user');

module.exports = {
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
    sendSMTPMail: function (email, subject, body,callback) {
        var nodemailer = require('nodemailer');
        var smtpTransport = require('nodemailer-smtp-transport');

        var transporter = nodemailer.createTransport({
                service: secret_const.MAIL_CONFIG.DOMAIN,
                auth: {
                    user: secret_const.MAIL_CONFIG.EMAIL,
                    pass: secret_const.MAIL_CONFIG.PASSWORD
                }
            });

            transporter.sendMail({
                from: secret_const.MAIL_CONFIG.FROM,
                to: email,
                subject: subject,
                text: body
            }, function (error, info) {
                let isEmailSent = false;
                if (error) {
                    console.log(error);
                    // res.status(500).json({ success: false, message: 'Mail not sent, please try again later' });
                } else {
                    isEmailSent = true;
                    console.log('Message sent: ' + info.response);
                    //res.status(200).json({ success: true, message: 'Mail sent, Please check your mailbox' });
                }
                callback(error,isEmailSent);
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
