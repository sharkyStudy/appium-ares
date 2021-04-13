import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import ARES from '../index';

chai.should();
chai.use(chaiAsPromised);

describe('Ares', function () {
  it('should be start CLI Ares', async function () {
    await ARES.createARES({aresExecTimeout: 60000});
  });
});
