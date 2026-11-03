import * as store from '../store.js';
import { avg, chartSvg, sleepRhythmSvg, marksCard } from './charts.js';
import { esc, fmtNum, fmtSleep, METRICS, plural } from '../ui.js';

// Нейтральная сводка для психолога: личные отметки без диагностических выводов.
export function buildPsychReport(from, to, withTexts) {
  const n = store.daysBetween(from, to) + 1;
  const entries = Array.from({length:n},(_,i)=>{
    const date=store.addDays(from,i);
    return store.getEntry(date) || {date};
  });
  const actual = new Set(entries.filter(e=>store.getEntry(e.date)!=null).map(e=>e.date));
  const meds = store.medsOn(), cycle = store.cycleOn();
  const fmtDate = (d,opts) => store.parseKey(d).toLocaleDateString('ru-RU',opts);
  const values = (key) => entries.map(e=>e[key]).filter(v=>typeof v==='number'&&Number.isFinite(v));
  const format = (key,v) => key==='sleep' ? fmtSleep(v) : fmtNum(Math.round(v*10)/10);
  const kpi = (key) => {
    const data = values(key);
    if(!data.length)return '';
    return '<div class="kpi"><span>'+METRICS[key].label+'</span><b>'+format(key,avg(entries,key))+(key==='sleep'?' ч':' / 10')+'</b><span>по '+data.length+' дн.; от '+format(key,Math.min(...data))+' до '+format(key,Math.max(...data))+'</span></div>';
  };
  const top = (key) => {
    const counts=new Map();
    for(const e of entries)for(const item of Array.isArray(e[key])?e[key]:[]) counts.set(item,(counts.get(item)||0)+1);
    const found=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5);
    return found.length ? found.map(([name,num])=>esc(name)+' — '+num+' '+plural(num,['день','дня','дней'])).join('; ') : 'Нет отметок';
  };
  const chart=(title,keys,opt={})=>'<section><h2>'+title+'</h2><div class="chart">'+chartSvg(entries,keys,'line',opt)+'</div></section>';
  const headings=['<th>Дата</th>','<th class="num">Сон, ч</th>','<th class="num">Сост.</th>','<th class="num">Энерг.</th>','<th class="num">Трев.</th>','<th class="num">Раздр.</th>']
    .concat(meds?['<th>Лек.</th>']:[],cycle?['<th>Цикл</th>']:[],['<th>Эмоции и события</th>']);
  const val=(e,k)=>'<td class="num">'+(typeof e[k]==='number' ? format(k,e[k]) : '—')+'</td>';
  const medNames={taken:'Принято',missed:'Пропуск',none:'Не требуется'};
  const rows=entries.map(e=>{
    const recorded=actual.has(e.date);
    const notes=[...(e.emotions||[]),...(e.triggers||[])].map(esc).join(', ');
    const text=withTexts&&e.text?esc(e.text):'';
    const description=!recorded?'Нет записи':[notes,text].filter(Boolean).join('; ')||'—';
    return '<tr class="'+(!recorded?'report-empty':'')+'"><td>'+fmtDate(e.date,{day:'2-digit',month:'2-digit'})+'</td>'
      + ['sleep','state','energy','anxiety','irritability'].map(k=>val(e,k)).join('')
      + (meds?'<td>'+(medNames[e.meds]||'—')+'</td>':'')
      + (cycle?'<td>'+(e.periodStart?'Начало':'—')+'</td>':'')
      + '<td class="note-cell">'+description+'</td></tr>';
  }).join('');
  const name=store.settings().name;
  const intro='<header><h1>Отчёт для психолога'+(name?' — '+esc(name):'')+'</h1><p class="sub">Период: '
    +fmtDate(from,{day:'numeric',month:'long'})+' — '+fmtDate(to,{day:'numeric',month:'long',year:'numeric'})
    +'. Заполнено дней: '+actual.size+' из '+n+'. Подготовлен: '+new Date().toLocaleDateString('ru-RU')+'.</p></header>';
  const dashboard=actual.size?'<div class="kpis">'+['state','energy','sleep','anxiety','irritability'].map(kpi).join('')+'</div><p class="sub">Средние значения рассчитаны только по имеющимся самооценкам. Пропущенные дни не учитываются.</p>'
    : '<p>За выбранный период записей пока нет.</p>';
  const graphs=actual.size ? chart('Состояние и энергия',['state','energy'])+chart('Продолжительность сна',['sleep'],{neutralSleep:true})
    +chart('Тревога и раздражительность',['anxiety','irritability'])
    +(entries.some(e=>e.sleepStart&&e.sleepEnd)?'<section><h2>Время сна по ночам</h2><p class="sub">Показаны ночи с известным временем засыпания и пробуждения.</p><div class="chart sleep-rhythm">'+sleepRhythmSvg(entries)+'</div></section>':'')
    +((meds||cycle)?'<section class="report-marks">'+marksCard(entries)+'</section>':'')
    +'<section><h2>Чувства и события</h2><p><b>Чаще отмечались чувства:</b> '+top('emotions')+'</p><p><b>Значимые события:</b> '+top('triggers')+'</p></section>'
    : '';
  return intro+'<section><h2>Общая картина</h2>'+dashboard+'</section>'+graphs
    +'<section><h2>Дневник по дням</h2><div class="table-wrap"><table class="psych-report-table"><thead><tr>'
    +headings.join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<p class="sub">«—» — показатель не указан. Серым выделены дни без записей.</p></section>'
    +'<p class="footer">Самонаблюдение из приложения «Баланс» для обсуждения со специалистом. Не является медицинским заключением.</p>';
}
