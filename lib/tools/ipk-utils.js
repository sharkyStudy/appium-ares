import log from '../logger.js';

let ipkUtilsMethods = {};

ipkUtilsMethods.isAppInstalled = async function isAppInstalled (pkg) {
  try {
    let stdout = await this.aresExec(this.executableInstall, ['--device', this.udid, '--list']);
    return stdout.includes(pkg);
  } catch (e) {
    log.errorAndThrow(
      `Error finding if app is installed. Original error: ${e.message}`
    );
  }
};

ipkUtilsMethods.isWebAppInstalled = async function isWebAppInstalled (pkg) {
  let stdout;
  try {
    if (pkg != null) {
      let stdout = await this.aresExec(this.executableInstall, ['--device', this.udid, '--list', '--type', 'web']);
      return stdout.includes(pkg);
    } else {
      log.debug(
        `No package name included, skipping...`
      );
      return false;
    }
  } catch (e) {
    log.errorAndThrow(
      `Error finding if app is installed. Original error: ${e.message}`
    );
  }
  return stdout.includes(pkg);
};

ipkUtilsMethods.startApp = async function startApp (pkg, opts) {
  try {
    log.debug(`Getting start app for ${pkg}`);
    let started = await this.isStartedApp(pkg);

    if (started) {
      await this.closeApp(pkg);
      log.debug(
        `The app ${pkg} was launched previously. The webOS driver has closed and open it again!`
      );
      let stdout = await this.aresExec(this.executableLaunch, ['--device', this.udid, pkg], opts);
      return stdout.includes('Success');
    } else {
      let stdout = await this.aresExec(this.executableLaunch, ['--device', this.udid, pkg], opts);
      log.debug(`The app ${pkg} was launched.`);
      return stdout.includes('Success');
    }
  } catch (e) {
    log.errorAndThrow(
      `Error occured while starting App. Original error: ${e.message}`
    );
  }
};

ipkUtilsMethods.isStartedApp = async function isStartedApp (pkg) {
  try {
    log.debug(`Getting app startup status for ${pkg}`);
    let stdout = await this.aresExec(this.executableLaunch, ['--device', this.udid, '--running']);
    return stdout.includes(pkg);
  } catch (e) {
    log.errorAndThrow(
      `Error occured while getting app startup status for App. Original error: ${e.message}`
    );
  }
};

ipkUtilsMethods.uninstall = async function uninstall (pkg) {
  log.debug(`Uninstalling ${pkg}`);
  try {
    let stdout = await this.aresExec(this.executableInstall, [
      '--device', this.udid, '--remove', pkg
    ]);
    return stdout.indexOf(`Removed package ${pkg}`);
  } catch (e) {
    log.errorAndThrow(
      `Error occured while uninstalling app. Original error: ${e.message}`
    );
  }
};

ipkUtilsMethods.installFromDevicePath = async function installFromDevicePath () {
  let stdout = await this.aresExec(this.executableInstall, ['--device', this.udid]);
  return stdout.includes('Success');
};

ipkUtilsMethods.install = async function install (ipk) {
  let stdout = await this.aresExec(this.executableInstall, [`--device`, this.udid, ipk]);
  return stdout.includes('Success');
};

ipkUtilsMethods.closeApp = async function closeApp (pkg) {
  let stdout = await this.aresExec(this.executableLaunch, [`--device`, this.udid, '--close', pkg]);
  return stdout.includes(`Closed application ${pkg}`);
};

export default ipkUtilsMethods;
