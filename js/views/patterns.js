// Наблюдения для обсуждения со специалистом.
// Правила не являются критериями постановки диагноза.
export function findPatterns(entries, sleepLow = 7, sleepHigh = 9) {
  const rules = [
    {id:'short', title:'Несколько ночей короткого сна', min:3, test:e=>typeof e.sleep==='number' && e.sleep<sleepLow, detail:e=>e.sleep},
    {id:'long', title:'Несколько ночей длительного сна', min:3, test:e=>typeof e.sleep==='number' && e.sleep>sleepHigh, detail:e=>e.sleep},
    {id:'combo', title:'Короткий сон при высокой энергии', min:2, test:e=>typeof e.sleep==='number' && e.sleep<sleepLow && e.energy>=9, detail:e=>e.sleep},
    {id:'state', title:'Несколько дней низкого состояния', min:3, test:e=>typeof e.state==='number' && e.state<=3, detail:e=>e.state},
    {id:'anxiety', title:'Несколько дней сильной тревоги', min:3, test:e=>typeof e.anxiety==='number' && e.anxiety>=8, detail:e=>e.anxiety},
    {id:'irritability', title:'Несколько дней выраженной раздражительности', min:3, test:e=>typeof e.irritability==='number' && e.irritability>=8, detail:e=>e.irritability}
  ];
  const notes=[];
  for (const rule of rules) {
    let run=[];
    const flush=()=>{
      if(run.length>=rule.min) {
        const values=run.map(rule.detail).filter(Number.isFinite);
        notes.push({
          id:rule.id, title:rule.title,
          from:run[0].date, to:run[run.length-1].date,
          days:run.length,
          min:Math.min(...values), max:Math.max(...values),
          events:[...new Set(run.flatMap(e=>Array.isArray(e.triggers)?e.triggers:[]))].slice(0,4)
        });
      }
      run=[];
    };
    for (const entry of entries) {
      if(rule.test(entry)) run.push(entry);
      else flush();
    }
    flush();
  }
  return notes.sort((a,b)=>b.from.localeCompare(a.from)).slice(0,15);
}
