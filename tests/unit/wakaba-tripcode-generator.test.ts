import WakabaTripcodeGenerator from '../../src/wakaba-tripcode-generator';

test.each([
  ['', { name: '', tripcode: '' }],
  ['test', { name: 'test', tripcode: '' }],
  ['#test', { name: '', tripcode: '.CzKQna1OU' }],
  ['Tester#test', { name: 'Tester', tripcode: '.CzKQna1OU' }],
  ['#another', { name: '', tripcode: '5rdyZ9xiHE' }],
  ['#lPeA=BH2', { name: '', tripcode: 'Zimoy/N9WA' }],
  ['#K[@?dtBg', { name: '', tripcode: 'TOMATO.AsY' }],
  ['#RﾖﾄB儔hF', { name: '', tripcode: '0OAW4T4SHI' }],
  ['#/ｽ{VnFF繊X-', { name: '', tripcode: 'GINTOx/D7A' }],
])('generate tripcode', (name, expected) => {
  // Arrange
  const tripcodeGenerator = new WakabaTripcodeGenerator();

  // Act
  const tripcode = tripcodeGenerator.createTripcode(name);

  // Assert
  expect(tripcode).toEqual(expected);
});
