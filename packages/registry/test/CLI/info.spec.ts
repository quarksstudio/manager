import Info from '../../src/CLI/info-action';
jest.mock('@quarks.studio/distribution/CLI', () => ({ Info: jest.fn() }));
jest.mock('../../src/composition/presentation-services', () => ({ createPresentationServices: () => ({ distribution: 'services' }) }));
it('loads the info command and supplies its services', async () => {
  await Info('@quarks.studio/cli');
  expect(jest.requireMock('@quarks.studio/distribution/CLI').Info).toHaveBeenCalledWith('@quarks.studio/cli', 'services');
});
