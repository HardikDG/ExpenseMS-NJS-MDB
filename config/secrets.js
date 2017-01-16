/**
 * Define all secrets over here
 * 
 */


var mode = (typeof config.serverType !="undefined" && config.serverType == "production") ? "production" : "dev" ;
console.log("servermode =>",    mode);
//mode = "dev";

module.exports = {
  twilio: {
    TWILIO_SID:  'AC11e33316b53c53dab3e7e6e333ab4d53',
    TWILIO_TOKEN:  'c90e970beab86e440d18360166cbe768',
    TWILIO_MOB_NUMBER : "+16467131062"
  },
  MAIL_CONFIG: {
    EMAIL:  'support@selfierequest.com',
    PASSWORD:  '@Selfierequest22',
    DOMAIN : "@smtp.zoho.com",
    PROTOCOL : "smtps",  
    FROM:  'Selfie Request',
    FORGOT_SUBJECT : "Reset Password"
  },
  NOTIFICATION: {
    CERTIFICATE_FILE : (mode == "production" ) ? "APNS_Dis_SelfieRequest.pem" : "APNS_Dev_SelfieRequest.pem", 
    MODE : mode,
    DEFAULT_TOKEN : "3103CDEBC04197B9B6D9EF92F6428D9BD7C6A63E36AE8D07FAE0417CD38C509D"
  },
  REPORT_MAIL : {
      TWILIO_ERROR : "selfierequest.test@gmail.com"
  }
};
