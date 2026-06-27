const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'projects/members-portal/src/app/features/daily-quests/daily-quests.component.html');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<h4>(.*?)<\/h4>/g, '<h4>$1 <span class="text-[10px] ml-2 font-bold text-gold-primary tracking-widest bg-gold-primary/10 px-1.5 py-0.5 rounded-sm">+50 🪙</span></h4>');

fs.writeFileSync(file, content);
console.log('Successfully added coins to quests!');
