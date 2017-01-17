const User = require('../models/user');
const jwt = require('jsonwebtoken');
const config = require('../config');
const _ = require('lodash');

exports.checkAuth = function (req, res, next) {
    
    let openPath = ["/user/login","/user/register","/user/forgot-password","/user/reset"];
    if (_.includes(openPath, req.path) || req.path.includes('reset')){
        next()
    } else {
        var token = req.body.token || req.param('token') || req.headers['x-access-token'];
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, config.secret, function (err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                req.userId = decoded.id;
                next();
            }
        });
    } else {
        return res.status(401).json({
            success: false,
            message: 'No token provided.'
        });
    }
    }
};

exports.isUserAdmin = function (req, res, next) {
    User.findById(req.userId, (err, user) => {
        if (err) {
            res.status(500).json({ message: "Internal server error." });
        }
        if (user) {
            if (user.isAdmin === true) {
                req.admin = true;
                next();
            } else {
                res.status(403).json({ message: "You don't have required permission" });
            }
        }
    });
}