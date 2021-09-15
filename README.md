## RAT_Tools

主要用於Rat的測試工具存放。



## Funtions

- authorize_healthcheck.js

  測試authorize server是否還存活，成功會回傳status code 200。



- authorize_post.js

  使用前須先啟用 `fakegw_tls.js`

  同時 `uid` 需相同才能正常使用

  主要模擬 voice control 流程

  1. 測試 `/oauth2` 正常，則回 status code `200`
  2. Post `/authroize` to get `Grant Code` 
  3. Post `/token` to get `access_token` & `refresh_token` 
  4. Compare `device list` with `fakegw_tls.js`
     1. Discover `/ibobby`
     2. Discover `/google_assistant`
     3. Discover `/amazon_alexa`



- fakegw_tls.js

  建立一個測試用GW，搭配 `authorize_post.js` 使用，使用前須使用 `npm i`，來下載必備模組，並且將test_gw資料夾放在根目錄下，成功啟用後每30s會發送一次keep live。

