var csv = require('csv'),
    fs  = require('fs'),
    _   = require('./bower_components/underscore/underscore-min.js');

/**
 * For local use:
 * % ✗ python -m SimpleHTTPServer
 * var http = require('http');
 * var csvUrl = 'http://localhost:8000/agenda.csv';
 * use http.get
 *
*/

var https = require('https');
var csvUrl = 'https://docs.google.com/spreadsheets/export?id=1b5OBxMUsMnJSjCG88978PW6ZxZ1G5XISVAWJhR84bu8&exportFormat=csv';
var workshopsUrl = csvUrl + '&gid=1633917131';

var language = process.argv[2] || 'es';
var job = process.argv[3] || 'schedule';

if (job == 'workshops')
  makeSomeMagic(workshopsUrl, buildWorkshopsHtml);
else
  makeSomeMagic(csvUrl, buildScheduleHtml);

function makeSomeMagic(url, job) {

  https.get(url, function(res) {
    var response = "";

    res.on('data', function(chunk) {
      response += chunk;
    });

    res.on('end', function() {
      response = response.toString();
      csv.parse(response, function(err, output) {
        var events = csvArrayToJSON(output);
        job(events);
      });
    });

  }).on('error', function(e) {
    console.error(e);
  });

}

function csvArrayToJSON(csvArray) {
  var headers = _.head(csvArray);
  var rows = _.rest(csvArray);
  var rowObjects = _.map(rows, function(value, key, list) {
    return _.object(headers, value);
  });
  return rowObjects;
}

function buildWorkshopsHtml(events) {
  var workshops = _.where(events, { 'Track': 'Taller' });

  _.each(workshops, function(element, index, list) {
    var path = "agenda/" + language + "-" + element['Día'] + "-talleres-" + element.Id + ".html";
    fs.readFile('./templates/workshop-' + language + '.html', function (err, data) {
      if (err) throw err;
      var template = data.toString();
      var compiled = _.template(template);
      var html = compiled({ workshop: element });
      fs.writeFile(path, html, function (err) {
        if (err) throw err;
      });
    });
  });

  return true;
}

function buildScheduleHtml(events) {
  var html = "";

  // Sets a new variable which holds the hour without minutes
  _.each(events, function(element, index, list) {
    var hour = element['Hora Inicio'].split("");
    hour.pop();
    hour.pop();
    element['hour'] = hour.join("");
  });

  var eventsByHour = _.groupBy(events, 'hour');
  _.each(eventsByHour, function(value, key) {
    var hour = key.split("");
    if (hour.length == 1) hour.unshift("0");
    hour = hour.join("").concat(":00");

    html += buildScheduleRow(eventsByHour[key], hour);
  });

  console.log(html);
  return true;
}

function buildScheduleRow(eventsInAnHour, hour) {
  var html = "<td>" + hour + "</td>";


  html += _.reduce(_.where(eventsInAnHour, { 'Día': '1' }), function(memo, event) {
    return memo + buildEventLink(event);
  }, "<td>");
  html += "</td>";

  html += _.reduce(_.where(eventsInAnHour, { 'Día': '2' }), function(memo, event) {
    return memo + buildEventLink(event);
  }, "<td>");
  html += "</td>";

  return "<tr>" + html + "</tr>";
}

function buildEventLink(event) {
  var trackClassMap = {
    'Actores, políticas y principios': 'politicas',
    'Innovación y uso': 'innovacion',
    'Plataformas y herramientas': 'herramientas',
    'Plenarias': 'Plenarias',
    'Otros': 'otros'
  };
  event['trackClass'] = trackClassMap[event['Track']] || 'condatos';
  event['title'] = language == 'en' ? event['Panel inglés'] : event['Panel español'];

  var klass = "btn-<%= e['trackClass'] %> btn btn-default btn-s";
  var href = '';
  if (_.contains(['otros', 'condatos'], event.trackClass)) {
    href = '#';
    klass += ' disabled';
    event.title += '<br /><br />';
  } else {
    href = "../agenda/" + language + "-<%= e.Día %>-<%= e['Hora Inicio'] %>-<%= e.trackClass %>.html";
  }

  var template = "<a class='" + klass + "' href='" + href + "'><%= e.title %></a>";
  var compiled = _.template(template);
  return compiled({ e: event });
}

