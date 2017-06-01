#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const packager = require('electron-packager');
const packageJson = require('../package.json');

const name = packageJson.name;
const version = packageJson.version;
const root = path.join.bind(path, path.resolve(__dirname, '..'));

const options = {
  dir: root(),
  out: root('releases'),
  appVersion: version,
  name: name,
  appCopyright: 'Copyright 2017 blinksocks',
  platform: 'linux,win32,darwin',
  arch: 'ia32,x64',
  asar: true,
  packageManager: 'npm',
  overwrite: true,
  prune: true,
  quiet: false,
  win32metadata: {
    CompanyName: '',
    FileDescription: 'Cross-platform desktop GUI for blinksocks',
    OriginalFilename: name,
    ProductName: name,
    InternalName: name,
    'requested-execution-level': 'user'
  },
  // If the file extension is omitted, it is auto-completed to the correct extension based on the platform
  // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#icon
  icon: path.resolve(__dirname, 'icon')
};

packager(options, function done(err, appPaths) {
  if (err) {
    console.error(err);
  } else {
    for (const dir of appPaths) {
      const newDir = `${dir}-v${version}`;
      try {
        // 1. append version
        fs.renameSync(dir, newDir);

        // 2. generate patch
        let appAsar;
        if (newDir.indexOf('darwin') !== -1) {
          appAsar = path.join(newDir, `${name}.app`, 'Contents', 'Resources', 'app.asar');
        } else {
          appAsar = path.join(newDir, 'resources', 'app.asar');
        }
        child_process.execFileSync(root('tasks', 'create-patch.sh'), [appAsar, `${newDir}.patch`]);

        // 3. compress into .tar.gz
        child_process.execFileSync(root('tasks', 'compress.sh'), [path.basename(newDir), `${newDir}.tar.gz`], {
          cwd: root('releases')
        });

        // 4. generate sha256sum.txt
        child_process.execFileSync(root('tasks', 'sha256sum.sh'), [`${path.basename(newDir)}.tar.gz`], {
          cwd: root('releases')
        });
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    }
  }
});
