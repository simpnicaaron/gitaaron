// Author: Aaron Gw 連svr 20210730
'use strict';

//var net = require("net");
var tls = require("tls");
const utils = require("./test_gw/utils");
const RelayServerGwAddress = "svr.simpnic.com"; //rss.simpnic.com
const RelayServerGwPort = 9527;
// const GW_UID = "AAAA1A1CD27BC229CBEC";
const GW_UID = "simpnictestrid000010";//"simpnictestrid000005";
const KEEP_ALIVE_INTERVAL = 30000; // 30s
const username = "admin";
const password = "1";
const MAC = "00:06:19:31:A3:FA";//"00:22:33:44:55:88";

const PACKET_HEADER_SIZE = 4;
const PACKET_HEADER_PAYLOAD_OFFSET = 2;
const PACKET_HEADER_CID_OFFSET = 1;

const CID = 0;
var xorKey;
const print = console.log



// var devices = [

//     {
//         "nid": "wifi-301", "name": "adrian_bulb_rgb", "manufactureName": "adrian", "type": "LIGHT", "description": "Wi-Fi LIGHT", "reportState": true, "caps": [{ "interface": "ONOFF" }, { "interface": "BRIGHTNESS" },
//         {
//             "interface": "COLORSETTING",
//             "params": {
//                 "colorModel": "rgb",
//                 "commandOnlyColorSetting": false
//             }
//         }]
//     },
//     // {
//     //     "nid": "wifi-302", "name": "adrian_bulb_hsv", "manufactureName": "adrian", "type": "LIGHT", "description": "Wi-Fi LIGHT", "reportState": true, "caps": [{ "interface": "ONOFF" }, { "interface": "BRIGHTNESS" },
//     //     {
//     //         "interface": "COLORSETTING",
//     //         "params": {
//     //             "colorModel": "hsv",
//     //             "commandOnlyColorSetting": false
//     //         }

//     //     }]
//     // },
//     // {
//     //     "nid": "wifi-303", "name": "adrian_bulb_temperature", "manufactureName": "adrian", "type": "LIGHT", "description": "Wi-Fi LIGHT", "reportState": true, "caps": [{ "interface": "ONOFF" }, { "interface": "BRIGHTNESS" },
//     //     {
//     //         "interface": "COLORSETTING",
//     //         "params": {
//     //             "colorModel": "rgb",
//     //             "colorTemperatureRange": {
//     //                 "temperatureMinK": 2000,
//     //                 "temperatureMaxK": 9000
//     //             }
//     //         }
//     //     }]
//     // },
//     { "nid": "wifi-304", "name": "cts_bulb_rgb", "manufactureName": "CTS", "type": "LIGHT", "description": "Wi-Fi LIGHT", "reportState": true, "caps": [{ "interface": "ONOFF" }, { "interface": "BRIGHTNESS" }, { "interface": "COLORSPECTRUM" }] },
// ]

var devices = [
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

var bulb_state = {
    "nid": "wifi-301",
    "value": {

        "on": false,
        "brightness": 100,
    }
}
var bulb_states = []
var table={}
var table={} //map nid to array that saves for device info
for (var i = 0; i < devices.length; i++) {
    table[devices[i].nid]=i
    bulb_state.nid = devices[i].nid
    bulb_states.push(JSON.parse(JSON.stringify(bulb_state)));
}



function isValidChecksum(data, data_len) {
    var checksum = 0;
    var i = 1; // checksum starts with data[1], the first byte is the place holder for checksum itself
    for (i; i < data_len; i++) {
        // print( "checksum: " + checksum + " data[i]: " + data[i]) ;
        checksum += data[i];
    }
    // print("Final checksum: " + (checksum % 256) + " data[0]: " + data[0]) ;
    if ((checksum % 256) == data[0]) {
        return true;
    } else {
        print("invalid checksum!");
        return false;
    }
}

function getChecksum(data, data_len) {
    var checksum = 0;
    var i = 1; // checksum starts with data[1], the first byte is the place holder for checksum itself
    for (i; i < data_len; i++) {
        // print( "checksum: " + checksum + " data[i]: " + data[i]) ;
        checksum += data[i];
    }
    // print("Final checksum: " + checksum ) ;
    // print("(" + checksum % 256 + ")") ;
    return (checksum % 256);
}

function xorSendData(data, withHeader, client) {
    var stringfiedData = JSON.stringify(data);
    const buf = Buffer.from(stringfiedData);
    utils.xor_op(buf, xorKey);

    print(`xorSendData. ${stringfiedData}`);

    if (withHeader) {
        var data_len = new Buffer.alloc(PACKET_HEADER_SIZE);
    
        data_len[PACKET_HEADER_CID_OFFSET] = CID;
        data_len.writeUInt16BE(buf.length, PACKET_HEADER_PAYLOAD_OFFSET);
        var finalData = Buffer.concat([data_len, buf]);
        finalData[0] = getChecksum(finalData, finalData.length);
        client.write(finalData);
        print("send over")
    } else {
        client.write(buf);
        print(`write buf: ${buf.length} bytes`);
    }
}

function xorSendDataWithBinaryData(data, binaryData, withHeader, client) {
    var stringfiedData = JSON.stringify(data);
    var buf = Buffer.from(stringfiedData);

    buf = Buffer.concat([buf, binaryData]);

    utils.xor_op(buf, xorKey);

    print(`xorSendDataWithBinaryData. ${stringfiedData}`);

    if (withHeader) {
        var data_len = new Buffer.alloc(PACKET_HEADER_SIZE);
        var len = stringfiedData.length + binaryData.length;
        data_len[PACKET_HEADER_CID_OFFSET] = CID;
        data_len.writeUInt16BE(len, PACKET_HEADER_PAYLOAD_OFFSET);
        var finalData = Buffer.concat([data_len, buf]);
        finalData[0] = getChecksum(finalData, finalData.length);
        client.write(finalData);
    } else {
        client.write(buf);
        print(`write buf: ${buf.length} bytes`);
    }
}

function encryptSendData(data, withHeader, client, cid) {
    var stringfiedData = JSON.stringify(data);
    var encryptedData = utils.encrypt(cid, stringfiedData);
    var encryptedData_buf = Buffer.from(encryptedData, "hex");

    if (withHeader) {
        var data_len = new Buffer.alloc(PACKET_HEADER_SIZE);
        data_len[PACKET_HEADER_CID_OFFSET] = CID;
        data_len.writeUInt16BE(encryptedData_buf.length, PACKET_HEADER_PAYLOAD_OFFSET);
        var finalData = Buffer.concat([data_len, encryptedData_buf]);
        finalData[0] = getChecksum(finalData, finalData.length);
        client.write(finalData);
    } else {
        client.write(encryptedData_buf);
    }
}

function handleRequestWithBinaryData(client, jd, binaryData) {
    print("handleRequestWithBinaryData");
    print(JSON.stringify(jd));
    var meta = jd.meta;
    if (undefined == meta) {
        print("Error, invalid request, no meta object!");
        return;
    }
    var transId = jd.transId;
    var uid = jd.uid;
    if (uid != GW_UID) {
        meta.status = "ERROR";
        meta.statusCode = 400;
        meta.description = "Request to wrong device";
        return xorSendData(jd, true, client);
    }
    switch (meta.msgType) {
        case "custom":
            meta.status = "success";
            // xorSendData( jd, true, client ) ;

            var bd = new Buffer.alloc(5);
            bd[0] = 0;
            bd[1] = 176;
            bd[2] = 177;
            bd[3] = 178;
            bd[4] = 179;
            xorSendDataWithBinaryData(jd, bd, true, client);
            break;
        default:
            handleRequest(client, jd);
            break;
    }
}

function handleRequest(client, jd) {
    print("HandleRequest");
    print(JSON.stringify(jd));
    var meta = jd.meta;

    if (undefined == meta) {
        print("Error, invalid request, no meta object!");
        return;
    }
    var transId = jd.transId;
    var uid = jd.uid;
    if (uid != GW_UID) {
        meta.status = "ERROR";
        meta.statusCode = 400;
        meta.description = "Request to wrong device";
        return xorSendData(jd, true, client);
    }
    switch (meta.msgType) {
        case "custom":
            meta.status = "success";
            xorSendData(jd, true, client);
            break;

        case "AUTHORIZE":
            if ((username == meta.username) && (password == meta.password)) {
                print("Credential matched!! good ~~");
                meta.status = "SUCCESS";
                meta.statusCode = 200;
            } else {
                print("Credential incorrect!!");
                meta.status = "ERROR";
                meta.statusCode = 401;
                meta.description = "Unauthenticated";
            }
            delete meta.username;
            delete meta.password;
            xorSendData(jd, true, client);
            break;
        case "DISCOVER":
            print("DISCOVER~~");
            meta.status = "SUCCESS";
            meta.statusCode = 200;
            var sync_data =
            {
                "meta":
                {
                    "msgType": "DISCOVER",
                    "status": "SUCCESS",
                    "statusCode": "200"
                },
                "uid": uid,
                "transId": transId,
                "devices": devices
            };

            print(JSON.stringify(sync_data));
            // client.write(JSON.stringify(sync_data)) ;
            xorSendData(sync_data, true, client);
            break;

        //homegraph
        case "QUERY":
            print("QUERY~~");
            meta.status = "SUCCESS";
            meta.statusCode = 200;
            var query_devices = []
            // jd.devices.forEach(
            //     function (device) {
            //         print("device:",table[device])
            //         var device_info = {
            //             "nid": device,
            //             "states": bulb_states[table[device]].value
            //         }

            //         query_devices.push(JSON.parse(JSON.stringify(device_info)));
            //     }
            // )


            var query_data = {
                meta: meta,
                transId: transId,
                "uid": uid, // GW ID or MAC. needs to be unique
                "devices": "test",

                // [
                //         {
                //             "nid": jd.devices, 
                //                          "states": bulb_states[table[jd.devices]].value
                //         }

                // ]

                // {

                //     "nid": "aa-001",
                //     "states": {
                //         "on": true, // onoff
                //         "brightness": 25, // brightness
                //         "color": // colorSpectrum
                //         {
                //             "name": "red",
                //             "spectrumRGB": 12655639
                //         },
                //         // "lowerSetpoint": 20,
                //         // "targetSetpoint": 23,
                //         // "upperSetpoint": 25,
                //         // "thermostatMode": "COOL",
                //         // "thermostatTemperature": 23,
                //         // "thermostatHumidity": 30,
                //         // "thermoUnit": "CELSIUS"
                //         "colorTemp": {
                //             "name": "warm white",
                //             "temperature": 25000
                //         },
                //     }
                // },

                // {

                //     "nid": "aa-003",
                //     "states": {
                //         "on": true, // onoff
                //     }
                // },
                // {

                //     "nid": "aa-004",
                //     "states": {
                //         "on": false, // onoff
                //         "lowerSetpoint": 20,
                //         "targetSetpoint": 23,
                //         "upperSetpoint": 25,
                //         "thermostatMode": "COOL",
                //         "thermostatTemperature": 23,
                //         "thermostatHumidity": 30,
                //         "thermoUnit": "CELSIUS"
                //     }
                // },
                // {

                //     "nid": "aa-005",
                //     "states": {
                //         "on": false, // onoff
                //         "lowerSetpoint": 20,
                //         "targetSetpoint": 23,
                //         "upperSetpoint": 25,
                //         "thermostatMode": "COOL",
                //         "thermostatTemperature": 23,
                //         "thermostatHumidity": 30,
                //         "thermoUnit": "CELSIUS",
                //         "currentModeSettings":
                //         {
                //             "load": "large"
                //         }
                //     }
                // },




            };
            print(JSON.stringify(query_data));
            xorSendData(query_data, true, client);
            break;
        case "EXECUTE":
            print("EXECUTE~~");
            meta.status = "SUCCESS";
            meta.statusCode = 200;
            //bulb_states
            var exec_state = []
            for (var i = 0; i < jd.commands.length; i++) {
                print(jd.commands[i].value)
                Object.keys(jd.commands[i].value).forEach(function (interface_v) {
                    //jd.commands[i].devices : nid
                    //table : map nid to array that saves for device info
                    let nid = jd.commands[i].devices
                    print(bulb_states[table[nid]].value[interface_v])
                    bulb_states[table[nid]].value[interface_v] = jd.commands[i].value[interface_v]
                })


                //exec_state.push(JSON.parse(JSON.stringify(jd.commands[i].value))) ;//deep cope
            }
            var cmds = []
            var cmdtmp;
            
            for (var i = 0; i < jd.commands.length; i++) {
                let nid = jd.commands[i].devices
                cmdtmp = {
                    "command": jd.commands[i].command,
                    "status": "SUCCESS",
                    "nids": jd.commands[i].devices,
                    "states": bulb_states[table[nid]].value
                }
                cmds.push(JSON.parse(JSON.stringify(cmdtmp)));
            }


            var exec_data = {
                meta: meta,
                transId: transId,
                uid: uid, // GW ID or MAC. needs to be unique

                commands: cmds
                // [{
                //         "command": jd.commands[0].command, // Howard. 2019.3.12
                //         "status": "SUCCESS", // SUCCESS/PENDING/OFFLINE/ERROR
                //         // "status": "ERROR",

                //         "nids": jd.commands[0].devices,
                //         "states": // after execution
                //         {
                //             "on":true,
                //             "brightness": 66
                //         },
                //         /*"error":
                //         {
                //             "type": "tempOutOfRange",   // refers to errors.js. endpointUnreachable/tempOutOfRange/setpointsTooClose/unwillingToSetValue/thermostatOff
                //             "desc": "temperature is out of range"
                //         }*/
                //     }

                // ]
            };

            var vv = {};
            // switch (jd.commands[0].command) {
            //     case "ACTIVATESCENE":
            //     case "DEACTIVATESCENE":
            //         vv = {
            //             sceneTriggerSource: "VOICE_INTERACTION" // APP_INTERACTION, PHYSICAL_INTERACTION, PERIODIC_POLL. https://developer.amazon.com/docs/smarthome/state-reporting-for-a-smart-home-skill.html#cause-object
            //         }
            //         exec_data.commands[0].states = vv;
            //         break;
            //     case "ADJUSTBRIGHTNESS":
            //         vv = {
            //             brightness: 66
            //         }
            //         exec_data.commands[0].states = vv;
            //         break;
            //     case "ADJUSTPOWERLEVEL":
            //         vv = {
            //             powerLevel: 99 //jd.commands[0].value
            //         }
            //         exec_data.commands[0].states = vv;
            //         break;
            //     case "ADJUSTTARGETTEMPERATURE":
            //     case "RESUMESCHEDULE":
            //         vv = {
            //             // targetSetpoint: 25,
            //             lowerSetpoint: 20,
            //             upperSetpoint: 25,
            //             unit: "CELSIUS"
            //         }
            //         exec_data.commands[0].states = vv;
            //         break;
            //     default:
            //         exec_data.commands[0].states = jd.commands[0].value; // Howard. 2019.3.12
            //         break;
            // }

            print(JSON.stringify(exec_data));
            print("-----------------bulb_states--------------------\n",JSON.stringify(bulb_states),"\n-----------------bulb_states--------------------");

            xorSendData(exec_data, true, client);
            break;
        case "DISCONNECT":
            break;
    }
}

var cnt = 0;

function sleep(delay){
    for (var t = Date.now(); Date.now() - t <= delay;);
}

function destroy_client(c){
    sleep(1000);
    c.destroy();
    cnt++;
}


function fakeGw() {
    print("fakeGw running");
    var xorKey1 = MAC.split(":");
    var i;
    xorKey = [];
    for (i = 0; i < xorKey1.length; i++) {
        xorKey.push(Buffer.from(xorKey1[i], 'hex')[0]);
    }

    print("start connecting");
    var client = tls.connect(RelayServerGwPort, RelayServerGwAddress, null, function () {
        print("connected to server");

        print(cnt);

        var authData = {
            uid: GW_UID,
            timestamp: utils.toIso8601String(new Date()),
            mac: MAC
        }
        encryptSendData(authData, true, client, CID);
        setInterval(function () {
            //print("timer fires! send keepalive to Connection Server");
            var keepalive = {
                uid: GW_UID,
                keepalive: true
                
            };
            xorSendData(keepalive, true, client);
            // destroy_client(client);
        }, KEEP_ALIVE_INTERVAL);

        /*
        // request sync
        setInterval( function()
        {
            var requestSync = 
            {
                uid: GW_UID,
                meta:
                {
                    msgType: "REQUEST_SYNC"
                }
            }
            print("send request sync!") ;
            client.write( JSON.stringify(requestSync)) ;
            clearInterval(this) ;
        }, 1500) ;

        // report state
        setInterval( function()
        {
            var reportState = 
            {
                uid: GW_UID,
                meta:
                {
                    msgType: "REPORT_STATE"
                },
                devices:
                [
                    {

                        "nid": "aa-001",
                        "states":
                        {
                            "on": false
                        }
                    }
                ]
            }
            print("send report state!") ;
            client.write( JSON.stringify(reportState)) ;
            clearInterval(this) ;
        }, 3000) ;
        */
    });

    client.on("data", function (data) {
        //print(`RX data: ${data}, len: ${data.length}`) ;
        var validCS = isValidChecksum(data, data.length);
        print("validCS1: " + validCS);
        if (!validCS) {
            print("invalid checksum, discard packet!");
            return;
        }

        var header = data.slice(0, PACKET_HEADER_SIZE);
        print("payload len: " + header.readInt16BE(PACKET_HEADER_PAYLOAD_OFFSET));
        var buf = data.slice(PACKET_HEADER_SIZE);
        utils.xor_op(buf, xorKey);

        var indexOfZero = buf.indexOf(0);
        print("Rx buf indexOf(0): " + indexOfZero);
        var jd;
        if (-1 == indexOfZero) {
            jd = JSON.parse(buf);
        } else {
            jd = JSON.parse(buf.slice(0, indexOfZero));
            print("binary_data: " + buf.slice(indexOfZero).toString("hex"));
        }
        if ("REQUEST_SYNC" == jd.meta.msgType) {
            return;
        } else if ("REPORT_STATE" == jd.meta.msgType) {
            return;
        }
        if (-1 == indexOfZero) {
            return handleRequest(client, jd);
        } else {
            return handleRequestWithBinaryData(client, jd, buf.slice(indexOfZero));
        }
    });

    client.on("close", function () {
        print("socket closed");
        process.exit(0);
    });

}


print("start fake gw");
fakeGw();


var timesRun = 0;
var interval = setInterval(function(){
timesRun += 1;
if(timesRun === 60){
clearInterval(interval);
}
print("socket closed");
process.exit(0);
}, 10000); //10s後結束code
