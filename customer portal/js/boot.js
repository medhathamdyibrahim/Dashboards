// boot.js — the very last script tag. Everything above this has only
// *registered* itself (via __modules__.define); nothing has run yet.
// This line is what actually starts the app, by require()-ing the
// entry point, same as Node running "node src/main.js".
__modules__.require('main');
