const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { GoogleSpreadsheet } = require('google-spreadsheet');
const gSheetDoc = new GoogleSpreadsheet('1MNLpkRmJ62YQRLvrBEV_1wrqn6B3FP8UnbFo-sZhMsg');
const creds = require('./sheetsCred.json');

(async () => {
	await gSheetDoc.useServiceAccountAuth(creds);
  await gSheetDoc.loadInfo();
	console.log("gSheetTitle====>", gSheetDoc.title);
	getData(async function(resData) {
    // console.log('resData: ', resData);
		var spread_sheet = gSheetDoc.sheetsById[1860171452];
		await writeToGSheet(spread_sheet, resData.spread);

		var total_sheet = gSheetDoc.sheetsById[105618278];
		await writeToGSheet(total_sheet, resData.total);

		var money_sheet = gSheetDoc.sheetsById[1409990047];
		await writeToGSheet(money_sheet, resData.moneyline);
  });
})();

async function writeToGSheet(gSheet, rows) {
	// await gSheet.clearRows({start: 2}); 
	await gSheet.addRows(rows);
}

async function getData(callback) {
  const response = await axios.get(`https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=football&league=nfl&week=9`);
  let events = response.data.sports[0].leagues[0].events;
  let resData = {spread: [], total: [], moneyline: []};
  for(let k = 0; k < events.length; k++) {
    let event = events[k];
    let teams = event.shortName.split(" @ ");
    let homeTeam = teams[1], awayTeam = teams[0];
    let spreads = event.odds.details.split(" ");
    let spreadTeam = spreads[0]; 
    let spreadVal = spreads[1];

    let homeSpread, awaySpread;
    if(spreadTeam == homeTeam) {
      homeSpread = spreadVal;
    } else {
      awaySpread = spreadVal;
    }
    if(!homeSpread) homeSpread = awaySpread * -1;
    if(!awaySpread) awaySpread = homeSpread * -1;

    let competitors = event.competitors;
    let homeScore, awayScore;
    if(competitors[0].homeAway == "home") {
      homeScore = competitors[0].score;
      awayScore = competitors[1].score;
    } else {
      homeScore = competitors[1].score;
      awayScore = competitors[0].score;
    }


    let homeSpreadRow = {eventId: event.id, match: event.shortName,time: event.date, pName: homeTeam, line: homeSpread, odds: event.odds["homeTeamOdds"].spreadOdds, score: homeScore}
    let awaySpreadRow = {eventId: event.id, match: event.shortName, time: event.date, pName: awayTeam, line: awaySpread, odds: event.odds["awayTeamOdds"].spreadOdds, score: awayScore}
    resData.spread.push(homeSpreadRow);
    resData.spread.push(awaySpreadRow);

    let homeTotalOverRow = {eventId: event.id, match: event.shortName,time: event.date, line: "O " + event.odds.overUnder, odds: event.odds.overOdds, score: Number(homeScore) + Number(awayScore)}
    let homeTotalUnderRow = {eventId: event.id, match: event.shortName,time: event.date, line: "U " + event.odds.overUnder, odds: event.odds.underOdds, score: Number(homeScore) + Number(awayScore)}
    resData.total.push(homeTotalOverRow);
    resData.total.push(homeTotalUnderRow);

    let homeMoneylineRow = {eventId: event.id, match: event.shortName,time: event.date, pName: homeTeam, odds: event.odds["homeTeamOdds"].moneyLine, score: homeScore}
    let awayMoneylineRow = {eventId: event.id, match: event.shortName, time: event.date, pName: awayTeam, odds: event.odds["awayTeamOdds"].moneyLine, score: awayScore}
    resData.moneyline.push(homeMoneylineRow);
    resData.moneyline.push(awayMoneylineRow);
    
    // passing, rush/rec, teamprops, dk
    
  }
  callback(resData);
}
