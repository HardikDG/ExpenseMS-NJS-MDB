const express = require('express');
const app = express();
var router = express.Router();

const userController = require('../controller/users');
const expnController = require('../controller/expenses');
const auth = require('../helper/auth');


//User APIs
router.use(auth.checkAuth);
// router.route('/user/*').post(auth.checkAuth);
router.route('/user/register').post(userController.register);
router.route('/user/login').post(userController.login);
router.route('/user/forgot-password').post(userController.forgetPassword);
router.route('/user/get-all-users').post(userController.getAllUsers);
router.route('/user/get-userbyid').post(userController.getUserInfobyId);
router.route('/user/update-userbyid').put(auth.isUserAdmin, userController.updateUserbyId);
router.route('/user/update-user').put(userController.updateUserbyId);
router.route('/user/update-password').put(userController.updatePassword);
router.route('/user/update-due-payments').put(auth.isUserAdmin, userController.updateDuePayments);
router.route('/user/delete-user').delete(auth.isUserAdmin, userController.deleteUser);
router.route('/user/reset/:token').get( userController.resetPassword);
router.route('/user/reset/newpass').post( userController.resetWithNewPassword);

//Expense API
// router.route('/expense/*').post(auth.checkAuth);
router.route('/expense/add-expense').post(expnController.addExpense);
router.route('/expense/get-expense').post(expnController.getExpense);
router.route('/expense/update-expense').put(expnController.addExpense);
router.route('/expense/delete-expense').delete(expnController.deleteExpense);

module.exports = router;