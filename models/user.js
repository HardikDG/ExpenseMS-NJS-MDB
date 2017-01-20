'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    phoneNo: String,
    balance: {
        type: Number,
        default: 0
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    modified_by: String,
    isAdmin: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    userPic: String, 
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, {
        timestamps: true
    });

// UserSchema.pre('save', function(next) {
//   var user = this;
//   var SALT_FACTOR = 5;

//   if (!user.isModified('password')) return next();

//   bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
//     if (err) return next(err);

//     bcrypt.hash(user.password, salt, null, function(err, hash) {
//         console.log("Err: " + err);
//         console.log("Hash: " + hash);
//       if (err) return next(err);
//       user.password = hash;
//       next();
//     });
//   });
// });

module.exports = mongoose.model('User', UserSchema);
