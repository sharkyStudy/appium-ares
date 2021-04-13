import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import ARES from '../../lib/ares';
import * as teen_process from 'teen_process';
import * as child_process from 'child_process';
import {withMocks} from 'appium-test-support';
import B from 'bluebird';
import execOptions from '../../lib/tools/exec-options';

const ares = new ARES();
chai.should();
let expect = chai.expect;
chai.use(chaiAsPromised);


describe('System calls', withMocks({teen_process, child_process}, function (mocks) {
  afterEach(function () {
    mocks.verify();
  });

  describe('getAresCommands', function () {
    it('should get all commands from ares', async function () {
      mocks.teen_process.expects('exec')
                .once().withExactArgs('ares', ['-l'], execOptions)
                .returns({
                  stdout: 'ares-generate      Generate files for a webOS app or service\n' +
                        'ares-inspect       Provide URL to use Web Inspector or Node Inspector\n' +
                        'ares-install       Install or Remove app from a device\n' +
                        'ares-launch        Launch or close apps\n' +
                        'ares-novacom       Command Line Tool to control target device\n' +
                        'ares-package       Create a webOS application package file\n' +
                        'ares-server        Run a local web server based on path\n' +
                        'ares-setup-device  Add or modify the informations of the devices to use\n' +
                        'ares-device-info   Print device\'s valid system information\n'
                });
      let commands = await ares.getAresCommands();
      commands.should.have.length.above(0);
    });
  });

  describe('getConnectedDevices', function () {
    it('should get all connected devices', async function () {
      mocks.teen_process.expects('exec')
                .once().withExactArgs(ares.executableDevice.path, ['--device-list'], execOptions)
                .returns({stdout: 'name      deviceinfo                 connection  profile\n--------  -------------------------  ----------  -------\nemulator  developer@127.0.0.1:6622   ssh         tv\n'});
      let devices = await ares.getConnectedDevices();
      devices.should.have.length.above(0);
    });
  });

  describe('getConnectedDevicesInfo', function () {
    it('should get all connected devices', async function () {
      mocks.teen_process.expects('exec')
                .once().withExactArgs(ares.executableSetup.path, ['--listfull'], execOptions)
                .returns({stdout: '[\n' +
                      '    {\n' +
                      '        "profile": "tv",\n' +
                      '        "name": "emulator",\n' +
                      '        "deviceinfo": {\n' +
                      '            "ip": "127.0.0.1",\n' +
                      '            "port": "6622",\n' +
                      '            "user": "developer"\n' +
                      '        },\n' +
                      '        "connection": [\n' +
                      '            "ssh"\n' +
                      '        ],\n' +
                      '        "details": {\n' +
                      '            "platform": "starfish",\n' +
                      '            "privatekey": "webos_emul",\n' +
                      '            "description": "LG webOS TV Emulator"\n' +
                      '        }\n' +
                      '    }\n' +
                      ']\n'});
      let devicesInfo = await ares.getConnectedDevicesInfo();
      devicesInfo.should.have.length.above(0);
    });
  });

  describe('getConnectedDevice', function () {
    it('should get connected in a specific device', async function () {
      mocks.teen_process.expects('exec')
                .once().withExactArgs(ares.executableDevice.path, [`--device emulator`], execOptions)
                .returns({
                  stdout: 'modelName : 43LM6300PDB\n' +
                        'sdkVersion : 4.7.0\n' +
                        'firmwareVersion : 04.72.10\n' +
                        'boardType : M3R_DVB_EU\n' +
                        'otaId : HE_DTV_W19R_AFAAABAA\n'
                });
      let device = await ares.getConnectDevice('emulator');
      device.should.have.length.above(0);
    });
  });

  describe('getListStorage', function () {
    it('should get listing the storage in a specific device', async function () {
      mocks.teen_process.expects('exec')
                .once().withExactArgs(ares.executableInstall.path, ['-S --device home'])
                .returns({
                  stdout: 'name      type   uri\n' +
                      '--------  -----  ----------------\n' +
                      'internal  flash  /media/developer\n'
                });
      let device = await ares.getListStorage('home');
      device.should.have.length.above(0);
    });
  });

  describe('getDevicesWithRetry', function () {
    it('should fail when there are no connected devices', async function () {
      this.timeout(20000);
      mocks.teen_process.expects('exec')
          .atLeast(2).withExactArgs(ares.executableDevice.path, ['--device-list'])
          .returns({stdout: 'List of devices attached'});
      await ares.getDevicesWithRetry(1000).should.eventually.be.rejectedWith(/Could not find a connected LG webOS device/);
    });
  });

  describe('isDeviceCreated', function () {
    it('should get device status', async function () {
      mocks.teen_process.expects('exec')
          .once().withExactArgs(ares.executableSetup.path, ['--listfull'], execOptions)
          .returns({
            stdout: '[\n' +
                '    {\n' +
                '        "profile": "tv",\n' +
                '        "name": "emulator",\n' +
                '        "deviceinfo": {\n' +
                '            "ip": "127.0.0.1",\n' +
                '            "port": "6622",\n' +
                '            "user": "developer"\n' +
                '        },\n' +
                '        "connection": [\n' +
                '            "ssh"\n' +
                '        ],\n' +
                '        "details": {\n' +
                '            "platform": "starfish",\n' +
                '            "privatekey": "webos_emul",\n' +
                '            "description": "LG webOS TV Emulator"\n' +
                '        }\n' +
                '    },\n' +
                '    {\n' +
                '        "profile": "tv",\n' +
                '        "name": "home",\n' +
                '        "deviceinfo": {\n' +
                '            "ip": "192.168.1.4",\n' +
                '            "port": "9922",\n' +
                '            "user": "prisoner"\n' +
                '        },\n' +
                '        "connection": [\n' +
                '            "ssh"\n' +
                '        ],\n' +
                '        "details": {\n' +
                '            "platform": "starfish",\n' +
                '            "privatekey": "home_webos",\n' +
                '            "passphrase": "FFFDF8",\n' +
                '            "description": "new device"\n' +
                '        }\n' +
                '    }\n' +
                ']\n'
          });
      let device = await ares.isDeviceCreated('home');
      expect(device).to.be.true;
    });
  });
}));

describe('System calls', withMocks({ares, B, teen_process}, function (mocks) {
  afterEach(function () {
    mocks.verify();
  });
  describe('getAresVersion', function () {
    it('should return ares version', async function () {
      mocks.ares.expects('aresExec')
                .once()
                .withExactArgs(ares.executable, '--version')
                .returns('Version: 1.10.4-j1703-k');
      let aresVersion = await ares.getAresVersion();
      aresVersion.versionString.should.equal('1.10.4');
      aresVersion.major.should.equal(1);
      aresVersion.minor.should.equal(10);
      aresVersion.patch.should.equal(4);
    });
  });
}));