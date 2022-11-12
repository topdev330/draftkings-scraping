function dateSomeChangeFunc(type, dateStr, inputTime = "") {
  var resultTime = dateStr.trim().toUpperCase();
  let hmTime = inputTime;

	if(resultTime.includes("TODAY")) {
		var resultTime = new Date().toDateString();
		resultTime = resultTime.substring(0, resultTime.length - 4);
	} else if(resultTime.includes("TOMORROW")) {
    if(type!="moneyline") {
      hmTime = resultTime.split(" ")[1];
    }
		var resultTime = moment().add(1, 'days')._d.toDateString();
		resultTime = resultTime.substring(0, resultTime.length - 4);
	}
  
  let currentDate = new Date();
  const zoneOffset = currentDate.getTimezoneOffset();
  resultTime = resultTime + " "+ hmTime; // + "_" + zoneOffset
  resultTime = resultTime.toLowerCase();
  // if(resultTime.length) {
  //   var t1 = resultTime.replace("THU", "qqq");
  //   var t2 = t1.replace("TH", "");
  //   resultTime = t2.replace("qqq", "THU")
    
  //   let currentDate = new Date();
  //   const zoneOffset = currentDate.getTimezoneOffset();
  //   resultTime = resultTime + "_" + zoneOffset
    // console.log('resultTime: ', resultTime);
    // resultTime += " " + new Date().getFullYear();
    // var fullDate = new Date(resultTime);

    // var parts = time.match(/(\d+)\:(\d+)(\w+)/);
    // console.log('parts: ', parts);
    // var hours = /am/i.test(parts[3]) ? parseInt(parts[1], 10) : parseInt(parts[1], 10) + 12;
    // var minutes = parseInt(parts[2], 10);

    // fullDate.setHours(hours);
    // fullDate.setMinutes(minutes);
    // resultTime = fullDate.toUTCString();
    // // resultTime = new Date(fullDate).toISOString();
  // }
	return resultTime;
}
