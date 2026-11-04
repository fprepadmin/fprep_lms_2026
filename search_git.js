const { execSync } = require('child_process');
try {
  const out = execSync('git log -p -n 15', { encoding: 'utf8' });
  const lines = out.split('\n');
  lines.forEach((l, i) => {
    if (/closing|hidden|bảo trì|database/i.test(l)) {
      console.log(l);
    }
  });
} catch (e) {
  console.log(e.message);
}
