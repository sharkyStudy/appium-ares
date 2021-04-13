import log from '../logger.js';
import {system} from 'appium-support';
import {exec, spawn} from 'teen_process';
import {retry} from 'asyncbox';
import _ from 'lodash';
import B from 'bluebird';
import execOptions from './exec-options.js';
import { v4 as uuidv4 } from 'uuid';

let systemCallMethods = {};

const DEFAULT_ARES_EXEC_TIMEOUT = 20000;

systemCallMethods.getAresCommands = async function getAresCommands () {
  log.debug('Getting ares commands...');
  let stdout;
  try {
    ({stdout} = await exec('ares', [...this.executable.defaultArgs, '-l'], execOptions));
  } catch (e) {
    throw new Error(`Error while getting ares commands. Original error: ${e.stderr}`);
  }
  let startingIndex = stdout.indexOf('ares-generate      Generate files for a webOS app or service');
  let excludedLines = [];
  if (startingIndex < 0) {
    throw new Error(`Unexpected output while trying to get devices: ${stdout}`);
  }
  stdout = stdout.slice(startingIndex);
  const commands = stdout.split('\n')
        .map(_.trim)
        .filter((line) => line && !excludedLines.some((x) => line.includes(x)))
        .reduce((acc, line) => {
          const [command, description] = line.split(/\s{2,}/);
          acc.push({command, description});
          return acc;
        }, []);
  log.info(commands);
  if (_.isEmpty(commands)) {
    log.debug('No commands have been detected');
  } else {
    log.debug(`Commands: ${JSON.stringify(commands)}`);
  }
  return commands;
};

systemCallMethods.forwardPort = async function forwardPort (hostPort, servicePort, device) {
  log.debug(`Forwarding ports ${servicePort}:${hostPort} for ${device}`);
  try {
    let forwardProcess = await spawn(
      this.executableNovacom.path,
      ['--forward', '--port', `${servicePort}:${hostPort}`, '-d', device], { shell: true }
    );
    forwardProcess.stdout.on('data', (data) => {
      log.debug(data.toString());
    });

    forwardProcess.stderr.on('data', (data) => {
      log.error(`Forwarding process stderr: ${data}`);
    });

    forwardProcess.on('close', (code) => {
      if (code !== 0) {
        log.debug(`Forwarding process exited with code ${code}`);
      }
    });
    this.forwards[`${servicePort}:${hostPort}`] = forwardProcess;
    return 'Ports forwarded!';
  } catch (e) {
    log.debug(e.message);
    log.errorAndThrow('Error while forwarding port.');
  }
};

systemCallMethods.destroyPortForwards = async function destroyPortForwards () {
  if (!_.isEmpty(this.forwards)) {
    await this.forwards.values().forEach(
      function (forwardProcess) {
        forwardProcess.stdin.end();
        forwardProcess.stdout.destroy();
        forwardProcess.stderr.destroy();
        setTimeout(function () {
          forwardProcess.kill();
        }, 500);
      }
    );
  }
  if (this.inspectionProcess) {
    this.inspectionProcess.stdin.end();
    this.inspectionProcess.stdout.destroy();
    this.inspectionProcess.stderr.destroy();
  }
};

systemCallMethods.WebInspector = async function WebInspector (device, pkg) {
  log.debug(`Getting web inspector from app ${pkg} on ${device}...`);
  try {
    this.inspectionProcess = await spawn(
      this.executableInspect.path, ['--device', device, '--app', pkg], { shell: true }
    );
    return await new B((resolve, reject) => {
      this.inspectionProcess.stdout.once('data', (data) => {
        log.debug(`Process result: ${data.toString()}`);
        this.inspectorUrl = data.toString().replace(/^Application Debugging - /, '');
        resolve();
      });
      this.inspectionProcess.stderr.once('data', (data) => {
        log.error(`Inspection process stderr: ${data}`);
        reject();
      });
      this.inspectionProcess.once('close', (code) => {
        if (code !== 0) {
          log.debug(`Inspection process exited with code ${code}`);
          resolve();
        }
        reject();
      });
      this.inspectionProcesses[uuidv4()] = this.inspectionProcess;
    });
  } catch (e) {
    log.debug(e.message);
    log.errorAndThrow('Error while opening inspection process.');
  }
};

systemCallMethods.getConnectDevice = async function getConnectDevice (device) {
  log.debug(`Getting ares connected device ${device}...`);
  let stdout;
  let modelName;
  let sdkVersion;
  let firmwareVersion;
  let boardType;
  let otaId;
  let deviceInfo = '';
  try {
    ({stdout} = await exec(this.executableDevice.path, [...this.executableDevice.defaultArgs, `--device ${device}`], execOptions));
    let startingIndex = stdout.indexOf('modelName');
    if (startingIndex < 0) {
      log.debug(`Unexpected output while trying to get devices: ${stdout}`);
    } else {
      stdout = stdout.slice(startingIndex);
      for (let line of stdout.split('\n')) {
        if (line.trim() !== '') {
          const [key, value] = line.split(/\s[:]\s/);
          if (key === 'modelName') {
            modelName = value;
          } else if (key === 'sdkVersion') {
            sdkVersion = value;
          } else if (key === 'firmwareVersion') {
            firmwareVersion = value;
          } else if (key === 'boardType') {
            boardType = value;
          } else if (key === 'otaId') {
            otaId = value;
          }
        }
      }
      deviceInfo = JSON.stringify({modelName, sdkVersion, firmwareVersion, boardType, otaId});
      if (_.isEmpty(deviceInfo)) {
        log.debug('No connected device have been detected');
      } else {
        log.debug(`Connected device: ${deviceInfo}`);
      }
      return deviceInfo;
    }
  } catch (e) {
    if (e.message.indexOf(`${stdout} exited with code 255`)) {
      log.debug(`Error getting device info. Connection time out. please check the device IP address or port.`);
      return false;
    } else {
      log.errorAndThrow(
        `Error creating device. Original error: ${e.message}`
      );
    }
  }
};

systemCallMethods.getConnectedDevices = async function getConnectedDevices () {
  log.debug('Getting connected devices...');
  let stdout;
  try {
    ({ stdout } = await exec(this.executableDevice.path, [...this.executableDevice.defaultArgs, '--device-list'], execOptions));
  } catch (e) {
    throw new Error(
      `Error while getting connected devices. Original error: ${e.message}`
    );
  }
  let headerRegex = /name[\S\s]+-{7}/;
  if (!headerRegex.test(stdout)) {
    throw new Error(`Unexpected output while trying to get devices: ${stdout}`);
  }
  stdout = stdout.replace(headerRegex, '');
  const devices = stdout.split('\n').map(_.trim)
        .filter((line) => line)
        .reduce((arr, line) => {
          const [name, deviceinfo, connection, profile] = line.split(/\s+/);
          arr.push({name, deviceinfo, connection, profile});
          return arr;
        }, []);
  if (_.isEmpty(devices)) {
    log.debug('No connected devices have been detected');
  } else {
    log.debug(`Connected devices: ${JSON.stringify(devices)}`);
  }
  return devices;
};

systemCallMethods.createDevice = async function createDevice () {
  try {
    let outCreateDevice = await spawn(
        this.executableSetup.path,
        [],
        execOptions
    );
    return outCreateDevice;
  } catch (e) {
    log.debug(
        `Error occurred while getting key device. Original error: ${e.message}`
    );
  }
};

systemCallMethods.getKey = async function getKey (device) {
  log.debug('Getting a device key, be sure you created the device before and this is connected...This operation could take a while!');
  try {
    let outKey = await spawn(
        this.executableNovacom.path,
        [`--device ${device} --getkey`],
        execOptions
    );
    return outKey;
  } catch (e) {
    log.debug(`Error occurred while getting key device. Original error: ${e.message}`);
  }
};

systemCallMethods.removeDevice = async function removeDevice (device) {
  log.debug('Removing device...');
  let stdout;
  try {
    ({stdout} = await exec(this.executableSetup.path, [`--remove ${device}`], execOptions));
    log.debug(`The device "${device}" was removed`);
    return stdout;
  } catch (e) {
    if (e.message.indexOf(`${stdout} exited with code 255`)) {
      log.debug(`An error occurred while deleting the device. The device "${device}" was deleted previously or never was created.`);
      return false;
    } else {
      log.errorAndThrow(
        `An error occurred while deleting the device. Original error: ${e.message}`
      );
    }
  }
};

systemCallMethods.getConnectedDevicesInfo = async function getConnectedDevicesInfo () {
  log.debug('Getting connected devices info...');
  let stdout;
  try {
    ({stdout} = await exec(this.executableSetup.path, [...this.executableSetup.defaultArgs, '--listfull'], execOptions));
  } catch (e) {
    throw new Error(`Error while getting connected devices info. Original error: ${e.stderr}`);
  }
  let startingIndex = stdout.indexOf('[');
  if (startingIndex < 0) {
    throw new Error(`Unexpected output while trying to get info of the devices: ${stdout}`);
  }
  stdout = stdout.slice(startingIndex);
  let deviceInfo = '';
  for (let line of stdout.split('\n')) {
    if (line.trim() !== '') {
      deviceInfo += line.trim();
    }
  }
  if (_.isEmpty(deviceInfo)) {
    log.debug('No connected devices have been detected');
  } else {
    log.debug(`Connected devices: ${JSON.parse(JSON.stringify(deviceInfo))}`);
  }
  return JSON.parse(deviceInfo);
};

systemCallMethods.isDeviceCreated = async function isDeviceCreated (device) {
  let devicesInfo = await this.getConnectedDevicesInfo();
  return devicesInfo.some((deviceInfo) => deviceInfo.name === device);
};

systemCallMethods.getAresBinaryPath = async function getAresBinaryPath (binaryName) {
  let binaryLoc = null;
  let cmd = this.getBinaryNameForOS();
  try {
    let {stdout} = await exec(cmd, [binaryName]);
    log.debug(`Using ${binaryName} from ${stdout}`);
    // binaryLoc = stdout.trim();
    binaryLoc = stdout.trim().split('\n').filter((tempStdout) => !tempStdout.match(/(.*)\.[^.]{1,10}$/))[0];
    return binaryLoc;
  } catch (e) {
    throw new Error(`Could not find ${binaryName} Please set the ARES_HOME ` +
            `environment variable with the Ares root directory path.`
    );
  }
};

systemCallMethods.getBinaryNameForOS = _.memoize(function getBinaryNameForOS () {
  let cmd = 'which';
  if (system.isWindows()) {
    cmd = 'where';
  }
  return cmd;
});

systemCallMethods.getListStorage = async function getListStorage (device) {
  log.debug(`Getting listing the storage in devices ${device}...`);
  let stdout;
  try {
    ({stdout} = await exec(this.executableInstall.path, [...this.executableInstall.defaultArgs, `-S --device ${device}`]));
  } catch (e) {
    throw new Error(`Error while getting listing the storage in devices. Original error: ${e.stderr}`);
  }
  const listHeader = 'name      type   uri';
  const startingIndex = stdout.indexOf(listHeader);
  if (startingIndex < 0) {
    throw new Error(`Unexpected output while trying to get devices: ${stdout}`);
  }
  stdout = stdout.slice(startingIndex);
  let excludedLines = [listHeader, '--------  -----  ----------------'];
  const listStorage = stdout.split('\n')
        .map(_.trim)
        .filter((line) => line && !excludedLines.some((x) => line.includes(x)))
        .reduce((acc, line) => {
          const [name, type, uri] = line.split(/\s+/);
          acc.push({name, type, uri});
          return acc;
        }, []);
  if (_.isEmpty(listStorage)) {
    log.debug('No listing the storage in devices have been detected');
  } else {
    log.debug(`Listing the storage in devices: ${JSON.stringify(listStorage)}`);
  }
  return listStorage;
};

systemCallMethods.getDevicesWithRetry = async function getDevicesWithRetry (timeoutMs = DEFAULT_ARES_EXEC_TIMEOUT) {
  let start = Date.now();
  let times = 0;
  log.debug('Trying to find a connected LG webOS device');
  let getDevices = async () => {
    if ((Date.now() - start) > timeoutMs || times > 10) {
      throw new Error('Could not find a connected LG webOS device.');
    }
    try {
      let devices = await this.getConnectedDevices();
      if (devices.length < 1) {
        times++;
        return await getDevices();
      }
      return devices;
    } catch (e) {
      times++;
      return await getDevices();
    }
  };
  return await getDevices();
};

systemCallMethods.aresExec = async function aresExec (executable, cmd, opts = execOptions) {
  if (!cmd) {
    throw new Error('You need to pass in a command to aresExec()');
  }
  opts = _.cloneDeep(opts);
  opts.timeout = opts.timeout || this.aresExecTimeout || DEFAULT_ARES_EXEC_TIMEOUT;
  opts.timeoutCapName = opts.timeoutCapName || 'aresExecTimeout';

  cmd = _.isArray(cmd) ? cmd : [cmd];
  const execFunc = async () => {
    try {
      const args = [...executable.defaultArgs, ...cmd];
      log.debug(`Running '${executable.path} ${args.join(' ')}'...\n`);
      let { stdout } = await exec(executable.path, args, { shell: true, timeout: opts.timeout});
      return stdout;
    } catch (e) {
      if (e.stdout) {
        let stdout = e.stdout;
        return stdout;
      }
      throw new Error(`Error executing aresExec. Original error system call: '${e.stderr}'; ` +
                `Stderr: '${(e.stderr || '').trim()}'; Code: '${e.code}'`);
    }
  };
  return await retry(2, execFunc);
};

systemCallMethods.getAresVersion = _.memoize(async function getAresVersion () {
  try {
    let aresVersion = (await this.aresExec(this.executable, '--version'))
            .replace(/Version:\s([\d.]*)[\s\w-]*/, '$1');
    log.info(aresVersion);
    let parts = aresVersion.split('.');
    log.info(parts);
    return {
      versionString: aresVersion,
      versionFloat: parseFloat(aresVersion),
      major: parseInt(parts[0], 10),
      minor: parseInt(parts[1], 10),
      patch: parts[2] ? parseInt(parts[2], 10) : undefined,
    };
  } catch (e) {
    throw new Error(
      `Error getting ares version. Original error: '${e.message}'; ` +
      `Stderr: '${(e.stderr || '').trim()}'; Code: '${e.code}'`
    );
  }
});

systemCallMethods.shell = async function shell (cmd, opts = {}) {
  if (!await this.isDeviceConnected()) {
    throw new Error(`No device connected, cannot run ares shell command '${cmd.join(' ')}'`);
  }
  return await this.aresExec(this.executableNovacom, cmd, opts);
};

export default systemCallMethods;
export {DEFAULT_ARES_EXEC_TIMEOUT};