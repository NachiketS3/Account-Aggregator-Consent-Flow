// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
const axios = require('axios');
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

const translate = require('@vitalets/google-translate-api');

const admin = require('firebase-admin');
// FIREBASE_CONFIG is used here so you can initialize without params here:
admin.initializeApp();

const BASE_HOST='https://aa-api-core.el.r.appspot.com';
const PATH_LOGIN='/nsdl/aa/onemoney/login/send';
const PATH_OTP='/nsdl/aa/onemoney/login/verify';
const PATH_LIST_OF_CONSENTS='/nsdl/aa/onemoney/consent/dashboard';
const PATH_LOGOUT='/nsdl/aa/onemoney/logout';
const PATH_ACTION_OTP = '/nsdl/aa/onemoney/consent/management/otp/send';
const PATH_CONSENT_ACTION_APPROVE='/nsdl/aa/onemoney/consent/management/approve';
const PATH_CONSENT_ACTION_REJECT='/nsdl/aa/onemoney/consent/management/reject';
const PATH_CONSENT_CONSENT_DETAIL='/nsdl/aa/onemoney/consent/details';

const CONSENT_CONFIRMED = "approve";
const CONSENT_REJECT = 'reject';

var phone_num;
var otp_reference;
var sessionId;
var pending_arr;
var active_arr; 
var bank_arr;
var rejected_arr;
var actionType;
var serialNumber;

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
   
   function translateWord(text){
   
     
    console.log("Translate word "+text);
    var aa;
     translate(""+text, {to: 'hi'}).then(res => {
    console.log(""+res);
    aa = ""+res.text;
    return ""+res.text;
	}).catch(err => {
    console.error(err);
	});
    console.log("Return : "+ aa);
    return aa;
  }
  
  function translateWord1(text){
    
  }

   function UserProvidesPhoneNumberhandler(agent){
    console.log("Login Agent phone number : "+ agent.parameters.phonenumber);
    const data = { "phone_number": agent.parameters.phonenumber}; 
    return axios.post(BASE_HOST+PATH_LOGIN, data)
    .then((res) => {
        console.log(`Status: ${res.status}`);
        console.log('Body: ', res.data);
      if(res.data.status == "true"){
        phone_num = agent.parameters.phonenumber;
        otp_reference = res.data.otp_reference;
        if(agent.locale === 'hi'){
        	agent.add("कृपया ओटीपी दर्ज करें");
        }else{
        	agent.add("Please enter OTP");
        }
      }else{
        if(agent.locale === 'hi'){
        	agent.add("दर्ज फ़ोन नंबर मान्य नहीं है। कृपया पुन: प्रयास करें।");
        }else{
        	agent.add("Entered phone number is not valid. Please try again.");
        }
      }
    }).catch((err) => {
        console.error(err);
    }); 
  }
  
  function UserProvidesOtphandler(agent){
    console.log("Otp Agent : "+ agent.parameters.otp);
    console.log("Saved Phone number : "+ phone_num);
    console.log("Saved Otp reference : "+ otp_reference);
    const data = { 
      "phone_number": phone_num,
      "otp_reference": otp_reference,
      "code": "123456"
    }; 
    return axios.post(BASE_HOST+PATH_OTP, data)
    .then((res) => {
        console.log(`Status: ${res.status}`);
        console.log('Body: ', res.data);
      if(res.status === 200){
        sessionId = res.data.sessionId;
        if(agent.locale === 'hi'){
        	agent.add("वेलकम टू अकाउंट एग्रीगेटर। क्या मेरे द्वारा आपकी कोई सहायता हो सकती है ?");
        }else{
        	agent.add("Welcome to Account Aggregator. How may I help you ?");
        }
      }else{
        if(agent.locale === 'hi'){
        	agent.add("कृपया पुन: प्रयास करें");
        }else{
        	agent.add("Please try again");
        }
      }
    }).catch((err) => {
        console.error(err);
    }); 
  }
  
  function ListOfAllConsentshandler(agent){
    console.log('ListOfAllConsentshandler Session : ', sessionId);
    return axios.get(BASE_HOST+PATH_LIST_OF_CONSENTS, {
     headers: {
       'sessionId': sessionId
     }
	}).then((res) => {
        console.log(`Status: ${res.status}`);
        console.log('Body: ', res.data);
      if(res.status === 200){
        pending_arr = res.data.consents.pending;
        active_arr = res.data.consents.active;
        rejected_arr = res.data.consents.rejected;
        bank_arr = res.data.bankAccounts;
        var i = 1;
      
        //translate
        if(agent.locale === 'hi'){
          agent.add("लंबित सहमति की सूची");
          res.data.consents.pending.map(pendingObj => {
              agent.add(i+". लंबित सहमति\n"+"समय: "+pendingObj.timeStamp+"\n"+
                       "समय: "+pendingObj.timeStamp+"\n"+
                       "स्थिति: "+ pendingObj.status+"\n"+
                       "समय शुरू: "+pendingObj.startTime+"\n"+
            		   "समाप्त हुई समय सीमा: "+pendingObj.expireTime+"\n"+
            		   "उद्देश्य पाठ: "+pendingObj.purposeText+"\n"+
                       "सहमति के प्रकार: "+pendingObj.consentTypes+"\n"+
                       "FIU नाम: "+pendingObj.fiu_name+"\n"+
                       "FIU आईडी: "+pendingObj.fiuID);
             // agent.add("समय: "+pendingObj.timeStamp);
           	  //agent.add("स्थिति: "+ pendingObj.status);
              //agent.add("समय शुरू: "+pendingObj.startTime);
              //agent.add("समाप्त हुई समय सीमा: "+pendingObj.expireTime);
              //agent.add("उद्देश्य पाठ: "+pendingObj.purposeText);
              //agent.add("सहमति के प्रकार: "+pendingObj.consentTypes);
              //agent.add("FIU नाम: "+pendingObj.fiu_name);
              //agent.add("FIU आईडी: "+pendingObj.fiuID);
              i++;
          });
        }else{
        	 agent.add("List of Pending Consent");
        res.data.consents.pending.map(pendingObj => {
        	agent.add(i+".Pending Consent\n"+"Time: "+pendingObj.timeStamp+"\n"+
                     "Status: "+pendingObj.status+"\n"+
                     "Start time: "+pendingObj.startTime+"\n"+
                     "Expire time: "+pendingObj.expireTime+"\n"+
                     "Purpose text: "+pendingObj.purposeText+"\n"+
                     "Consent types: "+pendingObj.consentTypes+"\n"+
                     "FIU name:: "+pendingObj.fiu_name+"\n"+
                     "FIU id: "+pendingObj.fiuID);
          	//agent.add("Time: "+pendingObj.timeStamp);
          	//agent.add("Status: "+pendingObj.status);
          	//agent.add("Start time: "+pendingObj.startTime);
          	//agent.add("Expire time: "+pendingObj.expireTime);
          	//agent.add("Purpose text: "+pendingObj.purposeText);
          	//agent.add("Consent types: "+pendingObj.consentTypes);
          	//agent.add("FIU name: "+pendingObj.fiu_name);
          	//agent.add("FIU id: "+pendingObj.fiuID);
          	//agent.add(" ");
       	 	//agent.add(" ");
          	i++;
        });
        }
       
      }else{
        agent.add("Unfortunately we could not get the list of all consents");
      }
    }).catch((err) => {
        console.error(err);
    }); 
  }
  
  function PendingConsenthandler(agent){
     var i = 1;
    if(agent.locale === 'hi'){
          agent.add("लंबित सहमति की सूची");
          pending_arr.map(pendingObj => {
              agent.add(i+". लंबित सहमति\n"+"समय: "+pendingObj.timeStamp+"\n"+
                       "समय: "+pendingObj.timeStamp+"\n"+
                       "स्थिति: "+ pendingObj.status+"\n"+
                       "समय शुरू: "+pendingObj.startTime+"\n"+
            		   "समाप्त हुई समय सीमा: "+pendingObj.expireTime+"\n"+
            		   "उद्देश्य पाठ: "+pendingObj.purposeText+"\n"+
                       "सहमति के प्रकार: "+pendingObj.consentTypes+"\n"+
                       "FIU नाम: "+pendingObj.fiu_name+"\n"+
                       "FIU आईडी: "+pendingObj.fiuID);
             // agent.add("समय: "+pendingObj.timeStamp);
           	  //agent.add("स्थिति: "+ pendingObj.status);
              //agent.add("समय शुरू: "+pendingObj.startTime);
              //agent.add("समाप्त हुई समय सीमा: "+pendingObj.expireTime);
              //agent.add("उद्देश्य पाठ: "+pendingObj.purposeText);
              //agent.add("सहमति के प्रकार: "+pendingObj.consentTypes);
              //agent.add("FIU नाम: "+pendingObj.fiu_name);
              //agent.add("FIU आईडी: "+pendingObj.fiuID);
              i++;
          });
        }else{
        	 agent.add("List of Pending Consent");
        pending_arr.map(pendingObj => {
        	agent.add(i+".Pending Consent\n"+"Time: "+pendingObj.timeStamp+"\n"+
                     "Status: "+pendingObj.status+"\n"+
                     "Start time: "+pendingObj.startTime+"\n"+
                     "Expire time: "+pendingObj.expireTime+"\n"+
                     "Purpose text: "+pendingObj.purposeText+"\n"+
                     "Consent types: "+pendingObj.consentTypes+"\n"+
                     "FIU name:: "+pendingObj.fiu_name+"\n"+
                     "FIU id: "+pendingObj.fiuID);
          	//agent.add("Time: "+pendingObj.timeStamp);
          	//agent.add("Status: "+pendingObj.status);
          	//agent.add("Start time: "+pendingObj.startTime);
          	//agent.add("Expire time: "+pendingObj.expireTime);
          	//agent.add("Purpose text: "+pendingObj.purposeText);
          	//agent.add("Consent types: "+pendingObj.consentTypes);
          	//agent.add("FIU name: "+pendingObj.fiu_name);
          	//agent.add("FIU id: "+pendingObj.fiuID);
          	//agent.add(" ");
       	 	//agent.add(" ");
          	i++;
        });
        }
  }
  
  function ActiveConsentshandler(agent){
    var i =1;
    if(agent.locale === 'hi'){
          agent.add("सक्रिय सहमति की सूची");
          pending_arr.map(pendingObj => {
              agent.add(i+". सक्रिय सहमति\n"+"समय: "+pendingObj.timeStamp+"\n"+
                       "समय: "+pendingObj.timeStamp+"\n"+
                       "स्थिति: "+ pendingObj.status+"\n"+
                       "समय शुरू: "+pendingObj.startTime+"\n"+
            		   "समाप्त हुई समय सीमा: "+pendingObj.expireTime+"\n"+
            		   "उद्देश्य पाठ: "+pendingObj.purposeText+"\n"+
           			   "उद्देश्य पाठ: "+pendingObj.purposeText+"\n"+
                       "सहमति के प्रकार: "+pendingObj.consentTypes+"\n"+
                       "FIU नाम: "+pendingObj.fiu_name+"\n"+
                       "FIU आईडी: "+pendingObj.fiuID);
              i++;
          });
    }else{
      	agent.add("List of Active Consent");
        active_arr.map(activeObj => {
        	agent.add(i+".Active Consent\n"+"Time: "+activeObj.timeStamp+"\n"+
                     "Status: "+activeObj.status+"\n"+
                     "Start time: "+activeObj.startTime+"\n"+
                     "Expire time: "+activeObj.expireTime+"\n"+
                     "Purpose text: "+activeObj.purposeText+"\n"+
                     "Consent types: "+activeObj.consentTypes+"\n"+
                     "FIU name:: "+activeObj.fiu_name+"\n"+
                     "FIU id: "+activeObj.fiuID);
          	i++;
        });
    }
  }
  
  function RejectedConsenthandler(agent){
    var i = 1;
    
    if(agent.locale === 'hi'){
          agent.add("अस्वीकृत सहमति की सूची");
          pending_arr.map(pendingObj => {
              agent.add(i+". अस्वीकृत सहमति\n"+"समय: "+pendingObj.timeStamp+"\n"+
                       "समय: "+pendingObj.timeStamp+"\n"+
                       "स्थिति: "+ pendingObj.status+"\n"+
                       "समय शुरू: "+pendingObj.startTime+"\n"+
            		   "समाप्त हुई समय सीमा: "+pendingObj.expireTime+"\n"+
            		   "उद्देश्य पाठ: "+pendingObj.purposeText+"\n"+
           			   "उद्देश्य पाठ: "+pendingObj.purposeText+"\n"+
                       "सहमति के प्रकार: "+pendingObj.consentTypes+"\n"+
                       "FIU नाम: "+pendingObj.fiu_name+"\n"+
                       "FIU आईडी: "+pendingObj.fiuID);
              i++;
          });
    }else{
      	 agent.add("List of Rejected Consent");   
          rejected_arr.map(activeObj => {
              agent.add(i+".Rejected Consent\n"+"Time: "+activeObj.timeStamp+"\n"+
                     "Status: "+activeObj.status+"\n"+
                     "Start time: "+activeObj.startTime+"\n"+
                     "Expire time: "+activeObj.expireTime+"\n"+
                     "Purpose text: "+activeObj.purposeText+"\n"+
                     "Consent types: "+activeObj.consentTypes+"\n"+
                     "FIU name:: "+activeObj.fiu_name+"\n"+
                     "FIU id: "+activeObj.fiuID);
              i++;
          });
    }
  }
  
   function Logouthandler(agent){
  	console.log("Login Agent session id : "+ sessionId);
    const data = { "sessionId": sessionId}; 
    return axios.post(BASE_HOST+PATH_LOGOUT, data)
    .then((res) => {
        console.log(`Status: ${res.status}`);
        console.log('Body: ', res.data);
      if(res.status === 200){
        agent.add(""+res.data.message);
      }else{
        agent.add("Please try again.");
      }
    }).catch((err) => {
        console.error(err);
    }); 
  }
  
  function UseractionTypehandler(agent){
    serialNumber = agent.parameters.serialNumber;
    console.log("agent parameters",agent.parameters);
    if(CONSENT_CONFIRMED === agent.parameters.approve){
    	actionType = 'CONSENT_CONFIRMED';
       // agent.add("Please enter serial number of consent you want to approve");
    }else{
    	actionType = 'CONSENT_REJECT';
       // agent.add("Please enter serial number of consent you want to reject");
    }
    console.log('Action Type : ', actionType);
    
    const data = { 
      "actionType": actionType,
      "identifierValue": phone_num,
      "identifierType": "MOBILE"
    }; 
    const options = {
  		headers: {
      		'sessionId': sessionId
  		}
	}; 
    return axios.post(BASE_HOST+PATH_ACTION_OTP, data,options)
    .then((res) => {
        console.log(`Status: ${res.status}`);
        console.log('Body: ', res.data);
      if(res.status === 200){
        agent.add("Please enter OTP");
      }else{
        agent.add("Please try again.");
      }
    }).catch((err) => {
        console.error(err);
    });
  }
  
  function UserPendingListNumberhandler(agent){
  	serialNumber = agent.parameters.serialNumber;
    const data = { 
      "actionType": actionType,
      "identifierValue": phone_num,
      "identifierType": "MOBILE"
    }; 
    const options = {
  		headers: {
      		'sessionId': sessionId
  		}
	}; 
    return axios.post(BASE_HOST+PATH_ACTION_OTP, data,options)
    .then((res) => {
        console.log(`Status: ${res.status}`);
        console.log('Body: ', res.data);
      if(res.status === 200){
        agent.add("Please enter OTP");
      }else{
        agent.add("Please try again.");
      }
    }).catch((err) => {
        console.error(err);
    });
  }
  
  function UserProvideConsentOtphandler(agent){
    console.log('UserProvideConsentOtphandler Session : ', sessionId);
    const options = {
  		headers: {
      		'sessionId': sessionId
  		}
	};
  	var data;
    var pending_consent = pending_arr[serialNumber-1];
    var accounts = [];
    bank_arr.map(activeObj => {
    	accounts.push({"type":"BANK","data":{"accType":activeObj.accountType,"accRefNumber":activeObj.accountRefNumber,"maskedAccNumber":activeObj.maskedAccountNumber,"fipId":activeObj.fipID,"userInfo":{}}
                      });
    });
      
    console.log("accounts",JSON.stringify(accounts)) ; 
    console.log("pending_arr : "+pending_arr);
    console.log("consentHandle",pending_consent) ; 
    console.log("otp",agent.parameters.consentOtp) ; 
    
    if(actionType === 'CONSENT_CONFIRMED'){
      console.log('INSIDE confirmed : ', actionType);
    	data = { 
          "consentHandle": pending_consent.eventID,
          "otp": agent.parameters.consentOtp,
          "accounts": accounts
   		 }; 
      return axios.post(BASE_HOST+PATH_CONSENT_ACTION_APPROVE, data,options)
      .then((res) => {
          console.log(`Status: ${res.status}`);
          console.log('Body: ', res.data);
        if(res.data.status === 'SUCCESS'){
          agent.add("Serial number "+serialNumber+" has approved successfully.");
        }else{
          agent.add("Please try again.");
        }
      }).catch((err) => {
          console.error(err);
      });
    }else{
      console.log("consentHandle",pending_consent) ; 
    	data = { 
          "consentHandle": pending_consent.eventID,
          "otp": agent.parameters.consentOtp
   		 }; 
      return axios.post(BASE_HOST+PATH_CONSENT_ACTION_REJECT, data,options)
      .then((res) => {
          console.log(`Status: ${res.status}`);
          console.log('Body: ', res.data);
        if(res.data.status === 'SUCCESS'){
          agent.add("Serial number "+serialNumber+" has rejected successfully.");
        }else{
          agent.add("Please try again.");
        }
      }).catch((err) => {
          console.error(err);
      });
    }
  }
  
  function ConstentDetailhandler(agent){
  	var number = agent.parameters.consentNumber;
    //PATH_CONSENT_CONSENT_DETAIL
    var pending_consent = pending_arr[number-1];
    console.log("consentHandle",pending_consent.eventID) ; 
    const data = { 
          "consentHandle": pending_consent.eventID
   	}; 
    const options = {
  		headers: {
      		'sessionId': sessionId
  		}
	}; 
    return axios.post(BASE_HOST+PATH_CONSENT_CONSENT_DETAIL, data,options)
    .then((res) => {
        console.log(`Status: ${res.status}`);
        console.log('Body: ', res.data);
      if(res.status === 200){
        agent.add("Consent Detail");
        agent.add("Consent handle : "+res.data.consentHandle);
        agent.add("Consent FUI id : "+res.data.fiuID);
        agent.add("Consent FUI name : "+res.data.fiu_name);
        agent.add("Consent types : "+res.data.ConsentTypes);
        agent.add("Consent start date : "+res.data.consentStart);
        agent.add("Consent End Date : "+res.data.consentExpiry);
        agent.add("Consent Status : "+res.data.consentStatus);
      }else{
        agent.add("Please try again.");
      }
    }).catch((err) => {
        console.error(err);
    });
  }
  
 // function UserRejecthandler(agent){var reject = agent.parameters.reject;}
  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('UserProvidesPhoneNumber', UserProvidesPhoneNumberhandler);
  intentMap.set('UserProvidesOtp', UserProvidesOtphandler);
  intentMap.set('ListOfAllConsents', ListOfAllConsentshandler);
  intentMap.set('ActiveConsent', ActiveConsentshandler);
  intentMap.set('PendingConsent', PendingConsenthandler);
  intentMap.set('RejectedConsent', RejectedConsenthandler);
  intentMap.set('UserApproved',UseractionTypehandler);
  intentMap.set('UserReject',UseractionTypehandler);
 // intentMap.set('UserPendingListNumber',UserPendingListNumberhandler);
  intentMap.set('UserProvideConsentOtp',UserProvideConsentOtphandler);
  intentMap.set('ConstentDetail',ConstentDetailhandler);
  intentMap.set('Logout', Logouthandler);
  agent.handleRequest(intentMap);
});
