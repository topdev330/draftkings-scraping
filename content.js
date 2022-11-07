function dateSomeChangeFunc(str, time) {
  var time = time.trim();
  var str = str.trim().toUpperCase();
	var resultTime = str;

	if(str == "TODAY") {
		var resultTime = new Date().toDateString();
		resultTime = resultTime.substring(0, resultTime.length - 4);
	} else if(str == "TOMORROW") {
		var resultTime = moment().add(1, 'days')._d.toDateString();
		resultTime = resultTime.substring(0, resultTime.length - 4);
	}
  resultTime = resultTime.trim();
  if(resultTime.length) {
    var t1 = resultTime.replace("THU", "qqq");
    var t2 = t1.replace("TH", "");
    resultTime = t2.replace("qqq", "THU")

    console.log('resultTime: ', resultTime);
    resultTime += " " + new Date().getFullYear();
    var fullDate = new Date(resultTime);

    var parts = time.match(/(\d+)\:(\d+)(\w+)/);
    var hours = /am/i.test(parts[3]) ? parseInt(parts[1], 10) : parseInt(parts[1], 10) + 12;
    var minutes = parseInt(parts[2], 10);

    fullDate.setHours(hours);
    fullDate.setMinutes(minutes);
    resultTime = fullDate.toUTCString();
    // resultTime = new Date(fullDate).toISOString();
  }
	return resultTime;
}
