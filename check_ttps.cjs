const fs = require('fs');
const txt = fs.readFileSync('c:/Users/Lord/Desktop/PruebaJulve/Orquestador/Frontend/src/presentation/pages/TtpsPage.jsx', 'utf8');
const ttps = ['T1190', 'T1059', 'T1071', 'T1210', 'T1021', 'T1105', 'T1078', 'T1053', 'T1068', 'T1611'];
ttps.forEach(t => {
    console.log(t, txt.includes(`id: '${t}'`));
});
