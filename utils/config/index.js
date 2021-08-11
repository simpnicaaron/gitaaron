// Author: Howard Chang
'use strict';
const Config =
{
    Encryption: {},
};

Config.Encryption.Algorithm = "aes-256-cbc";
Config.Encryption.Key =
    [
        Buffer.from('0e0bea120ebacdf008eaa1b7f02a61ef6769fee2f129b4ed51039a03f1831fe1', 'hex'),
        Buffer.from('39c5c5ec6b3b409cba3167ca656b68ffbab8104841d0404485fc08eeb30fb838', 'hex')
    ];
Config.Encryption.Iv =
    [
        Buffer.from('9af62fc12cbed8ec3ea4d69b41e5d6e0', 'hex'),
        Buffer.from('78a180e49ea14dfc85a3fbfe85e82131', 'hex')
    ]

module.exports =
{
    Config
}
