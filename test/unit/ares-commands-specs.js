import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import ARES from '../../lib/ares';
import net from 'net';
import * as teen_process from 'teen_process';
import {withMocks} from 'appium-test-support';

const ares = new ARES({aresExecTimeout: 60000});
chai.use(chaiAsPromised);
const should = chai.should();

describe('adb commands', withMocks({ares, teen_process, net}, function (mocks) {
  afterEach(function () {
    mocks.verify();
  });

  it('isValidClass should correctly validate class names', function () {
    ares.isValidClass('com.example/com.example.Main').index.should.equal(0);
    should.not.exist(ares.isValidClass('illegalPackage#/adsasd'));
  });

  it('getAresPath should correctly return aresPath', function () {
    ares.getAresPath().should.equal(ares.executable.path);
  });

}));