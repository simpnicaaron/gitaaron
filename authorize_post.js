// Author: Aaron   authorize  post發送 20210809 

const https = require('https');//連線模組
const hostname='svr.simpnic.com';
const port=443;
const client_id='aa_cid';
const redirect_uri='https://pitangui.amazon.com/api/skill/link/M22VZ4V3N33XJZ';
const client_secret='DAxg5ciBea'; //Alexa暫時不需要
const uid='simpnictestrid000010';


//----------------------------------------gwdevices--------------------------------------------//

const gwdevices = [
    {
        "nid": "zw-012",
        "name": "Roller Shutter 3FE00C",
        "manufactureName": "CTS",
        "type": "SWITCH",
        "description": "Z-Wave SWITCH",
        "reportState": true,
        "caps": [
        {
        "interface": "ONOFF"
        },
        {
        "interface": "POWERLEVEL"
        }
        ]
        },
    {
      "nid": "wifi-303",
      "name": "智慧接觸感應器_CD857E",
      "manufactureName": "SiMPNiC",
      "type": "CONTACTSENSOR",
      "description": "Wi-Fi CONTACTSENSOR",
      "reportState": true,
      "caps": [
        {
          "interface": "OPENCLOSE",
          "params": {
            "queryOnlyOpenClose": true,
            "discreteOnlyOpenClose": true
          }
        }
      ]
    },

    
]
const gwdevices1 = (gwdevices[0].nid);
const gwdevices2 = (gwdevices[1].nid);

const gwdevicesnid=(gwdevices1+','+gwdevices2);
// console.log(gwdevicesnid);
 
// -----------------------------------oauth2-------------------------------------------------//

function oauth2(){
    const options = {
        hostname: hostname,
        port: port,
        path: "/oauth2?response_type=code&client_id=aa_cid&redirect_uri=https://pitangui.amazon.com/api/skill/link/M22VZ4V3N33XJZ&state=EXAMPLEXKPAtB4RCiMSIMPNICDSypo2LNvmAKCTESTYYj6FuQFmHoRdSTATE&user_locale=en",
        method: 'GET',

        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en'
        }
    };

    const req = https.request(options, (res) => {
         console.log('/oauth2 statusCode:', res.statusCode,'\n');  // output
        // console.log('headers:', res.headers);
   // const oauthstatus = res.statusCode;
    const oauthstatus = res.statusCode;
    reqgrantcode(oauthstatus);

        res.on('data', (d) => {
            //process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    req.end();
}
oauth2();
// -----------------------------------req grant code-------------------------------------------------//
function reqgrantcode(oauthstatus){
    if(oauthstatus===200){
const codebody = JSON.stringify({
    uid: uid,
    username: 'admin',
    password: '1',
    redirect_uri: redirect_uri,
    client_id: client_id,
    state: 'EXAMPLEXKPAtB4RCiMSIMPNICDSypo2LNvmAKCTESTYYj6FuQFmHoRdSTATE'
})

const codeoptions = {
    hostname: hostname,
    port: port,
    path: '/authorize',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': codebody.length,
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US'
    }
};

let reqgrant = https.request(codeoptions, (res) => {
    //  console.log('statusCode:', res.statusCode);
    //  console.log('headers:', res.headers);
    //  console.log(res.headers.location);

    const grantcode = res.headers.location;
    const regexp = /code=(?<firstname>\w+)&state/mg;
    const testcode = regexp.exec(grantcode);

    // console.log(testcode.groups.firstname);

    const code = (testcode.groups.firstname);
    console.log('Grant code:', code,'\n');  // output
    reqtoken(code);

    res.on('data', (d) => {
        //   process.stdout.write(d);
    });
});

reqgrant.on('error', function (e) {
    console.log('problem with request: ' + e.message);
});

// console.log('post',body);
reqgrant.write(codebody);
reqgrant.end();

    }else{
        console.log('oauthstatus error');
    }

}
// -----------------------------------req token-------------------------------------------------//
function reqtoken(code) {

    const tokenbody = JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
        client_id: client_id,
        // client_secret: client_secret //Alexa暫時不需要
    })

    const tokenoptions = {
        hostname: hostname,
        port: port,
        path: '/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': tokenbody.length,
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US'
        }
    };

    let reqt = https.request(tokenoptions, (rest) => {
        //    console.log('statusCode:', rest.statusCode);
        //    console.log('headers:', rest.headers);
        //console.log('res:', rest);

        rest.on('data', (data) => {
            //tokendata=process.stdout.write(data);

            tokendata = (data.toString());

            const access_token_regexp = /access_token":"(?<access_token_data>\w+)","/mg; //access_token
            const access_token_exec = access_token_regexp.exec(tokendata);
            const access_token = (access_token_exec.groups.access_token_data);
           console.log('access_token:', access_token,'\n'); // output

            AlexaDiscovery(access_token);
            ibobbyDiscovery(access_token);
            googleassistantDiscovery(access_token);

            const refresh_token_regexp = /refresh_token":"(?<refresh_token_data>\w+)","/mg;  //refresh_token
            const refresh_token_exec = refresh_token_regexp.exec(tokendata);
            const refresh_token = (refresh_token_exec.groups.refresh_token_data);
           console.log('refresh_token:', refresh_token,'\n'); // output

        });
    });

    reqt.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });

    reqt.write(tokenbody);
    reqt.end();


}
//----------------------------------------AlexaDiscovery----------------------------------------------//
function AlexaDiscovery(access_token) {
  
    const testdata ={
      "directive": {
        "header": {
          "namespace": "Alexa.Discovery",
          "name": "Discover",
          "payloadVersion": "3",
          "messageId": "a5da1b79-fa38-4c38-8478-e7472b04cf8a"
        },
        "payload": {
          "scope": {
            "type": "BearerToken",
            "token": access_token
          }
        }
      }
    }



    const options = {
        hostname: hostname,
        port: port,
        path: '/amazon_alexa',//ibobby //amazon_alexa //google_assistant
        method: 'POST',

        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            "Authorization": "Bearer " + access_token,   //token
        }


    };

    const req = https.request(options, (res) => {
      //  console.log('commnd statusCode:', res.statusCode,'\n');
      //  console.log('headers:', res.headers);

        res.on('data', (data) => {

        const Alexacommnd = (data.toString());
        

        //   console.log(Alexacommnd);

          const Alexa_nid_regexp1 = /({"endpointId":"(?<Alexa_nid_1>\w+-\w+))/mg; //nid
          const Alexa_nid_regexp2 = /(},{"endpointId":"(?<Alexa_nid_2>\w+-\w+))/mg; //nid

          const Alexa_nid_exec1 = Alexa_nid_regexp1.exec(Alexacommnd);
          const Alexa_nid_exec2 = Alexa_nid_regexp2.exec(Alexacommnd);    

          const Alexa_nid1 = (Alexa_nid_exec1.groups.Alexa_nid_1);
          const Alexa_nid2 = (Alexa_nid_exec2.groups.Alexa_nid_2);

          const Alexa_nid=(Alexa_nid1+','+Alexa_nid2);

        //   console.log(Alexa_nid);

          if(gwdevicesnid===Alexa_nid){
              console.log('Alexa devices list good');
              console.log('Alexa','\n',Alexacommnd,'\n'); // output
          }else{
              console.log('Alexa devices list different');
          }

        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    const postData = JSON.stringify(testdata);
    req.write(postData);
    req.end();

}
//----------------------------------------ibobbyDiscovery--------------------------------------------//
function ibobbyDiscovery(access_token) {
    
    var testdata =
    { 'meta': { 'msgType': 'DISCOVER' }, 'uid': uid, };



    const options = {
        hostname: hostname,
        port: port,
        path: '/ibobby',//ibobby //amazon_alexa //google_assistant
        method: 'POST',

        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            "Authorization": "Bearer " + access_token,   //token
        }


    };

    const req = https.request(options, (res) => {
      //  console.log('commnd statusCode:', res.statusCode,'\n');
      //  console.log('headers:', res.headers);

        res.on('data', (data) => {

            const ibobbycommnd = (data.toString());


           
            const ibobby_nid_regexp1 = /("nid":"(?<ibobby_nid_1>\w+-\w+))/mg; //nid
            const ibobby_nid_regexp2 = /(},{"nid":"(?<ibobby_nid_2>\w+-\w+))/mg; //nid

            const ibobby_nid_exec1 = ibobby_nid_regexp1.exec(ibobbycommnd);
            const ibobby_nid_exec2 = ibobby_nid_regexp2.exec(ibobbycommnd);    

            const ibobby_nid1 = (ibobby_nid_exec1.groups.ibobby_nid_1);
            const ibobby_nid2 = (ibobby_nid_exec2.groups.ibobby_nid_2);

            const ibobby_nid=(ibobby_nid1+','+ibobby_nid2);
            //console.log(ibobby_nid);

            if(gwdevicesnid===ibobby_nid){
                console.log('ibobby devices list good');
                console.log('ibobby','\n',ibobbycommnd,'\n');
            }else{
                console.log('ibobby devices list different');
            }

        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    const postData = JSON.stringify(testdata);
    req.write(postData);
    req.end();

}
//----------------------------------------googleassistantDiscovery--------------------------------------------//
function googleassistantDiscovery(access_token) {

    const testdata ={
        "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
        "inputs": [{
          "intent": "action.devices.SYNC"
        }]
    }
    const options = {
        hostname: hostname,
        port: port,
        path: '/google_assistant',//ibobby //amazon_alexa //google_assistant
        method: 'POST',

        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            "Authorization": "Bearer " + access_token,   //token
        }


    };

    const req = https.request(options, (res) => {
      //  console.log('commnd statusCode:', res.statusCode,'\n');
      //  console.log('headers:', res.headers);

        res.on('data', (data) => {

          const googleassistantcommnd = (data.toString());

          const googleassistant_nid_regexp1 = /({"id":"(?<googleassistant_nid_1>\w+-\w+))/mg; //nid
          const googleassistant_nid_regexp2 = /(},{"id":"(?<googleassistant_nid_2>\w+-\w+))/mg; //nid

          const googleassistant_nid_exec1 = googleassistant_nid_regexp1.exec(googleassistantcommnd);
          const googleassistant_nid_exec2 = googleassistant_nid_regexp2.exec(googleassistantcommnd);    

          const googleassistant_nid1 = (googleassistant_nid_exec1.groups.googleassistant_nid_1);
          const googleassistant_nid2 = (googleassistant_nid_exec2.groups.googleassistant_nid_2);

          const googleassistant_nid=(googleassistant_nid1+','+googleassistant_nid2);
        //   console.log(googleassistant_nid);

          if(gwdevicesnid===googleassistant_nid){
              console.log('googleassistant devices list good');
              console.log('googleassistan','\n',googleassistantcommnd,'\n');

          }else{
              console.log('googleassistant devices list different');
          }

        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    const postData = JSON.stringify(testdata);
    req.write(postData);
    req.end();

}

