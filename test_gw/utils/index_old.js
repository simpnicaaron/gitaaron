// Author: Howard Chang
'use strict' ;

const crypto = require('crypto') ;
const Cfg = require("./config").Config ;
const mysql = require('mysql') ;


const PACKET_HEADER_SIZE = 4;
const PACKET_HEADER_BIG_SIZE = 8;
const PACKET_HEADER_CID_OFFSET = 1;
const PACKET_HEADER_PAYLOAD_OFFSET = 2;
const PACKET_HEADER_PAYLOAD_BIG_OFFSET = 4;
const UINT16BE = 65535

function encrypt(cid, text)
{
    console.log(text) ;
    var mode = Cfg.Encryption ;
    if( cid >= mode.Key.length )
    {
        return null ;
    }
    var cipher = crypto.createCipheriv(mode.Algorithm, mode.Key[cid], mode.Iv[cid]) ;
    var crypted = cipher.update(text,'utf8','hex') ;
    crypted += cipher.final('hex') ;
    return crypted ;
}
 
function decrypt(cid, text)
{
    var mode = Cfg.Encryption ;
    if( cid >= mode.Key.length )
    {
        return null ;
    }
    try{
        var decipher = crypto.createDecipheriv(mode.Algorithm, mode.Key[cid], mode.Iv[cid]) ;    
    }catch(err){
        console.log("[ERROR] text : ",text,"err msg :",err)
    }
    var decipher = crypto.createDecipheriv(mode.Algorithm, mode.Key[cid], mode.Iv[cid]) ;
    var dec = decipher.update(text,'hex','utf8' )
    dec += decipher.final('utf8') ;
    return dec ;
}

function xor_op( data, key )
{
    var i, k ;
    var len = data.length ;
    var key_len = key.length ;
    for( i = 0, k = 0 ; i < len ; i++ )
    {
        data[i] ^= key[k] ;
        if( ++k == key_len )
        {
            k = 0 ;
        }
    }
}

function toIso8601String(d)
{
    function pad(n) {return n<10 ? '0'+n : n}
    let zone=d.getTimezoneOffset()/60;
    let tmp=0;
    let sign='+';
    if(zone<0){
        tmp=zone*(-100);
        sign='+';
    }else{
        tmp=zone*100;
        sign='-';
    }
    tmp=tmp.toString()
    var tmplen=tmp.length;
    for(var i=0;i<(4-tmplen);i++){
        tmp=0+tmp;
    }
    return d.getFullYear()+'-'
         + pad(d.getMonth()+1)+'-'
         + pad(d.getDate())+'T'
         + pad(d.getHours())+':'
         + pad(d.getMinutes())+':'
         + pad(d.getSeconds())+
        sign+
        tmp    
}


function getChecksum(data, data_len) {
    var checksum = 0;
    var i = 1; // checksum starts with data[1], the first byte is the place holder for checksum itself
    for (i; i < data_len; i++) {
        // console.log( "checksum: " + checksum + " data[i]: " + data[i]) ;
        checksum += data[i];
    }
    // console.log("Final checksum: " + checksum ) ;
    // console.log("(" + checksum % 256 + ")") ;
    return (checksum % 256);
}

function isValidChecksum(data, data_len) {
    var checksum = 0;
    var i = 1; // checksum starts with data[1], the first byte is the place holder for checksum itself
    for (i; i < data_len; i++) {
        // console.log( "checksum: " + checksum + " data[i]: " + data[i]) ;
        checksum += data[i];
    }
    // console.log("Final checksum: " + (checksum % 256) + " data[0]: " + data[0]) ;
    if ((checksum % 256) == data[0]) {
        return true;
    }
    else {
        return false;
    }
}

function packageXorData(stringfiedData,xorKey){
    var buf = Buffer.from(stringfiedData);
    xor_op(buf,xorKey);

    if (buf.length > UINT16BE){
        var data_len = new Buffer.alloc(PACKET_HEADER_BIG_SIZE);
        data_len.writeUInt32BE(buf.length, PACKET_HEADER_PAYLOAD_BIG_OFFSET);
    }else{
        var data_len = new Buffer.alloc(PACKET_HEADER_SIZE);
        data_len.writeUInt16BE(buf.length, PACKET_HEADER_PAYLOAD_OFFSET);
    }

    var finalData = Buffer.concat([data_len, buf]);
    finalData[0] = getChecksum(finalData, finalData.length);
    return finalData
}

function packageXorBinaryData(stringfiedData,binaryData,xorKey){
    var buf = Buffer.from(stringfiedData);
    buf = Buffer.concat([buf, binaryData]);
    xor_op(buf,xorKey);

    if (buf.length > UINT16BE){
        var data_len = new Buffer.alloc(PACKET_HEADER_BIG_SIZE);
        data_len.writeUInt32BE(buf.length, PACKET_HEADER_PAYLOAD_BIG_OFFSET);
    }else{
        var data_len = new Buffer.alloc(PACKET_HEADER_SIZE);
        data_len.writeUInt16BE(buf.length, PACKET_HEADER_PAYLOAD_OFFSET);
    }

    var finalData = Buffer.concat([data_len, buf]);
    finalData[0] = getChecksum(finalData, finalData.length);
    return finalData
}

function packageData(stringfiedData){
    var buf = Buffer.from(stringfiedData);

    if (buf.length > UINT16BE){
        var data_len = new Buffer.alloc(PACKET_HEADER_BIG_SIZE);
        data_len.writeUInt32BE(buf.length, PACKET_HEADER_PAYLOAD_BIG_OFFSET);
    }else{
        var data_len = new Buffer.alloc(PACKET_HEADER_SIZE);
        data_len.writeUInt16BE(buf.length, PACKET_HEADER_PAYLOAD_OFFSET);
    }

    var finalData = Buffer.concat([data_len, buf]);
    finalData[0] = getChecksum(finalData, finalData.length);
    return finalData
}

function packageBinaryData(stringfiedData,binaryData){
    var buf = Buffer.from(stringfiedData);
    buf = Buffer.concat([buf, binaryData]);

    if (buf.length > UINT16BE){
        var data_len = new Buffer.alloc(PACKET_HEADER_BIG_SIZE);
        data_len.writeUInt32BE(buf.length, PACKET_HEADER_PAYLOAD_BIG_OFFSET);
    }else{
        var data_len = new Buffer.alloc(PACKET_HEADER_SIZE);
        data_len.writeUInt16BE(buf.length, PACKET_HEADER_PAYLOAD_OFFSET);
    }

    var finalData = Buffer.concat([data_len, buf]);
    finalData[0] = getChecksum(finalData, finalData.length);
    return finalData
}

function collectData(c, data) {
    var data_len = data.length;
    var validCS = false;
    if ((0 == c.payload_len) && (PACKET_HEADER_SIZE <= data_len)) {
        if (undefined == c.cid) {
            c.cid = data[PACKET_HEADER_CID_OFFSET];
        }
        var payload_len = data.readUInt16BE(PACKET_HEADER_PAYLOAD_OFFSET);
        // var header = data.slice(0,8)
        // console.log(`[${c.uid}] header ${header}`)
        if (payload_len == 0){
            c.header_len = PACKET_HEADER_BIG_SIZE
            payload_len = data.readUInt32BE(PACKET_HEADER_PAYLOAD_BIG_OFFSET);
            var remaining_len = data_len - PACKET_HEADER_BIG_SIZE ;
            var header = data.slice(0,PACKET_HEADER_BIG_SIZE)
        }else{
            c.header_len = PACKET_HEADER_SIZE
            var header = data.slice(0,PACKET_HEADER_SIZE)
            var remaining_len = data_len - PACKET_HEADER_SIZE;
        }
        
        if (payload_len == remaining_len) {
            c.payload_len = 0;
            validCS = isValidChecksum(data, data.length);
            //console.log( "validCS1: " + validCS ) ;
            if (validCS) {
                c.rxRequests.push(data.slice(c.header_len));
            }
        }
        else if (payload_len < remaining_len) {
            // multiple requests in one shot
            var toGo = c.header_len + payload_len;
            validCS = isValidChecksum(data, toGo);//data.length ) ;	// Howard. 2019.7.18
            //console.log( "validCS2: " + validCS ) ;
            if (validCS) {
                c.rxRequests.push(data.slice(c.header_len, toGo));
            }else{
                console.log(`[WARN] Disconnect it! UID: ${c.UID}`);
                c.socket.destroy();
            }
            c.payload_len = 0;
            collectData(c, data.slice(toGo));
        }
        else if (payload_len > remaining_len) {
            // not enough data for this request
            c.payload_len = payload_len;
            // c.full_data = data.slice(PACKET_HEADER_SIZE);
            c.full_data = data
        }
    }
    else if (c.full_data != undefined) {
        if (c.payload_len+c.header_len > (c.full_data.length + data.length)) {
            c.full_data = Buffer.concat([c.full_data, data]);
        }
        else if (c.payload_len+c.header_len < (c.full_data.length + data.length)) {
            var toGo = c.payload_len+c.header_len - c.full_data.length;
            c.full_data = Buffer.concat([c.full_data, data.slice(0, toGo)]);
            validCS = isValidChecksum(c.full_data, c.full_data.length);
            //console.log( "validCS3: " + validCS ) ;
            if (validCS) {
                c.rxRequests.push(c.full_data.slice(c.header_len));
            }else{
                c.socket.destroy();
            }
            c.payload_len = 0;
            collectData(c, data.slice(toGo));
        }
        else {
            var d = Buffer.concat([c.full_data, data]);
            validCS = isValidChecksum(d, d.length);
            //console.log( "validCS4: " + validCS ) ;
            if (validCS) {
                c.rxRequests.push(d.slice(c.header_len));
            }
            c.payload_len = 0;
            // c.header_len = PACKET_HEADER_SIZE
        }
    }
    return;
}



module.exports =
{
    xor_op,
    encrypt,
    decrypt,
    toIso8601String,
    packageXorData,
    packageXorBinaryData,
    getChecksum,
    collectData,
    packageData,
    packageBinaryData
}
