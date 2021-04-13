# 🚀 appium-ares

[![NPM version](http://img.shields.io/npm/v/appium-ares.svg)](https://npmjs.org/package/appium-ares)
[![Downloads](http://img.shields.io/npm/dm/appium-ares.svg)](https://npmjs.org/package/appium-ares)

A wrapper over LG webOS ares, implemented using ES6 and along with async/await. This package is mainly used by Appium to perform all ares operations on smart tv's LG device.

## 🚀 Usage:

Prerequisites:
_ node 8.x or above
_ npm
_ LG SDK installed with emulators V3.0.0 or above
_ Set the environment variables with the route of your LG SDK installation.

    - (FOR MAC)
    ARES_HOME=/opt/webOS_TV_SDK/CLI
    export PATH=$PATH:$ARES_HOME/bin:$PATH
    export PATH=$PATH:/opt/webOS_TV_SDK/CLI/bin:$PATH

- Import the library appium-ares (npm install appium-ares) as a dependency.
- Define the variables to use.

example:

```js
import ARES from "appium-ares";

const ares = new ARES();

await ares.createARES({
  device = "home",
  pkgFromPath = "/Users/username/documents/SmartTVWorkspace/com.applg-webos-_0.0.1_all.ipk",
  pkg = "com.applg-webos"
});
```

### 🚀 List of methods:

- `createARES()`
- `getConnectedDevices()`
- `getConnectedDevicesInfo()`
- `getConnectDevice(device)`
- `install(device, pkgFromPath)`
- `uninstall(device, pkg)`
- `isAppInstalled(device, pkg)`
- `isStartedApp(device, pkg)`
- `startApp(device, pkg)`
- `closeApp(device, pkg)`
- `createDevice()`
- `getKey(device)`
- `removeDevice(device)`
- `webInspector(device, pkg)`

### 🚀 Create Device method:

Tips:

- To create a device you can use this library or follow the steps in LG Official documentation http://webostv.developer.lge.com/sdk/tools/using-webos-tv-cli/
- This method works to create, modify, and remove devices.
- The device name shouldn't have spaces or hyphens (-).
- The user that you should use is "prisoner".
- You can leave the password empty, just press enter.
- The host or IP for your device connection. Default is 127.0.0.1. You can get the IP on your Developer Mode App.
- If you want to change the port, feel free to change it. The default is 9922 for LG TV and 6622 for the emulator.
- The key server should be ON in the Developer Mode app.

<img alt="The Key Server button on the Developer Mode app" src="http://webostv.developer.lge.com/download_file/view_inline/2099/" style="width: 537px; height: 302px;"/>

```js
import ARES from "appium-ares";

async function createDeviceAres() {
  let ares = await ARES.createARES();
  let result = await ares.createDevice();
  return result;
}
createDeviceAres();
```

### 🚀 get SSH Key Device method:

GET the SSH file name `getKey(device)` when you have an LG TV connected. "device" is the name that you put it when created it. Remember, for this method you need to have the Developer Mode activated on your device. https://webostv.developer.lge.com/develop/app-test/

### 🚀 Web Inspector method:

Inspect your application installed on your device using the Google Chrome or Chromium (Strongly recommended) web inspector with the `webInspector(device, pkg)` method.
