const _ = require('lodash');
const mongoose = require('mongoose');
const User = require('../models/user');

function treatAsUTC(date) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

module.exports = {
    isEmail: function (email) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    },
    isEmpty: function (mixedVar) {
        var undef, key, i, len;
        var emptyValues = [undef, null, false, 0, '', '0'];
        for (i = 0, len = emptyValues.length; i < len; i++) {
            if (mixedVar === emptyValues[i]) {
                return true;
            }
        }
        if (typeof mixedVar === 'object') {
            for (key in mixedVar) {
                return false;
            }
            return true;
        }

        return false;
    },
    range: function (mixedVar, start, end) {

        if (this.isEmpty(mixedVar)) {
            return false;
        }
        var len = mixedVar.length;
        return _.inRange(len, start, end);

    },
    isObjectId: function (objectId) {
        return mongoose.Types.ObjectId.isValid(objectId);
    }, getValidFields: function (reqFields) {
        const dbFields = ["email", "fullName", "balance"];
        let fields = _.intersection(dbFields, reqFields);
        let selectFields = _.join(fields, ' ');
        return selectFields;
    }, isAdmin: function (userId, callback) {
        User.findById(userId, (err, user) => {
            if (err) {
                console.error("Error: " + err);
                return false;
            }
            if (user) {
                if (user.isAdmin === true) {
                    callback(true);
                } else {
                    callback(false);
                }
            }
        });
    }, isValidDate: function (date) {
        var d = new Date(date);
        if (Object.prototype.toString.call(d) === "[object Date]") {
            // it is a date
            if (isNaN(d.getDate())) {
                return false;
            }
            else {
                return true;
            }
        }
        else {
            return false;
        }
    }, daysBetween: function (startDate, endDate) {
        var millisecondsPerDay = 24 * 60 * 60 * 1000;
        console.log("Diff: " + (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay);
        return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
    }
}

