#!/usr/bin/env node
// APKs use relative assets. Hosted root SPAs need a base for deep report links.
import fs from 'node:fs';import path from 'node:path';
const folder=path.resolve(process.argv[2]??'dist');const file=path.join(folder,'index.html');
let html=fs.readFileSync(file,'utf8');if(!/<base\s/i.test(html))html=html.replace('<head>','<head>\n    <base href="/">');
fs.writeFileSync(file,html);console.log('Prepared root-hosted SPA: '+folder);
