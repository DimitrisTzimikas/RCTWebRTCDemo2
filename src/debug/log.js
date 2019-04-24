function log(log, value, type) {
  let count = 60;
  let i = 0;
  let str = '';
  let z = count - log.length;
  
  for (i; i <= z; i++) {
    str += '_';
    if (i === Math.floor(z / 2)) {
      str += log;
    }
  }
  console.log('%c' + str, 'font-size: 15px');
  value !== undefined ? (type === 'table' ? console.table(value) : console.log(value)) : null;
  console.log('\n\n');
}

export default log;