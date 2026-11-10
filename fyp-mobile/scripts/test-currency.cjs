const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../utils/currency.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
module.exports=api;
