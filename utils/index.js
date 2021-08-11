// Author: Howard Chang
'use strict' ;
const OAuth2 = require("../config/service_config").OAuth2 ;
const crypto = require('crypto') ;
const uuidv4 = require("uuid/v4") ;
const logger = require("../config/winston").logger ;

const GA_IDX = 0 ;
const AA_IDX = 1 ;
const TypeMapping =
{
    // [Assistant, Alexa]
    "AC": ["action.devices.types.AC_UNIT", "THERMOSTAT"],
    "LIGHT": ["action.devices.types.LIGHT", "LIGHT"],
    "SWITCH": ["action.devices.types.SWITCH", "SWITCH"],
    "OUTLET": ["action.devices.types.OUTLET", "SMARTPLUG"],
    "SCENE": ["action.devices.types.SCENE", "SCENE_TRIGGER"],
    "THERMOSTAT": ["action.devices.types.THERMOSTAT", "THERMOSTAT"],
    "WASHER": ["action.devices.types.WASHER", ""]
} ;

const InterfaceMapping =
{
    // [Assistant, Alexa]
    "ONOFF": ["action.devices.traits.OnOff", "Alexa.PowerController"],
    "BRIGHTNESS": ["action.devices.traits.Brightness", "Alexa.BrightnessController"],
    "SCENE": ["action.devices.traits.Scene", "Alexa.SceneController"],
    "COLORSPECTRUM": ["action.devices.traits.ColorSpectrum", "Alexa.ColorController"],
    "COLORTEMPERATURE": ["action.devices.traits.ColorTemperature", "Alexa.ColorTemperatureController"],
    "MODE": ["action.devices.traits.Modes", ""],
    "THERMOSTAT": ["action.devices.traits.TemperatureSetting", "Alexa.ThermostatController"],
}

const CommandMapping =  // for Google Assistant only
{
    "action.devices.commands.OnOff": "ONOFF",
    "action.devices.commands.BrightnessAbsolute": "BRIGHTNESS",
    "action.devices.commands.ActivateScene": "SCENE",
    "action.devices.commands.ColorAbsolute": "COLORSPECTRUM",
    "action.devices.commands.ColorAbsolute": "COLORTEMPERATURE",
    "action.devices.commands.ThermostatTemperatureSetpoint": "SETTARGETTEMPERATURE",
    "action.devices.commands.ThermostatTemperatureSetRange": "SETTARGETTEMPERATURE",
    "action.devices.commands.ThermostatSetMode": "SETTHERMOSTATMODE",
    "action.devices.commands.TemperatureRelative": "ADJUSTTARGETTEMPERATURE",
    "action.devices.commands.SetModes": "MODE",
}

const StateMapping =
{
    // for Google Assistant
    // GA to GW
    request:
    {
        "thermostatTemperatureSetpoint": "targetSetpoint",
        "thermostatTemperatureSetpointLow": "lowerSetpoint",
        "thermostatTemperatureSetpointHigh": "upperSetpoint",
        "thermostatMode": "thermostatMode",
        "brightness": "brightness",
        "on": "on",
        "color": "color",
        "updateModeSettings": "updateModeSettings",
    },

    // GW to GA
    response:
    {
        "targetSetpoint": "thermostatTemperatureSetpoint",
        "lowerSetpoint": "thermostatTemperatureSetpointLow",
        "upperSetpoint": "thermostatTemperatureSetpointHigh",
        "thermostatModes": "availableThermostatModes",
        "thermoUnit": "thermostatTemperatureUnit",
        "thermostatTemperature": "thermostatTemperatureAmbient",
        "thermostatHumidity": "thermostatHumidityAmbient",
        "thermostatMode": "thermostatMode",
        "brightness": "brightness",
        "on": "on",
        "color": "color",
        "availableModes": "availableModes",
        "currentModeSettings": "currentModeSettings",
    },

    // for Amazon Alexa
    alexa:
    {
        // only fields that need to be updated in the Discovery response will be listed here
        "thermostatModes": "supportedModes",
        "thermoScheduling": "supportsScheduling",
        "reversible": "supportsDeactivation",
    }
}

const NamespaceMapping =    // for Amazon Alexa only. [namespace, name]
{
    "brightness": ["Alexa.BrightnessController", "brightness"],
    "on": ["Alexa.PowerController", "powerState"],
    "powerLevel": ["Alexa.PowerLevelController", "powerLevel"],
    "lowerSetpoint": ["Alexa.ThermostatController", "lowerSetpoint"],
    "targetSetpoint": ["Alexa.ThermostatController", "targetSetpoint"],
    "upperSetpoint": ["Alexa.ThermostatController", "upperSetpoint"],
    "thermostatMode": ["Alexa.ThermostatController", "thermostatMode"],
}

const DirectiveMapping =    // for Amazon Alexa only
{
    /* format
    Alexa namespace:
    {
        request:
        {
            command name from Alexa:
            {
                value: the name of the key in the payload to retrieve the value from Alexa request
                command: converted command name for GW
                param: converted key to hold the value from Alexa for GW to read
            },
            ...
        },
        response:
        {
            command name from GW: converted name for the property name in the response to Alexa
            // If command name is misisng, meaning Alexa does NOT expect any property in the context array
        }
    }

    */
    "Alexa.BrightnessController":
    {
        request:
        {
            // command for GW
            AdjustBrightness: 
            {
                value: "brightnessDelta",   // @value is field in payload{}, where to retrieve the real value of the command from. -100 ~ 100, inclusive.
                command: "ADJUSTBRIGHTNESS",
                param: "brightnessDelta"    // @param is the parameter that GW is looking for. -100 ~ 100, inclusive
            },
            SetBrightness:
            {
                value: "brightness",        // 0 ~ 100, inclusive
                command: "BRIGHTNESS",
                param: "brightness"         // 0 ~ 100, inclusive
            }
        },
        response:
        {
            // context name of response to Alexa
            ADJUSTBRIGHTNESS: "brightness",
            BRIGHTNESS: "brightness",
            value: "brightness"             // used to retrieve the real value from the GW back
        }
    },
    "Alexa.PowerController":
    {
        request:
        {
            // command for GW
            TurnOn: 
            {
                command: "ONOFF",
                param: "on"
            },
            TurnOff:
            {
                command: "ONOFF",
                param: "on"
            }
        },
        response:
        {
            // context name of response to Alexa
            ONOFF: "powerState",     // ON or OFF
            value: "on"
        }
    },
    "Alexa.PowerLevelController":
    {
        request:
        {
            // command for GW
            SetPowerLevel: 
            {
                value: "powerLevel",    // 0 ~ 100, inclusive
                command: "POWERLEVEL",
                param: "powerLevel"     // 0 ~ 100, inclusive
            },
            AdjustPowerLevel:
            {
                value: "powerLevelDelta",   // -100 ~ 100, inclusive
                command: "ADJUSTPOWERLEVEL",
                param: "powerLevelDelta"    // -100 ~ 100, inclusive
            }
        },
        response:
        {
            // context name of response to Alexa
            POWERLEVEL: "powerLevel",           // 0 ~ 100, inclusive
            ADJUSTPOWERLEVEL: "powerLevel",     // 0 ~ 100, inclusive
            value: "powerLevel"
        }
    },
    "Alexa.SceneController":
    {
        request:
        {
            // command for GW
            Activate: 
            {
                command: "ACTIVATESCENE",
            },
            Deactivate:
            {
                command: "DEACTIVATESCENE",
            }
        },
        response:
        {
            // context name of response to Alexa
            ACTIVATESCENE: "ActivationStarted",
            DEACTIVATESCENE: "DeactivationStarted",
            value: "sceneTriggerSource"
            /*
            payload: 
            {
                cause:
                {
                    type: "VOICE_INTERACTION"   // APP_INTERACTION, PHYSICAL_INTERACTION, PERIODIC_POLL. https://developer.amazon.com/docs/smarthome/state-reporting-for-a-smart-home-skill.html#cause-object
                },
                timestamp: ISO8601
            }
            */
        }
    },
    "Alexa.ThermostatController":
    {
        request:
        {
            // command for GW
            SetTargetTemperature: 
            {
                command: "SETTARGETTEMPERATURE",
                param: "THERMOSTAT"
            },
            AdjustTargetTemperature:
            {
                command: "ADJUSTTARGETTEMPERATURE",
                param: "targetSetpointDelta"
            },
            SetThermostatMode:
            {
                value: "thermostatMode",
                command: "SETTHERMOSTATMODE",
                param: "thermostatMode"
            },
            ResumeSchedule:
            {
                command: "RESUMESCHEDULE"
            }
        },
        response:
        {
            // context name of response to Alexa
            SETTARGETTEMPERATURE: "targetSetpoint",
            ADJUSTTARGETTEMPERATURE: "AdjustTargetTemperature",
            SETTHERMOSTATMODE: "SetThermostatMode",
            RESUMESCHEDULE: "ResumeSchedule"
        }
    },
}

const Capabilities =    // for Amazon Alexa only. Discovery response
{
    "ONOFF": 
        {
            type: "AlexaInterface",
            interface: "Alexa.PowerController",
            version: 3,
            properties:
            {
                supported:
                [
                    {
                        name: "powerState"
                    }
                ],
                proactivelyReported: true,
                retrievable: true
            }
        },
    "BRIGHTNESS": 
        {
            type: "AlexaInterface",
            interface: "Alexa.BrightnessController",
            version: 3,
            properties:
            {
                supported:
                [
                    {
                        name: "brightness"
                    }
                ],
                proactivelyReported: true,
                retrievable: true
            }
        },
    "COLORTEMPERATURE": 
        {
            type: "AlexaInterface",
            interface: "Alexa.ColorTemperatureController",
            version: 3,
            properties:
            {
                supported:
                [
                    {
                        name: "colorTemperatureInKelvin"
                    }
                ],
                proactivelyReported: true,
                retrievable: true
            }
        },
    "COLORSPECTRUM": 
        {
            type: "AlexaInterface",
            interface: "Alexa.ColorController",
            version: 3,
            properties:
            {
                supported:
                [
                    {
                        name: "color"
                    }
                ],
                proactivelyReported: true,
                retrievable: true
            }
        },
    "THERMOSTAT": 
        {
            type: "AlexaInterface",
            interface: "Alexa.ThermostatController",
            version: 3,
            properties:
            {
                supported:
                [
                    {
                        name: "lowerSetpoint"
                    },
                    {
                        name: "targetSetpoint"
                    },
                    {
                        name: "upperSetpoint"
                    },
                    {
                        name: "thermostatMode"
                    }
                ],
                proactivelyReported: true,
                retrievable: true
            },
            configuration:
            {
                "supportsScheduling": false,
                "supportedModes": []
            }
        },
    "SCENE": 
        {
            type: "AlexaInterface",
            interface: "Alexa.SceneController",
            version: 3,
            supportsDeactivation: true
        },
    "POWERLEVEL": 
        {
            type: "AlexaInterface",
            interface: "Alexa.PowerLevelController",
            version: 3,
            properties:
            {
                supported:
                [
                    {
                        name: "powerLevel"
                    }
                ],
                proactivelyReported: true,
                retrievable: true
            }
        },
}

// process.env.TZ = 'Asia/Taipei' ;
function toIso8601String(d)
{
    function pad(n) {return n<10 ? '0'+n : n}
    var offset_hr_tmp = (d.getTimezoneOffset() / 60).toString().slice(0) ;  // Howard. 2018.8.9 changed from slice(1)
    var offset ;
    if( 0 < d.getTimezoneOffset() )
    {
        offset = "-".concat(String("00" + offset_hr_tmp ).slice(-2).concat("00")) ;
    }
    else
    {
        offset = "+".concat(String("00" + offset_hr_tmp ).slice(-2).concat("00")) ;
    }
    return d.getFullYear()+'-'
         + pad(d.getMonth()+1)+'-'
         + pad(d.getDate())+'T'
         + pad(d.getHours())+':'
         + pad(d.getMinutes())+':'
         + pad(d.getSeconds())+offset
}


function encrypt(text, mode)
{
    var cipher = crypto.createCipheriv(mode.Algorithm, mode.Key, mode.Iv) ;
    var crypted = cipher.update(text,'utf8','hex') ;
    crypted += cipher.final('hex') ;
    return crypted ;
}
 
function decrypt(text, mode)
{
    var decipher = crypto.createDecipheriv(mode.Algorithm, mode.Key, mode.Iv) ;
    var dec = decipher.update(text,'hex','utf8' )
    dec += decipher.final('utf8') ;
    return dec ;
}

function genAuthCode( uid )
{
    var now = new Date() ;
    var expiration = new Date(now.getTime() + OAuth2.AuthCode.Expires) ;
    var code = 
    {
        "uid": uid,
        "type": "AuthCode",
        "rand": uuidv4(),
        "expiration": toIso8601String(expiration)
    } ;
    // console.log("code: " + JSON.stringify(code)) ;
    return encrypt( JSON.stringify(code), OAuth2.AuthCode ) ;
}

function genToken( uid )
{
    var now = new Date() ;
    
    var code = 
    {
        "uid": uid,
        "type": "Token",
        "rand": uuidv4()
    }
    if( OAuth2.Token.Expires )
    {
        // token expires in OAuth2.Token.Expires ms
        var expiration = new Date(now.getTime() + OAuth2.Token.Expires) ;
        code.expiration = toIso8601String(expiration) ;
    }
    /*
    var expiration = new Date(now.getTime() + OAuth2.Token.Expires) ;
    var code = 
    {
        "uid": uid,
        "type": "Token",
        "rand": uuidv4(),
        "expiration": toIso8601String(expiration)
    } ;
    */
    // console.log("code: " + JSON.stringify(code)) ;
    return encrypt( JSON.stringify(code), OAuth2.Token ) ;
}

function genRefreshToken( uid )
{
    var now = new Date() ;
    var expiration = new Date(now.getTime() + OAuth2.Refresh.Expires) ;
    var code = 
    {
        "uid": uid,
        "type": "RefreshToken",
        "rand": uuidv4(),
        "expiration": toIso8601String(expiration)
    } ;
    // console.log("code: " + JSON.stringify(code)) ;
    return encrypt( JSON.stringify(code), OAuth2.Refresh ) ;
}

function validateAuthCode( code )
{
    var out = decrypt( code, OAuth2.AuthCode) ;
    try
    {
        var oo = JSON.parse(out) ;
        logger.debug(`validateAuthCode: ${JSON.stringify(oo)}`) ;
        if( oo.type == "AuthCode" )
        {
            var now = new Date().getTime() ;
            var expire = Date.parse(oo.expiration) ;
            if( expire > now )
            {
                logger.debug(`valid authCode`) ;
                return oo ;
            }
        }
    }
    catch(ex)
    {
        logger.error(ex) ;
    }
}

function validateToken( token )
{
    var out = decrypt( token, OAuth2.Token) ;
    try
    {
        var oo = JSON.parse(out) ;
        logger.debug(`validateToken: ${JSON.stringify(oo)}`) ;
        if( oo.type == "Token" )
        {
            if( oo.expiration )
            {
                var now = new Date().getTime() ;
                var expire = Date.parse(oo.expiration) ;
                if( expire > now )
                {
                    logger.debug(`valid token`) ;
                    return oo ;
                }    
            }
            else
            {
                // token never expires
                return oo ;
            }
            /*
            var expire = Date.parse(oo.expiration) ;
            if( expire > now )
            {
                return oo ;
            }
            */
        }
    }
    catch(ex)
    {
        logger.error(ex) ;
    }
}

function validateRefreshToken( rtoken )
{
    var out = decrypt( rtoken, OAuth2.Refresh) ;
    try
    {
        var oo = JSON.parse(out) ;
        logger.debug(`validateRefreshToken: ${JSON.stringify(oo)}`) ;
        if( oo.type == "RefreshToken" )
        {
            var now = new Date().getTime() ;
            var expire = Date.parse(oo.expiration) ;
            if( expire > now )
            {
                logger.debug(`valid refresh token`) ;
                return oo ;
            }
        }
    }
    catch(ex)
    {
        logger.error(ex) ;
    }
}

module.exports =
{
    toIso8601String,
    genAuthCode,
    genToken,
    genRefreshToken,
    validateAuthCode,
    validateToken,
    validateRefreshToken,
    TypeMapping,
    InterfaceMapping,
    CommandMapping,
    Capabilities,
    // AttributeMapping,
    StateMapping,
    NamespaceMapping,
    DirectiveMapping,
    GA_IDX,
    AA_IDX
}
