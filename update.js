const axios = require("axios");
const jsdom = require("jsdom");
const stringSimilarity = require("string-similarity");
const { JSDOM } = jsdom;
const { GoogleSpreadsheet } = require('google-spreadsheet');
const gSheetDoc = new GoogleSpreadsheet('1MNLpkRmJ62YQRLvrBEV_1wrqn6B3FP8UnbFo-sZhMsg');
const creds = require('./sheetsCred.json');

const sheetList = {
  "spread": "1860171452",
  "total": "105618278",
  "moneyline": "1409990047",
  "pass": "485258135",
  "rec": "945683983",
  "dst": "460653605"
};

(async () => {
	await gSheetDoc.useServiceAccountAuth(creds);
  await gSheetDoc.loadInfo();
	console.log("gSheetTitle====>", gSheetDoc.title);

	getData(function(resData, prtd) {
    updateScore(gSheetDoc, resData, prtd);
  });
})();

async function writeToGSheet(gSheet, rows) {
	// await gSheet.clearRows({start: 2}); 
	await gSheet.addRows(rows);
}

function arrayconv(inputName, arr1, arr2) {
  const arr = arr1.concat(arr2);
  const nameArr = [];
  for(item of arr) {
    nameArr.push(item.name)
  }
  let bestMatch = stringSimilarity.findBestMatch(inputName, nameArr);
  return arr[bestMatch.bestMatchIndex];
}

async function updateOUTab(gSheetDoc, type, prtd, prtdNameArr) {
  let sheetId = sheetList[type];
  let sheet = gSheetDoc.sheetsById[sheetId];
  let rows = await sheet.getRows(); // can pass in { limit, offset }
  let fRows = rows.filter((item) => {
    return item.marked !=1;
  });
  for(let fRow of fRows) {
    if(!fRow.match) return;
    let tss = fRow.match.split(" @ ");
    let team1 = tss[0].split(" ")[0];
    let team2 = tss[1].split(" ")[0];
    let teamStr = team1 + " @ " + team2;
    let bestMatch = stringSimilarity.findBestMatch(teamStr, prtdNameArr);
    if(bestMatch.bestMatch.rating < 0.7) continue;
    let bstid = bestMatch.bestMatchIndex;
    let selectedPrtdOne = prtd[bstid];
    let strObj = matchType(fRow.type);
    let selectMember = arrayconv(fRow.pName, selectedPrtdOne.data[strObj.id][0].data, selectedPrtdOne.data[strObj.id][1].data)
    console.log('selectMember: ', selectMember);
    fRow.score = selectMember[strObj.name];
    fRow.marked = 1;
    await fRow.save();
  }
}

async function updateSMTab(gSheetDoc, type, data) { // spread & moneyline
  let sheetId = sheetList[type];
  let sheet = gSheetDoc.sheetsById[sheetId];
  let rows = await sheet.getRows(); // can pass in { limit, offset }
  let fRows = rows.filter((item) => {
    return item.marked !=1;
  });
  for(let fRow of fRows) {
    if(!fRow.match) return;
    let tss = fRow.match.split(" @ ");
    let team1 = tss[0].split(" ")[0];
    let team2 = tss[1].split(" ")[0];
    let teamStr = team1 + " @ " + team2;
    for(let item of data) {
      if(item.match == teamStr && item.pName == fRow.pName.split(" ")[0]) {
        if(!item.score) continue;
        fRow.score = item.score;
        fRow.marked = 1;
        await fRow.save();
      }
    }
  }
}

async function updateTOTab(gSheetDoc, type, data) { // over/under
  let sheetId = sheetList[type];
  let sheet = gSheetDoc.sheetsById[sheetId];
  let rows = await sheet.getRows(); // can pass in { limit, offset }
  let fRows = rows.filter((item) => {
    return item.marked !=1;
  });
  for(let fRow of fRows) {
    if(!fRow.match) return;
    let tss = fRow.match.split(" @ ");
    let team1 = tss[0].split(" ")[0];
    let team2 = tss[1].split(" ")[0];
    let teamStr = team1 + " @ " + team2;
    for(let item of data) {
      if(item.match == teamStr) {
        if(!item.score) continue;
        fRow.total = item.score;
        fRow.marked = 1;
        await fRow.save();
      }
    }
  }
}

async function updateScore(sheetDoc, resData, prtd) {
  let prtdNameArr = [];
  for(let item of prtd) {
    prtdNameArr.push(item.match)
  }
  
  for(let type in sheetList) {
    console.log("sheetProgress===>", type);
    if(type == "pass" || type == "rec" || type == "dst") {
      await updateOUTab(sheetDoc, type, prtd, prtdNameArr);
    }
    if(type == "spread" ||type == "moneyline") {
      let selectData = resData[type];
      await updateSMTab(sheetDoc, type, selectData);
    }
    if(type == "total") {
      let selectData = resData[type];
      await updateTOTab(sheetDoc, type, selectData);
    }
  }
}

async function getData(callback) {
  const response = await axios.get(`https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=football&league=nfl`);
  let events = response.data.sports[0].leagues[0].events;
  let resData = {spread: [], total: [], moneyline: []};
  let prtd = [];
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

    if(event.gamecastAvailable) {
      let d = await onePage(`https://www.espn.com/nfl/boxscore/_/gameId/${event.id}`);
      prtd.push({match: event.shortName, data: d});
    }
  }
  callback(resData, prtd);
}

async function onePage(url) {
  console.log('url: ', url);
  await new Promise((resolve) => setTimeout(resolve, 1000 * 8));
  let pageRes = await axios.get(url);
  const dom = new JSDOM(pageRes.data);
  let passDom = dom.window.document;
  // passing -------------
  let tabs = passDom.querySelectorAll("article.boxscore-tabs > div");
  if(!tabs) return null;
  let tabObj = {};
  for(let tab of tabs) {
    tabObj[`${tab.getAttribute("id")}`] = [];
    let teams = tab.querySelectorAll(`div.sub-module`);
    
    for(let team of teams) {
      let teamName = team.querySelector("div.team-name").textContent;
      let teamData = {name: teamName, data: []};
      let trs = team.querySelectorAll("table.mod-data tbody tr");

      for(let tr of trs) {
        let tds = tr.querySelectorAll("td");
        let obj = {};
        for(let td of tds) {
          
          if(td.getAttribute("class") == "name") {
            if(td.querySelector("span:nth-child(1)")) {
              obj["name"] = td.querySelector("span:nth-child(1)").textContent;
            } else {
              obj["name"] = td.textContent;
            }
            
          } else {
            obj[td.getAttribute("class")] = td.textContent;
          }
        }
        teamData.data.push(obj);
      }
      tabObj[`${tab.getAttribute("id")}`].push(teamData);
    }
  }
  return tabObj;
  
}


function matchType(type) {
  let id, name;
  switch(type) {
    case "Pass Yds":
      id = "gamepackage-passing";
      name = "yds";
      break;
    case "Pass TDs":
      id = "gamepackage-passing";
      name = "td";
      break;
    case "Pass Completions":
      id = "gamepackage-passing";
      name = "c-att";
      break;
    case "Interceptions":
      id = "gamepackage-passing";
      name = "int";
      break;
    case "Pass + Rush Yds":
      id = "nnnnn";
      name = "dddd";
      break;
    // Rush
    case "Rush Yds":
      id = "gamepackage-rushing";
      name = "yds";
      break;
    case "Rec Yds":
      id = "gamepackage-receiving";
      name = "yds";
      break;
    case "Receptions":
      id = "gamepackage-receiving";
      name = "rec";
      break;
    case "Rush + Rec Yds":
      id = "nnnnn";
      name = "dddd";
      break;
    case "Sacks":
      id = "gamepackage-defensive";
      name = "sacks";
      break;
    case "Tackles + Ast":
      id = "gamepackage-defensive";
      name = "tot";
      break;
    case "FG Made":
      id = "gamepackage-kicking";
      name = "fg";
      break;
    case "Team Totals":
      id = "nnnnn";
      name = "dddd";
      break;
    }
    return {id: id, name: name};
}