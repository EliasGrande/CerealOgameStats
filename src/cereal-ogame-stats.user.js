// ==UserScript==
// @name         CerealOgameStats
// @description  Make alliance stats from ogame to post in forums
// @namespace    https://github.com/EliasGrande/
// @downloadURL  https://github.com/EliasGrande/CerealOgameStats/raw/master/dist/releases/latest.user.js
// @updateURL    https://github.com/EliasGrande/CerealOgameStats/raw/master/dist/releases/latest.meta.js
// @icon         https://github.com/EliasGrande/CerealOgameStats/raw/master/dist/img/icon.png
// @version      3.1.3
// @include      *://*.ogame.*/game/index.php?*page=alliance*
// @include      *://*.ogame.gameforge.*/game/index.php?*page=alliance*
// ==/UserScript==
/*! CerealOgameStats (C) 2017 Elías Grande Cásedas | MIT | opensource.org/licenses/MIT */
(function(){
////////////

var win = window, doc, $;
try{if (unsafeWindow) win = unsafeWindow;}
catch(e){}
doc = win.document;

// backup memberlist before the "pretty-titles script" delete the titles

var addCss = function (text)
{
	var el = doc.createElement('style');
	el.setAttribute('type','text/css');
	
	if (el.styleSheet)
		el.styleSheet.cssText = text;
	else
		el.appendChild(doc.createTextNode(text));
	
	var head = doc.getElementsByTagName("head")[0];
	head.appendChild(el);
};

addCss('#member-list {display:none;}');

var memberList =
{
	ready : false,
	list  : doc.createElement('table'),
	wait  : 10
};

var initMemberList = function()
{
	try
	{
		var list = doc.getElementById('member-list');
		if (!list)
			throw 0;
		else
		{
			memberList.list.innerHTML = list.innerHTML;
			memberList.ready = true;
			delete memberList.wait;
			addCss('#member-list {display:table;}');
		}
	}
	catch (e)
	{
		memberList.wait = Math.round(memberList.wait*1.1);
		var _this = this;
		setTimeout(initMemberList, memberList.wait);
	}
};

initMemberList();

// script general info

var script =
{
	name : 'CerealOgameStats',
	home : 'https://github.com/EliasGrande/CerealOgameStats/'
};
	
// extend some prototypes

String.prototype._cos_replaceAll = function (search, replacement)
{
	return this.split(search).join(replacement);
};

String.prototype._cos_recursiveReplaceMap = function (org, rep, index)
{
	if (index==0)
		return this.split(org[0]).join(rep[0]);

	var i, arr = this.split(org[index]);
	for (i in arr)
	{
		arr[i] = arr[i]._cos_recursiveReplaceMap(org, rep, index-1);
	}
	
	return arr.join(rep[index]);
};

String.prototype._cos_replaceMap = function (replaceMap)
{
	var key, org, rep, count;
	org = new Array();
	rep = new Array();
	
	count = 0;
	for (key in replaceMap)
	{
		org.push(key);
		rep.push(replaceMap[key]);
		count ++;
	}
	
	if (count==0)
		return this;
	else
		return this._cos_recursiveReplaceMap(org, rep, count-1);
};

String.prototype._cos_trimNaN = function ()
{
	return this.replace(/^\D+$/,'').replace(/^\D*(\d)/,'$1').replace(/(\d)\D*$/,'$1');
};

var onDOMContentLoaded = function()
{

////////////////////////////////////
//                                //
//   START onDOMContentLoaded()   //
//                                //
////////////////////////////////////

// ogame info

var OgameInfo = function()
{
	this.getMeta("version"    ,"ogame-version"    ,null);
	this.getMeta("language"   ,"ogame-language"   ,"en");
	this.getMeta("timestamp"  ,"ogame-timestamp"  ,null);
	this.getMeta("universe"   ,"ogame-universe"   ,null);
	this.getMeta("alliance_id","ogame-alliance-id",null);
	this.getMeta("player_name","ogame-player-name","");
};

OgameInfo.prototype =
{
	getMeta : function (name, search, def)
	{
		try
		{
			this[name] =
				doc.querySelector('meta[name="'+search+'"]'
				).getAttribute('content');
		}
		catch(e)
		{
			this[name] = def;
		}
	}
};

var ogameInfo = new OgameInfo();

// local storage

var storage =
{
	id : function(id)
	{
		return script.name+'_'+
			ogameInfo.universe+'_'+
			ogameInfo.alliance_id+'_'+
			id;
	},
	set : function(id,txt)
	{
		var key = this.id(id);
		try
		{
			win.localStorage.setItem(key, txt);
		}
		catch(e)
		{
			win.localStorage[key] = txt;
		}
		return txt;
	},
	get : function(id)
	{
		var key = this.id(id);
		try
		{
			return win.localStorage.getItem(key);
		}
		catch(e)
		{
			var val = win.localStorage[key];
			return (val == 'undefined') ? null : val;
		}
	}
};

// internationalization (i18n)

var I18n = function()
{
	this.lc = {};
};

I18n.prototype =
{
	get : function (key)
	{
		if (this.lc[key])
			return this.lc[key];
		return key;
	},
	set : function (prop)
	{
		for (var attr in prop)
			this.lc[attr] = prop[attr];
	},
	// addCommas | mredkj.com/javascript/nfbasic.html
	number : function (n)
	{
		var nStr, x, x1, x2;
		nStr = n+'';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? this.lc.s_dec + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + this.lc.s_tho + '$2');
		}
		return x1 + x2;
	},
	date : function (d)
	{
		return (d + '')._cos_trimNaN().split(/\D+/).splice(0, 3).join(this.lc.s_dat);
	},
	time : function (t)
	{
		return (t + '')._cos_trimNaN().split(/\D+/).splice(-3).join(this.lc.s_tim);
	},
	period : function (seconds)
	{
		var w, d, h, m, s = parseInt(seconds), output = '', n = 0;
		
		w = Math.floor(s/604800);s -= w*604800;
		d = Math.floor(s/ 86400);s -= d* 86400;
		h = Math.floor(s/  3600);s -= h*  3600;
		m = Math.floor(s/    60);s -= m*    60;
		
		if (w>0)
		{
			output += this.number(w) + this.lc.a_wee + ' ';
			n++;
		}
		
		if (d>0)
		{
			output += this.number(d) + this.lc.a_day + ' ';
			n++;
		}
		
		if (h>0||n<1||m+s<1)
		{
			output += this.number(h) + this.lc.a_hou + ' ';
			n++;
		}
		
		if (m>0||n<2||(n==2&&s<1))
		{
			output += this.number(m) + this.lc.a_min + ' ';
			n++;
		}
		
		if (s>0||n<3)
		{
			output += this.number(s) + this.lc.a_sec;
		}
		
		return output.trim();
	}
};

var i18n = new I18n();

var _ = function (text)
{
	return i18n.get(text);
};

/*! [i18n=en] */
i18n.set(
{	
	// separators
	s_dec: ".",
	s_tho: ",",
	s_dat: "/",
	s_tim: ":",
	// abb time units
	a_wee: "w",
	a_day: "d",
	a_hou: "h",
	a_min: "m",
	a_sec: "s",
	// buttons
	b_sel:'Select',
	b_del:'Erase',
	b_get:'Get from this page',
	b_sav:'Save as "Old data"',
	b_loa:'Load saved data',
	b_res:'Reset stats',
	// titles
	t_odt:'Old data',
	t_ndt:'New data',
	t_fmt:'Format',
	t_col:'Colors',
	t_inc:'Include',
	t_out:'Statistics (code)',
	t_stb:'Status',
	t_pre:'Evolution',
	t_exp:'Export to forums',
	// period
	p_ago:'{period} ago',
	p_now:'now',
	// colors
	c_dbg:'Dark background',
	c_lbg:'Light background',
	// status (errors)
	e_nod:'No old data',
	e_nnd:'No new data',
	e_odf:'The old data has wrong format',
	e_ndf:'The new data has wrong format',
	e_unk:'Unexpected error',
	e_ndt:'No data',
	e_wft:'Wrong format',
	// status (success)
	w_pcs:'Processing',
	// output
	o_tdt:'Evolution of the alliance since {oldDate} to {newDate}',
	o_tet:'Elapsed time',
	o_tas:'Alliance summary',
	o_ptl:'Total points',
	o_ppm:'Points per member',
	o_ttt:'Top 3 by total score',
	o_tts:'Top 3 by gained score',
	o_ttp:'Top 3 by gained percent',
	o_ttg:'Top 3 by gained positions',
	o_trt:'Total score rank',
	o_trs:'Gained score rank',
	o_trp:'Gained percent rank',
	o_trg:'Gained positions rank',
	o_tsc:'Special cases',
	o_cnm:'new member',
	o_cla:'leaves the alliance',
	o_bdg:'banned',
	o_bdq:'unbanned',
	o_abt:'Statistics performed with {link}',
	// OGame Error
	e_oga:'OGame Error, reload this page may fix it'
});

/*! [i18n=es] */
if (/es|ar|mx/.test(ogameInfo.language))i18n.set(
{
	// separators
	s_dec: ",",
	s_tho: ".",
	// abb time units
	a_wee: "s",
	a_day: "d",
	a_hou: "h",
	a_min: "m",
	a_sec: "s",
	// buttons
	b_sel:'Seleccionar',
	b_del:'Borrar',
	b_get:'Obtener de esta página',
	b_sav:'Guardar como "Datos antiguos"',
	b_loa:'Cargar datos guardados',
	b_res:'Resetear estadísticas',
	// titles
	t_odt:'Datos antiguos',
	t_ndt:'Datos nuevos',
	t_fmt:'Formato',
	t_col:'Colores',
	t_inc:'Incluir',
	t_out:'Estadísticas (código)',
	t_stb:'Estado',
	t_pre:'Evolución',
	t_exp:'Exportar para foros',
	// period
	p_ago:'hace {period}',
	p_now:'ahora',
	// colors
	c_dbg:'Fondo oscuro',
	c_lbg:'Fondo claro',
	// status (errors)
	e_nod:'No hay datos antiguos',
	e_nnd:'No hay datos nuevos',
	e_odf:'Los datos antiguos tienen un formato erróneo',
	e_ndf:'Los datos nuevos tienen un formato erróneo',
	e_unk:'Error inesperado',
	e_ndt:'Sin datos',
	e_wft:'Formato erróneo',
	// status (success)
	w_pcs:'Procesando',
	// output
	o_tdt:'Evolución de la alianza desde el {oldDate} hasta el {newDate}',
	o_tet:'Tiempo transcurrido',
	o_tas:'Resumen de la alianza',
	o_ptl:'Puntos totales',
	o_ppm:'Puntos por miembro',
	o_ttt:'Top 3 por puntos totales',
	o_tts:'Top 3 por puntos subidos',
	o_ttp:'Top 3 por porcentaje subido',
	o_ttg:'Top 3 por posiciones subidas',
	o_trt:'Ranking por puntos totales',
	o_trs:'Ranking por puntos subidos',
	o_trp:'Ranking por porcentaje subido',
	o_trg:'Ranking por posiciones subidas',
	o_tsc:'Casos especiales',
	o_cnm:'nuevo miembro',
	o_cla:'abandona la alianza',
	o_bdg:'baneado',
	o_bdq:'desbaneado',
	o_abt:'Estadísticas realizadas con {link}',
	// OGame Error
	e_oga:'Error de OGame, recargar esta página puede arreglarlo'
});

/*! [i18n=fr] by Elvara http://userscripts-mirror.org/topics/116649 */
if (/fr/.test(ogameInfo.language))i18n.set(
{
	// separators
	s_dec: ".",
	s_tho: ",",
	s_dat: "/",
	s_tim: ":",
	// abb time units
	a_wee: "s",
	a_day: "j",
	a_hou: "h",
	a_min: "m",
	a_sec: "s",
	// buttons
	b_sel:'Sélectionner',
	b_del:'Effacer',
	b_get:'Recharger de cette page',
	b_sav:'Sauvegarder comme "Anciennes données"',
	b_loa:'Charger anciennes données',
	b_res:'Réinitialiser les statistiques',
	// titles
	t_odt:'Anciennes données',
	t_ndt:'Nouvelles données',
	t_fmt:'Format',
	t_col:'Couleur',
	t_inc:'Inclure',
	t_out:'Statistiques (code)',
	t_stb:'Statut',
	t_pre:'Évolution',
	t_exp:'Exporter pour forums',
	// period
	p_ago:'{period} depuis le début',
	p_now:'maintenant',
	// colors
	c_dbg:'Arrière plan foncé',
	c_lbg:'Arrière plan clair',
	// status (errors)
	e_nod:'Pas d\'anciennes données',
	e_nnd:'Pas de nouvelles données',
	e_odf:'Les anciennes données ont un mauvais format',
	e_ndf:'Les nouvelles données ont un mauvais format',
	e_unk:'Erreur inattendu',
	e_ndt:'Pas de données',
	e_wft:'Mauvais format',
	// status (success)
	w_pcs:'Traitement en cours',
	// output
	o_tdt:'Évolution de l\'alliance du {oldDate} au {newDate}',
	o_tet:'Temps passé',
	o_tas:'Résumé de l\'alliance ',
	o_ptl:'Points totaux',
	o_ppm:'Points par membres',
	o_ttt:'Top 3 par points totaux',
	o_tts:'Top 3 par points gagnées',
	o_ttp:'Top 3 par pourcentage gagné',
	o_ttg:'Top 3 par places gagnées',
	o_trt:'Rang par points totaux',
	o_trs:'Rang par points gagnées',
	o_trp:'Rang par pourcentage gagné',
	o_trg:'Rang par places gagnées',
	o_tsc:'Cas spéciaux',
	o_cnm:'Nouveaux Membres',
	o_cla:'A quitté l\'alliance',
	o_bdg:'Banni',
	o_bdq:'Débanni',
	o_abt:'Statistiques obtenues avec {link}',
	// OGame Error
	e_oga:'Erreur OGame, recharger la page peut régler le problème'
});

/*! [i18n=tr] by Joaquin09 http://userscripts-mirror.org/topics/118658 */
if (/tr/.test(ogameInfo.language))i18n.set(
{
	// Ayırıcılar
	s_dec: ".",
	s_tho: ",",
	s_dat: "/",
	s_tim: ":",
	// Zaman birimleri
	a_wee: "h",
	a_day: "g",
	a_hou: "s",
	a_min: "d",
	a_sec: "s",
	// Butonlar
	b_sel: 'Seç',
	b_del: 'Sil',
	b_get: 'Bu sayfadankini kullan',
	b_sav: '"Eski veri" olarak kaydet',
	b_loa: 'Kaydedilen verileri yükle',
	b_res: 'İstatistikleri sıfırla',
	// Başlıklar
	t_odt: 'Eski veri',
	t_ndt: 'Yeni veri',
	t_fmt: 'Biçim',
	t_col: 'Renkler',
	t_inc: 'Ekle',
	t_out: 'İstatistik (code)',
	t_stb: 'Durum',
	t_pre: 'Gelişim',
	t_exp: 'Forumlara Aktar ',
	// Periyot
	p_ago: '{period} önce',
	p_now: 'şimdi',
	// Renkler
	c_dbg: 'Koyu arka plan',
	c_lbg: 'Açık arka plan',
	// Durum (hatalar)
	e_nod: 'Eski veri',
	e_nnd: 'Yeni veri yok',
	e_odf: 'Eski veri hatalı formatta',
	e_ndf: 'Yeni veri hatalı formatta',
	e_unk: 'Beklenmeyen hata',
	e_ndt: 'Veri yok',
	e_wft: 'Yanlış format',
	// Durum (başarı)
	w_pcs: 'İşleniyor',
	// Çıktı
	o_tdt: 'Gelişim Zaman Aralığı {oldDate} - {newDate} ',
	o_tet: 'Geçen zaman',
	o_tas: 'İttifak Bilgisi',
	o_ptl: 'Toplam Puan',
	o_ppm: 'Üye Başına Ortalama Puan',
	o_ttt: 'Toplam Puana Göre En İyi 3',
	o_tts: 'Puan Artışına Göre En İyi 3',
	o_ttp: 'Yüzdelik Artışa Göre En İyi 3',
	o_ttg: 'Sıra Artışına Göre En İyi 3',
	o_trt: 'Toplam Puana Göre Sıralama',
	o_trs: 'Puan Artışına Göre Sıralama',
	o_trp: 'Yüzdelik Artışa Göre Sıralama',
	o_trg: 'Sıra Artışına Göre Sıralama',
	o_tsc: 'Özel Durumlar',
	o_cnm: 'Yeni Üye',
	o_cla: 'İttifaktan ayrılır',
	o_bdg: 'Yasaklı',
	o_bdq: 'Yasağı kaldırılmış',
	o_abt: '{link} tarafından gerçekleştirilen istatistikler',
	// OGame Hatası
	e_oga: 'OGame Hatası, Düzeltmek İçin Sayfayı Tekrar Yükleyin'
});

/*! [i18n=pt] by wacker faxes http://userscripts-mirror.org/topics/118886 */
if (/pt|br/.test(ogameInfo.language))i18n.set(
{
	// separators
	s_dec: ".",
	s_tho: ",",
	s_dat: "/",
	s_tim: ":",
	// abb time units
	a_wee: "s",
	a_day: "d",
	a_hou: "h",
	a_min: "m",
	a_sec: "s",
	// buttons
	b_sel:'Seleccionar',
	b_del:'Apagar',
	b_get:'Obter desta página',
	b_sav:'Gravar como "Informação antiga"',
	b_loa:'Carregar informação gravada',
	b_res:'Recomeçar',
	// titles
	t_odt:'Informação antiga',
	t_ndt:'Informação nova',
	t_fmt:'Formato',
	t_col:'Cores',
	t_inc:'Incluir',
	t_out:'Estatísticas (código)',
	t_stb:'Estado',
	t_pre:'Evolução',
	t_exp:'Exportar para foruns',
	// period
	p_ago:'{period} atrás',
	p_now:'agora',
	// colors
	c_dbg:'Fundo escuro',
	c_lbg:'Fundo claro',
	// status (errors)
	e_nod:'Sem informação antiga',
	e_nnd:'Sem informação nova',
	e_odf:'A informação antiga tem formato errado',
	e_ndf:'A informação nova tem formato errado',
	e_unk:'Erro inesperado',
	e_ndt:'Sem informação',
	e_wft:'Formato errado',
	// status (success)
	w_pcs:'Processar',
	// output
	o_tdt:'Evolução da aliança desde {oldDate} até {newDate}',
	o_tet:'Tempo decorrido',
	o_tas:'Sumario da aliança',
	o_ptl:'Pontos totais',
	o_ppm:'Pontos por membro',
	o_ttt:'Top 3 por pontos totais',
	o_tts:'Top 3 por pontos ganhos',
	o_ttp:'Top 3 por percentagem ganha',
	o_ttg:'Top 3 por posições ganhas',
	o_trt:'Classificação total de pontos',
	o_trs:'Classificação pontos ganhos',
	o_trp:'Classificação percentagem ganha',
	o_trg:'Classificação posições ganhos',
	o_tsc:'Casos especiais',
	o_cnm:'novo membro',
	o_cla:'deixou aliança',
	o_bdg:'banido',
	o_bdq:'ex-banido',
	o_abt:'Estatísticas realizadas por {link}'
});

/*! [i18n=it] by adyr http://userscripts-mirror.org/topics/119582 */
if (/it/.test(ogameInfo.language))i18n.set(
{
	// separators
	s_dec: ".",
	s_tho: ",",
	s_dat: "/",
	s_tim: ":",
	// abb time units
	a_wee: "s",
	a_day: "g",
	a_hou: "o",
	a_min: "m",
	a_sec: "s",
	// buttons
	b_sel:'Seleziona',
	b_del:'Cancella',
	b_get:'Copia dalla pagina',
	b_sav:'Salva come "Dati vecchi"',
	b_loa:'Carica dati salvati',
	b_res:'Resetta le statistiche',
	// titles
	t_odt:'Dati vecchi',
	t_ndt:'Nuovi dati',
	t_fmt:'Formato',
	t_col:'Colori',
	t_inc:'Includi',
	t_out:'Statistiche (codice)',
	t_stb:'Status',
	t_pre:'Progresso',
	t_exp:'Esporta per il forum',
	// period
	p_ago:'{period} fa',
	p_now:'ora',
	// colors
	c_dbg:'Sfondo scuro',
	c_lbg:'Sfondo chiaro',
	// status (errors)
	e_nod:'Nessun dato vecchio',
	e_nnd:'Nessun dato nuovo',
	e_odf:'I dati vecchi hanno un formato sbagliato',
	e_ndf:'I dati nuovi hanno un formato sbagliato',
	e_unk:'Errore generico',
	e_ndt:'Nessu dato',
	e_wft:'Formato errato',
	// status (success)
	w_pcs:'In elaborazione',
	// output
	o_tdt:'Progresso alleanza da {oldDate} a {newDate}',
	o_tet:'Tempo trascorso',
	o_tas:'Sommario alleanza',
	o_ptl:'Punti totali',
	o_ppm:'Punti per Player',
	o_ttt:'Top 3 punteggio totale',
	o_tts:'Top 3 punti guadagnati',
	o_ttp:'Top 3 percentuale punti guadagnati',
	o_ttg:'Top 3 posizioni guadagnate',
	o_trt:'Classifica punteggio totale',
	o_trs:'Classifica punti guadagnati',
	o_trp:'Classifica percentuale punti guadagnati',
	o_trg:'Classifica posizioni guadagnate',
	o_tsc:'Casi speciali',
	o_cnm:'nuovo alleato',
	o_cla:'ha lasciato l alleanza',
	o_bdg:'bannato',
	o_bdq:'sbannato',
	o_abt:'Statistiche create da {link}',
	// OGame Error
	e_oga:'Errore di Ogame, ricarica la pagina'
});

/*! [i18n=ru] by Asiman board.origin.ogame.gameforge.com/board175-u/board39-o/p34454-c#post34454 */
if (/ru/.test(ogameInfo.language))i18n.set(
{
	// separators
	s_dec: ".",
	s_tho: ",",
	s_dat: "/",
	s_tim: ":",
	// abb time units
	a_wee: "н",
	a_day: "д",
	a_hou: "ч",
	a_min: "м",
	a_sec: "с",
	// buttons
	b_sel:'Выделить',
	b_del:'Очистить',
	b_get:'Получить с этой страницы',
	b_sav:'Сохранить "Старые данные"',
	b_loa:'Загрузить сохраненные данные',
	b_res:'Обнулить статистику',
	// titles
	t_odt:'Старые данные',
	t_ndt:'Новые данные',
	t_fmt:'Формат',
	t_col:'Цвета',
	t_inc:'Показать/Скрыть',
	t_out:'Статистика (код)',
	t_stb:'Статус',
	t_pre:'Прогресс',
	t_exp:'Экспорт для форума',
	// period
	p_ago:'{period} с предыдущей даты',
	p_now:'сейчас',
	// colors
	c_dbg:'Темный фон',
	c_lbg:'Светлый фон',
	// status (errors)
	e_nod:'Нет старых данных',
	e_nnd:'Нет новых данных',
	e_odf:'Старые данные имеют неверный формат',
	e_ndf:'Новые данные имеют неверный формат',
	e_unk:'Неожиданная ошибка',
	e_ndt:'Нет данных',
	e_wft:'Неверный формат',
	// status (success)
	w_pcs:'Обработка',
	// output
	o_tdt:'Прогресс альянса с {oldDate} по {newDate}',
	o_tet:'Прошедшее время',
	o_tas:'Сумарно по альянсу',
	o_ptl:'Общее количество очков',
	o_ppm:'Очки на одного члена',
	o_ttt:'Топ 3 по общему количеству очков',
	o_tts:'Топ 3 по полученому количеству очков',
	o_ttp:'Топ 3 по полученому проценту',
	o_ttg:'Топ 3 по полученым позициям',
	o_trt:'Всего количество очей по топу',
  	o_trs:'Приобретено количество очей по топу',
	o_trp:'Приобретено процентов по топу',
	o_trg:'Приобретено позиций по топу',
	o_tsc:'Особые случаи',
	o_cnm:'новый игрок альянса',
	o_cla:'покинул альянс',
	o_bdg:'заблокирован',
	o_bdq:'разблокирован',
	o_abt:'Первоисточник статистики: {link}',
	// OGame Error
	e_oga:'Ошибка OGame, перезагрузка страници может исправить данную ошибку'
});
/*! [/i18n] */

// colors

var Colors = function ()
{
	this.names = new Array();
	this.colors = new Array();
	this.selected = null;
};

Colors.prototype =
{
	add : function (name, colors)
	{
		this.names.push(name);
		this.colors.push(colors);
	},
	select : function (index)
	{
		this.selected = this.colors[index];
	},
	replace : function (tpl)
	{
		return tpl._cos_replaceMap(this.selected);
	}
};

var colors = new Colors();

/*! [color=dark-background] */
colors.add(
	_('c_dbg'),
	{
		'{nameColor}'      : 'white',
		'{growsColor}'     : '#00FF40',
		'{decreasesColor}' : '#ED7010',
		'{remainsColor}'   : '#00DDDD'
	}
);

/*! [color=light-background] */
colors.add(
	_('c_lbg'),
	{
		'{nameColor}'      : 'purple',
		'{growsColor}'     : 'green',
		'{decreasesColor}' : 'red',
		'{remainsColor}'   : 'blue'
	}
);
/*! [/color] */

// operations

var Calc =
{
	diffScore : function (oldScore, newScore)
	{
		var diff = newScore - oldScore;
		var percent = ((newScore/oldScore)-1)*100;
		return {
			score: diff,
			percent: percent
		}
	}
};

// format

var Format = function()
{
	this.formats   = new Array();
	this.selected  = null;
	this.escapeMap =
	{
		'[':"[[u][/u]",
		']':"[u][/u]]"
	};
	this.lastReplace =
	{
		'{grows}'     : "\u00BB", // »
		'{decreases}' : "\u00AB", // «
		'{remains}'   : "\u007E", // ~
		'{remainsNo}' : "\u00D8", // Ø
		'{up}'        : "\u2191", // ↑
		'{down}'      : "\u2193", // ↓
		'{infinity}'  : "\u8734;", // ∞
		'{rank}'      : '#',
		'{\\'         : '{',
		'\\}'         : '}'
	};
	this.layout = {
		sectionStart : '[size=big]{title}[/size]',
		sectionEnd   : "\n\n",
		dateTime : '{date} ([i]{time}[/i])',
		header :
		'[b]{title}[/b]'+"\n"+
		'{elapsedTitle}: {elapsedTime}'+
		"\n\n",
		allianceLine : "\n"+
		'[color={diffColor}]{diff}[/color] '+
		'[b][color={nameColor}]{title}[/color][/b] '+
		'- {newScore} '+
		'([b][color={diffColor}]{diffScore}[/color][/b]) '+
		'([b][color={diffColor}]{diffPercent}[/color][/b] '+
		'[color={diffColor}][size=small]%[/size][/color])',
		top3TScoreLine : "\n"+
		'[color={diffColor}]{position} {diff} [/color] '+
		'[color={nameColor}][b]{name}[/b][/color] '+
		'({newScore})',
		top3ScoreLine : "\n"+
		'[color={diffColor}]{position} {diff} [/color] '+
		'[color={nameColor}][b]{name}[/b][/color] '+
		'([b][color={diffColor}]{diffScore}[/color][/b])',
		top3PercentLine : "\n"+
		'[color={diffColor}]{position} {diff} [/color] '+
		'[color={nameColor}][b]{name}[/b][/color] '+
		'([b][color={diffColor}]{diffPercent}[/color][/b] '+
		'[color={diffColor}][size=small]%[/size][/color])',
		top3PositionsLine : "\n"+
		'[color={diffColor}]{position} {diff} [/color] '+
		'[color={nameColor}][b]{name}[/b][/color] '+
		'([b][color={diffColor}]{diffPos}[/color][/b])',
		rankLine : "\n"+
		'[color={diffColor}]{position} {diff} [/color]'+
		'[color={nameColor}][b]{name}[/b][/color] '+
		'- {newScore} '+
		'([b][color={diffColor}]{diffScore}[/color][/b]) '+
		'([b][color={diffColor}]{diffPercent}[/color][/b] '+
		'[color={diffColor}][size=small]%[/size][/color])',
		rank :
		' [size=small]{rank}[/size]{newPos} '+
		'([b][color={diffColor}]{diffPos}[/color][/b])',
		rankNoDiff :
		' [size=small]{rank}[/size]{newPos} '+
		'([b][color={remainsColor}]{remainsNo}[/color][/b])',
		rankLineNoDiff : "\n"+
		'[color={diffColor}]{position} {diff} [/color]'+
		'[color={nameColor}][b]{name}[/b][/color] '+
		'- {oldScore} '+
		'([b][color={remainsColor}]{remainsNo}[/color][/b])',
		from0Member : "\n"+
		'[color={growsColor}]{grows} [/color] '+
		'[color={nameColor}][b]{name}[/b][/color] '+
		'- [b][color={growsColor}]{score}[/color][/b] '+
		'[size=small]({reason})[/size]',
		to0Member : "\n"+
		'[color={decreasesColor}]{decreases} [/color] '+
		'[color={nameColor}][b]{name}[/b][/color] '+
		'- [b][color={decreasesColor}]{score}[/color][/b] '+
		'[size=small]({reason})[/size]',
		scriptData : "\n"+
		'[i]{scriptDataTitle}:[/i]'+"\n"+
		'[spoiler][code]{scriptData}[/code][/spoiler]',
		scriptLink :"\n"+'[i]'+
		_('o_abt').replace('{link}','[url={scriptHome}]{scriptName}[/url]')
		+'[/i]'
	};
};

Format.prototype =
{
	add : function (name, patterns)
	{
		this.formats.push({
			name: name,
			patterns: patterns,
			escapeMap: (arguments.length>2)
				? arguments[2]
				: false
		});
	},
	select : function (index)
	{
		this.selected = this.formats[index];
	},
	escape : function (text)
	{
		if (this.selected.escapeMap)
			return text._cos_replaceMap(this.selected.escapeMap);
		else
			return text._cos_replaceMap(this.escapeMap);
	},
	diff : function (input, diff)
	{
		var output = input;
		if (diff < 0)
		{
			output = output._cos_replaceMap({
				'{diffColor}' : '{decreasesColor}',
				'{diff}'      : '{decreases}'
			});
		}
		else
		{	
			if (diff > 0)
				output = output._cos_replaceMap({
					'{diffColor}' : '{growsColor}',
					'{diff}'      : '{grows}'
				});
			else
				output = output._cos_replaceMap({
					'{diffColor}' : '{remainsColor}',
					'{diff}'      : '{remains}'
				});
		}
		return output;
	},
	header : function (allyInfo)
	{
		return this.layout.header._cos_replaceMap(
		{
			'{title}' :
				_('o_tdt'
				)._cos_replaceMap(
				{
					'{oldDate}' : this.layout.dateTime._cos_replaceMap(
					{
						'{date}' : allyInfo.oldDate,
						'{time}' : allyInfo.oldTime
					}),
					'{newDate}' : this.layout.dateTime._cos_replaceMap(
					{
						'{date}' : allyInfo.newDate,
						'{time}' : allyInfo.newTime
					})
				}),
			'{elapsedTitle}' : _('o_tet'),
			'{elapsedTime}'  :
				this.escape(i18n.period(
					allyInfo.newTimestamp -
					allyInfo.oldTimestamp
				))
		});
	},
	alliance : function (allyInfo)
	{
		if (allyInfo.oldScore==0)
			return '';
		
		return this.layout.sectionStart._cos_replaceAll(
			'{title}', _('o_tas')
		)+
		this.diff(
			this.layout.allianceLine,
			allyInfo.diffScore
		)._cos_replaceMap(
		{
			'{title}'       : _('o_ptl'),
			'{newScore}'    : allyInfo.formatted.newScore,
			'{diffScore}'   : allyInfo.formatted.diffScore,
			'{diffPercent}' : allyInfo.formatted.diffPercent
		})+
		this.diff(
			this.layout.allianceLine,
			allyInfo.diffMemberScore
		)._cos_replaceMap({
			'{title}'       : _('o_ppm'),
			'{newScore}'    : allyInfo.formatted.newMemberScore,
			'{diffScore}'   : allyInfo.formatted.diffMemberScore,
			'{diffPercent}' : allyInfo.formatted.diffMemberPercent
		})+
		this.layout.sectionEnd;
	},
	position : function (n,end)
	{
		var out = n+'', from = (out).length, to = (end+'').length;
		for (var i=from; i<to; i++)
			out = '0'+out;
		return out;
	},
	top3 : function (membersInfo, key, title, lineLayout)
	{
		var output = (this.layout.sectionStart+'').replace(
			'{title}', title
		);
		
		var end = Math.min(membersInfo.length, 3);
		var i, info;
		for (i=0; i<end; i++)
		{
			info = membersInfo[i];
			output = output + this.diff(
				lineLayout,
				info.diffScore
			)._cos_replaceMap({
				'{position}' : this.position(i+1,end),
				'{name}'     : this.escape(info.name),
				'{diffPos}'  : info.formatted.diffPos._cos_replaceMap({
					'+': '{up}',
					'-': '{down}'
				})
			})._cos_replaceAll(
				'{'+key+'}', info.formatted[key]
			);
		}
		return output + this.layout.sectionEnd;
	},
	rank : function (membersInfo, title)
	{
		var output = (this.layout.sectionStart+'').replace(
			'{title}', title
		);
		var end = membersInfo.length;
		var i, info;
		for (i=0; i<end; i++)
		{
			info = membersInfo[i];
			info.name = info.name.replace(/\(.+\)/gm, '');
			var layout = (info.diffScore==0)
				? this.layout.rankLineNoDiff
				: this.layout.rankLine;
			output = output + this.diff(
				layout,
				info.diffScore
			)._cos_replaceMap({
				'{position}'     : this.position(i+1,end),
				'{name}'         : this.escape(info.name),
				'{oldScore}'     : info.formatted.oldScore,
				'{newScore}'     : info.formatted.newScore,
				'{diffScore}'    : info.formatted.diffScore,
				'{diffPercent}'  : info.formatted.diffPercent
			});
			
			layout = (info.diffPos==0)
				? this.layout.rankNoDiff
				: this.layout.rank;
			
			output = output + this.diff(
				layout,
				info.diffPos
			)._cos_replaceMap({
				'{newPos}'  : info.formatted.newPos,
				'{diffPos}' : info.formatted.diffPos._cos_replaceMap({
					'+': '{up}',
					'-': '{down}'
				})
			});
		}
		return output + this.layout.sectionEnd;
	},
	specialCases : function (to0MembersInfo, from0MembersInfo)
	{
		if ((to0MembersInfo.length + from0MembersInfo.length) == 0)
			return '';
		
		var output = this.layout.sectionStart.replace(
			'{title}', _('o_tsc')
		);
		var key, info;
		
		for (key in from0MembersInfo)
		{
			info = from0MembersInfo[key];
			output = output + this.layout.from0Member._cos_replaceMap({
				'{name}'   : this.escape(info.name),
				'{score}'  : info.score,
				'{reason}' : info.reason
			});
		}
		
		for (key in to0MembersInfo)
		{
			info = to0MembersInfo[key];
			output = output + this.layout.to0Member._cos_replaceMap({
				'{name}'   : this.escape(info.name),
				'{score}'  : info.score,
				'{reason}' : info.reason
			});
		}
		
		return output + this.layout.sectionEnd;
	},
	format : function (
		include, allyInfo, membersInfo,
		to0MembersInfo, from0MembersInfo,
		oldData, newData
	)
	{
		var output = this.header(allyInfo);
		
		if (include.alliance)
				output = output + this.alliance(allyInfo);
		
		var top3Score     = '';
		var top3TScore    = '';
		var top3Percent   = '';
		var top3Positions = '';
		var tScoreRank    = '';
		var scoreRank     = '';
		var percentRank   = '';
		var positionsRank = '';
		
		if(membersInfo.length > 0)
		{
			// TOTAL SCORE
		
			membersInfo = membersInfo.sort(function(a,b)
			{
				if (a.newScore==b.newScore)
					return (a.diffScore>=b.diffScore) ? -1 : 1;
				else
					return (a.newScore>=b.newScore) ? -1 : 1;
			});
			
			if(include.top3TScore&&(membersInfo.length>5||!include.tScore))
			{
				top3TScore = this.top3(
					membersInfo,
					'newScore',
					_('o_ttt'),
					this.layout.top3TScoreLine
				);
			}
			
			if (include.tScore)
				tScoreRank = this.rank(membersInfo,_('o_trt'));
				
			// GAINED SCORE
		
			membersInfo = membersInfo.sort(function(a,b)
			{
				if (a.diffScore==b.diffScore)
				{
					if (a.diffPercent==b.diffPercent)
						return (a.newScore>=b.newScore) ? -1 : 1;
					else
						return (a.diffPercent>=b.diffPercent) ? -1 : 1;
				}
				else
					return (a.diffScore>=b.diffScore) ? -1 : 1;
			});
			
			if(include.top3Score&&(membersInfo.length>5||!include.score))
			{
				top3Score = this.top3(
					membersInfo,
					'diffScore',
					_('o_tts'),
					this.layout.top3ScoreLine
				);
			}
			
			if (include.score)
				scoreRank = this.rank(membersInfo,_('o_trs'));
			
			// GAINED PERCENT
			
			membersInfo = membersInfo.sort(function(a,b)
			{
				if (a.diffPercent==b.diffPercent)
				{
					if (a.diffScore==b.diffScore)
						return (a.newScore>=b.newScore) ? -1 : 1;
					else
						return (a.diffScore>=b.diffScore) ? -1 : 1;
				}
				else
					return (a.diffPercent>=b.diffPercent) ? -1 : 1;
			});
			
			if(include.top3Percent&&(membersInfo.length>5||!include.percent))
			{
				top3Percent = this.top3(
					membersInfo,
					'diffPercent',
					_('o_ttp'),
					this.layout.top3PercentLine
				);
			}
				
			if (include.percent)
				percentRank = this.rank(membersInfo,_('o_trp'));
			
			// GAINED POSITIONS
			
			membersInfo = membersInfo.sort(function(a,b)
			{
				if (a.diffPos==b.diffPos)
				{
					if (a.diffScore==b.diffScore)
					{
						if (a.diffPercent==b.diffPercent)
							return (a.newScore>=b.newScore) ? -1 : 1;
						else
							return (a.diffPercent>=b.diffPercent) ? -1 : 1;
					}
					else
						return (a.diffScore>=b.diffScore) ? -1 : 1;
				}
				else
					return (a.diffPos>=b.diffPos) ? -1 : 1;
			});
			
			if(include.top3Positions&&(membersInfo.length>5||!include.positions))
			{
				top3Positions = this.top3(
					membersInfo,
					'diffPos',
					_('o_ttg'),
					this.layout.top3PositionsLine
				);
			}
			
			if (include.positions)
				positionsRank = this.rank(membersInfo,_('o_trg'));
		}
		
		output = output +
			top3TScore + top3Score + top3Percent + top3Positions +
			tScoreRank + scoreRank + percentRank + positionsRank;
		
		if (include.special)
			output = output + this.specialCases(
				to0MembersInfo,
				from0MembersInfo
			);
		
		var data;
		
		if (include.oldData)
		{
			data = JSON.parse(oldData);
			output = output + this.layout.scriptData._cos_replaceMap({
				'{scriptDataTitle}' : _('t_odt') + ' - ' + data.strDate + ' (' + data.strTime + ')',
				'{scriptData}'      : '{oldData}'
			});
		}
		
		if (include.newData)
		{
			data = JSON.parse(newData);
			output = output + this.layout.scriptData._cos_replaceMap({
				'{scriptDataTitle}' : _('t_ndt') + ' - ' + data.strDate + ' (' + data.strTime + ')',
				'{scriptData}'      : '{newData}'
			});
		}
		
		output = output + this.layout.scriptLink;
		output = output._cos_replaceMap(
			this.selected.patterns
		)._cos_replaceMap(
			colors.selected
		)._cos_replaceMap({
			'{scriptName}' : script.name,
			'{scriptHome}' : script.home
		})._cos_replaceMap(
			this.lastReplace
		).replace(
			'{oldData}',
			oldData._cos_replaceMap({
				'<' : "\\u003C",
				'>' : "\\u003E",
				'[' : "\\u005B",
				']' : "\\u005D"
			})
		).replace(
			'{newData}',
			newData._cos_replaceMap({
				'<' : "\\u003C",
				'>' : "\\u003E",
				'[' : "\\u005B",
				']' : "\\u005D"
			})
		);
			
		return output.trim();
	}
}

var format = new Format();

format.add(
	'phpBB',
	{
		'[size=big]'   : '[size=20]',
		'[size=small]' : '[size=10]'
	}
);

format.add(
	'phpBB3',
	{
		'[size=big]'   : '[size=140]',
		'[size=small]' : '[size=80]'
	}
);

format.add(
	'SMF',
	{
		'[size=big]'   : '[size=14pt]',
		'[size=small]' : '[size=7pt]'
	}
);

format.add(
	'vBulletin',
	{
		'[size=big]'   : '[size=4]',
		'[size=small]' : '[size=1]'
	}
);

format.add(
	'HTML',
	{
		'{grows}'      : '&raquo;',
		'{decreases}'  : '&laquo;',
		'{remains}'    : '&sim;',
		'{remainsNo}'  : '&Oslash;', // Ø
		'{up}'         : "&uarr;", // ↑
		'{down}'       : "&darr;", // ↓
		'{infinity}'   : "&#8734;", // ∞
		'[size=big]'   : '<span style="font-size: 140%;">',
		'[size=small]' : '<span style="font-size: 80%;">',
		'[/size]'      : '</span>',
		'[color={'     : '<span style="color: {',
		'Color}]'      : 'Color}">',
		'[/color]'     : '</span>',
		'[b]'          : '<b>',
		'[/b]'         : '</b>',
		'[i]'          : '<i>',
		'[/i]'         : '</i>',
		"\n"           : '<br />'+"\n",
		'[spoiler]'    : '<div>',
		'[/spoiler]'   : '</div>',
		'[code]'       : '<textarea onclick="this.select();" rows="5" cols="20">',
		'[/code]'      : '</textarea>',
		'[url={scriptHome}]{scriptName}[/url]' : '<a href="{scriptHome}">{scriptName}</a>'
	},
	{
		'&':'&amp;',
		'<':'&lt;',
		'>':'&gt;'
	}
);

// convert

var Conversor = function() {};

Conversor.prototype =
{
	reset : function ()
	{
		this.allyInfo =
		{
			oldCount: 0,
			oldScore: 0,
			newCount: 0,
			newScore: 0
		};
		this.membersInfo = new Array();
		this.oldMembersInfo = new Array();
		this.newMembersInfo = new Array();
		this.to0MembersInfo = new Array();
		this.from0MembersInfo = new Array();
	},
	readData : function (text, oldNew)
	{
		var name, data = JSON.parse(text);
		this.allyInfo[oldNew+'Timestamp'] = data.timestamp;
		this.allyInfo[oldNew+'Date'] = data.strDate;
		this.allyInfo[oldNew+'Time'] = data.strTime;
		for (name in data.members)
		{
			this[oldNew+'MembersInfo'].push({
				id    : ('i' in data.members[name])
					? data.members[name].i
					: -1,
				name  : name,
				score : data.members[name].s,
				pos   : data.members[name].p,
				coord : data.members[name].c,
				date  : data.members[name].d,
				noPartner : true
			});
			this.allyInfo[oldNew+'Count']++;
			this.allyInfo[oldNew+'Score'] =
				this.allyInfo[oldNew+'Score'] + data.members[name].s;
		}
		return data;
	},
	merge : function ()
	{
		var newKey, oldKey, oldEnd, oldInfo, newInfo, mergeInfo, diff;
		oldEnd = this.allyInfo.oldCount;
		for (newKey in this.newMembersInfo)
		{
			newInfo = this.newMembersInfo[newKey];
			for (oldKey = 0; oldKey < oldEnd; oldKey++)
			{
				oldInfo = this.oldMembersInfo[oldKey];
				if ((oldInfo.noPartner)&&(oldInfo.id == newInfo.id)) break;
			}
			if (oldKey != oldEnd)
			{
				this.oldMembersInfo[oldKey].noPartner = false;
				this.newMembersInfo[newKey].noPartner = false;
				if (newInfo.pos == 0)
				{
					this.to0MembersInfo.push({
						name   : newInfo.name,
						score  : i18n.number(oldInfo.score),
						reason : _('o_bdg')
					});
				}
				else if (oldInfo.pos == 0)
				{
					this.from0MembersInfo.push({
						name   : newInfo.name,
						score  : i18n.number(newInfo.score),
						reason : _('o_bdq')
					});
				}
				else
				{
					var diffScore, diffPercent, fDiffScore, fDiffPercent;
					if (oldInfo.score == 0)
					{
						if (newInfo.score == 0)
						{
							diffScore = 0;
							diffPercent = 0;
							fDiffScore = '+0';
							fDiffPercent = '+' + i18n.number('0.00');
						}
						else
						{
							diffScore = newInfo.score;
							diffPercent = (1/0);
							fDiffScore = '+' + i18n.number(newInfo.score);
							fDiffPercent = '+{infinity}';
						}
					}
					else if (newInfo.score == 0)
					{
						diffScore = (-1)*oldInfo.score;
						diffPercent = (-100);
						fDiffScore = i18n.number(diffScore);
						fDiffPercent = i18n.number('-100.00')
					}
					else
					{
						diff = Calc.diffScore(oldInfo.score, newInfo.score);
						diffScore = diff.score;
						diffPercent = diff.percent;
						fDiffScore = ((diffScore<0) ? '' : '+') + i18n.number(diffScore.toFixed());
						fDiffPercent = ((diffPercent<0) ? '' : '+') + i18n.number(diffPercent.toFixed(2));
					}
					
					mergeInfo = {
						name        : newInfo.name,
						oldScore    : oldInfo.score,
						newScore    : newInfo.score,
						oldPos      : oldInfo.pos,
						newPos      : newInfo.pos,
						diffPos     : oldInfo.pos-newInfo.pos,
						diffScore   : diffScore,
						diffPercent : diffPercent
					};
					mergeInfo.formatted = {
						oldScore    : i18n.number(mergeInfo.oldScore),
						newScore    : i18n.number(mergeInfo.newScore),
						oldPos      : i18n.number(mergeInfo.oldPos.toFixed()),
						newPos      : i18n.number(mergeInfo.newPos.toFixed()),
						diffPos     : ((mergeInfo.diffPos<0) ? '' : '+') + i18n.number(mergeInfo.diffPos.toFixed()),
						diffScore   : fDiffScore,
						diffPercent : fDiffPercent
					};
					this.membersInfo.push(mergeInfo);
				}
			}
		}
		var info, key;
		for (key in this.newMembersInfo)
		{
			info = this.newMembersInfo[key];
			if(info.noPartner)
			{
				this.from0MembersInfo.push({
					name   : info.name,
					score  : i18n.number(info.score),
					reason : _('o_cnm')
				});
			}
		}
		for (key in this.oldMembersInfo)
		{
			info = this.oldMembersInfo[key];
			if(info.noPartner)
			{
				this.to0MembersInfo.push({
					name   : info.name,
					score  : i18n.number(info.score),
					reason : _('o_cla')
				});
			}
		}
		
		this.to0MembersInfo.sort(function(a,b){
			return parseInt(a.score)-parseInt(b.score);
		});
		this.from0MembersInfo.sort(function(a,b){
			return parseInt(b.score)-parseInt(a.score);
		});
		
		delete this.oldMembersInfo;
		delete this.newMembersInfo;
		
		diff = Calc.diffScore(this.allyInfo.oldScore, this.allyInfo.newScore);
		this.allyInfo.diffScore   = diff.score;
		this.allyInfo.diffPercent = diff.percent;
		this.allyInfo.oldMemberScore =
			this.allyInfo.oldScore / this.allyInfo.oldCount;
		this.allyInfo.newMemberScore =
			this.allyInfo.newScore / this.allyInfo.newCount;
		diff = Calc.diffScore(this.allyInfo.oldMemberScore, this.allyInfo.newMemberScore);
		this.allyInfo.diffMemberScore   = diff.score;
		this.allyInfo.diffMemberPercent = diff.percent;
		
		this.allyInfo.formatted =
		{
			oldScore        : i18n.number(this.allyInfo.oldScore),
			newScore        : i18n.number(this.allyInfo.newScore),
			diffScore       : ((this.allyInfo.diffScore<0)?'':'+')+
				i18n.number(this.allyInfo.diffScore.toFixed()),
			diffPercent     : ((this.allyInfo.diffPercent<0)?'':'+')+
				i18n.number(this.allyInfo.diffPercent.toFixed(2)),
			
			oldMemberScore    : i18n.number(this.allyInfo.oldMemberScore.toFixed()),
			newMemberScore    : i18n.number(this.allyInfo.newMemberScore.toFixed()),
			diffMemberScore   : ((this.allyInfo.diffMemberScore<0)?'':'+')+
				i18n.number(this.allyInfo.diffMemberScore.toFixed()),
			diffMemberPercent : ((this.allyInfo.diffMemberPercent<0)?'':'+')+
				i18n.number(this.allyInfo.diffMemberPercent.toFixed(2))
		};
	},
	
	doIt : function (form)
	{
		form.setStats();
		form.setPreview();
		format.select(parseInt(form.selectFormat.selectedIndex));
		colors.select(parseInt(form.selectColors.selectedIndex));
		form.setOkStatus(_('w_pcs')+'...');
		this.reset();
		var data, title, oldListError = false;
		if (form.oldList.value.trim()=='')
		{
			form.setErrorStatus(_('e_nod'));
			form.setTitle('old', _('e_ndt'), false);
			oldListError = true;
		}
		if (!oldListError) try
		{
			data = this.readData(form.oldList.value,'old');
			title = data.strDate+
				' (<i>'+data.strTime+'</i>) &rarr; '+
				((ogameInfo.timestamp==data.timestamp)
					? _('p_now')
					: _('p_ago').replace(
						'{period}',
						i18n.period(ogameInfo.timestamp-data.timestamp)
					));
			if (this.oldMembersInfo.length==0||/NaN|undefined/.test(title))
				throw 0;
			form.setTitle('old',title,true);
		}
		catch (e)
		{
			form.setTitle('old', _('e_wft'), false);
			form.setErrorStatus(_('e_odf'));
			oldListError = true;
		}
		if (form.newList.value.trim()=='')
		{
			form.setErrorStatus(_('e_nnd'));
			form.setTitle('new', _('e_ndt'), false);
			return;
		}
		try
		{
			data = this.readData(form.newList.value,'new');
			title = data.strDate+
				' (<i>'+data.strTime+'</i>) &rarr; '+
				((ogameInfo.timestamp==data.timestamp)
					? _('p_now')
					: _('p_ago').replace(
						'{period}',
						i18n.period(ogameInfo.timestamp-data.timestamp)
					));
			if (this.newMembersInfo.length==0||/NaN|undefined/.test(title))
				throw 0;
			form.setTitle('new',title,true);
			if(oldListError) return;
		}
		catch (e)
		{
			form.setErrorStatus(_('e_ndf'));
			return;
		}
		try
		{
			this.merge();
			/*if (/NaN|Infinity/.test(
				this.allyInfo.formatted.diffScore +
				this.allyInfo.formatted.diffPercent
			)){
				throw 'NaN|Infinity';
			}*/
			var include = {
				alliance      : form.doAlliance.checked,
				top3TScore    : form.doTop3TScore.checked,
				top3Score     : form.doTop3Score.checked,
				top3Percent   : form.doTop3Percent.checked,
				top3Positions : form.doTop3Positions.checked,
				tScore        : form.doTScore.checked,
				score         : form.doScore.checked,
				percent       : form.doPercent.checked,
				positions     : form.doPositions.checked,
				special       : form.doSpecial.checked,
				oldData       : form.doOldData.checked,
				newData       : form.doNewData.checked
			};
			form.setStats(format.format(
				include,
				this.allyInfo,
				this.membersInfo,
				this.to0MembersInfo,
				this.from0MembersInfo,
				form.oldList.value.trim(),
				form.newList.value.trim()
			));
			include.oldData = false;
			include.newData = false;
			format.select(format.formats.length-1);
			colors.select(0);
			// [DIRTY FIX]
			var player_high_search = '[color={nameColor}][b]{name}[/b][/color]'._cos_replaceMap(
				format.selected.patterns)._cos_replaceAll(
				'{name}',ogameInfo.player_name);
			var player_high_replace = player_high_search._cos_replaceAll('{nameColor}','#FF0');
			// [/DIRTY FIX]
			player_high_search = player_high_search._cos_replaceMap(colors.selected);
			form.setPreview(format.format(
				include,
				this.allyInfo,
				this.membersInfo,
				this.to0MembersInfo,
				this.from0MembersInfo,
				form.oldList.value.trim(),
				form.newList.value.trim()
			)._cos_replaceAll(
				format.selected.patterns['[size=small]'],'<span>'
			)._cos_replaceAll(
				format.selected.patterns['[size=big]'],'<span style="font-size:20px">'
			// [DIRTY FIX]
			)._cos_replaceAll(
				player_high_search, player_high_replace
			));
			// [/DIRTY FIX]
			form.hideStatus(); // status OK, no need to show it
		}
		catch (e)
		{
			form.setErrorStatus(_('e_unk')+': '+e);
		}
	}
}

var conversor = new Conversor();

var uniqid =
{
	num: (new Date()).getTime(),
	get: function()
	{
		return script.name+(this.num++);
	}
}

// DOM

var Dom = function(){}

Dom.prototype =
{
	addTextarea : function (parent)
	{
		var ta = doc.createElement('textarea');
		ta.setAttribute('cols','120');
		ta.setAttribute('rows','40');
		ta.setAttribute('class','textBox');
		parent.appendChild(ta);
		return ta;
	},
	addSelect : function (parent)
	{
		var s = doc.createElement('select');
		s.setAttribute('class','dropdown');
		parent.appendChild(s);
		return s;
	},
	addOption : function (text, value, parent)
	{
		var option = doc.createElement('option');
		option.appendChild(doc.createTextNode(text));
		option.setAttribute('value',value);
		parent.appendChild(option);
		return option;
	},
	addAnchor : function (parent, text)
	{
		var a = doc.createElement('a');
		a.setAttribute('href','javascript:void(0);');
		a.setAttribute('class',script.name);
		a.appendChild(doc.createTextNode(text));
		parent.appendChild(a);
		return a;
	},
	addTitle : function (parent, text)
	{
		//var b = doc.createElement('span');
		var b = doc.createElement('b');
		b.appendChild(doc.createTextNode(text));
		//b.setAttribute('style','display:block;color:#6F9FC8;font-size:12px');
		b.setAttribute('style','display:block;font-size:12px');
		parent.appendChild(b);
		return b;
	},
	newCell : function ()
	{
		var td = doc.createElement('td');
		return td;
	},
	addText : function (parent, text)
	{
		var t = doc.createTextNode(text);
		parent.appendChild(t);
		return t;
	},
	addBr : function (parent)
	{
		parent.appendChild(doc.createElement('br'));
	},
	addEvent : function (node, event, func)
	{
		node.addEventListener(event, func, false);
	},
	addOnChange : function (node, func)
	{
		node.addEventListener('change', func, false);
		node.addEventListener('keyup' , func, false);
	},
	cancelBubble : function (e)
	{
		var evt = e ? e : win.event;
		if (evt.stopPropagation)
			evt.stopPropagation();
		if (evt.cancelBubble!=null)
			evt.cancelBubble = true;
	},
	addCheckbox : function (parent, text, id, def, func)
	{
		var cb = doc.createElement('input');
		cb.setAttribute('type','checkbox');
		cb.setAttribute('id',script.name+'_'+id);
		cb.setAttribute('style','cursor:pointer;');
		parent.appendChild(cb);
		var label = doc.createElement('label');
		label.setAttribute('for',script.name+'_'+id);
		label.setAttribute('style','cursor:pointer;');
		label.innerHTML='&nbsp;'+text;
		parent.appendChild(label);
		this.addBr(parent);
		var checked = storage.get(id);
		cb.checked = (checked==null)
			? def
			: (parseInt(checked)==1);
		storage.set(id,(cb.checked)?1:0);
		cb.addEventListener('change', function()
			{
				storage.set(id,(cb.checked)?1:0);
				func();
			}
			,false
		);
		label.addEventListener('mouseover',function()
			{label.setAttribute('class','undermark');},
			false
		);
		label.addEventListener('mouseout',function()
			{label.removeAttribute('class');},
			false
		);
		return cb;
	},
	makeTogleable : function (elHide,buttonContainer,bar,goTo)
	{
		var a = doc.createElement('a');
		a.setAttribute('class',script.name+'_toggle_button');
		var go = goTo;
		var el = (elHide.length) ? elHide : new Array(elHide);
		var isOpen = true;
		var open = function()
		{
			isOpen = true;
			for (var i in el)
				el[i].removeAttribute('style');
			bar.setAttribute('class',bar.getAttribute('class').replace(
				'_toggle_bar_open', '_toggle_bar_close'
			));
		}
		var close = function()
		{
			isOpen = false;
			for (var i in el)
				el[i].setAttribute('style','display:none;');
			bar.setAttribute('class',bar.getAttribute('class').replace(
				'_toggle_bar_close', '_toggle_bar_open'
			));
		}
		var toggle = function()
		{
			if (isOpen)
				close();
			else
				open();
		}
		if (go)
		{
			var id = uniqid.get();
			a.setAttribute('href','#'+id);
			a.setAttribute('id',id);
		}
		else
			a.setAttribute('href','javascript:void(0);');
		a.addEventListener('click',
			function(e)
			{
				dom.cancelBubble(e);
				toggle();
			},
			false
		);
		bar.setAttribute('class',bar.hasAttribute('class')
			? bar.getAttribute('class')+' '+script.name+'_toggle_bar_close'
			: script.name+'_toggle_bar_close'
		);
		bar.addEventListener('click',
			function(e)
			{
				a.click();
			}
			,false);
		toggle();
		buttonContainer.setAttribute('style','position:relative;');
		buttonContainer.appendChild(a);
		return {
			open:open,
			close:close,
			toggle:toggle
		}
	},
	addCss : addCss, // now defined at the start for a fast change of css
	ogameDropDown : function (select)
	{
		var i, j, oldDD = $('.dropdown.dropdownList').get(), newDD, isNew, id, _change, _info;
		try {
			select.ogameDropDown();
		}
		catch (e) {
			select.css('visibility','visible');
			return false;
		}
		_info = {
			select : select
		}
		_change = function()
		{
			var val, text;
			val  = _info.select.val();
			text = _info.select.find('[value="'+val+'"]').text();
			_info.dropdown.attr('data-value',val).text(text);
		}
		newDD = $('.dropdown.dropdownList').get();
		for (i=0;i<oldDD.length;i++) oldDD[i] = $(oldDD[i]);
		for (i=0;i<newDD.length;i++)
		{
			newDD[i] = $(newDD[i]);
			id = newDD[i].attr('id');
			isNew = true;
			for (j=0;j<oldDD.length;j++)
				if (oldDD[j].attr('id')==id)
				{
					isNew = false;
					break;
				}
			if (isNew)
			{
				_info.dropdown = $('.dropdown [rel="'+id+'"]');
				//_info.dropdownList = newDD[i];
				_change();
				select.change(_change);
				break;
			}
		}
		return true;
	}
}

var dom = new Dom();

/*! [css] */
dom.addCss
(
	'#'+script.name+' table'+
	'{'+
		'width: 610px !important;'+
	'}'+
	'#'+script.name+' textarea'+
	'{'+
		'width: 350px !important;'+
		'height: 70px !important;'+
		'margin: 0 !important;'+
		'padding: 5px !important;'+
	'}'+
	'#'+script.name+' a.'+script.name+
	'{'+
		'display: block !important;'+
		'padding: 5px 0 0 0 !important;'+
	'}'+
	'#'+script.name+' select'+
	'{'+
		'width: 250px !important;'+
	'}'+
	'#'+script.name+' td'+
	'{'+
		'border-top: 2px dotted #242E38 !important;'+
		'padding: 5px !important;'+
		'text-align: left !important;'+
	'}'+
	'tr.alt #'+script.name+' td'+
	'{'+
		'border-top: 2px dotted #24292E !important;'+
	'}'+
	'#'+script.name+' td.col2'+
	'{'+
		'width: 364px !important;'+
	'}'+
	'#'+script.name+' tr.tit td'+
	'{'+
		'border-top: none !important;'+
		'line-height: 18px !important;'+
	'}'+
	'td#'+script.name+'_preview'+
	'{'+
		'border-top: 2px dotted #242E38 !important;'+
		'color: #6F9FC8 !important;'+
	'}'+
	'#'+script.name+'_preview div'+
	'{'+
		'padding-top: 5px !important;'+
		'padding-bottom: 5px !important;'+
	'}'+
	'#'+script.name+'_preview a'+
	'{'+
		'display: inline !important;'+
		'padding: 0 !important;'+
	'}'+
	'.'+script.name+'_toggle_button'+
	'{'+
		'background-color: transparent !important;'+
		'background-image: url(\'http://gf2.geo.gfsrv.net/cdn71/fc7a8ede3499a0b19ea17613ff0cb1.gif\') !important;'+
		'display  : block !important;'+
		'position : absolute !important;'+
		'top      : 0 !important;'+
		'right    : 0 !important;'+
		'height   : 18px !important;'+ // previosly 18 - 5
		'width    : 20px !important;'+
	'}'+
	'.'+script.name+'_toggle_bar_open,' +
	'.'+script.name+'_toggle_bar_close' +
	'{'+
		'cursor: pointer !important;'+
	'}'+
	'.'+script.name+'_toggle_bar_open .'+script.name+'_toggle_button'+
	'{'+
		'background-position: 0 0 !important;'+
	'}'+
	'.'+script.name+'_toggle_bar_close .'+script.name+'_toggle_button'+
	'{'+
		'background-position: 0 -18px !important;'+
	'}'+
	'.'+script.name+'_toggle_bar_open:hover .'+script.name+'_toggle_button'+
	'{'+
		'background-position: -20px 0 !important;'+
	'}'+
	'.'+script.name+'_toggle_bar_close:hover .'+script.name+'_toggle_button'+
	'{'+
		'background-position: -20px -18px !important;'+
	'}'
);
/*! [/css] */

// form

var Form = function (parent)
{	
	var tbody, tr, td, a, _this, key, index, doIt, toggleList, toggleCont, toggleBar, div;
	_this = this;
	
	doIt = function(){_this.doIt();}
	
	var useToggles = /WebKit|Gecko|Presto/i.test(win.navigator.userAgent);
	
	// table
	
	this.table = doc.createElement('table');
	this.table.setAttribute('cellpadding','0');
	this.table.setAttribute('cellspacing','0');
	this.table.setAttribute('class','members bborder');
	parent.appendChild(this.table);
	tbody = doc.createElement('tbody');
	this.table.appendChild(tbody);
	
	// sections title row
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','tit alt');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	td.setAttribute('colspan','2');
	td.setAttribute('class','col2');
	toggleCont = doc.createElement('div');
	dom.addTitle(toggleCont,_('t_inc')+':');
	td.appendChild(toggleCont);
	tr.appendChild(td);
	toggleBar = tr;
	
	// sections content row
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','alt');
	tbody.appendChild(tr);
	
	tr.appendChild(dom.newCell());
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	this.doAlliance = dom.addCheckbox(td,_('o_tas'),'doAlliance',true,doIt);
	this.doTop3TScore = dom.addCheckbox(td,_('o_ttt'),'doTop3TScore',false,doIt);
	this.doTop3Score = dom.addCheckbox(td,_('o_tts'),'doTop3Score',false,doIt);
	this.doTop3Percent = dom.addCheckbox(td,_('o_ttp'),'doTop3Percent',false,doIt);
	this.doTop3Positions = dom.addCheckbox(td,_('o_ttg'),'doTop3Positions',false,doIt);
	this.doTScore = dom.addCheckbox(td,_('o_trt'),'doTScore',false,doIt);
	this.doScore = dom.addCheckbox(td,_('o_trs'),'doScore',true,doIt);
	this.doPercent = dom.addCheckbox(td,_('o_trp'),'doPercent',true,doIt);
	this.doPositions = dom.addCheckbox(td,_('o_trg'),'doPositions',false,doIt);
	this.doSpecial = dom.addCheckbox(td,_('o_tsc'),'doSpecial',true,doIt);
	this.doOldData = dom.addCheckbox(td,'[spoiler] '+_('t_odt'),'doOldData',false,doIt);
	this.doNewData = dom.addCheckbox(td,'[spoiler] '+_('t_ndt'),'doNewData',true,doIt);
	tr.appendChild(td);
	if (useToggles) dom.makeTogleable(tr,toggleCont,toggleBar,false);
	
	// preview
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','tit');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	td.setAttribute('colspan','2');
	td.setAttribute('class','col2');
	toggleCont = doc.createElement('div');
	dom.addTitle(toggleCont,_('t_pre')+':');
	td.appendChild(toggleCont);
	tr.appendChild(td);
	toggleBar = tr;

	tr = doc.createElement('tr');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	td.setAttribute('colspan','2');
	td.setAttribute('id',script.name+'_preview');
	tr.appendChild(td);
	if (useToggles) dom.makeTogleable(tr,toggleCont,toggleBar,false).open();
	td.appendChild(this.preview = doc.createElement('div'));
	this.previewRow = tr;
	this.setPreview();
	
	// old data title row
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','alt tit');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	dom.addTitle(td,_('t_odt')+':');
	tr.appendChild(td);
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	toggleCont = doc.createElement('div');
	this.oldTitle = doc.createElement('span');
	toggleCont.appendChild(this.oldTitle);
	td.appendChild(toggleCont);
	tr.appendChild(td);
	toggleBar = tr;
	
	// old data content row
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','alt');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	a = dom.addAnchor(td,_('b_sel'));
	a.addEventListener('click', function(){_this.oldList.select();}, false);
	a = dom.addAnchor(td,_('b_del'));
	a.addEventListener('click', function(){_this.setOldList();}, false);
	a = dom.addAnchor(td,_('b_loa'));
	a.addEventListener('click', function(){_this.load();}, false);
	a = dom.addAnchor(td,_('b_sav'));
	a.addEventListener('click', function(){_this.save('old');}, false);
	tr.appendChild(td);
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	this.oldList = dom.addTextarea(td);
	dom.addOnChange(this.oldList, doIt, false);
	tr.appendChild(td);
	if (useToggles) dom.makeTogleable(tr,toggleCont,toggleBar,true);
	
	// new data title row
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','tit');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	dom.addTitle(td,_('t_ndt')+':');
	tr.appendChild(td);
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	toggleCont = doc.createElement('div');
	this.newTitle = doc.createElement('span');
	toggleCont.appendChild(this.newTitle);
	td.appendChild(toggleCont);
	tr.appendChild(td);
	toggleBar = tr;
	
	// new data content row
	
	tr = doc.createElement('tr');
	tbody.appendChild(tr);
	
	td = dom.newCell();

	a = dom.addAnchor(td,_('b_sel'));
	a.addEventListener('click', function(){_this.newList.select();}, false);
	a = dom.addAnchor(td,_('b_del'));
	a.addEventListener('click', function(){_this.setNewList();}, false);
	a = dom.addAnchor(td,_('b_get'));
	a.addEventListener('click', function(){_this.setNewListFromPage();}, false);
	a = dom.addAnchor(td,_('b_sav'));
	a.addEventListener('click', function(){_this.save('new');}, false);
	a.setAttribute('title',_('b_svt'));
	tr.appendChild(td);
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	this.newList = dom.addTextarea(td);
	dom.addOnChange(this.newList, doIt, false);
	tr.appendChild(td);
	if (useToggles) dom.makeTogleable(tr,toggleCont,toggleBar,true);
	
	// export title row
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','tit alt');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	td.setAttribute('colspan','2');
	td.setAttribute('class','col2');
	toggleCont = doc.createElement('div');
	dom.addTitle(toggleCont,_('t_exp')+':');
	td.appendChild(toggleCont);
	tr.appendChild(td);
	toggleBar = tr;
	toggleList = new Array();
	
	// forum type
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','alt');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	dom.addText(td,_('t_fmt')+':');
	tr.appendChild(td);
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	this.selectFormat = dom.addSelect(td);
	for (key in format.formats)
		dom.addOption(format.formats[key].name, key, this.selectFormat);
	index = storage.get('selectFormat');
	this.selectFormat.selectedIndex = (index==null) ? 0 : parseInt(index);
	$(this.selectFormat).change(function()
	{
		storage.set('selectFormat', _this.selectFormat.selectedIndex+'');
		doIt();
	});
	tr.appendChild(td);
	toggleList.push(tr);
	dom.ogameDropDown($(this.selectFormat));
	
	// color profile
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','alt');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	dom.addText(td,_('t_col')+':');
	tr.appendChild(td);
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	this.selectColors = dom.addSelect(td);
	for (key in colors.names)
		dom.addOption(colors.names[key], key, this.selectColors);
	index = storage.get('selectColors');
	this.selectColors.selectedIndex = (index==null) ? 0 : parseInt(index);
	$(this.selectColors).change(function()
	{
		storage.set('selectColors', _this.selectColors.selectedIndex+'');
		doIt();
	});
	tr.appendChild(td);
	toggleList.push(tr);
	dom.ogameDropDown($(this.selectColors));
	
	// forum code title row
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','alt');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	dom.addText(td,_('t_out')+':');
	a = dom.addAnchor(td,_('b_sel'));
	a.addEventListener('click', function(){_this.stats.select();}, false);
	tr.appendChild(td);
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	this.stats = dom.addTextarea(td);
	this.stats.setAttribute('readonly','readonly');
	this.stats.addEventListener('click', function(){_this.stats.select();}, false);
	tr.appendChild(td);
	toggleList.push(tr);
	
	if (useToggles) dom.makeTogleable(toggleList,toggleCont,toggleBar,true);
	
	// reset data line
	
	tr = doc.createElement('tr');
	tr.setAttribute('class','tit');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	td.setAttribute('class','col2');
	td.setAttribute('align','right');
	td.setAttribute('colspan','2');
	tr.appendChild(td);
	
	a = dom.addAnchor(td,_('b_res'));
	a.setAttribute('class','action btn_blue float_right');
	a.addEventListener('click', function(){_this.resetData();}, false);
	
	// status line
	
	this.statusRow = (tr = doc.createElement('tr'));
	tr.setAttribute('class','alt tit');
	tbody.appendChild(tr);
	
	td = dom.newCell();
	dom.addTitle(td,_('t_stb')+':');
	tr.appendChild(td);
	
	this.statusLine = (td = dom.newCell());
	td.setAttribute('class','col2');
	this.statusText = dom.addText(td,'');
	tr.appendChild(td);
	
	this.hideStatus();
}

Form.prototype =
{
	load : function ()
	{
		this.setOldList(storage.get('oldData'));
	},
	save : function (oldNew)
	{
		storage.set('oldData',this[oldNew+'List'].value);
	},
	setOldList : function (text)
	{
		if(arguments.length>0)
			this.oldList.value=text;
		else
			this.oldList.value='';
		this.doIt();
	},
	setNewList : function (text)
	{
		if(arguments.length>0)
			this.newList.value=text;
		else
			this.newList.value='';
		this.doIt();
	},
	resetData : function ()
	{
		this.setNewListFromPage();
		this.setOldList(this.currentPageData);
		storage.set('oldData',this.currentPageData);
	},
	setStats : function (text)
	{
		if(arguments.length>0)
			this.stats.value=text;
		else
			this.stats.value='';
	},
	setPreview : function (html)
	{
		if(arguments.length>0)
			this.preview.innerHTML = html;
		else
			this.preview.innerHTML = '';
	},
	setNewListFromPage : function ()
	{
		if (this.currentPageData)
		{
			this.setNewList(this.currentPageData);
			return;
		}
		
		var clock = doc.getElementById('OGameClock'); // ogame<5 compatibility
                if (clock==null)
                    clock = doc.querySelector('li.OGameClock');
		var data =
		{	
			timestamp : ogameInfo.timestamp,
			strDate : i18n.date(clock.innerHTML.split('<')[0]),
			strTime : i18n.time(clock.getElementsByTagName('span')[0].innerHTML),
			members : {}
		};

		var trs = memberList
			.list
			.getElementsByTagName('tbody')[0]
			.getElementsByTagName('tr');
		
		for (var i=0; i<trs.length; i++)
		{
			var tds = trs[i].getElementsByTagName('td');
			
			// user
			var user = tds[0].getElementsByTagName('span');
			if (user.length > 0)
				user = user[0]; // ogame>=6
			else
				user = tds[0]; // ogame<6 compatibility
			user = user.innerHTML.trim();
			/*! Ouraios FIX, not sure why this is needed, from https://github.com/ouraios/CerealOgameStats/commit/b83b33bd8cbd23882d254684bbd69b5d07de720a */
			user = user.replace(' (u)', '');
			// win.console.log('user:', user);
			
			// rank
			var rank;
			var sel = tds[2].getElementsByTagName('select');
			if(sel.length > 0)
				rank = sel[0].options[sel[0].selectedIndex].innerHTML;
			else
				rank = tds[2].innerHTML;
			rank = rank.trim();
			// win.console.log('rank:', rank);
			
			// score
			var score = tds[3].getElementsByTagName('span');
			if (score.length > 0)
				score = score[0]; // ogame<5 compatibility
			else
				score = tds[3]; // ogame>=5
			var position = score.getElementsByTagName('a')[0];
			score = score.getAttribute('title');
			score = parseInt(score.replace(/\D/gi,''));
			// win.console.log('score:', score);
			
			// position & id
			var id = position.getAttribute('href');
			id = parseInt(id.replace(/^.*searchRelId\=(\d+)(\D.*)?$/,'$1'));
			position = parseInt(position.innerHTML.replace(/\D/gi,''));
			// win.console.log('position:', position);
			// win.console.log('id:', id);
			
			// coord
			/*! Extraction method changed because seems that Ouraios found a non-anchor (tag A) scenario, see https://github.com/ouraios/CerealOgameStats/commit/b83b33bd8cbd23882d254684bbd69b5d07de720a */
			var coord = tds[4].innerHTML.split(/[\r\n\s]/).join('').replace(/^.*(\d+\:\d+\:\d+).*$/g,'$1');
			// win.console.log('coord:', coord);
			
			var date = i18n.date(tds[5].innerHTML);
			// win.console.log('date:', date);
			
			data.members[user]=
			{
				i: id,
				r: rank,
				s: score,
				p: position,
				c: coord,
				d: date
			};
			
			var info = data.members[user];
			if (
				/NaN|undefined|null/.test(info.i+'') ||
				(info.r) == null || typeof info.r == 'undefined' ||
				/NaN|undefined|null/.test(info.s+'') ||
				/NaN|undefined|null/.test(info.p+'') ||
				(!(/^\d+\:\d+\:\d+$/.test(info.c+''))) ||
				(info.d) == null || typeof info.d == 'undefined'
			)
			{
				return false;
			}
		}
		this.currentPageData = JSON.stringify(data);
		this.setNewList(this.currentPageData);
		return true;
	},
	hideStatus : function ()
	{
		this.statusRow.setAttribute('style','display:none');
	},
	showStatus : function ()
	{
		this.statusRow.setAttribute('style','');
	},
	setErrorStatus : function (text)
	{
		this.statusText.nodeValue = '';
		this.statusLine.setAttribute('class','overmark');
		if(arguments.length>0)
			this.statusText.nodeValue = text;
		this.showStatus();
	},
	setOkStatus : function (text)
	{
		this.statusText.nodeValue = '';
		this.statusLine.setAttribute('class','undermark');
		if(arguments.length>0)
			this.statusText.nodeValue = text;
		this.showStatus();
	},
	setTitle : function (oldNew, html, success)
	{
		this[oldNew+'Title'].setAttribute(
			'class',(success)?'undermark':'overmark');
		this[oldNew+'Title'].innerHTML = html;
	},
	doIt : function ()
	{	
		conversor.doIt(this);
	}
}

var Section = function(parent)
{
	var _this = this;
	
	// section title
	
	this.section = doc.createElement('div');
	this.section.setAttribute('class','section');
	var h3 = doc.createElement('h3');
	var span = doc.createElement('span');
	this.button = doc.createElement('a');
	this.button.setAttribute('class','closed'); // toggle -> opened
	this.button.setAttribute('href','javascript:void(0);');
	this.button.addEventListener('click', function(){_this.toggle();}, false);
	
	dom.addText(span, script.name);
	this.button.appendChild(span);
	h3.appendChild(this.button);
	this.section.appendChild(h3);
	parent.appendChild(this.section);
	
	// section content
	
	this.sectioncontent = doc.createElement('div');
	this.sectioncontent.setAttribute('class','sectioncontent');
	this.sectioncontent.setAttribute('id',script.name);
	this.sectioncontent.setAttribute('style','display:none;');
	this.content = doc.createElement('div');
	this.content.setAttribute('class','contentz');
	var footer = doc.createElement('div');
	footer.setAttribute('class','footer');
	
	this.sectioncontent.appendChild(this.content);
	this.sectioncontent.appendChild(footer);
	parent.appendChild(this.sectioncontent);
	
	// form (load on demand)
	
	this.form = null;
	this.canLoad = true;
	this.wTime = 30;
	this.toggleTimer = null;
}

var offset = function (obj)
{
	var l=0,t=0;
	if (obj.offsetParent) do
	{
		l += obj.offsetLeft;
		t += obj.offsetTop;
	}
	while (obj = obj.offsetParent);
	return {l:l,t:t};
}

Section.prototype =
{
	loadForm : function()
	{
		this.canLoad = false;
		if (!memberList.ready)
		{
			this.wTime = Math.round(this.wTime*1.1);
			var _this = this;
			setTimeout(function(){_this.loadForm();}, this.wTime);
			return;
		}
		
		this.form = new Form (this.content);
		this.form.setErrorStatus(_('e_nod'));
		if (!this.form.setNewListFromPage())
		{
			this.sectioncontent.innerHTML =
				'<div style="color:red;text-align:center;font-weigth:bold;padding:30px">'+
				_('e_oga')+
				'</div>';
		}
		this.form.load();
		if (this.form.oldList.value=='')
		{
			this.form.save('new');
			this.form.load();
		}
	},
	toggle : function()
	{
		if (this.canLoad)
			this.loadForm();
		
		if (this.button.getAttribute('class')=='closed')
		{
			this.button.setAttribute('class','opened');
			this.sectioncontent.setAttribute('style','display:block;');
			var o = offset(this.section);
			for (var i=10; i<=100; i+=30)
				setTimeout(function(){try{win.scroll(o.l,o.t);}catch(e){}},i);
		}
		else
		{
			this.button.setAttribute('class','closed');
			this.sectioncontent.setAttribute('style','display:none;');
		}
	}
}

script.domWait = 30;
script.domLoader = function()
{
	clearTimeout(this.domTimer);
	if (doc.getElementById('allyInternText'))
	{
		delete this.dom;
		this.dom = new Section(doc.getElementById('eins'));
	}
	else
	{
		this.domWait = Math.round(this.domWait*1.1);
		this.domTimer = setTimeout(function()
		{
			script.domLoader();
		},
		this.domWait);
	}
}

script.init = function()
{
	this.domLoader();
	try
	{
		doc.querySelector("a.navi.overview").addEventListener(
			'click',
			function()
			{
				script.domWait = 30;
				script.domLoader();
			},
			false
		);
		var save = doc.querySelector("#form_assignRank a.save_bigger");
		if (save)
			save.addEventListener(
				'click',
				function()
				{
					script.domWait = 30;
					script.domTimer = setTimeout(function()
					{
						script.domLoader();
					},
					500);
				},
				false
			);
	}
	catch(e){}
}

script.init();

//////////////////////////////////
//                              //
//   END onDOMContentLoaded()   //
//                              //
//////////////////////////////////
}

var initJQuery = function()
{
	try
	{
		$ = win.jQuery;
		if (typeof($)=='undefined') throw 0;
		if (typeof($.fn.ogameDropDown)=='undefined') throw 0;
		
		// init script
		onDOMContentLoaded();
	}
	catch(e)
	{
		setTimeout(initJQuery,50);
	}
}

/*! [onDOMContentLoaded] by Dean Edwards & Matthias Miller & John Resig */
var initDone = false, init = function()
{
	// quit if this function has already been called
	if (initDone) return;
	initDone = true;

	// kill the timer
	if (_timer) clearInterval(_timer);

	// do stuff
	initJQuery();
};

/* for Mozilla/Opera9 */
if (doc.addEventListener)
	doc.addEventListener("DOMContentLoaded", init, false);

/* for Safari */
if (/WebKit/i.test(win.navigator.userAgent)) { // sniff
	var _timer = setInterval(
		function()
		{
			if (/loaded|complete/.test(doc.readyState))
				init(); // call the onload handler
		},
		10
	);
}

/* for other browsers */
win.onload = init;

/////
})();
