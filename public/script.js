var defaultXML = '<C><P Ca="" F="8" /><Z><S><S L="800" X="400" H="20" Y="400" T="0" P="0,0,0.3,0.2,0,0,0,0" /></S><D /><O /><L><VL n="Layer1" l="-1" /><JD c="13191E,250,1,0" P1="0,15" P2="800,15" /><JD c="ff8400,250,0.3,0" P1="0,15" P2="800,15" /><JD c="ff8400,250,0.3,0" P1="0,265" P2="800,265" /><JD c="ff8400,250,0.3,0" P1="0,515" P2="800,515" /><L /></L></Z></C>';
var xmlInfo = {};
var anyMatch = false;
var bgcolor, bgopacity=0.3, bgwidth=800;
var bgimg = new Image();
bgimg.src = "bg.png";

window.requestAnimationFrame(render);

function showWarn(text) {
	// TODO
}

function parseSize(props) {
	var width = props.attr('L') || 800;
	var height = props.attr('H') || 400;

	width = parseInt(width);
	height = parseInt(height);

	xmlInfo.width = isNaN(width) ? 800 : width;
	xmlInfo.height = isNaN(height) ? 400 : height;
}

function load2() {
	var xml = $("#xml").val();
	var $xmlDoc, xmlProps, xmlRoot;

	try {
		$xmlDoc = $($.parseXML(xml));
		xmlProps = $xmlDoc.children('C').children('P');
		xmlRoot = $xmlDoc.children('C').children('Z');
	} catch (err) {
		showWarn("Invalid XML!");
		return;
	}

	xmlInfo.doc = $xmlDoc;
	parseSize(xmlProps);
	map.height = xmlInfo.height;

	var jointParent = xmlRoot.children('L');

	if (jointParent.length === 0) {
		return;
	}

	var joints = jointParent.children('JD');

	// TODO simplify rest use [].filter
	var cloudmask, color, opacity;

	for (var jprop, jp1, jp2, matches, i=0; i<joints.length; i++) {
		jprop = joints[i].attr('c');
		jp1 = joints[i].attr('P1');
		jp2 = joints[i].attr('P2');
		jp1 = jp1 ? jp1.split(',') : jp1;
		jp2 = jp2 ? jp2.split(',') : jp2;

		if (jp1 && jp2 && jp1[1] && jp1[1] == jp2[1]) {
			if (jprop == '13191E,250,1,0') {
				cloudmask = joints[i];
			} else if (matches = jprop.match(/^(\w+),250,(\d+(?:\.\d+)?),\d+$/)) {
				if (color === undefined && opacity === undefined) {
					color = matches[1];
					opacity = matches[2];
				}
			}
		}
	}
}

function save2() {
	var foo = $ts.find("Object").get(0);
	var serializer = new XMLSerializer(); 
	var original = serializer.serializeToString(foo);
}

function load() {
	var xml = $("#xml").val();
	var matches = xml.match(/<JD.*c="(\w+),250,0.3,0".*?\/><JD.*c="\1,250,0.3,0".*?\/><JD.*c="\1,250,0.3,0".*?\/>/);
	var hmatch, wmatch, pmatch = xml.match(/<C><P (.*?)\/>/);
	var map = document.getElementById("map");

	anyMatch = false;
	
	if (matches && matches[1]) {
		anyMatch = true;
		bgcolor = "#"+matches[1];
		$.farbtastic('#picker').setColor(bgcolor);
	}

	if (pmatch && pmatch[0]) {
		hmatch = pmatch[0].match(/H="(\d+)"/);
		wmatch = pmatch[0].match(/L="(\d+)"/);
	}

	if (hmatch && hmatch[1]) {
		var height = parseInt(hmatch[1]);

		if (isNaN(height))
			height = 400;

		map.height = height;
	}

	if (wmatch && wmatch[1]) {
		var width = parseInt(wmatch[1]);

		if (isNaN(width))
			width = 800;

		bgwidth = width;
	}
}

function save() {
	if (!bgcolor || !bgopacity)
		return;

	var xml = $("#xml").val();
	var color = bgcolor.substr(1);
	
	if (anyMatch) {
		xml = xml.replace(/(<JD.*c=")(\w+),250,([\d\.]+)(,0".*?\/><JD.*c=")\2,250,\3(,0".*?\/><JD.*c=")\2,250,\3(,0".*?\/>)/,
			function(m, m1, m2, m3, m4, m5, m6){
				return m1+color+",250,"+bgopacity+m4+color+",250,"+bgopacity+m5+color+",250,"+bgopacity+m6;
			});
	}/* else {
		var JDs = '<JD c="13191E,250,1,0" P1="0,15" P2="800,15" /><JD c="'+color+',250,0.3,0" P1="0,15" P2="800,15" /><JD c="'+color+',250,0.3,0" P1="0,265" P2="800,265" /><JD c="'+color+',250,0.3,0" P1="0,515" P2="800,515" />';

		if (xml.indexOf('</L>') == -1) {
			xml = xml.replace('</Z>', '<L>' + JDs + '</L></Z>');
		} else {
			xml = xml.replace('</L>', '<L>' + JDs + '</L>');
		}
	}*/
	
	$("#xml").val(xml);
}

function render() {
	if (bgcolor && bgopacity) {
		var map = document.getElementById("map");
		var ctx = map.getContext("2d");
		var width = map.width, height = map.height;

		ctx.clearRect(0, 0, bgwidth, height);

		ctx.drawImage(bgimg, 0, 0, bgimg.width, bgimg.height, 0, 0, bgwidth, height);

		ctx.fillStyle = "#13191E";
		ctx.fillRect(0, -110, 800, 250);
		
		if (bgopacity != 0) {
			ctx.fillStyle = bgcolor;
			ctx.globalAlpha = bgopacity;
			ctx.fillRect(0, 0, width, height);
			ctx.globalAlpha = 1;
		}
	}

	window.requestAnimationFrame(render);
}

// Color Wheel
$('#picker').farbtastic(function(color) {
	bgcolor = color;
	$("#color").val(color);
	//render();
	save();
});
$('#color').keyup(function() {
	var color = $(this).val();
	var fcolor = "#" + color.replace(/[^0-9a-fA-F]/g, "");

	fcolor = fcolor.substr(0, 7);
	
	if (color != fcolor)
		$(this).val(fcolor);

	$.farbtastic('#picker').setColor(fcolor);
})/*.keypress(function(e){
	if(e.which >= 32 && e.which < 48 ||
	e.which > 57 && e.which < 65 ||
	e.which > 70 && e.which < 97 ||
	e.which > 102) {
		e.preventDefault();
	}
})*/;

// Opacity Slider
$("#slider").slider({
	range: "min",
	min: 0,
	max: 10,
	value: 3,
	slide: function(evt, ui) {
		$("#opacity").val(ui.value / 10);
		bgopacity = ui.value / 10;
		//render();
		save();
	}
});
$("#opacity").val($("#slider").slider("value") / 10);
$('#opacity').keyup(function() {
	var opacity = $(this).val();
	var fopacity = parseFloat(opacity);

	if (isNaN(fopacity))
		fopacity = 0.3;

	if (opacity != fopacity)
		$(this).val(fopacity);

	$("#slider").slider("value", fopacity * 10);
});

// XML Textarea
$('#xml').bind('input propertychange', load);
load();
new Clipboard('.xml-copy');
