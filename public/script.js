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

var State = {
		InvalidXML: 0,
		NoJointRoot: 1,
		NoJointGroup: 2,
		NoCloudMask: 3,
		Normal: 4,
	};

function checkXML(xml) {
	var ret = {}

	try {
		ret.tree = $.parseXML(xml);
		var $tree = $(ret.tree);
		ret.props = $tree.children('C').children('P');
		ret.root = $tree.children('C').children('Z');
	} catch (err) {
		return { state: State.InvalidXML };
	}

	try {
		ret.jointParent = ret.root.children('L');
	} catch (err) {
		ret.state = State.NoJointRoot;
		return ret;
	}

	ret.joints = ret.jointParent.children('JD');

	if (ret.joints.length == 0 || !checkCloudMask(ret.joints)) {
		ret.state = State.NoCloudMask;
		return ret;
	}

	var jointGroups = getJointGroups(ret.joints);

	if (jointGroups.length < 1) {
		ret.state = State.NoJointGroup;
		return ret;
	}

	ret.jointGroup = jointGroups[0];
	ret.state = State.Normal;

	return ret;
}

function checkCloudMask(joints) {
	var cloudmasks = [].filter.apply(joints, [function(j) {
			return j.getAttribute('c') == '13191E,250,1,0';
		}]);

	return cloudmasks.length > 0;
}

function getJointGroups(joints) {
	var jointGroups = [];
	var c, cs, p1, p2, jg, j;

	for (var i=0; i<joints.length; i++) {
		j = joints[i];

		c = j.getAttribute('c'); // color, size, opacity, foreground
		cs = c.split(',');
		p1 = j.getAttribute('P1').split(',');
		p2 = j.getAttribute('P2').split(',');

		if (cs[1] == '250' && p1[1] == p2[1] && !inAGroup(jointGroups, c, p1, p2)) {
			jg = findJoints(joints, c, p1, p2);

			if (jg && jg.length > 1)
				jointGroups.push(jg);
		}
	}

	return jointGroups;
}

function findJoints(joints, c, p1, p2) {
	return [].filter.apply(joints, [function(j) {
			return inSameGroup(j, c, p1, p2);
		}]);
}

function inAGroup(groups, c, p1, p2) {
	for (var i=0; i<groups.length; i++) {
		if (inSameGroup(groups[i][0], c, p1, p2)) {
			return true;
		}
	}
	return false;
}

function inSameGroup(j1, j2_c, j2_p1, j2_p2) {
	try {
		var
			j1_c = j1.getAttribute('c'),
			j1_p1 = j1.getAttribute('P1').split(','),
			j1_p2 = j1.getAttribute('P2').split(',');

		return j1_c == j2_c
			&& j1_p1[0] == j2_p1[0] // p1.x
			&& j1_p2[0] == j2_p2[0]; // p2.x
	} catch (err) {}

	return false;
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

	xmlInfo = checkXML(xml);

	if (xmlInfo.state == State.InvalidXML) {
		showWarn("Invalid XML!");
		return;
	}

	parseSize(xmlInfo.props);
	map.height = xmlInfo.height;

	console.log(xmlInfo);
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
$('.xml-load').click(load2);
