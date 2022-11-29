const puppeteer = require('puppeteer');
const fs =  require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
var moment = require('moment');
const gSheetDoc = new GoogleSpreadsheet('1MNLpkRmJ62YQRLvrBEV_1wrqn6B3FP8UnbFo-sZhMsg');
const creds = require('./sheetsCred.json');

console.log("=============STARTED============");
async function scrapping(gSheetDoc, page) {
	console.log("---------------------------------Call the Scrapper-----------------------------------------------------------");
	try {
		// Game page --------------------------------------------------------
		var moneylineData = await moneyline(page);
		var spread_sheet = gSheetDoc.sheetsById[1860171452];
		await writeToGSheet(spread_sheet, moneylineData.spread);

		var total_sheet = gSheetDoc.sheetsById[105618278];
		await writeToGSheet(total_sheet, moneylineData.total);

		var money_sheet = gSheetDoc.sheetsById[1409990047];
		await writeToGSheet(money_sheet, moneylineData.moneyline);
		
		var passing = await overUnder(page, "game_category_Passing Props", ['Pass TDs', 'Pass Yds', 'Interceptions', 'Pass Completions'])
		var passing_sheet = gSheetDoc.sheetsById[485258135];
		await writeToGSheet(passing_sheet, passing);

		var rec = await overUnder(page, "game_category_Rush/Rec Props", ['Rush Yds', 'Rec Yds', 'Receptions'])
		var rec_sheet = gSheetDoc.sheetsById[945683983];
		await writeToGSheet(rec_sheet, rec);

		var dst = await overUnder(page, "game_category_D/ST Props", ['Sacks', 'Tackles + Ast', 'FG Made'])
		var dst_sheet = gSheetDoc.sheetsById[460653605];
		await writeToGSheet(dst_sheet, dst);

/* 		var teamPropsData = await teamProps(page);
		var teamProps_sheet = gSheetDoc.sheetsById[1451968654];
		await writeToGSheet(teamProps_sheet, teamPropsData); */


	} catch(err) {
		console.log("==========>", err);
		setTimeout(function() {
			process.exit(1);
		}, 1000 * 10)
	}
}

async function writeToGSheet(gSheet, rows) {
	await gSheet.clearRows({start: 2}); 
	await gSheet.addRows(rows);
}

async function moneyline(page) {
	await page.click('a[id="game_category_Game Lines"]');
	await page.waitForSelector('div[aria-labelledby="game_category_Game Lines"] table.sportsbook-table');
	await new Promise((resolve) => setTimeout(resolve, 1000 * 1));
	var gameData = await page.evaluate(async () => {
		var resData = {spread: [], total: [], moneyline: []};
		var tables = document.querySelectorAll('div[aria-labelledby="game_category_Game Lines"] table.sportsbook-table');
		for(var k = 0; k < tables.length; k++) {
			var table = tables[k];
			var date = table.querySelector("thead tr th div.sportsbook-table-header__title span").innerText;
			
			var trs = table.querySelectorAll("tbody tr");
			let preivousTeamNameTemp = null;
			for(var i = 0; i < trs.length; i++) {
				if(!trs[i].querySelector("a.toggle-sgp-badge__nav-link")) {
					i++;
					continue;
				}
				var time;
				if(trs[i].querySelector("span.event-cell__start-time")) {
					time = trs[i].querySelector("span.event-cell__start-time").textContent;
				} else {
					time = trs[i].querySelector("span.event-cell__time").textContent;
				}
				var timeStr =dateSomeChangeFunc("moneyline", date, time);
				

				var pName = trs[i].querySelector('div.event-cell__name-text').textContent;
				var matchName = null;
				if(!preivousTeamNameTemp) {
					matchName = pName + " @ " + trs[i+1].querySelector('div.event-cell__name-text').textContent;
					preivousTeamNameTemp = pName;
				} else if(i%2 == 1){
					matchName = preivousTeamNameTemp + " @ " + pName;
					preivousTeamNameTemp = null;
				}
				
				var lines = trs[i].querySelectorAll('span.sportsbook-outcome-cell__line');
				var total_line_label = trs[i].querySelector('span.sportsbook-outcome-cell__label').textContent;
				var odds = trs[i].querySelectorAll('span.sportsbook-odds');
				resData.spread.push({match: matchName, time: timeStr, pName: pName, line: lines[0].textContent, odds: odds[0].textContent})
				resData.total.push({match: matchName, time: timeStr, pName: pName, line: total_line_label + " " + lines[1].textContent, odds: odds[1].textContent})
				resData.moneyline.push({match: matchName, time: timeStr, pName: pName, odds: odds[2].textContent})
			}
		}
		return resData;
	});
	return gameData;
}

async function teamProps(page) {
	await page.waitForSelector('a[id="game_category_Team Props"]');
	await page.click('a[id="game_category_Team Props"]');
	await new Promise((resolve) => setTimeout(resolve, 1000 * 1));
	await page.click('a[id="game_category_Team Props"]');
	await page.waitForSelector('div.sportsbook-event-accordion__children-wrapper');
	await new Promise((resolve) => setTimeout(resolve, 1000 * 1));

	var gameData = await page.evaluate((idName) => {
		var resultArr = [];
		var accordions = document.querySelectorAll(`div[aria-labelledby="game_category_Team Props"] div.sportsbook-event-accordion__wrapper`);

		for(var k = 0; k < accordions.length; k++) {
			if( !accordions[k].querySelector("div.sportsbook-event-accordion__title-wrapper")) continue;
			var title = accordions[k].querySelector("div.sportsbook-event-accordion__title-wrapper").innerText.replace("\nat\n", " _VS_ ");
			var dateString = accordions[k].querySelector("span.sportsbook-event-accordion__date").textContent;
			var time = "";
			if(dateString) {
				var dateStr = dateString.split(" ")[0];
				console.log('dateStr: ', dateStr);
				var timeStr = dateString.split(" ")[1];
				var date = dateSomeChangeFunc(null, dateStr, timeStr);
				time = date
			}

			var table = accordions[k].querySelector("div.sportsbook-event-accordion__children-wrapper");

			var trs = table.querySelectorAll("div.component-29");
			for(var i = 0; i < trs.length; i++) {
				var pName = trs[i].querySelector('p.participants').textContent;
				var line = trs[i].querySelector('span.sportsbook-outcome-cell__line').textContent;
				var odds = trs[i].querySelectorAll('span.sportsbook-odds');
				var overOdds = odds[0].textContent;
				var underOdds = odds[1].textContent;
				resultArr.push({time: time, match: title, type: idName, pName: pName, line: line, overOdds: overOdds, underOdds: underOdds})
			}
		}
		return resultArr;
	}, 'Team Totals');
	return gameData;
}

async function overUnder(page, catId, subcatArr) {
	await new Promise((resolve) => setTimeout(resolve, 1000 * 1));
	await page.click(`a[id="${catId}"]`);
	await page.waitForSelector(`div[aria-labelledby="${catId}"] table.sportsbook-table`);
	var buttonList = await page.evaluate((subcatArr) => {
		var buttons = document.querySelectorAll('div[aria-label="Subcategories"] a.sportsbook-tabbed-subheader__tab-link')
		var arr = [];
		for(var i =0;i < buttons.length; i++) {
			var name = buttons[i].querySelector("span.sportsbook-tabbed-subheader__tab").textContent;
			var sameThing = subcatArr.filter((item) => {
				return name == item;
			})
			if(sameThing.length) {
				arr.push({id: buttons[i].getAttribute("id"), name: name})
			}
		}
		return arr;
	}, subcatArr);
	
	var oddsData = [];
	for(let k = 0; k < buttonList.length; k++) {
		let idObj = buttonList[k];
		await page.waitForSelector(`a[id="${idObj.id}"]`);
		await page.click(`a[id="${idObj.id}"]`);
		await new Promise((resolve) => setTimeout(resolve, 1000 * 1));
		await page.waitForSelector(`div[aria-labelledby="${catId}"] table.sportsbook-table`);

		var tabData = await page.evaluate(async (idName, catId) => {
			var resultArr = [];
			var accordions = document.querySelectorAll(`div[aria-labelledby="${catId}"] div.sportsbook-event-accordion__wrapper`);
			// var tables = document.querySelectorAll(`div[aria-labelledby="${catId}"] table.sportsbook-table`);
			for(var k = 0; k < accordions.length; k++) {
				if(!accordions[k].querySelector("a.toggle-sgp-badge__nav-link")) continue;
				var table = accordions[k].querySelector("table.sportsbook-table");
				var title = accordions[k].querySelector("div.sportsbook-event-accordion__title-wrapper").innerText.replace("\nat\n", " @ ");
				var dateString = accordions[k].querySelector("span.sportsbook-event-accordion__date").textContent;
				console.log('dateString: ', dateString);
				var time = dateSomeChangeFunc(null, dateString);
				// if(dateString) {
				// 	var dateStr = dateString.split(" ")[0];
				// 	console.log('dateStr: ', dateStr);
				// 	var timeStr = dateString.split(" ")[1];
				// 	var date = dateSomeChangeFunc(dateStr, timeStr);
				// 	time = date;
				// }

				var trs = table.querySelectorAll("tbody tr");
				var pName, line, overOdds, underOdds;
				for(var i = 0; i < trs.length; i++) {
					pName = trs[i].querySelector('span.sportsbook-row-name').textContent;
					line = trs[i].querySelector('span.sportsbook-outcome-cell__line').textContent;
					odds = trs[i].querySelectorAll('span.sportsbook-odds');
					overOdds = odds[0].textContent;
					underOdds = odds[1].textContent;
					resultArr.push({time: time, match: title, type: idName, pName: pName, line: line, overOdds: overOdds, underOdds: underOdds})
				}
			}
			return resultArr;
		}, idObj.name, catId);
		if(tabData.length) {
			oddsData = oddsData.concat(tabData);
		}
	}
	return oddsData;
}

(async () => {
	await gSheetDoc.useServiceAccountAuth(creds);
  await gSheetDoc.loadInfo();
	console.log("gSheetTitle====>", gSheetDoc.title);
	
	const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
	await page.setDefaultNavigationTimeout(60000); //timeout 60 seconds now
  await page.goto('https://sportsbook.draftkings.com/leagues/football/nfl', {
		waitUntil: 'domcontentloaded',
  });

	await page.evaluate(fs.readFileSync("./moment.js", 'utf8'));
	await page.evaluate(fs.readFileSync("./content.js", 'utf8'));
	await scrapping(gSheetDoc, page);
	console.log("------END-------------");
	browser.close();
})();