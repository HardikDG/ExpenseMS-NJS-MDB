/**
 * Define all secrets over here
 * 
 */

module.exports = {
  TWILIO: {
    TWILIO_SID:  'AC11e33316b53c53dab3e7e6e333ab4d53',
    TWILIO_TOKEN:  'c90e970beab86e440d18360166cbe768',
    TWILIO_MOB_NUMBER : "+16467131062"
  },
  MAIL_CONFIG: {
    EMAIL:  'pyrolrdev@gmail.com',
    PASSWORD:  'pyro@123',
    DOMAIN : "gmail",
    PROTOCOL : "smtps",  
    FROM:  '"Pyro EMS" <pyrolrdev@gmail.com>',
    FORGOT_SUBJECT : "Reset Password"
  },MAILCHIMP: {
      SERVER_INSTANCE: 'us14',
      LIST_UNIQUE_ID: 'd974dea8d2',
      API_KEY: '5a5a25fb6be75801c68330300cf4dd11-us14'
  }
};
